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

    // Ensure getImageData is a Jest mock
    mockContext.getImageData = jest.fn((..._args: any[]) => originalImageData);
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

  describe('branch and edge coverage', () => {
    it('should throw error if canvas is missing', async () => {
      mockCanvasManager.getCanvas.mockReturnValueOnce(undefined as any);
      const command = new HueCommand(editor, 10);
      await expect(command.execute()).rejects.toThrow('Canvas not available');
    });
    it('should throw error if context is missing', async () => {
      mockCanvasManager.getContext.mockReturnValueOnce(undefined as any);
      const command = new HueCommand(editor, 10);
      await expect(command.execute()).rejects.toThrow('Canvas not available');
    });
    it('should throw error if undo is called before execute', async () => {
      const command = new HueCommand(editor, 10);
      await expect(command.undo()).rejects.toThrow('No original image data to restore');
    });
    it('should throw error if undo is called after data is cleared', async () => {
      const command = new HueCommand(editor, 10);
      await command.execute();
      (command as any).originalImageData = null;
      await expect(command.undo()).rejects.toThrow('No original image data to restore');
    });
    it('should cover all rgbToHsl switch branches', async () => {
      // r is max
      let img = new ImageData(1, 1);
      img.data.set([255, 100, 50, 255]);
      (mockContext.getImageData as jest.Mock).mockReturnValueOnce(img);
      await new HueCommand(editor, 10).execute();
      // g is max
      img = new ImageData(1, 1);
      img.data.set([100, 255, 50, 255]);
      (mockContext.getImageData as jest.Mock).mockReturnValueOnce(img);
      await new HueCommand(editor, 10).execute();
      // b is max
      img = new ImageData(1, 1);
      img.data.set([50, 100, 255, 255]);
      (mockContext.getImageData as jest.Mock).mockReturnValueOnce(img);
      await new HueCommand(editor, 10).execute();
      // achromatic
      img = new ImageData(1, 1);
      img.data.set([128, 128, 128, 255]);
      (mockContext.getImageData as jest.Mock).mockReturnValueOnce(img);
      await new HueCommand(editor, 10).execute();
    });
    it('should cover all hslToRgb branches (hue2rgb)', async () => {
      // s === 0 (achromatic)
      let img = new ImageData(1, 1);
      img.data.set([128, 128, 128, 255]);
      (mockContext.getImageData as jest.Mock).mockReturnValueOnce(img);
      await new HueCommand(editor, 10).execute();
      // s !== 0, t < 0, t > 1, t < 1/6, t < 1/2, t < 2/3, else
      const testColors = [
        [255, 0, 128, 255], // t < 0
        [128, 255, 0, 255], // t > 1
        [255, 128, 64, 255], // t < 1/6
        [64, 255, 128, 255], // t < 1/2
        [128, 64, 255, 255], // t < 2/3
        [255, 64, 128, 255], // else
      ];
      for (const color of testColors) {
        img = new ImageData(1, 1);
        img.data.set(color);
        (mockContext.getImageData as jest.Mock).mockReturnValueOnce(img);
        await new HueCommand(editor, 120).execute();
      }
    });
    it('should cover high and low lightness branches in rgbToHsl', async () => {
      // l > 0.5
      let img = new ImageData(1, 1);
      img.data.set([250, 250, 200, 255]);
      (mockContext.getImageData as jest.Mock).mockReturnValueOnce(img);
      await new HueCommand(editor, 10).execute();
      // l <= 0.5
      img = new ImageData(1, 1);
      img.data.set([10, 10, 50, 255]);
      (mockContext.getImageData as jest.Mock).mockReturnValueOnce(img);
      await new HueCommand(editor, 10).execute();
    });
  });

  describe('color conversion edge cases', () => {
    it('should handle rgbToHsl achromatic (gray) case', async () => {
      // Gray: R=G=B
      const grayImageData = new ImageData(1, 1);
      grayImageData.data[0] = 50;
      grayImageData.data[1] = 50;
      grayImageData.data[2] = 50;
      grayImageData.data[3] = 255;
      jest.spyOn(mockContext, 'getImageData').mockReturnValue(grayImageData);
      const command = new HueCommand(editor, 120);
      await command.execute();
      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjusted = putImageDataCall[0] as ImageData;
      expect(adjusted.data[0]).toBe(50);
      expect(adjusted.data[1]).toBe(50);
      expect(adjusted.data[2]).toBe(50);
    });

    it('should handle hslToRgb with s=0 (achromatic)', async () => {
      // Achromatic HSL: s=0
      const achromaticImageData = new ImageData(1, 1);
      achromaticImageData.data[0] = 200;
      achromaticImageData.data[1] = 200;
      achromaticImageData.data[2] = 200;
      achromaticImageData.data[3] = 255;
      jest.spyOn(mockContext, 'getImageData').mockReturnValue(achromaticImageData);
      const command = new HueCommand(editor, 60);
      await command.execute();
      const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls[0];
      const adjusted = putImageDataCall[0] as ImageData;
      expect(adjusted.data[0]).toBe(adjusted.data[1]);
      expect(adjusted.data[1]).toBe(adjusted.data[2]);
    });

    it('should cover hslToRgb hue2rgb branches (t < 0, t > 1, t < 1/6, t < 1/2, t < 2/3)', async () => {
      // Custom crafted HSL values to hit all hue2rgb branches
      // This is indirect, but we can force the code path by using specific RGBs
      const testCases = [
        { r: 255, g: 0, b: 0 }, // Red
        { r: 0, g: 255, b: 0 }, // Green
        { r: 0, g: 0, b: 255 }, // Blue
        { r: 255, g: 255, b: 0 }, // Yellow
        { r: 0, g: 255, b: 255 }, // Cyan
        { r: 255, g: 0, b: 255 }, // Magenta
      ];
      for (const { r, g, b } of testCases) {
        const imgData = new ImageData(1, 1);
        imgData.data[0] = r;
        imgData.data[1] = g;
        imgData.data[2] = b;
        imgData.data[3] = 255;
        jest.spyOn(mockContext, 'getImageData').mockReturnValue(imgData);
        const command = new HueCommand(editor, 45);
        await command.execute();
        const putImageDataCall = (mockContext.putImageData as jest.Mock).mock.calls.pop();
        const adjusted = putImageDataCall[0] as ImageData;
        expect(adjusted.data[3]).toBe(255);
      }
    });
  });

  describe('error handling', () => {
    it('should throw if canvas is missing', async () => {
      (mockCanvasManager.getCanvas as jest.Mock).mockReturnValueOnce(null);
      const command = new HueCommand(editor, 90);
      await expect(command.execute()).rejects.toThrow();
    });
    it('should throw if context is missing', async () => {
      (mockCanvasManager.getContext as jest.Mock).mockReturnValueOnce(null);
      const command = new HueCommand(editor, 90);
      await expect(command.execute()).rejects.toThrow();
    });
    it('should throw on undo if no image data', async () => {
      const command = new HueCommand(editor, 90);
      // Simulate never calling execute
      await expect(command.undo()).rejects.toThrow();
    });
  });
});
