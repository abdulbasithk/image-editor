import {
  ImageLoader,
  ImageLoadOptions,
  ImageLoadResult,
  ImageValidationResult,
} from '../../src/core/ImageLoader';
import {
  createMockCanvas,
  createMockDataTransfer,
  createMockFile,
  createMockImage,
} from '../utils/test-helpers';

// Mock HTMLCanvasElement and related APIs
global.HTMLCanvasElement = jest.fn(() => createMockCanvas()) as any;
global.HTMLImageElement = jest.fn(() => createMockImage()) as any;
global.URL = {
  createObjectURL: jest.fn(() => 'mock-object-url'),
  revokeObjectURL: jest.fn(),
} as any;

// Mock DragEvent and DataTransfer for drag and drop tests
(global as any).DragEvent = class MockDragEvent extends Event {
  dataTransfer: any;
  constructor(type: string, eventInitDict?: any) {
    super(type);
    this.dataTransfer = eventInitDict?.dataTransfer || createMockDataTransfer();
  }
};

(global as any).DataTransfer = class MockDataTransfer {
  files: FileList;
  items: any;
  constructor() {
    this.files = [] as any;
    this.items = {
      add: jest.fn(),
      clear: jest.fn(),
      length: 0,
    };
  }
};

// Mock ImageData
(global as any).ImageData = class MockImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
} as any;

describe('ImageLoader', () => {
  let imageLoader: ImageLoader;
  let mockOptions: ImageLoadOptions;

  beforeEach(() => {
    mockOptions = {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 0.9,
      maintainAspectRatio: true,
      enableProgress: true,
    };
    imageLoader = new ImageLoader(mockOptions);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default options when none provided', () => {
      const loader = new ImageLoader();
      expect(loader).toBeInstanceOf(ImageLoader);
    });

    it('should initialize with provided options', () => {
      const loader = new ImageLoader(mockOptions);
      expect(loader).toBeInstanceOf(ImageLoader);
    });

    it('should handle options with maintainAspectRatio explicitly set to false', () => {
      const options = { ...mockOptions, maintainAspectRatio: false };
      const loader = new ImageLoader(options);
      expect(loader).toBeInstanceOf(ImageLoader);
    });

    it('should handle options with enableProgress explicitly set to false', () => {
      const options = { ...mockOptions, enableProgress: false };
      const loader = new ImageLoader(options);
      expect(loader).toBeInstanceOf(ImageLoader);
    });

    it('should merge provided options with defaults', () => {
      const options = { quality: 0.8 };
      const loader = new ImageLoader(options);
      expect(loader).toBeInstanceOf(ImageLoader);
    });
  });
  describe('validateImage', () => {
    it('should validate a valid image file', async () => {
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);

      // Mock getImageInfo to return quick dimensions
      jest.spyOn(imageLoader as any, 'getImageInfo').mockResolvedValue({
        width: 800,
        height: 600,
      });

      const result: ImageValidationResult = await imageLoader.validateImage(mockFile);

      expect(result.isValid).toBe(true);
      expect(result.format).toBe('image/jpeg');
      expect(result.size).toBe(1024);
    });

    it('should reject oversized files', async () => {
      const oversizedFile = createMockFile('big.jpg', 'image/jpeg', 60 * 1024 * 1024); // 60MB

      const result: ImageValidationResult = await imageLoader.validateImage(oversizedFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should reject unsupported formats', async () => {
      const unsupportedFile = createMockFile('test.tiff', 'image/tiff', 1024);

      const result: ImageValidationResult = await imageLoader.validateImage(unsupportedFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported image format');
    });
    it('should reject images with excessive dimensions', async () => {
      const mockFile = createMockFile('huge.jpg', 'image/jpeg', 1024);

      // Mock getImageInfo to return large dimensions
      jest.spyOn(imageLoader as any, 'getImageInfo').mockResolvedValue({
        width: 10000,
        height: 10000,
      });

      const result: ImageValidationResult = await imageLoader.validateImage(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceed maximum allowed dimensions');
    });

    it('should handle validation errors gracefully', async () => {
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);

      // Mock getImageInfo to throw an error
      jest.spyOn(imageLoader as any, 'getImageInfo').mockRejectedValue(new Error('Network error'));

      const result: ImageValidationResult = await imageLoader.validateImage(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Validation failed: Network error');
    });

    it('should handle unknown validation errors', async () => {
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);

      // Mock getImageInfo to throw a non-Error object
      jest.spyOn(imageLoader as any, 'getImageInfo').mockRejectedValue('string error');

      const result: ImageValidationResult = await imageLoader.validateImage(mockFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Validation failed: Unknown error');
    });
  });

  describe('loadImage', () => {
    beforeEach(() => {
      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any,
        onprogress: null as any,
        result: 'data:image/jpeg;base64,mock-data',
      };
      global.FileReader = jest.fn(() => mockFileReader) as any;
    });

    it('should load image from URL', async () => {
      const url = 'https://example.com/image.jpg';

      // Mock loadFromUrl
      const mockResult: ImageLoadResult = {
        image: createMockImage(),
        originalWidth: 800,
        originalHeight: 600,
        displayWidth: 800,
        displayHeight: 600,
        format: 'image/jpeg',
        size: 1024,
      };

      const loadFromUrlSpy = jest
        .spyOn(imageLoader as any, 'loadFromUrl')
        .mockResolvedValue(mockResult);

      const result = await imageLoader.loadImage(url);

      expect(loadFromUrlSpy).toHaveBeenCalledWith(url);
      expect(result).toEqual(mockResult);
    });

    it('should load image from File', async () => {
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);

      const mockResult: ImageLoadResult = {
        image: createMockImage(),
        originalWidth: 800,
        originalHeight: 600,
        displayWidth: 800,
        displayHeight: 600,
        format: 'image/jpeg',
        size: 1024,
      };

      const loadFromFileSpy = jest
        .spyOn(imageLoader as any, 'loadFromFile')
        .mockResolvedValue(mockResult);

      const result = await imageLoader.loadImage(mockFile);

      expect(loadFromFileSpy).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(mockResult);
    });

    it('should load image from Blob', async () => {
      const mockBlob = new Blob(['mock data'], { type: 'image/jpeg' });

      const mockResult: ImageLoadResult = {
        image: createMockImage(),
        originalWidth: 800,
        originalHeight: 600,
        displayWidth: 800,
        displayHeight: 600,
        format: 'image/jpeg',
        size: 1024,
      };

      const loadFromBlobSpy = jest
        .spyOn(imageLoader as any, 'loadFromBlob')
        .mockResolvedValue(mockResult);

      const result = await imageLoader.loadImage(mockBlob);

      expect(loadFromBlobSpy).toHaveBeenCalledWith(mockBlob);
      expect(result).toEqual(mockResult);
    });

    it('should emit events during loading', async () => {
      const url = 'https://example.com/image.jpg';
      const loadStartSpy = jest.fn();
      const loadCompleteSpy = jest.fn();

      imageLoader.on('load:start', loadStartSpy);
      imageLoader.on('load:complete', loadCompleteSpy);

      // Mock successful loading
      jest.spyOn(imageLoader as any, 'loadFromUrl').mockResolvedValue({
        image: createMockImage(),
        originalWidth: 800,
        originalHeight: 600,
        displayWidth: 800,
        displayHeight: 600,
        format: 'image/jpeg',
        size: 1024,
      });

      await imageLoader.loadImage(url);

      expect(loadStartSpy).toHaveBeenCalledWith({ source: url });
      expect(loadCompleteSpy).toHaveBeenCalled();
    });

    it('should emit error event on loading failure', async () => {
      const url = 'https://example.com/nonexistent.jpg';
      const loadErrorSpy = jest.fn();

      imageLoader.on('load:error', loadErrorSpy);

      // Mock failed loading
      const mockError = new Error('Failed to load image');
      jest.spyOn(imageLoader as any, 'loadFromUrl').mockRejectedValue(mockError);

      await expect(imageLoader.loadImage(url)).rejects.toThrow('Failed to load image');
      expect(loadErrorSpy).toHaveBeenCalledWith({
        error: mockError,
        source: url,
      });
    });
    it('should throw error for unsupported source type', async () => {
      // Use a plain object that doesn't match any supported types
      const unsupportedSource = { invalid: 'source' } as any;

      await expect(imageLoader.loadImage(unsupportedSource)).rejects.toThrow(
        'Unsupported image source type',
      );
    });

    it('should load image from ArrayBuffer', async () => {
      const arrayBuffer = new ArrayBuffer(1024);

      const mockResult: ImageLoadResult = {
        image: createMockImage(),
        originalWidth: 800,
        originalHeight: 600,
        displayWidth: 800,
        displayHeight: 600,
        format: 'application/octet-stream',
        size: 1024,
      };

      const loadFromArrayBufferSpy = jest
        .spyOn(imageLoader as any, 'loadFromArrayBuffer')
        .mockResolvedValue(mockResult);

      const result = await imageLoader.loadImage(arrayBuffer);

      expect(loadFromArrayBufferSpy).toHaveBeenCalledWith(arrayBuffer);
      expect(result).toEqual(mockResult);
    });

    it('should load image from ImageData', async () => {
      const imageData = new (global as any).ImageData(100, 100);

      const mockResult: ImageLoadResult = {
        image: createMockImage(),
        originalWidth: 100,
        originalHeight: 100,
        displayWidth: 100,
        displayHeight: 100,
        format: 'image/png',
        size: 0,
      };

      const loadFromImageDataSpy = jest
        .spyOn(imageLoader as any, 'loadFromImageData')
        .mockResolvedValue(mockResult);

      const result = await imageLoader.loadImage(imageData);

      expect(loadFromImageDataSpy).toHaveBeenCalledWith(imageData);
      expect(result).toEqual(mockResult);
    });
  });

  describe('static methods', () => {
    it('should return supported formats', () => {
      const formats = ImageLoader.getSupportedFormats();
      expect(formats).toContain('image/jpeg');
      expect(formats).toContain('image/png');
      expect(formats).toContain('image/webp');
      expect(formats).toContain('image/gif');
    });

    it('should check if format is supported', () => {
      expect(ImageLoader.isFormatSupported('image/jpeg')).toBe(true);
      expect(ImageLoader.isFormatSupported('image/png')).toBe(true);
      expect(ImageLoader.isFormatSupported('image/tiff')).toBe(false);
      expect(ImageLoader.isFormatSupported('text/plain')).toBe(false);
    });
  });

  describe('dimension calculation', () => {
    it('should maintain aspect ratio when resizing', () => {
      const loader = new ImageLoader({ maxWidth: 400, maxHeight: 400, maintainAspectRatio: true });

      // Test landscape image (800x600)
      const landscapeResult = (loader as any).calculateDisplayDimensions(800, 600);
      expect(landscapeResult.width).toBe(400);
      expect(landscapeResult.height).toBe(300);

      // Test portrait image (600x800)
      const portraitResult = (loader as any).calculateDisplayDimensions(600, 800);
      expect(portraitResult.width).toBe(300);
      expect(portraitResult.height).toBe(400);
    });

    it('should not maintain aspect ratio when disabled', () => {
      const loader = new ImageLoader({ maxWidth: 400, maxHeight: 400, maintainAspectRatio: false });

      const result = (loader as any).calculateDisplayDimensions(800, 600);
      expect(result.width).toBe(400);
      expect(result.height).toBe(400);
    });

    it('should not resize if image fits within limits', () => {
      const loader = new ImageLoader({ maxWidth: 1000, maxHeight: 1000 });

      const result = (loader as any).calculateDisplayDimensions(800, 600);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should handle aspect ratio calculation for height constraint', () => {
      const loader = new ImageLoader({ maxWidth: 1000, maxHeight: 400, maintainAspectRatio: true });

      // Test very wide image that would exceed height when width-constrained
      const result = (loader as any).calculateDisplayDimensions(1200, 800);
      expect(result.width).toBe(600); // 400 * 1.5 aspect ratio
      expect(result.height).toBe(400);
    });

    it('should handle edge case with very tall images', () => {
      const loader = new ImageLoader({ maxWidth: 400, maxHeight: 1000, maintainAspectRatio: true });

      // Test very tall image
      const result = (loader as any).calculateDisplayDimensions(300, 1200);
      expect(result.width).toBe(250); // 1000 / 4 aspect ratio
      expect(result.height).toBe(1000);
    });

    it('should handle case where width constraint is met but height needs further reduction', () => {
      const loader = new ImageLoader({ maxWidth: 400, maxHeight: 200, maintainAspectRatio: true });

      // Test image where width-based scaling would exceed height limit
      const result = (loader as any).calculateDisplayDimensions(800, 500);
      // Width constraint would give us 400x250, but height limit forces 320x200
      expect(result.width).toBe(320);
      expect(result.height).toBe(200);
    });
  });

  describe('progress tracking', () => {
    it('should emit progress events when enabled', () => {
      const loader = new ImageLoader({ enableProgress: true });
      const progressSpy = jest.fn();

      loader.on('load:progress', progressSpy);

      // Simulate progress
      (loader as any).emitProgress(500, 1000);

      expect(progressSpy).toHaveBeenCalledWith({
        loaded: 500,
        total: 1000,
        percentage: 50,
      });
    });

    it('should not emit progress events when disabled', () => {
      const loader = new ImageLoader({ enableProgress: false });
      const progressSpy = jest.fn();

      loader.on('load:progress', progressSpy);

      // Simulate progress
      (loader as any).emitProgress(500, 1000);

      expect(progressSpy).not.toHaveBeenCalled();
    });

    it('should handle zero total correctly', () => {
      const loader = new ImageLoader({ enableProgress: true });
      const progressSpy = jest.fn();

      loader.on('load:progress', progressSpy);

      // Simulate progress with zero total
      (loader as any).emitProgress(0, 0);

      expect(progressSpy).toHaveBeenCalledWith({
        loaded: 0,
        total: 0,
        percentage: 0,
      });
    });
  });

  describe('URL handling', () => {
    it('should detect data URLs as not cross-origin', () => {
      const loader = new ImageLoader();
      expect((loader as any).isCrossOrigin('data:image/jpeg;base64,abc')).toBe(false);
    });

    it('should detect blob URLs as not cross-origin', () => {
      const loader = new ImageLoader();
      expect((loader as any).isCrossOrigin('blob:https://example.com/abc')).toBe(false);
    });
  });

  describe('private method coverage', () => {
    let mockImg: any;
    let mockCanvas: any;

    beforeEach(() => {
      mockImg = createMockImage();
      mockCanvas = createMockCanvas();

      // Mock HTMLImageElement constructor
      global.HTMLImageElement = jest.fn(() => mockImg) as any;

      // Mock document.createElement with a fallback
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn((tagName) => {
        if (tagName === 'canvas') return mockCanvas;
        if (tagName === 'img') return mockImg;
        return originalCreateElement.call(document, tagName);
      }) as any;
    });

    it('should handle loadFromUrl with cross-origin URLs', async () => {
      const loader = new ImageLoader();
      jest.spyOn(loader as any, 'isCrossOrigin').mockReturnValue(true);

      // Mock image load success
      const loadPromise = (loader as any).loadFromUrl('https://other.com/image.jpg');

      // Simulate successful image load
      setTimeout(() => {
        mockImg.onload();
      }, 0);

      const result = await loadPromise;
      expect(mockImg.crossOrigin).toBe('anonymous');
      expect(result).toBeDefined();
    });

    it('should handle loadFromUrl with data URLs and progress tracking', async () => {
      const loader = new ImageLoader({ enableProgress: true });
      const progressSpy = jest.fn();
      loader.on('load:progress', progressSpy);

      const dataUrl =
        'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      // Mock image load success
      const loadPromise = (loader as any).loadFromUrl(dataUrl);

      // Simulate successful image load
      setTimeout(() => {
        mockImg.onload();
      }, 0);

      const result = await loadPromise;
      expect(progressSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle loadFromUrl error', async () => {
      const loader = new ImageLoader();

      // Mock image load error
      const loadPromise = (loader as any).loadFromUrl('https://example.com/invalid.jpg');

      // Simulate image load error
      setTimeout(() => {
        mockImg.onerror();
      }, 0);

      await expect(loadPromise).rejects.toThrow('Failed to load image from URL');
    });

    it('should handle processLoadedImage error during optimization', () => {
      const loader = new ImageLoader({ maxWidth: 400, maxHeight: 300 });

      // Mock image that needs optimization
      mockImg.naturalWidth = 2000;
      mockImg.naturalHeight = 1500;
      mockImg.width = 2000;
      mockImg.height = 1500;

      // Mock canvas getContext to return null to cause optimization failure
      const mockCanvasForOptimization = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => null), // This will cause the error
      };

      // Override document.createElement for this test to return the failing canvas
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn((tagName) => {
        if (tagName === 'canvas') return mockCanvasForOptimization as any;
        if (tagName === 'img') return mockImg;
        return originalCreateElement.call(document, tagName);
      }) as any;

      try {
        expect(() => {
          (loader as any).processLoadedImage(mockImg, 'image/jpeg', 1024);
        }).toThrow('Failed to get canvas context for optimization');
      } finally {
        // Restore original createElement
        document.createElement = originalCreateElement;
      }
    });

    it('should handle loadFromFile with FileReader error', async () => {
      const loader = new ImageLoader();
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);

      // Mock validateImage to pass
      jest.spyOn(loader, 'validateImage').mockResolvedValue({ isValid: true });

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any,
        onprogress: null as any,
        result: null,
      };
      global.FileReader = jest.fn(() => mockFileReader) as any;

      const loadPromise = (loader as any).loadFromFile(mockFile);

      // Simulate FileReader error
      setTimeout(() => {
        if (mockFileReader.onerror) {
          mockFileReader.onerror();
        }
      }, 0);

      await expect(loadPromise).rejects.toThrow('Failed to read file');
    });

    it('should handle loadFromFile with invalid result type', async () => {
      const loader = new ImageLoader();
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);

      // Mock validateImage to pass
      jest.spyOn(loader, 'validateImage').mockResolvedValue({ isValid: true });

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any,
        onprogress: null as any,
        result: new ArrayBuffer(10), // Non-string result
      };
      global.FileReader = jest.fn(() => mockFileReader) as any;

      const loadPromise = (loader as any).loadFromFile(mockFile);

      // Simulate FileReader load with non-string result
      setTimeout(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: new ArrayBuffer(10) } });
        }
      }, 0);

      await expect(loadPromise).rejects.toThrow('Failed to read file');
    });

    it('should handle loadFromFile progress tracking', async () => {
      const loader = new ImageLoader({ enableProgress: true });
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
      const progressSpy = jest.fn();

      loader.on('load:progress', progressSpy);

      // Mock validateImage to pass
      jest.spyOn(loader, 'validateImage').mockResolvedValue({ isValid: true });

      // Mock loadFromUrl to resolve
      jest.spyOn(loader as any, 'loadFromUrl').mockResolvedValue({
        image: mockImg,
        originalWidth: 800,
        originalHeight: 600,
        displayWidth: 800,
        displayHeight: 600,
        format: 'image/unknown',
        size: 0,
      });

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any,
        onprogress: null as any,
        result: 'data:image/jpeg;base64,mock-data',
      };
      global.FileReader = jest.fn(() => mockFileReader) as any;

      const loadPromise = (loader as any).loadFromFile(mockFile);

      // Simulate FileReader progress
      setTimeout(() => {
        if (mockFileReader.onprogress) {
          mockFileReader.onprogress({ lengthComputable: true, loaded: 500, total: 1024 });
        }
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,mock-data' } });
        }
      }, 0);

      const result = await loadPromise;
      expect(progressSpy).toHaveBeenCalledWith({
        loaded: 500,
        total: 1024,
        percentage: 49, // Math.round(500/1024 * 100)
      });
      expect(result.format).toBe('image/jpeg');
      expect(result.size).toBe(1024);
    });

    it('should handle loadFromImageData with canvas context failure', async () => {
      const loader = new ImageLoader();
      const imageData = new (global as any).ImageData(100, 100);

      // Mock canvas getContext to return null
      mockCanvas.getContext = jest.fn(() => null);

      await expect((loader as any).loadFromImageData(imageData)).rejects.toThrow(
        'Failed to get canvas context',
      );
    });

    it('should handle createOptimizedImage with canvas context failure', () => {
      const loader = new ImageLoader();

      // Mock canvas getContext to return null
      mockCanvas.getContext = jest.fn(() => null);

      expect(() => {
        (loader as any).createOptimizedImage(mockImg, 400, 300);
      }).toThrow('Failed to get canvas context for optimization');
    });

    it('should handle getImageInfo with load error', async () => {
      const loader = new ImageLoader();
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);

      // Mock URL methods
      const mockUrl = 'mock-object-url';
      global.URL.createObjectURL = jest.fn(() => mockUrl);
      global.URL.revokeObjectURL = jest.fn();

      const infoPromise = (loader as any).getImageInfo(mockFile);

      // Simulate image load error
      setTimeout(() => {
        if (mockImg.onerror) {
          mockImg.onerror();
        }
      }, 0);

      const result = await infoPromise;
      expect(result).toEqual({});
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });

    it('should format file sizes correctly', () => {
      const loader = new ImageLoader();

      expect((loader as any).formatFileSize(512)).toBe('512.0 B');
      expect((loader as any).formatFileSize(1536)).toBe('1.5 KB'); // 1536 / 1024
      expect((loader as any).formatFileSize(1048576)).toBe('1.0 MB');
      expect((loader as any).formatFileSize(1073741824)).toBe('1.0 GB');
    });

    it('should handle isImageData when ImageData is undefined', () => {
      const loader = new ImageLoader();

      // Temporarily undefine ImageData
      const originalImageData = global.ImageData;
      delete (global as any).ImageData;

      expect((loader as any).isImageData({})).toBe(false);

      // Restore ImageData
      (global as any).ImageData = originalImageData;
    });

    it('should handle loadFromUrl with processLoadedImage error', async () => {
      const loader = new ImageLoader();

      // Mock processLoadedImage to throw an error
      jest.spyOn(loader as any, 'processLoadedImage').mockImplementation(() => {
        throw new Error('Processing failed');
      });

      const loadPromise = (loader as any).loadFromUrl('https://example.com/image.jpg');

      // Simulate successful image load
      setTimeout(() => {
        if (mockImg.onload) {
          mockImg.onload();
        }
      }, 0);

      await expect(loadPromise).rejects.toThrow('Processing failed');
    });

    it('should handle data URL without base64 data', async () => {
      const loader = new ImageLoader({ enableProgress: true });
      const progressSpy = jest.fn();
      loader.on('load:progress', progressSpy);

      const dataUrl = 'data:image/jpeg,'; // No base64 data after comma

      const loadPromise = (loader as any).loadFromUrl(dataUrl);

      // Simulate successful image load
      setTimeout(() => {
        if (mockImg.onload) {
          mockImg.onload();
        }
      }, 0);

      const result = await loadPromise;
      expect(progressSpy).toHaveBeenCalledWith({
        loaded: 0,
        total: 0,
        percentage: 0,
      });
      expect(result).toBeDefined();
    });

    it('should handle getImageInfo successful load', async () => {
      const loader = new ImageLoader();
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);

      // Mock URL methods
      const mockUrl = 'mock-object-url';
      global.URL.createObjectURL = jest.fn(() => mockUrl);
      global.URL.revokeObjectURL = jest.fn();

      // Set up mock image dimensions
      mockImg.naturalWidth = 800;
      mockImg.naturalHeight = 600;
      mockImg.width = 800;
      mockImg.height = 600;

      const infoPromise = (loader as any).getImageInfo(mockFile);

      // Simulate successful image load
      setTimeout(() => {
        if (mockImg.onload) {
          mockImg.onload();
        }
      }, 0);

      const result = await infoPromise;
      expect(result).toEqual({
        width: 800,
        height: 600,
      });
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });

    it('should handle loadFromFile validation failure', async () => {
      const loader = new ImageLoader();
      const mockFile = createMockFile('test.txt', 'text/plain', 1024);

      // Don't mock validateImage - let it run naturally to fail
      await expect((loader as any).loadFromFile(mockFile)).rejects.toThrow(
        'Unsupported image format',
      );
    });

    it('should handle loadFromBlob validation failure', async () => {
      const loader = new ImageLoader();
      const mockBlob = new Blob(['data'], { type: 'text/plain' });

      // Don't mock validateImage - let it run naturally to fail
      await expect((loader as any).loadFromBlob(mockBlob)).rejects.toThrow(
        'Unsupported image format',
      );
    });

    it('should handle FileReader progress with non-computable length', async () => {
      const loader = new ImageLoader({ enableProgress: true });
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
      const progressSpy = jest.fn();

      loader.on('load:progress', progressSpy);

      // Mock validateImage to pass
      jest.spyOn(loader, 'validateImage').mockResolvedValue({ isValid: true });

      // Mock loadFromUrl to resolve
      jest.spyOn(loader as any, 'loadFromUrl').mockResolvedValue({
        image: mockImg,
        originalWidth: 800,
        originalHeight: 600,
        displayWidth: 800,
        displayHeight: 600,
        format: 'image/unknown',
        size: 0,
      });

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        onerror: null as any,
        onprogress: null as any,
        result: 'data:image/jpeg;base64,mock-data',
      };
      global.FileReader = jest.fn(() => mockFileReader) as any;

      const loadPromise = (loader as any).loadFromFile(mockFile);

      // Simulate FileReader progress with non-computable length
      setTimeout(() => {
        if (mockFileReader.onprogress) {
          mockFileReader.onprogress({ lengthComputable: false, loaded: 500, total: 1024 });
        }
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: 'data:image/jpeg;base64,mock-data' } });
        }
      }, 0);

      const result = await loadPromise;
      // Progress should not be emitted for non-computable length
      expect(progressSpy).not.toHaveBeenCalled();
      expect(result.format).toBe('image/jpeg');
      expect(result.size).toBe(1024);
    });
  });
});
