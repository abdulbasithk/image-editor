import {
  ImageLoader,
  ImageLoadOptions,
  ImageLoadResult,
  ImageValidationResult,
} from '../../src/core/ImageLoader';
import { ImageEditor } from '../../src/core/ImageEditor';
import {
  createMockCanvas,
  createMockFile,
  createMockImage,
  createMockDataTransfer,
  nextTick,
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
  });
});

describe('ImageEditor with ImageLoader integration', () => {
  let imageEditor: ImageEditor;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    imageEditor = new ImageEditor({
      container,
      width: 800,
      height: 600,
      enableDragDrop: true,
      enableLoadingProgress: true,
    });
  });

  afterEach(() => {
    imageEditor.destroy();
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  describe('image loading integration', () => {
    it('should load image through ImageEditor', async () => {
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
      const loadedSpy = jest.fn();

      imageEditor.on('image:loaded', loadedSpy);

      // Mock the ImageLoader.loadImage method
      const mockResult: ImageLoadResult = {
        image: createMockImage(),
        originalWidth: 800,
        originalHeight: 600,
        displayWidth: 800,
        displayHeight: 600,
        format: 'image/jpeg',
        size: 1024,
      };

      jest.spyOn(imageEditor.getImageLoader(), 'loadImage').mockResolvedValue(mockResult);

      // Mock the canvas manager's drawImage to avoid JSDOM issues
      jest.spyOn(imageEditor.getCanvasManager(), 'drawImage').mockImplementation(() => {});

      // Mock the canvas manager's resize method
      jest.spyOn(imageEditor.getCanvasManager(), 'resize').mockImplementation(() => {});

      await imageEditor.loadImage(mockFile);

      expect(loadedSpy).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        displayWidth: 800,
        displayHeight: 600,
        format: 'image/jpeg',
        size: 1024,
        source: mockFile,
      });
    });
    it('should validate image before loading', async () => {
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);

      // Mock the ImageLoader validation method
      jest.spyOn(imageEditor.getImageLoader(), 'validateImage').mockResolvedValue({
        isValid: true,
        format: 'image/jpeg',
        size: 1024,
      });

      const result = await imageEditor.validateImage(mockFile);

      expect(result.isValid).toBe(true);
    });

    it('should handle image loading errors', async () => {
      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
      const errorSpy = jest.fn();

      imageEditor.on('image:error', errorSpy);

      const mockError = new Error('Failed to load image');
      jest.spyOn(imageEditor.getImageLoader(), 'loadImage').mockRejectedValue(mockError);

      await expect(imageEditor.loadImage(mockFile)).rejects.toThrow('Failed to load image');
      expect(errorSpy).toHaveBeenCalledWith({
        error: mockError,
        source: mockFile,
      });
    });
  });
  describe('drag and drop functionality', () => {
    let canvas: HTMLCanvasElement;

    beforeEach(() => {
      canvas = imageEditor.getCanvasManager().getCanvas();
      // Mock the classList methods
      canvas.classList.add = jest.fn();
      canvas.classList.remove = jest.fn();
      canvas.classList.contains = jest.fn(() => false);
    });
    it('should handle drag enter events', () => {
      const enterSpy = jest.fn();
      imageEditor.on('dragdrop:enter', enterSpy);

      const dragEvent = new (global as any).DragEvent('dragenter', {
        dataTransfer: createMockDataTransfer(),
      });

      canvas.dispatchEvent(dragEvent);

      expect(enterSpy).toHaveBeenCalled();
      expect(canvas.classList.add).toHaveBeenCalledWith('drag-over');
    });
    it('should handle drag leave events', () => {
      const leaveSpy = jest.fn();
      imageEditor.on('dragdrop:leave', leaveSpy);

      // First trigger drag enter
      canvas.dispatchEvent(new (global as any).DragEvent('dragenter'));

      // Then trigger drag leave
      const dragEvent = new (global as any).DragEvent('dragleave');
      canvas.dispatchEvent(dragEvent);

      expect(leaveSpy).toHaveBeenCalled();
      expect(canvas.classList.remove).toHaveBeenCalledWith('drag-over');
    });
    it('should handle successful file drop', async () => {
      const dropSpy = jest.fn();
      const successSpy = jest.fn();

      imageEditor.on('dragdrop:drop', dropSpy);
      imageEditor.on('dragdrop:success', successSpy);

      // Mock successful image loading
      jest.spyOn(imageEditor, 'loadImage').mockResolvedValue();

      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
      const mockDataTransfer = createMockDataTransfer([mockFile]);

      const dropEvent = new (global as any).DragEvent('drop', {
        dataTransfer: mockDataTransfer,
      });

      canvas.dispatchEvent(dropEvent);

      // Wait for async operations
      await nextTick();

      expect(dropSpy).toHaveBeenCalledWith({ file: mockFile });
      expect(successSpy).toHaveBeenCalledWith({ file: mockFile });
    });
    it('should handle drop errors for non-image files', async () => {
      const errorSpy = jest.fn();
      imageEditor.on('dragdrop:error', errorSpy);

      const mockFile = createMockFile('test.txt', 'text/plain', 1024);
      const mockDataTransfer = createMockDataTransfer([mockFile]);

      const dropEvent = new (global as any).DragEvent('drop', {
        dataTransfer: mockDataTransfer,
      });

      canvas.dispatchEvent(dropEvent);

      // Wait for async operations
      await nextTick();

      expect(errorSpy).toHaveBeenCalledWith({
        error: 'Dropped file is not an image',
        file: mockFile,
      });
    });
    it('should handle drop errors when no files are dropped', async () => {
      const errorSpy = jest.fn();
      imageEditor.on('dragdrop:error', errorSpy);

      const mockDataTransfer = createMockDataTransfer();
      const dropEvent = new (global as any).DragEvent('drop', {
        dataTransfer: mockDataTransfer,
      });

      canvas.dispatchEvent(dropEvent);

      // Wait for async operations
      await nextTick();

      expect(errorSpy).toHaveBeenCalledWith({
        error: 'No files dropped',
      });
    });

    it('should enable/disable drag and drop', () => {
      // Test that drag and drop is initially enabled
      expect((imageEditor as any).dragDropEnabled).toBe(true);

      // Disable drag and drop
      imageEditor.setDragDropEnabled(false);
      expect((imageEditor as any).dragDropEnabled).toBe(false);

      // Re-enable drag and drop
      imageEditor.setDragDropEnabled(true);
      expect((imageEditor as any).dragDropEnabled).toBe(true);
    });
  });

  describe('progress events', () => {
    it('should forward progress events from ImageLoader', () => {
      const progressSpy = jest.fn();
      imageEditor.on('image:progress', progressSpy);

      // Simulate progress event from ImageLoader
      imageEditor.getImageLoader().emit('load:progress', {
        loaded: 500,
        total: 1000,
        percentage: 50,
      });

      expect(progressSpy).toHaveBeenCalledWith({
        loaded: 500,
        total: 1000,
        percentage: 50,
      });
    });
  });
});
