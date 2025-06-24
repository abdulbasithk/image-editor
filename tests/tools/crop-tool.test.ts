import { CropTool, ASPECT_RATIO_PRESETS } from '../../src/tools/CropTool';
import { ImageEditor } from '../../src/core/ImageEditor';
import { createMockContainer } from '../utils/test-helpers';

describe('CropTool', () => {
  let container: HTMLElement;
  let editor: ImageEditor;
  let cropTool: CropTool;

  beforeEach(() => {
    // Create test environment
    container = createMockContainer();
    document.body.appendChild(container);

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn(),
    }));

    // Mock getComputedStyle
    global.getComputedStyle = jest.fn().mockReturnValue({
      cursor: 'pointer',
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    // Create editor instance
    editor = new ImageEditor({
      container,
      width: 800,
      height: 600,
    });

    // Create crop tool instance
    cropTool = new CropTool(editor);
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(cropTool.name).toBe('crop');
      expect(cropTool.getAspectRatio()).toBeNull();
    });

    it('should have aspect ratio presets available', () => {
      expect(ASPECT_RATIO_PRESETS).toContainEqual(
        expect.objectContaining({ name: 'free', ratio: null }),
      );
      expect(ASPECT_RATIO_PRESETS).toContainEqual(
        expect.objectContaining({ name: 'square', ratio: 1 }),
      );
      expect(ASPECT_RATIO_PRESETS).toContainEqual(
        expect.objectContaining({ name: 'landscape', ratio: 4 / 3 }),
      );
    });
  });

  describe('Activation and Deactivation', () => {
    it('should activate correctly', () => {
      cropTool.activate();
      const overlay = container.querySelector('.crop-overlay');
      expect(overlay).toBeTruthy();
    });

    it('should deactivate correctly', () => {
      cropTool.activate();
      cropTool.deactivate();
      const overlay = container.querySelector('.crop-overlay');
      expect(overlay).toBeFalsy();
    });

    it('should create overlay when activated', () => {
      cropTool.activate();
      const overlay = container.querySelector('.crop-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay?.className).toContain('crop-overlay');
    });

    it('should remove overlay when deactivated', () => {
      cropTool.activate();
      expect(container.querySelector('.crop-overlay')).toBeTruthy();

      cropTool.deactivate();
      expect(container.querySelector('.crop-overlay')).toBeFalsy();
    });
  });

  describe('Aspect Ratio Management', () => {
    it('should set aspect ratio correctly', () => {
      cropTool.setAspectRatio(16 / 9);
      expect(cropTool.getAspectRatio()).toBeCloseTo(16 / 9);
    });

    it('should handle free aspect ratio', () => {
      cropTool.setAspectRatio(null);
      expect(cropTool.getAspectRatio()).toBeNull();
    });

    it('should handle square aspect ratio', () => {
      cropTool.setAspectRatio(1);
      expect(cropTool.getAspectRatio()).toBe(1);
    });

    it('should update crop area when aspect ratio changes', () => {
      cropTool.activate();
      // const initialArea = cropTool.getCropArea();
      cropTool.setAspectRatio(1); // Square
      const squareArea = cropTool.getCropArea();
      // Should maintain aspect ratio of 1:1
      expect(squareArea.width / squareArea.height).toBeCloseTo(1, 1);
    });
  });

  describe('Crop Area Management', () => {
    beforeEach(() => {
      cropTool.activate();
    });

    it('should set crop area', () => {
      const area = { x: 10, y: 20, width: 100, height: 80 };
      cropTool.setCropArea(area);

      const currentArea = cropTool.getCropArea();
      expect(currentArea.x).toBe(area.x);
      expect(currentArea.y).toBe(area.y);
      expect(currentArea.width).toBe(area.width);
      expect(currentArea.height).toBe(area.height);
    });

    it('should handle crop area bounds validation', () => {
      const canvas = editor.getCanvasManager().getCanvas();

      // Test area that exceeds canvas bounds
      const area = { x: -10, y: -20, width: canvas.width + 100, height: canvas.height + 100 };
      cropTool.setCropArea(area);

      const currentArea = cropTool.getCropArea();
      // Should be within canvas bounds
      expect(currentArea.x).toBeGreaterThanOrEqual(0);
      expect(currentArea.y).toBeGreaterThanOrEqual(0);
      expect(currentArea.x + currentArea.width).toBeLessThanOrEqual(canvas.width);
      expect(currentArea.y + currentArea.height).toBeLessThanOrEqual(canvas.height);
    });

    it('should reset crop area to canvas bounds', () => {
      const canvas = editor.getCanvasManager().getCanvas();

      // Set a small crop area
      cropTool.setCropArea({ x: 100, y: 100, width: 200, height: 200 });

      // Reset to full canvas
      cropTool.resetCrop();

      const area = cropTool.getCropArea();
      expect(area.x).toBe(0);
      expect(area.y).toBe(0);
      expect(area.width).toBe(canvas.width);
      expect(area.height).toBe(canvas.height);
    });
  });

  describe('Mouse Interaction', () => {
    beforeEach(() => {
      cropTool.activate();
    });

    it('should handle mouse down event', () => {
      const point = { x: 100, y: 100 };
      const event = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
      });

      // Should not throw
      expect(() => {
        cropTool.onMouseDown(point, event);
      }).not.toThrow();
    });

    it('should handle mouse move event', () => {
      const point = { x: 150, y: 150 };
      const event = new MouseEvent('mousemove', {
        clientX: 150,
        clientY: 150,
        bubbles: true,
      });

      // Should not throw
      expect(() => {
        cropTool.onMouseMove(point, event);
      }).not.toThrow();
    });

    it('should handle mouse up event', () => {
      const point = { x: 200, y: 200 };
      const event = new MouseEvent('mouseup', {
        clientX: 200,
        clientY: 200,
        bubbles: true,
      });

      // Should not throw
      expect(() => {
        cropTool.onMouseUp(point, event);
      }).not.toThrow();
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      cropTool.activate();
    });

    it('should handle Enter key to apply crop', () => {
      // Mock canvas methods
      const canvas = editor.getCanvasManager().getCanvas();
      const ctx = canvas.getContext('2d')!;
      jest.spyOn(ctx, 'drawImage').mockImplementation(() => {});
      jest.spyOn(ctx, 'clearRect').mockImplementation(() => {});

      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      expect(() => {
        cropTool.onKeyDown('Enter', event);
      }).not.toThrow();
    });

    it('should handle Escape key to reset crop', () => {
      const canvas = editor.getCanvasManager().getCanvas();
      cropTool.setCropArea({ x: 100, y: 100, width: 200, height: 200 });

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      cropTool.onKeyDown('Escape', event);

      const area = cropTool.getCropArea();
      expect(area.width).toBe(canvas.width);
      expect(area.height).toBe(canvas.height);
    });

    it('should handle Ctrl+R key to reset crop', () => {
      const canvas = editor.getCanvasManager().getCanvas();
      cropTool.setCropArea({ x: 100, y: 100, width: 200, height: 200 });

      const event = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true });
      jest.spyOn(event, 'preventDefault');

      cropTool.onKeyDown('r', event);

      expect(event.preventDefault).toHaveBeenCalled();
      const area = cropTool.getCropArea();
      expect(area.width).toBe(canvas.width);
      expect(area.height).toBe(canvas.height);
    });
  });

  describe('Crop Application', () => {
    beforeEach(() => {
      cropTool.activate();
    });

    it('should apply crop successfully', () => {
      // Set up a crop area
      cropTool.setCropArea({ x: 10, y: 20, width: 100, height: 80 });
      // Mock canvas methods
      const canvas = editor.getCanvasManager().getCanvas();
      const ctx = canvas.getContext('2d')!;
      jest.spyOn(ctx, 'drawImage').mockImplementation(() => {});
      jest.spyOn(ctx, 'clearRect').mockImplementation(() => {});
      // const originalWidth = canvas.width;
      // const originalHeight = canvas.height;
      cropTool.applyCrop();
      // Canvas should be resized to crop dimensions
      expect(canvas.width).toBe(100);
      expect(canvas.height).toBe(80);
      // Methods should have been called
      expect(ctx.clearRect).toHaveBeenCalled();
      expect(ctx.drawImage).toHaveBeenCalled();
    });
    it('should not apply crop when inactive', () => {
      cropTool.deactivate();
      const canvas = editor.getCanvasManager().getCanvas();
      const originalWidth = canvas.width;
      const originalHeight = canvas.height;
      cropTool.applyCrop();
      // Canvas dimensions should remain unchanged
      expect(canvas.width).toBe(originalWidth);
      expect(canvas.height).toBe(originalHeight);
    });
  });

  describe('Guide Management', () => {
    beforeEach(() => {
      cropTool.activate();
    });

    it('should toggle guide visibility', () => {
      // Default should be showing guides
      cropTool.setShowGuides(false);

      // Should not throw and should accept the setting
      expect(() => {
        cropTool.setShowGuides(true);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle activation when already active', () => {
      cropTool.activate();

      // Should not throw when activating again
      expect(() => {
        cropTool.activate();
      }).not.toThrow();
    });

    it('should handle deactivation when already inactive', () => {
      // Should not throw when deactivating without activation
      expect(() => {
        cropTool.deactivate();
      }).not.toThrow();
    });

    it('should handle invalid crop area gracefully', () => {
      cropTool.activate();

      // Should not throw with invalid dimensions
      expect(() => {
        cropTool.setCropArea({ x: -100, y: -100, width: -50, height: -50 });
      }).not.toThrow();
    });

    it('should handle mouse events when inactive', () => {
      const point = { x: 100, y: 100 };
      const event = new MouseEvent('mousedown');

      // Should not throw when handling events while inactive
      expect(() => {
        cropTool.onMouseDown(point, event);
        cropTool.onMouseMove(point, event);
        cropTool.onMouseUp(point, event);
      }).not.toThrow();
    });

    it('should handle keyboard events when inactive', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });

      // Should not throw when handling keyboard events while inactive
      expect(() => {
        cropTool.onKeyDown('Enter', event);
      }).not.toThrow();
    });
  });
});
