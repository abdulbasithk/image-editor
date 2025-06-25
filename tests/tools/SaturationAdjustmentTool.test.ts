import { SaturationAdjustmentTool } from '../../src/tools/SaturationAdjustmentTool';
import { ImageEditor } from '../../src/core/ImageEditor';
import { CanvasManager } from '../../src/core/CanvasManager';
import { EventEmitter } from '../../src/core/EventEmitter';

// Mock the dependencies
jest.mock('../../src/core/ImageEditor');
jest.mock('../../src/core/CanvasManager');

describe('SaturationAdjustmentTool', () => {
  let editor: jest.Mocked<ImageEditor>;
  let canvasManager: jest.Mocked<CanvasManager>;
  let eventEmitter: jest.Mocked<EventEmitter>;
  let tool: SaturationAdjustmentTool;
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

    // Create test image data with colors that show clear saturation changes
    originalImageData = new ImageData(100, 100);
    for (let i = 0; i < originalImageData.data.length; i += 4) {
      originalImageData.data[i] = 200; // Red
      originalImageData.data[i + 1] = 100; // Green
      originalImageData.data[i + 2] = 50; // Blue
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
    tool = new SaturationAdjustmentTool(editor);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create tool with correct properties', () => {
      expect(tool.id).toBe('saturation');
      expect(tool.name).toBe('Saturation Adjustment');
      expect(tool.icon).toBe('🎨');
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
        toolId: 'saturation',
        toolName: 'Saturation Adjustment',
      });
    });

    it('should emit tool properties changed event', () => {
      tool.activate();

      expect(eventEmitter.emit).toHaveBeenCalledWith('tool:propertiesChanged', {
        toolId: 'saturation',
        properties: expect.objectContaining({
          saturation: expect.objectContaining({
            type: 'range',
            label: 'Saturation',
            value: 0,
            min: -100,
            max: 100,
            step: 1,
          }),
          preview: expect.objectContaining({
            type: 'boolean',
            label: 'Real-time Preview',
            value: false,
          }),
        }),
      });
    });
  });

  describe('deactivate', () => {
    it('should reset state when deactivated', () => {
      tool.activate();
      tool.onPropertyChanged('saturation', 50);
      tool.onPropertyChanged('preview', true);

      tool.deactivate();

      // Should restore original image
      expect(mockContext.putImageData).toHaveBeenCalledWith(originalImageData, 0, 0);
    });
  });

  describe('getToolProperties', () => {
    it('should return correct tool properties structure', () => {
      const properties = tool.getToolProperties();

      expect(properties).toEqual({
        saturation: {
          type: 'range',
          label: 'Saturation',
          value: 0,
          min: -100,
          max: 100,
          step: 1,
        },
        preview: {
          type: 'boolean',
          label: 'Real-time Preview',
          value: false,
        },
        actions: {
          type: 'actions',
          buttons: [
            { id: 'reset', label: 'Reset', style: 'secondary' },
            { id: 'apply', label: 'Apply', style: 'primary' },
          ],
        },
      });
    });
  });

  describe('onPropertyChanged', () => {
    beforeEach(() => {
      tool.activate();
      (mockContext.putImageData as jest.Mock).mockClear(); // Clear activation calls
    });

    it('should handle saturation value changes', () => {
      tool.onPropertyChanged('saturation', 50);

      // Should not trigger preview by default
      expect(mockContext.putImageData).not.toHaveBeenCalled();
    });

    it('should handle preview mode changes - enable preview', () => {
      tool.onPropertyChanged('saturation', 30);
      tool.onPropertyChanged('preview', true);

      // Should trigger preview when enabled
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should handle preview mode changes - disable preview', () => {
      tool.onPropertyChanged('saturation', 30);
      tool.onPropertyChanged('preview', true);
      (mockContext.putImageData as jest.Mock).mockClear();

      tool.onPropertyChanged('preview', false);

      // Should restore original image when preview is disabled
      expect(mockContext.putImageData).toHaveBeenCalledWith(originalImageData, 0, 0);
    });

    it('should handle reset action', () => {
      tool.onPropertyChanged('saturation', 50);
      tool.onPropertyChanged('preview', true);
      (mockContext.putImageData as jest.Mock).mockClear();

      tool.onPropertyChanged('reset', true);

      // Should restore original image and emit properties changed
      expect(mockContext.putImageData).toHaveBeenCalledWith(originalImageData, 0, 0);
      expect(eventEmitter.emit).toHaveBeenCalledWith('tool:propertiesChanged', {
        toolId: 'saturation',
        properties: expect.objectContaining({
          saturation: expect.objectContaining({ value: 0 }),
        }),
      });
    });

    it('should handle apply action for non-zero saturation', () => {
      tool.activate(); // Need to activate tool first
      tool.onPropertyChanged('saturation', 50);
      tool.onPropertyChanged('apply', true);

      expect(mockExecuteCommand).toHaveBeenCalled();
    });

    it('should not apply for zero saturation', () => {
      tool.onPropertyChanged('saturation', 0);
      tool.onPropertyChanged('apply', true);

      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });
  });

  describe('saturation preview functionality', () => {
    beforeEach(() => {
      tool.activate();
      tool.onPropertyChanged('preview', true); // Enable preview mode
      (mockContext.putImageData as jest.Mock).mockClear(); // Clear activation calls
    });

    it('should apply saturation preview to image data', () => {
      tool.onPropertyChanged('saturation', 50);

      expect(mockContext.putImageData).toHaveBeenCalled();
      // Get the last call (adjusted data) not the first call (original data)
      const calls = (mockContext.putImageData as jest.Mock).mock.calls;
      const adjustedImageData = calls[calls.length - 1][0] as ImageData;

      // Check that saturation was applied (colors should be more saturated)
      // Original: R=200, G=100, B=50 (vibrant orange color)
      expect(adjustedImageData.data[0]).not.toBe(200); // Red channel should change
      expect(adjustedImageData.data[1]).not.toBe(100); // Green channel should change
      expect(adjustedImageData.data[2]).not.toBe(50); // Blue channel should change
      expect(adjustedImageData.data[3]).toBe(255); // Alpha should remain unchanged
    });

    it('should handle negative saturation values in preview', () => {
      tool.onPropertyChanged('saturation', -50);

      expect(mockContext.putImageData).toHaveBeenCalled();
      // Get the last call (adjusted data) not the first call (original data)
      const calls = (mockContext.putImageData as jest.Mock).mock.calls;
      const adjustedImageData = calls[calls.length - 1][0] as ImageData;

      // Check that negative saturation was applied (colors should be less saturated)
      expect(adjustedImageData.data[0]).not.toBe(200); // Red channel should change
      expect(adjustedImageData.data[1]).not.toBe(100); // Green channel should change
      expect(adjustedImageData.data[2]).not.toBe(50); // Blue channel should change
      expect(adjustedImageData.data[3]).toBe(255); // Alpha should remain unchanged
    });

    it('should restore original image when saturation is zero in preview', () => {
      tool.onPropertyChanged('saturation', 50);
      (mockContext.putImageData as jest.Mock).mockClear();

      tool.onPropertyChanged('saturation', 0);

      // Should restore original image when saturation is 0
      expect(mockContext.putImageData).toHaveBeenCalledWith(originalImageData, 0, 0);
    });

    it('should create grayscale image with -100 saturation in preview', () => {
      tool.onPropertyChanged('saturation', -100);

      expect(mockContext.putImageData).toHaveBeenCalled();
      // Get the last call (adjusted data)
      const calls = (mockContext.putImageData as jest.Mock).mock.calls;
      const adjustedImageData = calls[calls.length - 1][0] as ImageData;

      // With -100 saturation, all color channels should be equal (grayscale)
      const red = adjustedImageData.data[0];
      const green = adjustedImageData.data[1];
      const blue = adjustedImageData.data[2];

      expect(red).toBe(green);
      expect(green).toBe(blue);
      expect(adjustedImageData.data[3]).toBe(255); // Alpha unchanged
    });
  });

  describe('edge cases', () => {
    it('should handle activation without canvas', () => {
      canvasManager.getCanvas.mockReturnValue(null as any);

      expect(() => tool.activate()).not.toThrow();
    });

    it('should handle deactivation without being activated', () => {
      expect(() => tool.deactivate()).not.toThrow();
    });

    it('should handle property changes before activation', () => {
      expect(() => {
        tool.onPropertyChanged('saturation', 50);
        tool.onPropertyChanged('preview', true);
        tool.onPropertyChanged('reset', true);
        tool.onPropertyChanged('apply', true);
      }).not.toThrow();
    });
  });

  describe('Tool interface methods', () => {
    it('should have optional Tool interface methods defined', () => {
      expect(typeof tool.onMouseDown).toBe('function');
      expect(typeof tool.onMouseMove).toBe('function');
      expect(typeof tool.onMouseUp).toBe('function');
      expect(typeof tool.onKeyDown).toBe('function');
      expect(typeof tool.onKeyUp).toBe('function');
    });

    it('should handle mouse and key events without errors', () => {
      const point = { x: 10, y: 20 };
      const mouseEvent = new MouseEvent('click');
      const keyEvent = new KeyboardEvent('keydown');

      expect(() => {
        tool.onMouseDown?.(point, mouseEvent);
        tool.onMouseMove?.(point, mouseEvent);
        tool.onMouseUp?.(point, mouseEvent);
        tool.onKeyDown?.('a', keyEvent);
        tool.onKeyUp?.('a', keyEvent);
      }).not.toThrow();
    });
  });
});
