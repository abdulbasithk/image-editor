import { ContrastCommand } from '../../src/commands/ContrastCommand';
import { ImageEditor } from '../../src/core/ImageEditor';

// Mock the ImageEditor
jest.mock('../../src/core/ImageEditor');

describe('ContrastCommand', () => {
  let editor: jest.Mocked<ImageEditor>;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let mockCanvasManager: any;
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

    // Mock canvas manager
    mockCanvasManager = {
      getCanvas: jest.fn(() => mockCanvas),
      getContext: jest.fn(() => mockContext),
    };

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
      const command = new ContrastCommand(editor, 50, 0);
      expect(command).toBeInstanceOf(ContrastCommand);
    });

    it('should set command name correctly for positive contrast', () => {
      const command = new ContrastCommand(editor, 25, 0);
      expect(command.name).toBe('Contrast +25');
    });

    it('should set command name correctly for negative contrast', () => {
      const command = new ContrastCommand(editor, -25, 0);
      expect(command.name).toBe('Contrast -25');
    });

    it('should set command name correctly for zero contrast', () => {
      const command = new ContrastCommand(editor, 0, 0);
      expect(command.name).toBe('Contrast 0');
    });
  });

  describe('execute', () => {
    it('should capture image data before adjustment', async () => {
      const command = new ContrastCommand(editor, 50, 0);
      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('should apply contrast adjustment to image', async () => {
      const command = new ContrastCommand(editor, 50, 0);
      await command.execute();

      expect(mockContext.putImageData).toHaveBeenCalled();
      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Check that contrast was applied (should increase contrast from light gray 200)
      // With factor 1.5, (200 - 128) * 1.5 + 128 = 72 * 1.5 + 128 = 108 + 128 = 236
      expect(adjustedImageData.data[0]).toBe(236); // Red channel should increase
      expect(adjustedImageData.data[1]).toBe(236); // Green channel should increase
      expect(adjustedImageData.data[2]).toBe(236); // Blue channel should increase
      expect(adjustedImageData.data[3]).toBe(255); // Alpha should remain unchanged
    });

    it('should handle negative contrast values', async () => {
      const command = new ContrastCommand(editor, -50, 0);
      await command.execute();

      expect(mockContext.putImageData).toHaveBeenCalled();
      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Check that negative contrast was applied
      // With factor 0.5, (200 - 128) * 0.5 + 128 = 72 * 0.5 + 128 = 36 + 128 = 164
      expect(adjustedImageData.data[0]).toBe(164); // Red channel should decrease
      expect(adjustedImageData.data[1]).toBe(164); // Green channel should decrease
      expect(adjustedImageData.data[2]).toBe(164); // Blue channel should decrease
    });

    it('should not modify alpha channel', async () => {
      const command = new ContrastCommand(editor, 75, 0);
      await command.execute();

      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Check that alpha channel is preserved for all pixels
      for (let i = 3; i < adjustedImageData.data.length; i += 4) {
        expect(adjustedImageData.data[i]).toBe(255);
      }
    });
  });

  describe('undo', () => {
    it('should restore original image data', async () => {
      const command = new ContrastCommand(editor, 50, 0);
      await command.execute();

      // Clear previous calls
      (mockContext.putImageData as jest.Mock).mockClear();

      await command.undo();

      expect(mockContext.putImageData).toHaveBeenCalledWith(originalImageData, 0, 0);
    });
  });

  describe('memory management', () => {
    it('should have basic memory usage tracking', () => {
      const command = new ContrastCommand(editor, 50, 0);
      expect(command.getMemoryUsage()).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero contrast correctly', async () => {
      const command = new ContrastCommand(editor, 0, 0);
      await command.execute();

      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Zero contrast should leave image unchanged
      expect(adjustedImageData.data[0]).toBe(200);
      expect(adjustedImageData.data[1]).toBe(200);
      expect(adjustedImageData.data[2]).toBe(200);
    });

    it('should clamp values to valid range', async () => {
      // Create image data with extreme values
      const extremeImageData = new ImageData(10, 10);
      for (let i = 0; i < extremeImageData.data.length; i += 4) {
        extremeImageData.data[i] = 255; // Max red
        extremeImageData.data[i + 1] = 0; // Min green
        extremeImageData.data[i + 2] = 128; // Mid blue
        extremeImageData.data[i + 3] = 255; // Alpha
      }

      (mockContext.getImageData as jest.Mock).mockReturnValue(extremeImageData);

      const command = new ContrastCommand(editor, 100, 0); // High contrast
      await command.execute();

      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Values should be clamped to 0-255 range
      for (let i = 0; i < adjustedImageData.data.length; i += 4) {
        expect(adjustedImageData.data[i]).toBeGreaterThanOrEqual(0);
        expect(adjustedImageData.data[i]).toBeLessThanOrEqual(255);
        expect(adjustedImageData.data[i + 1]).toBeGreaterThanOrEqual(0);
        expect(adjustedImageData.data[i + 1]).toBeLessThanOrEqual(255);
        expect(adjustedImageData.data[i + 2]).toBeGreaterThanOrEqual(0);
        expect(adjustedImageData.data[i + 2]).toBeLessThanOrEqual(255);
      }
    });
  });
});
