import { EventEmitter } from './EventEmitter';

export interface ImageLoadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maintainAspectRatio?: boolean;
  enableProgress?: boolean;
}

export interface ImageLoadResult {
  image: HTMLImageElement;
  originalWidth: number;
  originalHeight: number;
  displayWidth: number;
  displayHeight: number;
  format: string;
  size: number;
}

export interface ImageValidationResult {
  isValid: boolean;
  format?: string;
  size?: number;
  width?: number;
  height?: number;
  error?: string;
}

export interface ImageLoadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Comprehensive image loading and validation system
 */
export class ImageLoader extends EventEmitter {
  private static readonly SUPPORTED_FORMATS = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
  ];

  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly MAX_DIMENSION = 8192; // 8K max dimension

  private options: ImageLoadOptions;

  constructor(options: ImageLoadOptions = {}) {
    super();
    this.options = {
      maxWidth: options.maxWidth || ImageLoader.MAX_DIMENSION,
      maxHeight: options.maxHeight || ImageLoader.MAX_DIMENSION,
      quality: options.quality || 0.9,
      maintainAspectRatio: options.maintainAspectRatio !== false,
      enableProgress: options.enableProgress !== false,
      ...options,
    };
  }
  /**
   * Load image from various sources
   */
  public async loadImage(
    source: string | File | Blob | ArrayBuffer | ImageData,
  ): Promise<ImageLoadResult> {
    this.emit('load:start', { source });

    try {
      let result: ImageLoadResult;

      if (typeof source === 'string') {
        result = await this.loadFromUrl(source);
      } else if (source instanceof File) {
        result = await this.loadFromFile(source);
      } else if (source instanceof Blob) {
        result = await this.loadFromBlob(source);
      } else if (source instanceof ArrayBuffer) {
        result = await this.loadFromArrayBuffer(source);
      } else if (this.isImageData(source)) {
        result = await this.loadFromImageData(source as ImageData);
      } else {
        throw new Error('Unsupported image source type');
      }

      this.emit('load:complete', { result });
      return result;
    } catch (error) {
      this.emit('load:error', { error, source });
      throw error;
    }
  }

  /**
   * Validate image before loading
   */
  public async validateImage(source: File | Blob): Promise<ImageValidationResult> {
    try {
      // Check file size
      if (source.size > ImageLoader.MAX_FILE_SIZE) {
        return {
          isValid: false,
          error: `File size ${this.formatFileSize(source.size)} exceeds maximum allowed size of ${this.formatFileSize(ImageLoader.MAX_FILE_SIZE)}`,
        };
      }

      // Check MIME type
      if (!ImageLoader.SUPPORTED_FORMATS.includes(source.type)) {
        return {
          isValid: false,
          error: `Unsupported image format: ${source.type}. Supported formats: ${ImageLoader.SUPPORTED_FORMATS.join(', ')}`,
        };
      }

      // For images that can be validated without full loading, do quick validation
      if (source instanceof File || source instanceof Blob) {
        const imageInfo = await this.getImageInfo(source);

        if (imageInfo.width && imageInfo.height) {
          if (
            imageInfo.width > ImageLoader.MAX_DIMENSION ||
            imageInfo.height > ImageLoader.MAX_DIMENSION
          ) {
            return {
              isValid: false,
              error: `Image dimensions ${imageInfo.width}x${imageInfo.height} exceed maximum allowed dimensions of ${ImageLoader.MAX_DIMENSION}x${ImageLoader.MAX_DIMENSION}`,
              width: imageInfo.width,
              height: imageInfo.height,
            };
          }
        }

        return {
          isValid: true,
          format: source.type,
          size: source.size,
          width: imageInfo.width,
          height: imageInfo.height,
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Load image from URL with progress tracking
   */
  private async loadFromUrl(url: string): Promise<ImageLoadResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      // Enable CORS if needed
      if (this.isCrossOrigin(url)) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        try {
          const result = this.processLoadedImage(img, 'image/unknown', 0);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image from URL: ${url}`));
      };

      // Track progress for data URLs
      if (url.startsWith('data:')) {
        const base64Data = url.split(',')[1];
        const size = base64Data ? (base64Data.length * 3) / 4 : 0;
        this.emitProgress(size, size);
      }

      img.src = url;
    });
  }

  /**
   * Load image from File with validation and progress
   */
  private async loadFromFile(file: File): Promise<ImageLoadResult> {
    // Validate first
    const validation = await this.validateImage(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      if (this.options.enableProgress) {
        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            this.emitProgress(event.loaded, event.total);
          }
        };
      }

      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          this.loadFromUrl(result)
            .then((imageResult) => {
              resolve({
                ...imageResult,
                format: file.type,
                size: file.size,
              });
            })
            .catch(reject);
        } else {
          reject(new Error('Failed to read file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Load image from Blob
   */
  private async loadFromBlob(blob: Blob): Promise<ImageLoadResult> {
    const validation = await this.validateImage(blob);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const url = URL.createObjectURL(blob);
    try {
      const result = await this.loadFromUrl(url);
      return {
        ...result,
        format: blob.type,
        size: blob.size,
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Load image from ArrayBuffer
   */
  private async loadFromArrayBuffer(buffer: ArrayBuffer): Promise<ImageLoadResult> {
    const blob = new Blob([buffer]);
    return this.loadFromBlob(blob);
  }

  /**
   * Load image from ImageData
   */
  private async loadFromImageData(imageData: ImageData): Promise<ImageLoadResult> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.putImageData(imageData, 0, 0);

      const img = new Image();
      img.onload = () => {
        resolve(this.processLoadedImage(img, 'image/png', 0));
      };

      img.src = canvas.toDataURL('image/png');
    });
  }

  /**
   * Process loaded image and apply optimizations
   */
  private processLoadedImage(img: HTMLImageElement, format: string, size: number): ImageLoadResult {
    const originalWidth = img.naturalWidth || img.width;
    const originalHeight = img.naturalHeight || img.height;

    // Calculate display dimensions with aspect ratio preservation
    const { width: displayWidth, height: displayHeight } = this.calculateDisplayDimensions(
      originalWidth,
      originalHeight,
    );

    // Create optimized image if needed
    if (displayWidth !== originalWidth || displayHeight !== originalHeight) {
      const optimizedImg = this.createOptimizedImage(img, displayWidth, displayHeight);
      return {
        image: optimizedImg,
        originalWidth,
        originalHeight,
        displayWidth,
        displayHeight,
        format,
        size,
      };
    }

    return {
      image: img,
      originalWidth,
      originalHeight,
      displayWidth: originalWidth,
      displayHeight: originalHeight,
      format,
      size,
    };
  }

  /**
   * Calculate optimal display dimensions
   */
  private calculateDisplayDimensions(
    originalWidth: number,
    originalHeight: number,
  ): { width: number; height: number } {
    const { maxWidth = ImageLoader.MAX_DIMENSION, maxHeight = ImageLoader.MAX_DIMENSION } =
      this.options;

    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    if (!this.options.maintainAspectRatio) {
      return {
        width: Math.min(originalWidth, maxWidth),
        height: Math.min(originalHeight, maxHeight),
      };
    }

    const aspectRatio = originalWidth / originalHeight;

    if (originalWidth > maxWidth) {
      const width = maxWidth;
      const height = Math.round(width / aspectRatio);
      if (height <= maxHeight) {
        return { width, height };
      }
    }

    if (originalHeight > maxHeight) {
      const height = maxHeight;
      const width = Math.round(height * aspectRatio);
      return { width, height };
    }

    return { width: originalWidth, height: originalHeight };
  }

  /**
   * Create optimized version of image
   */
  private createOptimizedImage(
    img: HTMLImageElement,
    width: number,
    height: number,
  ): HTMLImageElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context for optimization');
    }

    // Use high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, width, height);

    const optimizedImg = new Image();
    optimizedImg.src = canvas.toDataURL('image/png', this.options.quality);
    return optimizedImg;
  }

  /**
   * Get basic image information without full loading
   */
  private async getImageInfo(source: File | Blob): Promise<{ width?: number; height?: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(source);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({});
      };

      img.src = url;
    });
  }

  /**
   * Check if URL is cross-origin
   */
  private isCrossOrigin(url: string): boolean {
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return false;
    }

    try {
      const urlObj = new URL(url, window.location.href);
      return urlObj.origin !== window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Emit progress event
   */
  private emitProgress(loaded: number, total: number): void {
    if (this.options.enableProgress) {
      const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
      this.emit('load:progress', {
        loaded,
        total,
        percentage,
      } as ImageLoadProgress);
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Get supported formats
   */
  public static getSupportedFormats(): string[] {
    return [...ImageLoader.SUPPORTED_FORMATS];
  }
  /**
   * Check if format is supported
   */
  public static isFormatSupported(mimeType: string): boolean {
    return ImageLoader.SUPPORTED_FORMATS.includes(mimeType);
  }

  /**
   * Check if source is ImageData (safe for environments without ImageData)
   */
  private isImageData(source: any): boolean {
    if (typeof ImageData === 'undefined') {
      return false;
    }
    return source instanceof ImageData;
  }
}
