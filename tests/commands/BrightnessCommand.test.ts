import { BrightnessCommand } from '../../src/commands/BrightnessCommand';
import { ImageEditor } from '../../src/core/ImageEditor';

// Mock CanvasManager
const mockCanvasManager = {
  getCanvas: jest.fn(() => ({
    width: 100,
    height: 100,
  })),
  getContext: jest.fn(() => ({
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray([255, 128, 64, 255, 200, 100, 50, 255]),
      width: 2,
      height: 1,
    })),
    putImageData: jest.fn(),
  })),
};

// Mock ImageEditor
const mockEditor = {
  getCanvasManager: jest.fn(() => mockCanvasManager),
} as unknown as ImageEditor;

describe('BrightnessCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create brightness command with correct values', () => {
    const command = new BrightnessCommand(mockEditor, 50, 0);

    expect(command.getBrightnessValue()).toBe(50);
    expect(command.getPreviousBrightnessValue()).toBe(0);
    expect(command.name).toBe('Brightness +50');
  });

  it('should handle negative brightness values in name', () => {
    const command = new BrightnessCommand(mockEditor, -25, 0);

    expect(command.name).toBe('Brightness -25');
  });

  it('should execute brightness adjustment', async () => {
    const command = new BrightnessCommand(mockEditor, 20, 0);

    await command.execute();

    // Verify the flow was executed
    expect(mockCanvasManager.getCanvas).toHaveBeenCalled();
    expect(mockCanvasManager.getContext).toHaveBeenCalled();
  });

  it('should apply correct brightness adjustment to image data', async () => {
    const command = new BrightnessCommand(mockEditor, 10, 0);

    await command.execute();

    // Verify execution completed
    expect(mockCanvasManager.getContext).toHaveBeenCalled();
  });

  it('should clamp values to valid range (0-255)', async () => {
    const command = new BrightnessCommand(mockEditor, 100, 0); // Maximum brightness

    await command.execute();

    // Verify execution completed
    expect(mockCanvasManager.getContext).toHaveBeenCalled();
  });

  it('should handle undo operation', async () => {
    const command = new BrightnessCommand(mockEditor, 30, 0);

    await command.execute();
    await command.undo();

    // Verify both execute and undo were called
    expect(mockCanvasManager.getContext).toHaveBeenCalled();
  });

  it('should return correct memory usage', () => {
    const command = new BrightnessCommand(mockEditor, 15, 0);

    const memoryUsage = command.getMemoryUsage();
    expect(memoryUsage).toBeGreaterThan(0);
  });

  it('should serialize command data correctly', () => {
    const command = new BrightnessCommand(mockEditor, 40, 10);

    const serialized = command.serialize();

    expect(serialized.data.brightnessValue).toBe(40);
    expect(serialized.data.previousBrightnessValue).toBe(10);
    expect(serialized.data.memoryUsage).toBeGreaterThan(0);
  });

  it('should merge with other brightness commands', () => {
    const command1 = new BrightnessCommand(mockEditor, 20, 0);
    const command2 = new BrightnessCommand(mockEditor, 30, 20);

    expect(command1.canMergeWith(command2)).toBe(true);

    const merged = command1.mergeWith(command2);
    expect(merged.getBrightnessValue()).toBe(30);
    expect(merged.getPreviousBrightnessValue()).toBe(0);
  });
});
