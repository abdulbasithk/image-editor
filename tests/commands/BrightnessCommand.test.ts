import { BrightnessCommand } from '../../src/commands/BrightnessCommand';
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
  createImageData: jest.fn((width: number, height: number) =>
    createMockImageData(width, height, 0),
  ),
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

// Mock ImageEditor
const mockEditor = {
  getCanvasManager: jest.fn(() => mockCanvasManager),
  getEventEmitter: jest.fn(() => mockEventEmitter),
  isDestroyed: jest.fn(() => false),
} as unknown as ImageEditor;

describe('BrightnessCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContext.getImageData.mockReturnValue(createMockImageData(100, 100));
  });

  describe('constructor', () => {
    it('should create brightness command with correct positive values', () => {
      const command = new BrightnessCommand(mockEditor, 50, 0);

      expect(command.getBrightnessValue()).toBe(50);
      expect(command.getPreviousBrightnessValue()).toBe(0);
      expect(command.name).toBe('Brightness +50');
      expect(command.id).toContain('cmd_');
    });

    it('should create brightness command with correct negative values', () => {
      const command = new BrightnessCommand(mockEditor, -25, 10);

      expect(command.getBrightnessValue()).toBe(-25);
      expect(command.getPreviousBrightnessValue()).toBe(10);
      expect(command.name).toBe('Brightness -25');
    });

    it('should create brightness command with zero brightness', () => {
      const command = new BrightnessCommand(mockEditor, 0, 0);

      expect(command.getBrightnessValue()).toBe(0);
      expect(command.name).toBe('Brightness 0');
    });

    it('should handle default previous brightness value', () => {
      const command = new BrightnessCommand(mockEditor, 30);

      expect(command.getPreviousBrightnessValue()).toBe(0);
    });
  });

  describe('execute', () => {
    it('should capture image data before adjustment', async () => {
      const command = new BrightnessCommand(mockEditor, 50, 0);

      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should apply positive brightness adjustment', async () => {
      const command = new BrightnessCommand(mockEditor, 20, 0);

      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalledTimes(2); // Before and after
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should apply negative brightness adjustment', async () => {
      const command = new BrightnessCommand(mockEditor, -30, 0);

      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalledTimes(2);
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should handle zero brightness adjustment', async () => {
      const command = new BrightnessCommand(mockEditor, 0, 0);

      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalledTimes(2);
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should handle extreme positive brightness values', async () => {
      const command = new BrightnessCommand(mockEditor, 100, 0);

      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalled();
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should handle extreme negative brightness values', async () => {
      const command = new BrightnessCommand(mockEditor, -100, 0);

      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalled();
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should apply brightness correctly to different pixel values', async () => {
      // Create mock image data with specific pixel values to test clamping
      const testImageData = {
        data: new Uint8ClampedArray([
          255,
          255,
          255,
          255, // White pixel (should clamp at 255 when increasing)
          0,
          0,
          0,
          255, // Black pixel (should clamp at 0 when decreasing)
          128,
          128,
          128,
          255, // Gray pixel (should adjust normally)
          64,
          192,
          32,
          255, // Mixed values
        ]),
        width: 2,
        height: 2,
      };
      mockContext.getImageData.mockReturnValue(testImageData);

      const command = new BrightnessCommand(mockEditor, 50, 0);
      await command.execute();

      expect(mockContext.putImageData).toHaveBeenCalled();
    });
  });

  describe('undo', () => {
    it('should restore original image data when imageDataBefore exists', async () => {
      const command = new BrightnessCommand(mockEditor, 30, 0);

      await command.execute();
      await command.undo();

      expect(mockContext.putImageData).toHaveBeenCalledTimes(2); // Once for execute, once for undo
    });

    it('should handle undo when imageDataBefore is null', async () => {
      const command = new BrightnessCommand(mockEditor, 30, 0);

      // Call undo without execute first
      await command.undo();

      expect(mockContext.putImageData).not.toHaveBeenCalled();
    });
  });

  describe('memory management', () => {
    it('should return base memory usage when no image data is stored', () => {
      const command = new BrightnessCommand(mockEditor, 15, 0);

      const memoryUsage = command.getMemoryUsage();
      expect(memoryUsage).toBe(1024); // Base memory usage from BaseCommand
    });

    it('should include imageDataBefore in memory usage calculation', async () => {
      const command = new BrightnessCommand(mockEditor, 40, 0);
      const initialMemory = command.getMemoryUsage();

      await command.execute();

      const postExecutionMemory = command.getMemoryUsage();
      expect(postExecutionMemory).toBeGreaterThan(initialMemory);
    });

    it('should include both imageDataBefore and imageDataAfter in memory usage', async () => {
      const command = new BrightnessCommand(mockEditor, 25, 0);

      await command.execute();

      const memoryUsage = command.getMemoryUsage();
      // Should include base + imageDataBefore + imageDataAfter
      const expectedMinimum = 1024 + 100 * 100 * 4 + 100 * 100 * 4; // Base + 2 image data arrays
      expect(memoryUsage).toBeGreaterThanOrEqual(expectedMinimum);
    });
  });

  describe('serialization', () => {
    it('should serialize command data correctly', () => {
      const command = new BrightnessCommand(mockEditor, 40, 10);

      const serialized = command.serialize();

      expect(serialized.data.brightnessValue).toBe(40);
      expect(serialized.data.previousBrightnessValue).toBe(10);
      expect(serialized.data.memoryUsage).toBeGreaterThan(0);
      expect(serialized.name).toBe('Brightness +40');
      expect(serialized.timestamp).toBeDefined();
    });

    it('should serialize with negative brightness values', () => {
      const command = new BrightnessCommand(mockEditor, -60, 20);

      const serialized = command.serialize();

      expect(serialized.data.brightnessValue).toBe(-60);
      expect(serialized.data.previousBrightnessValue).toBe(20);
    });
  });

  describe('command merging', () => {
    it('should merge with other brightness commands within time window', () => {
      const command1 = new BrightnessCommand(mockEditor, 20, 0);
      const command2 = new BrightnessCommand(mockEditor, 30, 20);

      expect(command1.canMergeWith(command2)).toBe(true);

      const merged = command1.mergeWith(command2);
      expect(merged.getBrightnessValue()).toBe(30);
      expect(merged.getPreviousBrightnessValue()).toBe(0);
    });

    it('should not merge with commands outside time window', () => {
      const command1 = new BrightnessCommand(mockEditor, 20, 0);

      // Mock older timestamp
      const command2 = new BrightnessCommand(mockEditor, 30, 20);
      Object.defineProperty(command2, 'timestamp', {
        value: Date.now() - 1000, // 1 second ago
        writable: false,
      });

      expect(command1.canMergeWith(command2)).toBe(false);
    });

    it('should not merge with non-brightness commands', () => {
      const brightnessCommand = new BrightnessCommand(mockEditor, 20, 0);
      const mockOtherCommand = {
        timestamp: Date.now(),
      } as any;

      expect(brightnessCommand.canMergeWith(mockOtherCommand)).toBe(false);
    });

    it('should preserve image data states when merging', async () => {
      const command1 = new BrightnessCommand(mockEditor, 20, 0);
      const command2 = new BrightnessCommand(mockEditor, 30, 20);

      // Execute both commands to populate image data
      await command1.execute();
      await command2.execute();

      const merged = command1.mergeWith(command2);

      // The merged command should have the original before state and final after state
      expect(merged.getBrightnessValue()).toBe(30);
      expect(merged.getPreviousBrightnessValue()).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle fractional brightness values', async () => {
      const command = new BrightnessCommand(mockEditor, 33.33, 0);

      await expect(command.execute()).resolves.not.toThrow();
      expect(command.getBrightnessValue()).toBe(33.33);
    });

    it('should handle very large brightness values', async () => {
      const command = new BrightnessCommand(mockEditor, 1000, 0);

      await expect(command.execute()).resolves.not.toThrow();
    });

    it('should handle very small brightness values', async () => {
      const command = new BrightnessCommand(mockEditor, -1000, 0);

      await expect(command.execute()).resolves.not.toThrow();
    });

    it('should handle empty image data', async () => {
      const emptyImageData = {
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 0,
      };
      mockContext.getImageData.mockReturnValue(emptyImageData);

      const command = new BrightnessCommand(mockEditor, 50, 0);

      await expect(command.execute()).resolves.not.toThrow();
    });

    it('should preserve alpha channel during brightness adjustment', async () => {
      const testImageData = {
        data: new Uint8ClampedArray([
          128,
          128,
          128,
          255, // Full alpha
          64,
          64,
          64,
          128, // Half alpha
          192,
          192,
          192,
          0, // Zero alpha
        ]),
        width: 3,
        height: 1,
      };
      mockContext.getImageData.mockReturnValue(testImageData);

      const command = new BrightnessCommand(mockEditor, 50, 0);
      await command.execute();

      expect(mockContext.putImageData).toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    it('should return correct brightness value', () => {
      const command = new BrightnessCommand(mockEditor, 75, 25);

      expect(command.getBrightnessValue()).toBe(75);
    });

    it('should return correct previous brightness value', () => {
      const command = new BrightnessCommand(mockEditor, 75, 25);

      expect(command.getPreviousBrightnessValue()).toBe(25);
    });
  });
});
