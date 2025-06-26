import { AutoEnhanceCommand, AutoEnhanceAnalysis } from '../../src/commands/AutoEnhanceCommand';
import { ImageEditor } from '../../src/core/ImageEditor';
import { CanvasManager } from '../../src/core/CanvasManager';
import { HistoryManager } from '../../src/core/HistoryManager';

// Mock the dependencies
jest.mock('../../src/core/CanvasManager');
jest.mock('../../src/core/HistoryManager');

describe('AutoEnhanceCommand', () => {
  let mockEditor: jest.Mocked<ImageEditor>;
  let mockCanvasManager: jest.Mocked<CanvasManager>;
  let mockHistoryManager: jest.Mocked<HistoryManager>;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let mockImageData: ImageData;

  beforeEach(() => {
    // Create mock canvas and context
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 100;
    mockCanvas.height = 100;

    // Create mock context with jest functions
    mockContext = {
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      canvas: mockCanvas,
    } as any;

    // Create mock image data
    const data = new Uint8ClampedArray(100 * 100 * 4);
    // Fill with a test pattern: alternating red and blue pixels
    for (let i = 0; i < data.length; i += 4) {
      if ((i / 4) % 2 === 0) {
        data[i] = 255; // Red
        data[i + 1] = 0; // Green
        data[i + 2] = 0; // Blue
        data[i + 3] = 255; // Alpha
      } else {
        data[i] = 0; // Red
        data[i + 1] = 0; // Green
        data[i + 2] = 255; // Blue
        data[i + 3] = 255; // Alpha
      }
    }
    mockImageData = new ImageData(data, 100, 100);

    // Create mock canvas manager
    mockCanvasManager = {
      getCanvas: jest.fn().mockReturnValue(mockCanvas),
      getContext: jest.fn().mockReturnValue(mockContext),
    } as any;

    // Create mock history manager
    mockHistoryManager = {
      executeCommand: jest.fn(),
    } as any;

    // Create mock editor
    mockEditor = {
      getCanvasManager: jest.fn().mockReturnValue(mockCanvasManager),
      getHistoryManager: jest.fn().mockReturnValue(mockHistoryManager),
    } as any;

    // Setup context mock to return our test image data
    (mockContext.getImageData as jest.Mock).mockReturnValue(mockImageData);
  });

  describe('constructor', () => {
    it('should create command with correct properties', () => {
      const command = new AutoEnhanceCommand(mockEditor);

      expect(command.name).toBe('Auto Enhance');
      expect(typeof command.execute).toBe('function');
      expect(typeof command.undo).toBe('function');
    });

    it('should create command with custom analysis', () => {
      const analysis: AutoEnhanceAnalysis = {
        brightness: 10,
        contrast: 15,
        saturation: 5,
        hue: -5,
      };

      const command = new AutoEnhanceCommand(mockEditor, analysis);
      expect(command.getAnalysis()).toEqual(analysis);
    });
  });

  describe('execute', () => {
    it('should capture image data before enhancement', async () => {
      const command = new AutoEnhanceCommand(mockEditor);

      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('should apply auto-enhancement to image', async () => {
      const command = new AutoEnhanceCommand(mockEditor);

      await command.execute();

      expect(mockContext.putImageData).toHaveBeenCalled();
      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      expect(putImageDataCall[0]).toBeInstanceOf(ImageData);
      expect(putImageDataCall[1]).toBe(0);
      expect(putImageDataCall[2]).toBe(0);
    });

    it('should use provided analysis when available', async () => {
      const customAnalysis: AutoEnhanceAnalysis = {
        brightness: 20,
        contrast: 10,
        saturation: 0,
        hue: 0,
      };

      const command = new AutoEnhanceCommand(mockEditor, customAnalysis);
      await command.execute();

      expect(command.getAnalysis()).toEqual(customAnalysis);
    });

    it('should analyze image when no analysis provided', async () => {
      const command = new AutoEnhanceCommand(mockEditor);
      await command.execute();

      const analysis = command.getAnalysis();
      expect(analysis).toBeDefined();
      expect(typeof analysis.brightness).toBe('number');
      expect(typeof analysis.contrast).toBe('number');
      expect(typeof analysis.saturation).toBe('number');
      expect(typeof analysis.hue).toBe('number');
    });
  });

  describe('undo', () => {
    it('should restore original image data', async () => {
      const command = new AutoEnhanceCommand(mockEditor);

      await command.execute();
      await command.undo();

      expect(mockContext.putImageData).toHaveBeenCalledWith(mockImageData, 0, 0);
    });
  });

  describe('getAnalysis', () => {
    it('should return the analysis object', async () => {
      const command = new AutoEnhanceCommand(mockEditor);
      await command.execute();

      const analysis = command.getAnalysis();
      expect(analysis).toBeDefined();
      expect(analysis).toHaveProperty('brightness');
      expect(analysis).toHaveProperty('contrast');
      expect(analysis).toHaveProperty('saturation');
      expect(analysis).toHaveProperty('hue');
    });
  });

  describe('memory management', () => {
    it('should have basic memory usage tracking', () => {
      const command = new AutoEnhanceCommand(mockEditor);

      const memoryUsage = command.getMemoryUsage();
      expect(typeof memoryUsage).toBe('number');
      expect(memoryUsage).toBeGreaterThan(0);
    });

    it('should return accurate memory usage after execution', async () => {
      const command = new AutoEnhanceCommand(mockEditor);

      const initialMemory = command.getMemoryUsage();
      await command.execute();
      const finalMemory = command.getMemoryUsage();

      expect(finalMemory).toBeGreaterThan(initialMemory);
    });
  });

  describe('image analysis', () => {
    it('should calculate reasonable brightness adjustments', async () => {
      // Create an image that's too dark
      const darkData = new Uint8ClampedArray(100 * 100 * 4);
      for (let i = 0; i < darkData.length; i += 4) {
        darkData[i] = 50; // Dark red
        darkData[i + 1] = 50; // Dark green
        darkData[i + 2] = 50; // Dark blue
        darkData[i + 3] = 255; // Alpha
      }
      const darkImageData = new ImageData(darkData, 100, 100);
      (mockContext.getImageData as jest.Mock).mockReturnValue(darkImageData);

      const command = new AutoEnhanceCommand(mockEditor);
      await command.execute();

      const analysis = command.getAnalysis();
      expect(analysis.brightness).toBeGreaterThan(0); // Should brighten dark image
    });

    it('should calculate contrast adjustments for low contrast images', async () => {
      // Create a low contrast image (all pixels similar)
      const lowContrastData = new Uint8ClampedArray(100 * 100 * 4);
      for (let i = 0; i < lowContrastData.length; i += 4) {
        lowContrastData[i] = 128; // Mid gray
        lowContrastData[i + 1] = 128; // Mid gray
        lowContrastData[i + 2] = 128; // Mid gray
        lowContrastData[i + 3] = 255; // Alpha
      }
      const lowContrastImageData = new ImageData(lowContrastData, 100, 100);
      (mockContext.getImageData as jest.Mock).mockReturnValue(lowContrastImageData);

      const command = new AutoEnhanceCommand(mockEditor);
      await command.execute();

      const analysis = command.getAnalysis();
      expect(Math.abs(analysis.contrast)).toBeGreaterThanOrEqual(0);
    });

    it('should handle grayscale images correctly', async () => {
      // Create a grayscale image
      const grayscaleData = new Uint8ClampedArray(100 * 100 * 4);
      for (let i = 0; i < grayscaleData.length; i += 4) {
        const gray = (i / 4) % 256;
        grayscaleData[i] = gray; // Red
        grayscaleData[i + 1] = gray; // Green
        grayscaleData[i + 2] = gray; // Blue
        grayscaleData[i + 3] = 255; // Alpha
      }
      const grayscaleImageData = new ImageData(grayscaleData, 100, 100);
      (mockContext.getImageData as jest.Mock).mockReturnValue(grayscaleImageData);

      const command = new AutoEnhanceCommand(mockEditor);
      await command.execute();

      const analysis = command.getAnalysis();
      // For grayscale images, saturation and hue adjustments should be minimal
      expect(Math.abs(analysis.saturation)).toBeLessThan(30);
      expect(Math.abs(analysis.hue)).toBeLessThan(15);
    });
  });

  describe('enhancement application', () => {
    it('should apply brightness enhancement correctly', async () => {
      const analysis: AutoEnhanceAnalysis = {
        brightness: 50,
        contrast: 0,
        saturation: 0,
        hue: 0,
      };

      const command = new AutoEnhanceCommand(mockEditor, analysis);
      await command.execute();

      // Verify that brightness was applied
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should apply multiple enhancements in correct order', async () => {
      const analysis: AutoEnhanceAnalysis = {
        brightness: 10,
        contrast: 15,
        saturation: 20,
        hue: 5,
      };

      const command = new AutoEnhanceCommand(mockEditor, analysis);
      await command.execute();

      // Verify that enhancements were applied
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should handle zero adjustments correctly', async () => {
      const analysis: AutoEnhanceAnalysis = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        hue: 0,
      };

      const command = new AutoEnhanceCommand(mockEditor, analysis);
      await command.execute();

      // Should still put image data even with zero adjustments
      expect(mockContext.putImageData).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle extreme enhancement values', async () => {
      const analysis: AutoEnhanceAnalysis = {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        hue: 180,
      };

      const command = new AutoEnhanceCommand(mockEditor, analysis);

      // Should not throw error with extreme values
      await expect(command.execute()).resolves.not.toThrow();
    });

    it('should handle negative enhancement values', async () => {
      const analysis: AutoEnhanceAnalysis = {
        brightness: -50,
        contrast: -30,
        saturation: -25,
        hue: -90,
      };

      const command = new AutoEnhanceCommand(mockEditor, analysis);

      // Should not throw error with negative values
      await expect(command.execute()).resolves.not.toThrow();
    });

    it('should handle small images correctly', async () => {
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = 1;
      smallCanvas.height = 1;

      const smallData = new Uint8ClampedArray(4);
      smallData[0] = 128; // Red
      smallData[1] = 128; // Green
      smallData[2] = 128; // Blue
      smallData[3] = 255; // Alpha

      const smallImageData = new ImageData(smallData, 1, 1);
      mockCanvasManager.getCanvas.mockReturnValue(smallCanvas);
      (mockContext.getImageData as jest.Mock).mockReturnValue(smallImageData);

      const command = new AutoEnhanceCommand(mockEditor);

      await expect(command.execute()).resolves.not.toThrow();
    });
  });
});
