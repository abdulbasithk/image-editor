import { HueCommand } from '../../src/commands/HueCommand';
import { ImageEditor } from '../../src/core/ImageEditor';
import { CanvasManager } from '../../src/core/CanvasManager';

// Mock dependencies
jest.mock('../../src/core/ImageEditor');
jest.mock('../../src/core/CanvasManager');

describe('HueCommand', () => {
  let editor: jest.Mocked<ImageEditor>;
  let mockCanvasManager: jest.Mocked<CanvasManager>;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let originalImageData: ImageData;

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

    // Mock canvas manager
    mockCanvasManager = {
      getCanvas: jest.fn(() => mockCanvas),
      getContext: jest.fn(() => mockContext),
    } as any;

    // Mock ImageEditor
    editor = {
      getCanvasManager: jest.fn(() => mockCanvasManager),
      getHistoryManager: jest.fn(() => ({
        executeCommand: jest.fn(),
      })),
    } as any;

    // Setup context methods
    jest.spyOn(mockContext, 'getImageData').mockReturnValue(originalImageData);
    jest.spyOn(mockContext, 'putImageData').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create command with correct properties', () => {
      const command = new HueCommand(editor, 90);
      expect(command).toBeInstanceOf(HueCommand);
    });

    it('should set command name correctly for positive hue', () => {
      const command = new HueCommand(editor, 90);
      expect((command as any).name).toBe('Hue +90°');
    });

    it('should set command name correctly for negative hue', () => {
      const command = new HueCommand(editor, -45);
      expect((command as any).name).toBe('Hue -45°');
    });

    it('should set command name correctly for zero hue', () => {
      const command = new HueCommand(editor, 0);
      expect((command as any).name).toBe('Hue 0°');
    });
  });

  describe('execute', () => {
    it('should capture image data before adjustment', async () => {
      const command = new HueCommand(editor, 90);
      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('should apply hue adjustment to image', async () => {
      const command = new HueCommand(editor, 90);
      await command.execute();

      expect(mockContext.putImageData).toHaveBeenCalled();
      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Check that hue was applied (colors should be shifted)
      // Original: R=255, G=128, B=0 (orange color)
      // With +90° hue shift, orange becomes green: RGB(0, 255, 0)
      expect(adjustedImageData.data[0]).toBe(0); // Red should become 0
      expect(adjustedImageData.data[1]).toBe(255); // Green should become 255
      expect(adjustedImageData.data[2]).toBe(0); // Blue stays 0
      expect(adjustedImageData.data[3]).toBe(255); // Alpha should remain unchanged
    });

    it('should handle negative hue values (shift backward)', async () => {
      const command = new HueCommand(editor, -90);
      await command.execute();

      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Check that negative hue was applied (colors should be shifted backward)
      // Original: R=255, G=128, B=0 (orange color)
      // With -90° hue shift, orange becomes magenta: RGB(255, 0, 254)
      expect(adjustedImageData.data[0]).toBe(255); // Red stays 255
      expect(adjustedImageData.data[1]).toBe(0); // Green becomes 0
      expect(adjustedImageData.data[2]).toBe(254); // Blue becomes 254
      expect(adjustedImageData.data[3]).toBe(255); // Alpha should remain unchanged
    });

    it('should not modify alpha channel', async () => {
      const command = new HueCommand(editor, 180);
      await command.execute();

      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Check that all alpha values remain unchanged
      for (let i = 3; i < adjustedImageData.data.length; i += 4) {
        expect(adjustedImageData.data[i]).toBe(255);
      }
    });

    it('should handle hue wraparound at 360 degrees', async () => {
      const command = new HueCommand(editor, 360);
      await command.execute();

      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // 360° should be equivalent to 0° (full circle)
      // Colors should be approximately the same as original
      expect(adjustedImageData.data[0]).toBeCloseTo(255, 0);
      expect(adjustedImageData.data[1]).toBeCloseTo(128, 0);
      expect(adjustedImageData.data[2]).toBeCloseTo(0, 0);
    });
  });

  describe('undo', () => {
    it('should restore original image data', async () => {
      const command = new HueCommand(editor, 90);
      await command.execute();
      await command.undo();

      expect(mockContext.putImageData).toHaveBeenCalledTimes(2);
      const undoCall = (mockContext.putImageData as jest.Mock).mock.calls[1];
      expect(undoCall[0]).toBe(originalImageData);
      expect(undoCall[1]).toBe(0);
      expect(undoCall[2]).toBe(0);
    });
  });

  describe('memory management', () => {
    it('should have basic memory usage tracking', () => {
      const command = new HueCommand(editor, 90);
      expect(command.getMemoryUsage()).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero hue correctly', async () => {
      const command = new HueCommand(editor, 0);
      await command.execute();

      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Zero hue should leave image unchanged
      expect(adjustedImageData.data[0]).toBe(255);
      expect(adjustedImageData.data[1]).toBe(128);
      expect(adjustedImageData.data[2]).toBe(0);
    });

    it('should clamp values to valid range', async () => {
      const command = new HueCommand(editor, 720); // Two full rotations
      await command.execute();

      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Should handle large hue values by wrapping
      for (let i = 0; i < adjustedImageData.data.length; i += 4) {
        expect(adjustedImageData.data[i]).toBeGreaterThanOrEqual(0);
        expect(adjustedImageData.data[i]).toBeLessThanOrEqual(255);
        expect(adjustedImageData.data[i + 1]).toBeGreaterThanOrEqual(0);
        expect(adjustedImageData.data[i + 1]).toBeLessThanOrEqual(255);
        expect(adjustedImageData.data[i + 2]).toBeGreaterThanOrEqual(0);
        expect(adjustedImageData.data[i + 2]).toBeLessThanOrEqual(255);
      }
    });

    it('should handle grayscale input correctly', () => {
      // Create grayscale image data
      const grayscaleImageData = new ImageData(10, 10);
      for (let i = 0; i < grayscaleImageData.data.length; i += 4) {
        grayscaleImageData.data[i] = 128; // Gray
        grayscaleImageData.data[i + 1] = 128; // Gray
        grayscaleImageData.data[i + 2] = 128; // Gray
        grayscaleImageData.data[i + 3] = 255; // Alpha
      }

      jest.spyOn(mockContext, 'getImageData').mockReturnValue(grayscaleImageData);

      const command = new HueCommand(editor, 180);
      expect(async () => await command.execute()).not.toThrow();
    });
  });
});
