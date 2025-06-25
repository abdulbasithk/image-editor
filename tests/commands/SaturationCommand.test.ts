import { SaturationCommand } from '../../src/commands/SaturationCommand';
import { ImageEditor } from '../../src/core/ImageEditor';

// Mock the ImageEditor
jest.mock('../../src/core/ImageEditor');

describe('SaturationCommand', () => {
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

    // Create test image data with colors that show clear saturation changes
    originalImageData = new ImageData(100, 100);
    for (let i = 0; i < originalImageData.data.length; i += 4) {
      originalImageData.data[i] = 200; // Red
      originalImageData.data[i + 1] = 100; // Green
      originalImageData.data[i + 2] = 50; // Blue
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
      const command = new SaturationCommand(editor, 50);
      expect(command).toBeInstanceOf(SaturationCommand);
    });

    it('should set command name correctly for positive saturation', () => {
      const command = new SaturationCommand(editor, 25);
      expect(command.name).toBe('Saturation +25');
    });

    it('should set command name correctly for negative saturation', () => {
      const command = new SaturationCommand(editor, -25);
      expect(command.name).toBe('Saturation -25');
    });

    it('should set command name correctly for zero saturation', () => {
      const command = new SaturationCommand(editor, 0);
      expect(command.name).toBe('Saturation 0');
    });
  });

  describe('execute', () => {
    it('should capture image data before adjustment', async () => {
      const command = new SaturationCommand(editor, 50);
      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('should apply saturation adjustment to image', async () => {
      const command = new SaturationCommand(editor, 50);
      await command.execute();

      expect(mockContext.putImageData).toHaveBeenCalled();
      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Check that saturation was applied (colors should be more saturated)
      // Original: R=200, G=100, B=50 (vibrant orange color)
      // With +50% saturation, all channels should change significantly
      expect(adjustedImageData.data[0]).not.toBe(200); // Red channel should change
      expect(adjustedImageData.data[1]).not.toBe(100); // Green channel should change
      expect(adjustedImageData.data[2]).not.toBe(50); // Blue channel should change
      expect(adjustedImageData.data[3]).toBe(255); // Alpha should remain unchanged
    });

    it('should handle negative saturation values (desaturate)', async () => {
      const command = new SaturationCommand(editor, -50);
      await command.execute();

      expect(mockContext.putImageData).toHaveBeenCalled();
      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Check that negative saturation was applied (colors should be less saturated)
      // With -50% saturation, all channels should change toward gray
      expect(adjustedImageData.data[0]).not.toBe(200); // Red channel should change
      expect(adjustedImageData.data[1]).not.toBe(100); // Green channel should change
      expect(adjustedImageData.data[2]).not.toBe(50); // Blue channel should change
      expect(adjustedImageData.data[3]).toBe(255); // Alpha should remain unchanged
    });

    it('should not modify alpha channel', async () => {
      const command = new SaturationCommand(editor, 75);
      await command.execute();

      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Check that alpha channel is preserved for all pixels
      for (let i = 3; i < adjustedImageData.data.length; i += 4) {
        expect(adjustedImageData.data[i]).toBe(255);
      }
    });

    it('should create grayscale image with -100 saturation', async () => {
      const command = new SaturationCommand(editor, -100);
      await command.execute();

      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // With -100 saturation, all color channels should be equal (grayscale)
      const red = adjustedImageData.data[0];
      const green = adjustedImageData.data[1];
      const blue = adjustedImageData.data[2];

      expect(red).toBe(green);
      expect(green).toBe(blue);
      expect(adjustedImageData.data[3]).toBe(255); // Alpha unchanged
    });
  });

  describe('undo', () => {
    it('should restore original image data', async () => {
      const command = new SaturationCommand(editor, 50);
      await command.execute();

      // Clear previous calls
      (mockContext.putImageData as jest.Mock).mockClear();

      await command.undo();

      expect(mockContext.putImageData).toHaveBeenCalledWith(originalImageData, 0, 0);
    });
  });

  describe('memory management', () => {
    it('should have basic memory usage tracking', () => {
      const command = new SaturationCommand(editor, 50);
      expect(command.getMemoryUsage()).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero saturation correctly', async () => {
      const command = new SaturationCommand(editor, 0);
      await command.execute();

      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Zero saturation should leave image unchanged
      expect(adjustedImageData.data[0]).toBe(200);
      expect(adjustedImageData.data[1]).toBe(100);
      expect(adjustedImageData.data[2]).toBe(50);
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

      const command = new SaturationCommand(editor, 100); // High saturation
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

    it('should handle grayscale input correctly', async () => {
      // Create grayscale image data
      const grayscaleImageData = new ImageData(10, 10);
      for (let i = 0; i < grayscaleImageData.data.length; i += 4) {
        grayscaleImageData.data[i] = 128; // Gray
        grayscaleImageData.data[i + 1] = 128; // Gray
        grayscaleImageData.data[i + 2] = 128; // Gray
        grayscaleImageData.data[i + 3] = 255; // Alpha
      }

      (mockContext.getImageData as jest.Mock).mockReturnValue(grayscaleImageData);

      const command = new SaturationCommand(editor, 50);
      await command.execute();

      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjustedImageData = putImageDataCall[0] as ImageData;

      // Grayscale image should remain grayscale regardless of saturation adjustment
      expect(adjustedImageData.data[0]).toBe(128);
      expect(adjustedImageData.data[1]).toBe(128);
      expect(adjustedImageData.data[2]).toBe(128);
    });
  });
});
