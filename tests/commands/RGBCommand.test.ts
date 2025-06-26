import { RGBCommand } from '../../src/commands/RGBCommand';
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
} as unknown as ImageEditor;

describe('RGBCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContext.getImageData.mockReturnValue(createMockImageData(100, 100));
  });

  describe('constructor', () => {
    it('should create command with correct properties', () => {
      const command = new RGBCommand(mockEditor, 50, -25, 0);

      expect(command.name).toBe('RGB Adjust (R+50, G-25)');
      expect(command.id).toContain('rgb-adjust');
    });

    it('should set command name correctly for positive adjustments', () => {
      const command = new RGBCommand(mockEditor, 30, 20, 10);
      expect(command.name).toBe('RGB Adjust (R+30, G+20, B+10)');
    });

    it('should set command name correctly for negative adjustments', () => {
      const command = new RGBCommand(mockEditor, -50, -30, -20);
      expect(command.name).toBe('RGB Adjust (R-50, G-30, B-20)');
    });

    it('should set command name correctly for mixed adjustments', () => {
      const command = new RGBCommand(mockEditor, 25, 0, -15);
      expect(command.name).toBe('RGB Adjust (R+25, B-15)');
    });

    it('should set command name correctly for zero adjustments', () => {
      const command = new RGBCommand(mockEditor, 0, 0, 0);
      expect(command.name).toBe('RGB Adjust (no change)');
    });
  });

  describe('execute', () => {
    it('should capture image data before adjustment', async () => {
      const command = new RGBCommand(mockEditor, 50, 25, -25);

      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
      expect(mockContext.putImageData).toHaveBeenCalled();
    });

    it('should apply RGB adjustments to image', async () => {
      const command = new RGBCommand(mockEditor, 20, -30, 10);

      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalled();
      expect(mockContext.putImageData).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('rgb:applied', {
        red: 20,
        green: -30,
        blue: 10,
      });
    });

    it('should handle zero adjustments correctly', async () => {
      const command = new RGBCommand(mockEditor, 0, 0, 0);
      await command.execute();

      expect(mockContext.getImageData).toHaveBeenCalled();
      expect(mockContext.putImageData).toHaveBeenCalled();
    });
  });

  describe('undo', () => {
    it('should restore original image data', async () => {
      const command = new RGBCommand(mockEditor, 50, -30, 20);
      await command.execute();
      await command.undo();

      expect(mockContext.putImageData).toHaveBeenCalledTimes(2); // Once for execute, once for undo
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('rgb:undone', {
        red: 50,
        green: -30,
        blue: 20,
      });
    });
  });

  describe('memory management', () => {
    it('should have basic memory usage tracking', () => {
      const command = new RGBCommand(mockEditor, 25, -15, 35);
      expect(command.getMemoryUsage()).toBeGreaterThan(0);
    });

    it('should return accurate memory usage after execution', async () => {
      const command = new RGBCommand(mockEditor, 40, 0, -20);
      const initialMemory = command.getMemoryUsage();

      await command.execute();

      const postExecutionMemory = command.getMemoryUsage();
      expect(postExecutionMemory).toBeGreaterThan(initialMemory);
    });
  });

  describe('edge cases', () => {
    it('should handle extreme positive adjustments', async () => {
      const command = new RGBCommand(mockEditor, 100, 100, 100);
      await expect(command.execute()).resolves.not.toThrow();
    });

    it('should handle extreme negative adjustments', async () => {
      const command = new RGBCommand(mockEditor, -100, -100, -100);
      await expect(command.execute()).resolves.not.toThrow();
    });

    it('should handle fractional adjustments', async () => {
      const command = new RGBCommand(mockEditor, 33.33, -66.67, 12.5);
      await expect(command.execute()).resolves.not.toThrow();
    });
  });
});
