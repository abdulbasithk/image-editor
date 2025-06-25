import { BrightnessAdjustmentTool } from '../../src/tools/BrightnessAdjustmentTool';
import { ImageEditor } from '../../src/core/ImageEditor';
import { CanvasManager } from '../../src/core/CanvasManager';
import { EventEmitter } from '../../src/core/EventEmitter';

// Mock CanvasManager
const mockCanvasManager = {
  getCanvas: jest.fn(() => ({
    width: 100,
    height: 100,
  })),
  getContext: jest.fn(() => ({
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray([255, 128, 64, 255]),
      width: 1,
      height: 1,
    })),
    putImageData: jest.fn(),
  })),
} as unknown as CanvasManager;

// Mock ImageEditor
const mockEventEmitter = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
} as unknown as EventEmitter;

const mockHistoryManager = {
  executeCommand: jest.fn(),
};

const mockEditor = {
  getCanvasManager: jest.fn(() => mockCanvasManager),
  getEventEmitter: jest.fn(() => mockEventEmitter),
  getHistoryManager: jest.fn(() => mockHistoryManager),
} as unknown as ImageEditor;

describe('BrightnessAdjustmentTool', () => {
  let tool: BrightnessAdjustmentTool;

  beforeEach(() => {
    jest.clearAllMocks();
    tool = new BrightnessAdjustmentTool(mockEditor, mockCanvasManager);
  });

  it('should have correct tool properties', () => {
    expect(tool.id).toBe('brightness');
    expect(tool.name).toBe('Brightness Adjustment');
    expect(tool.category).toBe('Adjustments');
    expect(tool.icon).toBe('☀️');
    expect(tool.cursor).toBe('default');
    expect(tool.shortcut).toBe('B');
  });

  it('should activate tool correctly', () => {
    tool.activate();

    expect(mockEventEmitter.emit).toHaveBeenCalledWith('tool:activated', {
      toolId: 'brightness',
      toolName: 'Brightness Adjustment',
    });

    expect(mockEventEmitter.emit).toHaveBeenCalledWith('tool:propertiesChanged', {
      toolId: 'brightness',
      properties: expect.any(Object),
    });
  });

  it('should deactivate tool correctly', () => {
    tool.activate();
    tool.deactivate();

    expect(mockEventEmitter.emit).toHaveBeenCalledWith('tool:deactivated', {
      toolId: 'brightness',
    });
  });

  it('should return correct tool properties', () => {
    const properties = tool.getToolProperties();

    expect(properties.toolId).toBe('brightness');
    expect(properties.toolName).toBe('Brightness Adjustment');
    expect(properties.groups).toHaveLength(1);

    const group = properties.groups[0]!;
    expect(group.id).toBe('brightness-adjustment');
    expect(group.title).toBe('Brightness');
    expect(group.controls).toHaveLength(4);

    const controls = group.controls;
    expect(controls[0]!.id).toBe('brightness');
    expect(controls[0]!.type).toBe('slider');
    expect(controls[1]!.id).toBe('preview');
    expect(controls[1]!.type).toBe('checkbox');
    expect(controls[2]!.id).toBe('reset');
    expect(controls[2]!.type).toBe('button');
    expect(controls[3]!.id).toBe('apply');
    expect(controls[3]!.type).toBe('button');
  });

  it('should handle brightness property change', () => {
    tool.activate();
    tool.onPropertyChanged('brightness', 50);

    expect(mockEventEmitter.emit).toHaveBeenCalledWith('brightness:changed', {
      value: 50,
    });
  });

  it('should handle preview mode toggle', () => {
    tool.activate();
    tool.onPropertyChanged('preview', true);

    // Should not throw error
    expect(() => tool.onPropertyChanged('preview', true)).not.toThrow();
  });

  it('should handle reset action', () => {
    tool.activate();
    tool.onPropertyChanged('brightness', 50);
    tool.onPropertyChanged('reset', true);

    expect(mockEventEmitter.emit).toHaveBeenCalledWith('tool:propertiesChanged', {
      toolId: 'brightness',
      properties: expect.any(Object),
    });
  });

  it('should handle apply action with brightness change', async () => {
    tool.activate();
    tool.onPropertyChanged('brightness', 30);
    tool.onPropertyChanged('apply', true);

    expect(mockHistoryManager.executeCommand).toHaveBeenCalled();
  });

  it('should not create command when applying zero brightness', () => {
    tool.activate();
    tool.onPropertyChanged('brightness', 0);
    tool.onPropertyChanged('apply', true);

    expect(mockHistoryManager.executeCommand).not.toHaveBeenCalled();
  });

  it('should handle unknown property changes gracefully', () => {
    tool.activate();

    expect(() => tool.onPropertyChanged('unknown', 'value')).not.toThrow();
  });

  it('should have optional mouse and keyboard event handlers', () => {
    expect(typeof tool.onMouseDown).toBe('function');
    expect(typeof tool.onMouseMove).toBe('function');
    expect(typeof tool.onMouseUp).toBe('function');
    expect(typeof tool.onKeyDown).toBe('function');
    expect(typeof tool.onKeyUp).toBe('function');
  });
});
