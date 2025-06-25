import { HueAdjustmentTool } from '../../src/tools/HueAdjustmentTool';
import { ImageEditor } from '../../src/core/ImageEditor';
import { CanvasManager } from '../../src/core/CanvasManager';
import { EventEmitter } from '../../src/core/EventEmitter';

// Mock the dependencies
jest.mock('../../src/core/ImageEditor');
jest.mock('../../src/core/CanvasManager');

describe('HueAdjustmentTool', () => {
  let editor: jest.Mocked<ImageEditor>;
  let canvasManager: jest.Mocked<CanvasManager>;
  let eventEmitter: jest.Mocked<EventEmitter>;
  let tool: HueAdjustmentTool;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let originalImageData: ImageData;
  let mockExecuteCommand: jest.Mock;

  beforeEach(() => {
    // Setup canvas and context mocks
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 100;
    mockCanvas.height = 100;

    mockContext = mockCanvas.getContext('2d') as CanvasRenderingContext2D;

    // Create test image data with colors that show clear hue changes
    originalImageData = new ImageData(100, 100);
    for (let i = 0; i < originalImageData.data.length; i += 4) {
      originalImageData.data[i] = 255; // Red
      originalImageData.data[i + 1] = 128; // Green
      originalImageData.data[i + 2] = 0; // Blue
      originalImageData.data[i + 3] = 255; // Alpha
    }

    // Mock EventEmitter
    eventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    // Mock CanvasManager
    canvasManager = {
      getCanvas: jest.fn(() => mockCanvas),
      getContext: jest.fn(() => mockContext),
    } as any;

    // Mock ImageEditor
    mockExecuteCommand = jest.fn();
    editor = {
      getCanvasManager: jest.fn(() => canvasManager),
      getEventEmitter: jest.fn(() => eventEmitter),
      getHistoryManager: jest.fn(() => ({
        executeCommand: mockExecuteCommand,
      })),
    } as any;

    // Setup context methods
    jest.spyOn(mockContext, 'getImageData').mockReturnValue(originalImageData);
    jest.spyOn(mockContext, 'putImageData').mockImplementation(() => {});

    // Create tool instance
    tool = new HueAdjustmentTool(editor);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create tool with correct properties', () => {
      expect(tool.id).toBe('hue');
      expect(tool.name).toBe('Hue Adjustment');
      expect(tool.category).toBe('adjustment');
    });
  });

  describe('activate', () => {
    it('should store original image data when activated', () => {
      tool.activate();
      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('should emit tool activation event', () => {
      tool.activate();
      expect(eventEmitter.emit).toHaveBeenCalledWith('tool:activated', {
        toolId: 'hue',
        toolName: 'Hue Adjustment',
      });
    });

    it('should emit tool properties changed event', () => {
      tool.activate();
      expect(eventEmitter.emit).toHaveBeenCalledWith('tool:propertiesChanged', {
        toolId: 'hue',
        properties: expect.objectContaining({
          hue: expect.objectContaining({ value: 0 }),
        }),
      });
    });
  });

  describe('deactivate', () => {
    it('should reset state when deactivated', () => {
      tool.activate();
      tool.onPropertyChanged('hue', 90);
      tool.onPropertyChanged('preview', true);
      tool.deactivate();

      expect(eventEmitter.emit).toHaveBeenCalledWith('tool:deactivated', {
        toolId: 'hue',
      });
    });
  });

  describe('getToolProperties', () => {
    it('should return correct tool properties structure', () => {
      const properties = tool.getToolProperties();

      expect(properties).toHaveProperty('hue');
      expect(properties.hue).toEqual({
        type: 'slider',
        label: 'Hue',
        value: 0,
        min: -180,
        max: 180,
        step: 1,
        unit: '°',
      });

      expect(properties).toHaveProperty('preview');
      expect(properties).toHaveProperty('reset');
      expect(properties).toHaveProperty('apply');
    });
  });

  describe('onPropertyChanged', () => {
    it('should handle hue value changes', () => {
      tool.onPropertyChanged('hue', 90);

      const properties = tool.getToolProperties();
      expect(properties.hue.value).toBe(90);
    });

    it('should handle preview mode changes - enable preview', () => {
      tool.activate();
      tool.onPropertyChanged('hue', 90);
      tool.onPropertyChanged('preview', true);

      // Should call putImageData to show preview
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should handle preview mode changes - disable preview', () => {
      tool.activate();
      tool.onPropertyChanged('hue', 90);
      tool.onPropertyChanged('preview', true);
      jest.clearAllMocks();

      tool.onPropertyChanged('preview', false);

      // Should restore original image
      expect(mockContext.putImageData).toHaveBeenCalledWith(originalImageData, 0, 0);
    });

    it('should handle reset action', () => {
      tool.activate();
      tool.onPropertyChanged('hue', 90);
      tool.onPropertyChanged('reset', true);

      const properties = tool.getToolProperties();
      expect(properties.hue.value).toBe(0);
      expect(mockContext.putImageData).toHaveBeenCalledWith(originalImageData, 0, 0);
      expect(eventEmitter.emit).toHaveBeenCalledWith('tool:propertiesChanged', {
        toolId: 'hue',
        properties: expect.objectContaining({
          hue: expect.objectContaining({ value: 0 }),
        }),
      });
    });

    it('should handle apply action for non-zero hue', () => {
      tool.activate();
      tool.onPropertyChanged('hue', 90);
      tool.onPropertyChanged('apply', true);

      expect(mockExecuteCommand).toHaveBeenCalled();
    });

    it('should not apply for zero hue', () => {
      tool.onPropertyChanged('hue', 0);
      tool.onPropertyChanged('apply', true);

      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });
  });

  describe('hue preview functionality', () => {
    it('should apply hue preview to image data', () => {
      tool.activate();
      tool.onPropertyChanged('hue', 90);
      tool.onPropertyChanged('preview', true);

      // Check that putImageData was called with modified data
      expect(mockContext.putImageData).toHaveBeenCalled();
      const calls = (mockContext.putImageData as jest.Mock).mock.calls;
      const adjustedImageData = calls[calls.length - 1][0] as ImageData;

      // Check that hue was applied (colors should be shifted)
      // Original: R=255, G=128, B=0 (orange color)
      // With +90° hue shift, orange becomes green: RGB(0, 255, 0)
      expect(adjustedImageData.data[0]).toBe(0); // Red becomes 0
      expect(adjustedImageData.data[1]).toBe(255); // Green becomes 255
      expect(adjustedImageData.data[2]).toBe(0); // Blue stays 0
      expect(adjustedImageData.data[3]).toBe(255); // Alpha should remain unchanged
    });

    it('should handle negative hue values in preview', () => {
      tool.activate();
      tool.onPropertyChanged('hue', -90);
      tool.onPropertyChanged('preview', true);

      const calls = (mockContext.putImageData as jest.Mock).mock.calls;
      const adjustedImageData = calls[calls.length - 1][0] as ImageData;

      // Check that negative hue was applied (colors should be shifted backward)
      // Original: R=255, G=128, B=0 (orange color)
      // With -90° hue shift, orange becomes magenta: RGB(255, 0, 254)
      expect(adjustedImageData.data[0]).toBe(255); // Red stays 255
      expect(adjustedImageData.data[1]).toBe(0); // Green becomes 0
      expect(adjustedImageData.data[2]).toBe(254); // Blue becomes 254
      expect(adjustedImageData.data[3]).toBe(255); // Alpha should remain unchanged
    });

    it('should restore original image when hue is zero in preview', () => {
      tool.activate();
      tool.onPropertyChanged('hue', 90);
      tool.onPropertyChanged('preview', true);
      jest.clearAllMocks();

      tool.onPropertyChanged('hue', 0);
      tool.onPropertyChanged('preview', true);

      // Should restore original image when hue is 0
      expect(mockContext.putImageData).toHaveBeenCalledWith(originalImageData, 0, 0);
    });

    it('should handle full rotation (360 degrees) in preview', () => {
      tool.activate();
      tool.onPropertyChanged('hue', 360);
      tool.onPropertyChanged('preview', true);

      const calls = (mockContext.putImageData as jest.Mock).mock.calls;
      const adjustedImageData = calls[calls.length - 1][0] as ImageData;

      // 360° should be equivalent to 0° (full circle)
      // Colors should be approximately the same as original
      expect(adjustedImageData.data[0]).toBeCloseTo(255, 0);
      expect(adjustedImageData.data[1]).toBeCloseTo(128, 0);
      expect(adjustedImageData.data[2]).toBeCloseTo(0, 0);
    });
  });

  describe('edge cases', () => {
    it('should handle activation without canvas', () => {
      (canvasManager.getCanvas as jest.Mock).mockReturnValue(null);
      expect(() => tool.activate()).not.toThrow();
    });

    it('should handle deactivation without being activated', () => {
      expect(() => tool.deactivate()).not.toThrow();
    });

    it('should handle property changes before activation', () => {
      expect(() => tool.onPropertyChanged('hue', 90)).not.toThrow();
    });
  });

  describe('Tool interface methods', () => {
    it('should have optional Tool interface methods defined', () => {
      expect(tool.onMouseDown).toBeUndefined();
      expect(tool.onMouseMove).toBeUndefined();
      expect(tool.onMouseUp).toBeUndefined();
      expect(tool.onKeyDown).toBeUndefined();
      expect(tool.onKeyUp).toBeUndefined();
    });

    it('should handle mouse and key events without errors', () => {
      const mouseEvent = new MouseEvent('click');
      const keyboardEvent = new KeyboardEvent('keydown');

      // These should not throw since they're optional
      expect(() => {
        if (tool.onMouseDown) tool.onMouseDown(mouseEvent);
        if (tool.onMouseMove) tool.onMouseMove(mouseEvent);
        if (tool.onMouseUp) tool.onMouseUp(mouseEvent);
        if (tool.onKeyDown) tool.onKeyDown('Escape', keyboardEvent);
        if (tool.onKeyUp) tool.onKeyUp('Escape', keyboardEvent);
      }).not.toThrow();
    });
  });
});
