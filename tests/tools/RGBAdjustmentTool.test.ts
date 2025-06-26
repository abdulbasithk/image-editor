import { RGBAdjustmentTool } from '../../src/tools/RGBAdjustmentTool';
import { ImageEditor } from '../../src/core/ImageEditor';

// Mock canvas and context
const mockCanvas = {
  width: 100,
  height: 100,
};

const createMockImageData = (width: number, height: number, fillValue = 128) => ({
  data: new Uint8ClampedArray(width * height * 4).fill(fillValue),
  width,
  height,
});

const mockContext = {
  getImageData: jest.fn(() => createMockImageData(100, 100)),
  putImageData: jest.fn(),
};

// Mock CanvasManager
const mockCanvasManager = {
  getCanvas: jest.fn(() => mockCanvas),
  getContext: jest.fn(() => mockContext),
};

// Mock EventEmitter
const mockEventEmitter = {
  emit: jest.fn(),
};

// Mock HistoryManager
const mockHistoryManager = {
  executeCommand: jest.fn(),
};

// Mock ImageEditor
const mockEditor = {
  getCanvasManager: jest.fn(() => mockCanvasManager),
  getEventEmitter: jest.fn(() => mockEventEmitter),
  getHistoryManager: jest.fn(() => mockHistoryManager),
} as unknown as ImageEditor;

describe('RGBAdjustmentTool', () => {
  let tool: RGBAdjustmentTool;

  beforeEach(() => {
    jest.clearAllMocks();
    tool = new RGBAdjustmentTool(mockEditor, mockCanvasManager as any);
    mockContext.getImageData.mockReturnValue(createMockImageData(100, 100));
  });

  describe('constructor', () => {
    it('should create tool with correct properties', () => {
      expect(tool.id).toBe('rgb-adjustment');
      expect(tool.name).toBe('RGB Channel Adjustment');
      expect(tool.category).toBe('Adjustments');
      expect(tool.icon).toBe('🎨');
      expect(tool.cursor).toBe('default');
      expect(tool.shortcut).toBe('R');
    });
  });

  describe('activate', () => {
    it('should store original image data when activated', () => {
      tool.activate();

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('should emit tool activation event', () => {
      tool.activate();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('tool:activated', {
        toolId: 'rgb-adjustment',
        toolName: 'RGB Channel Adjustment',
      });
    });

    it('should emit tool properties changed event', () => {
      tool.activate();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('tool:propertiesChanged', {
        toolId: 'rgb-adjustment',
        properties: expect.objectContaining({
          toolId: 'rgb-adjustment',
          toolName: 'RGB Channel Adjustment',
        }),
      });
    });
  });

  describe('deactivate', () => {
    it('should reset state when deactivated', () => {
      tool.activate();
      tool.onPropertyChanged('red', 25);
      tool.onPropertyChanged('green', -15);
      tool.onPropertyChanged('blue', 10);

      tool.deactivate();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('tool:deactivated', {
        toolId: 'rgb-adjustment',
      });
    });
  });

  describe('getToolProperties', () => {
    it('should return correct tool properties structure', () => {
      const properties = tool.getToolProperties();

      expect(properties).toEqual({
        toolId: 'rgb-adjustment',
        toolName: 'RGB Channel Adjustment',
        groups: [
          {
            id: 'rgb-adjustment',
            title: 'RGB Channels',
            icon: '🎨',
            controls: [
              {
                id: 'red',
                type: 'slider',
                label: 'Red Channel',
                value: 0,
                min: -100,
                max: 100,
                step: 1,
                tooltip: 'Adjust red channel intensity (-100 to +100)',
              },
              {
                id: 'green',
                type: 'slider',
                label: 'Green Channel',
                value: 0,
                min: -100,
                max: 100,
                step: 1,
                tooltip: 'Adjust green channel intensity (-100 to +100)',
              },
              {
                id: 'blue',
                type: 'slider',
                label: 'Blue Channel',
                value: 0,
                min: -100,
                max: 100,
                step: 1,
                tooltip: 'Adjust blue channel intensity (-100 to +100)',
              },
              {
                id: 'preview',
                type: 'checkbox',
                label: 'Real-time Preview',
                value: false,
                tooltip: 'Enable real-time preview of RGB channel changes',
              },
              {
                id: 'reset',
                type: 'button',
                label: 'Reset',
                tooltip: 'Reset all RGB channels to 0',
              },
              {
                id: 'apply',
                type: 'button',
                label: 'Apply',
                tooltip: 'Apply RGB channel adjustments permanently',
              },
            ],
          },
        ],
      });
    });
  });

  describe('onPropertyChanged', () => {
    it('should handle red channel value changes', () => {
      tool.onPropertyChanged('red', 25);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('rgb:redChanged', {
        value: 25,
      });
    });

    it('should handle green channel value changes', () => {
      tool.onPropertyChanged('green', -30);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('rgb:greenChanged', {
        value: -30,
      });
    });

    it('should handle blue channel value changes', () => {
      tool.onPropertyChanged('blue', 15);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('rgb:blueChanged', {
        value: 15,
      });
    });

    it('should handle preview mode changes - enable preview', () => {
      tool.activate();
      tool.onPropertyChanged('red', 20);
      tool.onPropertyChanged('preview', true);

      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should handle preview mode changes - disable preview', () => {
      tool.activate();
      tool.onPropertyChanged('preview', true);
      tool.onPropertyChanged('red', 30);

      jest.clearAllMocks();
      tool.onPropertyChanged('preview', false);

      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should handle reset action', () => {
      tool.activate();
      tool.onPropertyChanged('red', 50);
      tool.onPropertyChanged('green', -25);
      tool.onPropertyChanged('blue', 15);

      tool.onPropertyChanged('reset', undefined);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('tool:propertiesChanged', {
        toolId: 'rgb-adjustment',
        properties: expect.objectContaining({
          groups: expect.arrayContaining([
            expect.objectContaining({
              controls: expect.arrayContaining([
                expect.objectContaining({ id: 'red', value: 0 }),
                expect.objectContaining({ id: 'green', value: 0 }),
                expect.objectContaining({ id: 'blue', value: 0 }),
              ]),
            }),
          ]),
        }),
      });
    });

    it('should handle apply action for non-zero RGB values', () => {
      tool.activate();
      tool.onPropertyChanged('red', 30);
      tool.onPropertyChanged('green', -20);
      tool.onPropertyChanged('blue', 10);

      tool.onPropertyChanged('apply', undefined);

      expect(mockHistoryManager.executeCommand).toHaveBeenCalled();
    });

    it('should not apply for zero RGB values', () => {
      tool.activate();
      tool.onPropertyChanged('apply', undefined);

      expect(mockHistoryManager.executeCommand).not.toHaveBeenCalled();
    });
  });

  describe('RGB preview functionality', () => {
    it('should apply RGB preview to image data', () => {
      tool.activate();
      tool.onPropertyChanged('preview', true);
      tool.onPropertyChanged('red', 25);

      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should handle negative RGB values in preview', () => {
      tool.activate();
      tool.onPropertyChanged('preview', true);
      tool.onPropertyChanged('red', -50);
      tool.onPropertyChanged('green', -30);
      tool.onPropertyChanged('blue', -25);

      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should restore original image when all RGB values are zero in preview', () => {
      tool.activate();
      tool.onPropertyChanged('red', 25);
      tool.onPropertyChanged('preview', true);

      jest.clearAllMocks();
      tool.onPropertyChanged('red', 0);

      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should handle mixed RGB adjustments in preview', () => {
      tool.activate();
      tool.onPropertyChanged('preview', true);
      tool.onPropertyChanged('red', 40);
      tool.onPropertyChanged('green', -15);
      tool.onPropertyChanged('blue', 25);

      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should update preview when any channel changes', () => {
      tool.activate();
      tool.onPropertyChanged('preview', true);
      tool.onPropertyChanged('red', 20);

      jest.clearAllMocks();
      tool.onPropertyChanged('green', 15);

      expect(mockContext.putImageData).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle activation without canvas', () => {
      mockContext.getImageData.mockReturnValue(null as any);

      expect(() => tool.activate()).not.toThrow();
    });

    it('should handle deactivation without being activated', () => {
      expect(() => tool.deactivate()).not.toThrow();
    });

    it('should handle property changes before activation', () => {
      expect(() => tool.onPropertyChanged('red', 25)).not.toThrow();
      expect(() => tool.onPropertyChanged('preview', true)).not.toThrow();
    });

    it('should handle extreme RGB values', () => {
      tool.activate();
      expect(() => tool.onPropertyChanged('red', 100)).not.toThrow();
      expect(() => tool.onPropertyChanged('green', -100)).not.toThrow();
      expect(() => tool.onPropertyChanged('blue', 150)).not.toThrow(); // Out of expected range
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

      expect(() => tool.onMouseDown?.(point, mouseEvent)).not.toThrow();
      expect(() => tool.onMouseMove?.(point, mouseEvent)).not.toThrow();
      expect(() => tool.onMouseUp?.(point, mouseEvent)).not.toThrow();
      expect(() => tool.onKeyDown?.('Enter', keyEvent)).not.toThrow();
      expect(() => tool.onKeyUp?.('Enter', keyEvent)).not.toThrow();
    });
  });
});
