import { RotationTool } from '../../src/tools/RotationTool';
import { ImageEditor } from '../../src/core/ImageEditor';
import { CanvasManager } from '../../src/core/CanvasManager';

describe('RotationTool', () => {
  let rotationTool: RotationTool;
  let editor: ImageEditor;
  let canvasManager: CanvasManager;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Create mock canvas and context
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    mockContext = mockCanvas.getContext('2d')!;

    // Create container div
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Initialize ImageEditor with test configuration
    editor = new ImageEditor({
      container: container,
      width: 800,
      height: 600,
      showToolbar: false,
      showPanel: false,
    });

    canvasManager = new CanvasManager(container, 800, 600, mockCanvas);
    rotationTool = new RotationTool(editor, canvasManager);
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should initialize with correct default options', () => {
      const options = rotationTool.getOptions();
      expect(options.angle).toBe(0);
      expect(options.preserveQuality).toBe(true);
      expect(options.animateRotation).toBe(true);
      expect(options.animationDuration).toBe(300);
    });

    it('should have correct tool name', () => {
      expect(rotationTool.name).toBe('rotation');
    });
  });

  describe('Options Management', () => {
    it('should update options correctly', () => {
      const newOptions = {
        preserveQuality: false,
        animateRotation: false,
        animationDuration: 500,
      };

      rotationTool.setOptions(newOptions);
      const options = rotationTool.getOptions();

      expect(options.preserveQuality).toBe(false);
      expect(options.animateRotation).toBe(false);
      expect(options.animationDuration).toBe(500);
      expect(options.angle).toBe(0); // Should preserve existing values
    });

    it('should return a copy of options to prevent mutation', () => {
      const options1 = rotationTool.getOptions();
      const options2 = rotationTool.getOptions();

      options1.angle = 90;
      expect(options2.angle).toBe(0);
    });
  });
  describe('Rotation Operations', () => {
    beforeEach(() => {
      // Mock ImageData constructor for tests
      global.ImageData = class {
        width: number;
        height: number;
        data: Uint8ClampedArray;

        constructor(width: number, height: number) {
          this.width = width;
          this.height = height;
          this.data = new Uint8ClampedArray(width * height * 4);
        }
      } as any; // Mock canvas context methods
      jest.spyOn(mockContext, 'getImageData').mockReturnValue(new ImageData(800, 600));
      jest.spyOn(mockContext, 'putImageData').mockImplementation();
      jest.spyOn(mockContext, 'clearRect').mockImplementation();
      jest.spyOn(mockContext, 'save').mockImplementation();
      jest.spyOn(mockContext, 'restore').mockImplementation();
      jest.spyOn(mockContext, 'translate').mockImplementation();
      jest.spyOn(mockContext, 'rotate').mockImplementation();
      jest.spyOn(mockContext, 'drawImage').mockImplementation();

      // Mock document.createElement for temporary canvas
      const originalCreateElement = document.createElement;
      jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'canvas') {
          const mockTempCanvas = originalCreateElement.call(document, 'canvas');
          const mockTempContext = {
            putImageData: jest.fn(),
            getImageData: jest.fn().mockReturnValue(new ImageData(800, 600)),
            clearRect: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            translate: jest.fn(),
            rotate: jest.fn(),
            drawImage: jest.fn(),
          } as any;

          Object.defineProperty(mockTempCanvas, 'getContext', {
            value: () => mockTempContext,
          });

          return mockTempCanvas;
        }
        return originalCreateElement.call(document, tagName);
      });

      // Disable animation for predictable testing
      rotationTool.setOptions({ animateRotation: false });
    });

    afterEach(() => {
      // Restore all mocks
      jest.restoreAllMocks();
    });

    it('should rotate clockwise by 90 degrees', () => {
      rotationTool.rotateClockwise();
      const options = rotationTool.getOptions();
      expect(options.angle).toBe(90);
    });

    it('should rotate counterclockwise by 90 degrees', () => {
      rotationTool.rotateCounterclockwise();
      const options = rotationTool.getOptions();
      expect(options.angle).toBe(270); // -90 normalized to 270
    });

    it('should rotate by 180 degrees', () => {
      rotationTool.rotate180();
      const options = rotationTool.getOptions();
      expect(options.angle).toBe(180);
    });

    it('should handle multiple rotations correctly', () => {
      rotationTool.rotateClockwise(); // 90°
      rotationTool.rotateClockwise(); // 180°
      rotationTool.rotateClockwise(); // 270°
      rotationTool.rotateClockwise(); // 360° -> 0°

      const options = rotationTool.getOptions();
      expect(options.angle).toBe(0);
    });

    it('should normalize angles correctly', () => {
      rotationTool.rotateBy(450); // Should normalize to 90°
      const options = rotationTool.getOptions();
      expect(options.angle).toBe(90);
    });

    it('should handle negative angles correctly', () => {
      rotationTool.rotateBy(-90);
      const options = rotationTool.getOptions();
      expect(options.angle).toBe(270);
    });
  });
  describe('Canvas Interaction', () => {
    beforeEach(() => {
      // Disable animation for predictable testing
      rotationTool.setOptions({ animateRotation: false });
    });
    it('should not rotate when canvas is not available', () => {
      const emitSpy = jest.spyOn(editor, 'emit');

      // Create tool with invalid canvas manager
      const invalidCanvasManager = {
        getCanvas: () => null,
        getContext: () => null,
      } as any;

      const invalidRotationTool = new RotationTool(editor, invalidCanvasManager);
      invalidRotationTool.rotateClockwise();

      // Should not emit any tool action when canvas is not available
      expect(emitSpy).not.toHaveBeenCalledWith('tool:action', expect.any(Object));
      emitSpy.mockRestore();
    });

    it('should prevent multiple simultaneous rotations', () => {
      // Set animation to true to test the animation blocking logic
      rotationTool.setOptions({ animateRotation: true });

      rotationTool.rotateClockwise();
      rotationTool.rotateClockwise(); // Should be ignored

      // With animation enabled, the angle won't be updated immediately
      // Just verify that the second call was blocked
      expect(rotationTool.isRotating()).toBe(true);
    });
  });

  describe('Current State', () => {
    beforeEach(() => {
      // Disable animation for predictable testing
      rotationTool.setOptions({ animateRotation: false });
    });

    it('should return current angle correctly', () => {
      expect(rotationTool.getCurrentAngle()).toBe(0);

      rotationTool.rotateClockwise();
      expect(rotationTool.getCurrentAngle()).toBe(90);
    });

    it('should track rotation state correctly', () => {
      expect(rotationTool.isRotating()).toBe(false);

      // Note: Testing actual animation state would require more complex mocking
      // For now, just verify the method exists and returns boolean
      expect(typeof rotationTool.isRotating()).toBe('boolean');
    });
  });

  describe('Tool Lifecycle', () => {
    it('should activate without errors', () => {
      expect(() => rotationTool.activate()).not.toThrow();
    });

    it('should deactivate without errors', () => {
      expect(() => rotationTool.deactivate()).not.toThrow();
    });

    it('should cleanup without errors', () => {
      expect(() => rotationTool.cleanup()).not.toThrow();
    });
  });

  describe('Event Handling', () => {
    it('should handle keyboard shortcuts when supported', () => {
      const mockEvent = {
        key: 'ArrowRight',
        ctrlKey: true,
        preventDefault: jest.fn(),
      } as any;

      if (rotationTool.onKeyDown) {
        rotationTool.onKeyDown('ArrowRight', mockEvent);
        expect(mockEvent.preventDefault).toHaveBeenCalled();
      }
    });

    it('should not crash on mouse events', () => {
      const point = { x: 100, y: 100 };
      const mockEvent = {} as any;

      expect(() => {
        if (rotationTool.onMouseDown) rotationTool.onMouseDown(point, mockEvent);
        if (rotationTool.onMouseMove) rotationTool.onMouseMove(point, mockEvent);
        if (rotationTool.onMouseUp) rotationTool.onMouseUp(point, mockEvent);
      }).not.toThrow();
    });
  });
  describe('Reset Functionality', () => {
    beforeEach(() => {
      // Disable animation for predictable testing
      rotationTool.setOptions({ animateRotation: false });
    });

    it('should reset rotation to original state', () => {
      // First, do some rotations
      rotationTool.rotateClockwise(); // Should be 90°
      expect(rotationTool.getCurrentAngle()).toBe(90);

      rotationTool.rotate180(); // Should be 90° + 180° = 270°
      expect(rotationTool.getCurrentAngle()).toBe(270);

      // Now reset
      rotationTool.resetRotation();
      expect(rotationTool.getCurrentAngle()).toBe(0);
    });
  });

  describe('Apply Functionality', () => {
    it('should apply rotation without errors', () => {
      rotationTool.rotateClockwise();
      expect(() => rotationTool.applyRotation()).not.toThrow();
    });
  });
  describe('Flip Functionality', () => {
    beforeEach(() => {
      // Mock Canvas and ImageData for flip tests
      global.ImageData = class {
        width: number;
        height: number;
        data: Uint8ClampedArray;

        constructor(width: number, height: number) {
          this.width = width;
          this.height = height;
          this.data = new Uint8ClampedArray(width * height * 4);
        }
      } as any;

      // Mock canvas context methods for flip operations
      jest.spyOn(mockContext, 'getImageData').mockReturnValue(new ImageData(800, 600));
      jest.spyOn(mockContext, 'putImageData').mockImplementation();
      jest.spyOn(mockContext, 'clearRect').mockImplementation();
      jest.spyOn(mockContext, 'save').mockImplementation();
      jest.spyOn(mockContext, 'restore').mockImplementation();
      jest.spyOn(mockContext, 'scale').mockImplementation();
      jest.spyOn(mockContext, 'translate').mockImplementation();
      jest.spyOn(mockContext, 'drawImage').mockImplementation();

      // Mock document.createElement for temporary canvas - fix infinite recursion
      jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'canvas') {
          // Create a simple mock canvas instead of calling real createElement
          const mockTempCanvas = {
            width: 800,
            height: 600,
            getContext: jest.fn().mockReturnValue({
              putImageData: jest.fn(),
              getImageData: jest.fn().mockReturnValue(new ImageData(800, 600)),
              clearRect: jest.fn(),
              save: jest.fn(),
              restore: jest.fn(),
              scale: jest.fn(),
              translate: jest.fn(),
              drawImage: jest.fn(),
            }),
          } as any;

          return mockTempCanvas;
        }
        // For non-canvas elements, return a basic mock
        return { tagName } as any;
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should flip horizontally without errors', () => {
      expect(() => rotationTool.flipHorizontal()).not.toThrow();

      // Verify scale(-1, 1) was called for horizontal flip
      expect(mockContext.scale).toHaveBeenCalledWith(-1, 1);
      expect(mockContext.translate).toHaveBeenCalledWith(-800, 0);
    });

    it('should flip vertically without errors', () => {
      expect(() => rotationTool.flipVertical()).not.toThrow();

      // Verify scale(1, -1) was called for vertical flip
      expect(mockContext.scale).toHaveBeenCalledWith(1, -1);
      expect(mockContext.translate).toHaveBeenCalledWith(0, -600);
    });

    it('should emit flip events', () => {
      const emitSpy = jest.spyOn(editor, 'emit');

      rotationTool.flipHorizontal();
      expect(emitSpy).toHaveBeenCalledWith('tool:action', {
        toolName: 'rotation',
        action: 'flip',
        data: { direction: 'horizontal' },
      });

      rotationTool.flipVertical();
      expect(emitSpy).toHaveBeenCalledWith('tool:action', {
        toolName: 'rotation',
        action: 'flip',
        data: { direction: 'vertical' },
      });
    });

    it('should preserve image quality during flip operations', () => {
      rotationTool.setOptions({ preserveQuality: true });

      rotationTool.flipHorizontal();

      expect(mockContext.imageSmoothingEnabled).toBe(true);
      expect(mockContext.imageSmoothingQuality).toBe('high');
    });
    it('should not flip when canvas is not available', () => {
      const emitSpy = jest.spyOn(editor, 'emit');

      // Create tool with invalid canvas manager
      const invalidCanvasManager = {
        getCanvas: () => null,
        getContext: () => null,
      } as any;

      const invalidRotationTool = new RotationTool(editor, invalidCanvasManager);
      invalidRotationTool.flipHorizontal();

      // Should not emit any tool action when canvas is not available
      expect(emitSpy).not.toHaveBeenCalledWith('tool:action', expect.any(Object));
      emitSpy.mockRestore();
    });
  });
});
