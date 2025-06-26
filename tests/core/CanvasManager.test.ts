import { CanvasManager } from '../../src/core/CanvasManager';
import { Layer, Viewport } from '../../src/types';

describe('CanvasManager', () => {
  let canvasManager: CanvasManager;
  let mockContainer: HTMLElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock context
    mockContext = {
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      getImageData: jest.fn().mockReturnValue(new ImageData(800, 600)),
      putImageData: jest.fn(),
    } as any;

    // Mock canvas getContext to return our mock
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext);

    // Create a real DOM container element with mocked methods
    mockContainer = document.createElement('div');
    Object.defineProperty(mockContainer, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(mockContainer, 'clientHeight', { value: 600, configurable: true });

    // Mock appendChild to track calls
    mockContainer.appendChild = jest.fn().mockImplementation((child) => {
      // Still actually append the child for contains() to work
      HTMLElement.prototype.appendChild.call(mockContainer, child);
      return child;
    });

    canvasManager = new CanvasManager(mockContainer, 800, 600);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create canvas with default parameters', () => {
      const actualCanvas = canvasManager.getCanvas();
      expect(actualCanvas.width).toBe(800);
      expect(actualCanvas.height).toBe(600);
      expect(mockContainer.contains(actualCanvas)).toBe(true);
    });

    it('should use existing canvas when provided', () => {
      const existingCanvas = document.createElement('canvas');
      existingCanvas.width = 400;
      existingCanvas.height = 300;

      const _manager = new CanvasManager(mockContainer, 800, 600, existingCanvas);

      expect(existingCanvas.width).toBe(800);
      expect(existingCanvas.height).toBe(600);
    });

    it('should add existing canvas to container if not already contained', () => {
      const existingCanvas = document.createElement('canvas');
      mockContainer.contains = jest.fn().mockReturnValue(false);

      new CanvasManager(mockContainer, 800, 600, existingCanvas);

      expect(mockContainer.appendChild).toHaveBeenCalledWith(existingCanvas);
    });

    it('should not add existing canvas to container if already contained', () => {
      const existingCanvas = document.createElement('canvas');
      mockContainer.contains = jest.fn().mockReturnValue(true);
      jest.clearAllMocks(); // Clear appendChild calls from other tests

      new CanvasManager(mockContainer, 800, 600, existingCanvas);

      expect(mockContainer.appendChild).not.toHaveBeenCalled();
    });

    it('should throw error when 2D context is not supported', () => {
      // Mock a canvas element that doesn't support 2D context
      jest.spyOn(document, 'createElement').mockImplementationOnce(() => {
        const canvas = document.createElement('canvas');
        canvas.getContext = jest.fn().mockReturnValue(null);
        return canvas;
      });

      expect(() => new CanvasManager(mockContainer, 800, 600)).toThrow('2D context not supported');
    });
  });

  describe('resize', () => {
    it('should update canvas and viewport dimensions', () => {
      canvasManager.resize(1024, 768);

      const actualCanvas = canvasManager.getCanvas();
      const viewport = canvasManager.getViewport();
      expect(viewport.width).toBe(1024);
      expect(viewport.height).toBe(768);
      expect(actualCanvas.width).toBe(1024);
      expect(actualCanvas.height).toBe(768);
    });
  });

  describe('clear', () => {
    it('should clear the entire canvas', () => {
      canvasManager.clear();

      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });
  });

  describe('render', () => {
    it('should call render method without errors', () => {
      expect(() => canvasManager.render()).not.toThrow();
    });
  });

  describe('layer management', () => {
    const mockLayer: Layer = {
      id: 'layer1',
      visible: true,
    };

    it('should add layer', () => {
      canvasManager.addLayer(mockLayer);
      // Verify layer was added (we can't directly access layers, but can test through behavior)
      expect(() => canvasManager.addLayer(mockLayer)).not.toThrow();
    });

    it('should remove layer by id', () => {
      canvasManager.addLayer(mockLayer);
      canvasManager.removeLayer('layer1');
      // No direct way to verify, but ensure no errors
      expect(() => canvasManager.removeLayer('layer1')).not.toThrow();
    });

    it('should handle removing non-existent layer', () => {
      expect(() => canvasManager.removeLayer('nonexistent')).not.toThrow();
    });

    it('should move layer to new index', () => {
      const layer1: Layer = { id: 'layer1', visible: true };
      const layer2: Layer = { id: 'layer2', visible: true };

      canvasManager.addLayer(layer1);
      canvasManager.addLayer(layer2);

      expect(() => canvasManager.moveLayer('layer1', 1)).not.toThrow();
    });

    it('should handle moving non-existent layer', () => {
      expect(() => canvasManager.moveLayer('nonexistent', 0)).not.toThrow();
    });

    it('should handle moving layer when layer is undefined', () => {
      // Create a scenario where findIndex returns -1 but layer becomes undefined
      const layer: Layer = { id: 'test', visible: true };
      canvasManager.addLayer(layer);

      // This should not throw even in edge cases
      expect(() => canvasManager.moveLayer('test', 10)).not.toThrow();
    });
  });

  describe('coordinate system', () => {
    it('should convert screen coordinates to canvas coordinates', () => {
      const viewport: Viewport = { x: 10, y: 20, width: 800, height: 600, zoom: 2 };
      canvasManager.setViewport(viewport);

      const result = canvasManager.screenToCanvas(110, 120);

      expect(result.x).toBe(50); // (110 - 10) / 2
      expect(result.y).toBe(50); // (120 - 20) / 2
    });

    it('should convert canvas coordinates to screen coordinates', () => {
      const viewport: Viewport = { x: 10, y: 20, width: 800, height: 600, zoom: 2 };
      canvasManager.setViewport(viewport);

      const result = canvasManager.canvasToScreen(50, 50);

      expect(result.x).toBe(110); // 50 * 2 + 10
      expect(result.y).toBe(120); // 50 * 2 + 20
    });
  });

  describe('drawing utilities', () => {
    it('should draw image on canvas', () => {
      // Create a properly loaded image element
      const mockImage = document.createElement('img');
      mockImage.width = 100;
      mockImage.height = 100;

      // Mark image as complete (loaded)
      Object.defineProperty(mockImage, 'complete', { value: true, configurable: true });
      Object.defineProperty(mockImage, 'naturalWidth', { value: 100, configurable: true });
      Object.defineProperty(mockImage, 'naturalHeight', { value: 100, configurable: true });

      canvasManager.drawImage(mockImage as HTMLImageElement, 100, 200);

      expect(mockContext.drawImage).toHaveBeenCalledWith(mockImage, 100, 200);
    });

    it('should get image data from canvas', () => {
      const imageData = canvasManager.getImageData();

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 800, 600);
      expect(imageData).toBeInstanceOf(ImageData);
    });

    it('should put image data to canvas', () => {
      const imageData = new ImageData(100, 100);

      canvasManager.putImageData(imageData);

      expect(mockContext.putImageData).toHaveBeenCalledWith(imageData, 0, 0);
    });
  });

  describe('canvas access', () => {
    it('should return canvas element', () => {
      const canvas = canvasManager.getCanvas();

      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });

    it('should return canvas context', () => {
      const context = canvasManager.getContext();

      // The context should be a CanvasRenderingContext2D
      expect(context).toBeTruthy();
      expect(typeof context.clearRect).toBe('function');
    });

    it('should return viewport copy', () => {
      const viewport = canvasManager.getViewport();

      expect(viewport).toEqual({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        zoom: 1,
      });

      // Verify it's a copy, not the original
      viewport.x = 100;
      const newViewport = canvasManager.getViewport();
      expect(newViewport.x).toBe(0);
    });

    it('should set viewport properties', () => {
      canvasManager.setViewport({ x: 50, y: 100, zoom: 1.5 });

      const viewport = canvasManager.getViewport();
      expect(viewport.x).toBe(50);
      expect(viewport.y).toBe(100);
      expect(viewport.zoom).toBe(1.5);
      expect(viewport.width).toBe(800); // Should preserve existing values
      expect(viewport.height).toBe(600);
    });

    it('should handle partial viewport updates', () => {
      canvasManager.setViewport({ zoom: 2 });

      const viewport = canvasManager.getViewport();
      expect(viewport.zoom).toBe(2);
      expect(viewport.x).toBe(0); // Should preserve existing values
    });
  });

  describe('edge cases', () => {
    it('should handle zero dimensions', () => {
      expect(() => new CanvasManager(mockContainer, 0, 0)).not.toThrow();
    });

    it('should handle negative dimensions', () => {
      expect(() => new CanvasManager(mockContainer, -100, -100)).not.toThrow();
    });

    it('should handle layer operations with empty layer list', () => {
      expect(() => canvasManager.removeLayer('any')).not.toThrow();
      expect(() => canvasManager.moveLayer('any', 0)).not.toThrow();
    });
  });
});
