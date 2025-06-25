import { ContrastAdjustmentTool } from '../../src/tools/ContrastAdjustmentTool';
import { ImageEditor } from '../../src/core/ImageEditor';
import { CanvasManager } from '../../src/core/CanvasManager';
import { EventEmitter } from '../../src/core/EventEmitter';

// Mock the dependencies
jest.mock('../../src/core/ImageEditor');
jest.mock('../../src/core/CanvasManager');

describe('ContrastAdjustmentTool', () => {
  let editor: jest.Mocked<ImageEditor>;
  let canvasManager: jest.Mocked<CanvasManager>;
  let eventEmitter: jest.Mocked<EventEmitter>;
  let tool: ContrastAdjustmentTool;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let originalImageData: ImageData;

  beforeEach(() => {
    // Setup canvas and context mocks
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 100;
    mockCanvas.height = 100;

    mockContext = mockCanvas.getContext('2d') as CanvasRenderingContext2D;

    // Create test image data with non-middle gray values for contrast testing
    originalImageData = new ImageData(100, 100);
    for (let i = 0; i < originalImageData.data.length; i += 4) {
      originalImageData.data[i] = 200; // Light Red
      originalImageData.data[i + 1] = 200; // Light Green
      originalImageData.data[i + 2] = 200; // Light Blue
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
    editor = {
      getCanvasManager: jest.fn(() => canvasManager),
      getEventEmitter: jest.fn(() => eventEmitter),
      getHistoryManager: jest.fn(() => ({
        executeCommand: jest.fn(),
      })),
    } as any;

    // Setup context methods
    jest.spyOn(mockContext, 'getImageData').mockReturnValue(originalImageData);
    jest.spyOn(mockContext, 'putImageData').mockImplementation(() => {});

    // Create tool instance
    tool = new ContrastAdjustmentTool(editor, canvasManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create tool with correct properties', () => {
      expect(tool.id).toBe('contrast');
      expect(tool.name).toBe('Contrast Adjustment');
      expect(tool.category).toBe('Adjustments');
      expect(tool.icon).toBe('◑');
      expect(tool.cursor).toBe('default');
      expect(tool.shortcut).toBe('C');
    });
  });

  describe('activate', () => {
    it('should store original image data when activated', () => {
      tool.activate();

      expect(canvasManager.getCanvas).toHaveBeenCalled();
      expect(canvasManager.getContext).toHaveBeenCalled();
      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('should emit tool activation event', () => {
      tool.activate();

      expect(eventEmitter.emit).toHaveBeenCalledWith('tool:activated', {
        toolId: 'contrast',
        toolName: 'Contrast Adjustment',
      });
    });

    it('should emit tool properties changed event', () => {
      tool.activate();

      expect(eventEmitter.emit).toHaveBeenCalledWith('tool:propertiesChanged', {
        toolId: 'contrast',
        properties: expect.any(Object),
      });
    });
  });

  describe('deactivate', () => {
    it('should reset state when deactivated', () => {
      tool.activate();
      tool.deactivate();

      expect(eventEmitter.emit).toHaveBeenCalledWith('tool:deactivated', {
        toolId: 'contrast',
      });
    });
  });

  describe('getToolProperties', () => {
    it('should return correct tool properties structure', () => {
      const properties = tool.getToolProperties();

      expect(properties.toolId).toBe('contrast');
      expect(properties.toolName).toBe('Contrast Adjustment');
      expect(properties.groups).toHaveLength(1);

      const group = properties.groups[0];
      expect(group).toBeDefined();
      expect(group!.id).toBe('contrast-adjustment');
      expect(group!.title).toBe('Contrast');
      expect(group!.icon).toBe('◑');
      expect(group!.controls).toHaveLength(4);

      // Check contrast slider control
      const contrastControl = group!.controls[0];
      expect(contrastControl).toBeDefined();
      expect(contrastControl!.id).toBe('contrast');
      expect(contrastControl!.type).toBe('slider');
      expect(contrastControl!.label).toBe('Contrast');
      expect(contrastControl!.value).toBe(0);
      expect(contrastControl!.min).toBe(-100);
      expect(contrastControl!.max).toBe(100);
      expect(contrastControl!.step).toBe(1);

      // Check preview checkbox control
      const previewControl = group!.controls[1];
      expect(previewControl).toBeDefined();
      expect(previewControl!.id).toBe('preview');
      expect(previewControl!.type).toBe('checkbox');
      expect(previewControl!.label).toBe('Real-time Preview');
      expect(previewControl!.value).toBe(false);

      // Check reset button control
      const resetControl = group!.controls[2];
      expect(resetControl).toBeDefined();
      expect(resetControl!.id).toBe('reset');
      expect(resetControl!.type).toBe('button');
      expect(resetControl!.label).toBe('Reset');

      // Check apply button control
      const applyControl = group!.controls[3];
      expect(applyControl).toBeDefined();
      expect(applyControl!.id).toBe('apply');
      expect(applyControl!.type).toBe('button');
      expect(applyControl!.label).toBe('Apply');
    });
  });

  describe('onPropertyChanged', () => {
    beforeEach(() => {
      tool.activate();
    });

    it('should handle contrast value changes', () => {
      tool.onPropertyChanged('contrast', 50);

      expect(eventEmitter.emit).toHaveBeenCalledWith('contrast:changed', {
        value: 50,
      });
    });

    it('should handle preview mode changes - enable preview', () => {
      tool.onPropertyChanged('preview', true);

      // Should restore original and apply current contrast
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should handle preview mode changes - disable preview', () => {
      // Enable preview first
      tool.onPropertyChanged('preview', true);
      (mockContext.putImageData as jest.Mock).mockClear();

      // Then disable it
      tool.onPropertyChanged('preview', false);

      // Should restore original image
      expect(mockContext.putImageData).toHaveBeenCalledWith(originalImageData, 0, 0);
    });

    it('should handle reset action', () => {
      // Set contrast to non-zero value first
      tool.onPropertyChanged('contrast', 50);

      // Clear previous calls
      (eventEmitter.emit as jest.Mock).mockClear();

      tool.onPropertyChanged('reset', true);

      // Should emit properties changed event with reset values
      expect(eventEmitter.emit).toHaveBeenCalledWith('tool:propertiesChanged', {
        toolId: 'contrast',
        properties: expect.objectContaining({
          groups: expect.arrayContaining([
            expect.objectContaining({
              controls: expect.arrayContaining([
                expect.objectContaining({
                  id: 'contrast',
                  value: 0,
                }),
              ]),
            }),
          ]),
        }),
      });
    });

    it('should handle apply action for non-zero contrast', () => {
      const historyManager = { executeCommand: jest.fn() };
      editor.getHistoryManager.mockReturnValue(historyManager as any);

      // Set contrast to non-zero value
      tool.onPropertyChanged('contrast', 30);

      tool.onPropertyChanged('apply', true);

      expect(historyManager.executeCommand).toHaveBeenCalled();
    });

    it('should not apply for zero contrast', () => {
      const historyManager = { executeCommand: jest.fn() };
      editor.getHistoryManager.mockReturnValue(historyManager as any);

      // Contrast is 0 by default
      tool.onPropertyChanged('apply', true);

      expect(historyManager.executeCommand).not.toHaveBeenCalled();
    });
  });

  describe('contrast preview functionality', () => {
    beforeEach(() => {
      tool.activate();
      tool.onPropertyChanged('preview', true); // Enable preview mode
      (mockContext.putImageData as jest.Mock).mockClear(); // Clear activation calls
    });

    it('should apply contrast preview to image data', () => {
      tool.onPropertyChanged('contrast', 50);

      expect(mockContext.putImageData).toHaveBeenCalled();
      // Get the last call (adjusted data) not the first call (original data)
      const calls = (mockContext.putImageData as jest.Mock).mock.calls;
      const adjustedImageData = calls[calls.length - 1][0] as ImageData;

      // Check that contrast was applied (should increase contrast from light gray 200)
      // With factor 1.5, (200 - 128) * 1.5 + 128 = 72 * 1.5 + 128 = 236
      expect(adjustedImageData.data[0]).toBe(236); // Red channel should be 236
      expect(adjustedImageData.data[1]).toBe(236); // Green channel should be 236
      expect(adjustedImageData.data[2]).toBe(236); // Blue channel should be 236
      expect(adjustedImageData.data[3]).toBe(255); // Alpha should remain unchanged
    });

    it('should handle negative contrast values in preview', () => {
      tool.onPropertyChanged('contrast', -50);

      expect(mockContext.putImageData).toHaveBeenCalled();
      // Get the last call (adjusted data) not the first call (original data)
      const calls = (mockContext.putImageData as jest.Mock).mock.calls;
      const adjustedImageData = calls[calls.length - 1][0] as ImageData;

      // Check that negative contrast was applied
      // With factor 0.5, (200 - 128) * 0.5 + 128 = 72 * 0.5 + 128 = 164
      expect(adjustedImageData.data[0]).toBe(164); // Red channel should be 164
      expect(adjustedImageData.data[1]).toBe(164); // Green channel should be 164
      expect(adjustedImageData.data[2]).toBe(164); // Blue channel should be 164
    });

    it('should restore original image when contrast is zero in preview', () => {
      tool.onPropertyChanged('contrast', 50);
      (mockContext.putImageData as jest.Mock).mockClear();

      tool.onPropertyChanged('contrast', 0);

      // Should restore original image when contrast is 0
      expect(mockContext.putImageData).toHaveBeenCalledWith(originalImageData, 0, 0);
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
      const inactiveTool = new ContrastAdjustmentTool(editor, canvasManager);

      expect(() => inactiveTool.onPropertyChanged('contrast', 50)).not.toThrow();
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
      const point = { x: 0, y: 0 };
      const mouseEvent = new MouseEvent('click');
      const keyEvent = new KeyboardEvent('keydown');

      expect(() => tool.onMouseDown?.(point, mouseEvent)).not.toThrow();
      expect(() => tool.onMouseMove?.(point, mouseEvent)).not.toThrow();
      expect(() => tool.onMouseUp?.(point, mouseEvent)).not.toThrow();
      expect(() => tool.onKeyDown?.('a', keyEvent)).not.toThrow();
      expect(() => tool.onKeyUp?.('a', keyEvent)).not.toThrow();
    });
  });
});
