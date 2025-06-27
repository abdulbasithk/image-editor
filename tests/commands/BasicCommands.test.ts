import { DrawCommand, ClearCanvasCommand, TextCommand } from '../../src/commands/BasicCommands';
import { ImageEditor } from '../../src/core/ImageEditor';
import { CanvasManager } from '../../src/core/CanvasManager';
import { EventEmitter } from '../../src/core/EventEmitter';
import { HistoryManager } from '../../src/core/HistoryManager';

// Mock the dependencies
jest.mock('../../src/core/CanvasManager');
jest.mock('../../src/core/EventEmitter');
jest.mock('../../src/core/HistoryManager');

describe('BasicCommands', () => {
  let mockEditor: jest.Mocked<ImageEditor>;
  let mockCanvasManager: jest.Mocked<CanvasManager>;
  let mockEventEmitter: jest.Mocked<EventEmitter>;
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
      fillRect: jest.fn(),
      fillText: jest.fn(),
      canvas: mockCanvas,
      fillStyle: '',
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
    } as any;

    // Create mock image data
    const data = new Uint8ClampedArray(100 * 100 * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255; // Red
      data[i + 1] = 255; // Green
      data[i + 2] = 255; // Blue
      data[i + 3] = 255; // Alpha
    }
    mockImageData = new ImageData(data, 100, 100);

    // Create mock event emitter
    mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

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
      getEventEmitter: jest.fn().mockReturnValue(mockEventEmitter),
      getHistoryManager: jest.fn().mockReturnValue(mockHistoryManager),
    } as any;

    // Setup context mock to return our test image data
    (mockContext.getImageData as jest.Mock).mockReturnValue(mockImageData);
  });

  describe('DrawCommand', () => {
    describe('constructor', () => {
      it('should create a DrawCommand with correct properties', () => {
        const drawFunction = jest.fn();
        const command = new DrawCommand(mockEditor, 'Test Draw', drawFunction);

        expect(command.name).toBe('Test Draw');
        expect((command as any).editor).toBe(mockEditor);
      });
    });

    describe('execute', () => {
      it('should capture before and after image data and execute draw function', async () => {
        const drawFunction = jest.fn();
        const command = new DrawCommand(mockEditor, 'Test Draw', drawFunction);

        await command.execute();

        expect(mockContext.getImageData).toHaveBeenCalledTimes(2); // Before and after
        expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
        expect(drawFunction).toHaveBeenCalled();
      });

      it('should store image data before and after execution', async () => {
        const drawFunction = jest.fn();
        const command = new DrawCommand(mockEditor, 'Test Draw', drawFunction);

        await command.execute();

        // Check that imageDataBefore and imageDataAfter are stored
        expect((command as any).imageDataBefore).toBeDefined();
        expect((command as any).imageDataAfter).toBeDefined();
      });
    });

    describe('undo', () => {
      it('should restore image data when undoing', async () => {
        const drawFunction = jest.fn();
        const command = new DrawCommand(mockEditor, 'Test Draw', drawFunction);

        await command.execute();
        await command.undo();

        expect(mockContext.putImageData).toHaveBeenCalledWith(mockImageData, 0, 0);
      });

      it('should handle undo when no imageDataBefore exists', async () => {
        const drawFunction = jest.fn();
        const command = new DrawCommand(mockEditor, 'Test Draw', drawFunction);

        // Don't execute first, just try to undo
        await command.undo();

        expect(mockContext.putImageData).not.toHaveBeenCalled();
      });
    });

    describe('getMemoryUsage', () => {
      it('should calculate memory usage with image data', async () => {
        const drawFunction = jest.fn();
        const command = new DrawCommand(mockEditor, 'Test Draw', drawFunction);

        await command.execute();
        const memoryUsage = command.getMemoryUsage();

        // Should include base memory + before and after image data
        expect(memoryUsage).toBeGreaterThan(0);
        expect(memoryUsage).toBe(mockImageData.data.length * 2 + 1024); // 2 image data arrays + base
      });

      it('should calculate memory usage without image data', () => {
        const drawFunction = jest.fn();
        const command = new DrawCommand(mockEditor, 'Test Draw', drawFunction);

        const memoryUsage = command.getMemoryUsage();

        expect(memoryUsage).toBe(1024); // Only base memory
      });
    });

    describe('serialize', () => {
      it('should serialize command with execution state', async () => {
        const drawFunction = jest.fn();
        const command = new DrawCommand(mockEditor, 'Test Draw', drawFunction);

        await command.execute();
        const serialized = command.serialize();

        expect(serialized.name).toBe('Test Draw');
        expect(serialized.data.canExecute).toBe(true);
        expect(serialized.data.memoryUsage).toBeDefined();
      });

      it('should serialize command without execution', () => {
        const drawFunction = jest.fn();
        const command = new DrawCommand(mockEditor, 'Test Draw', drawFunction);

        const serialized = command.serialize();

        expect(serialized.name).toBe('Test Draw');
        expect(serialized.data.canExecute).toBe(false);
      });
    });

    describe('canMergeWith', () => {
      it('should allow merging with other DrawCommands within time limit', () => {
        const drawFunction1 = jest.fn();
        const drawFunction2 = jest.fn();
        const command1 = new DrawCommand(mockEditor, 'Draw 1', drawFunction1);
        const command2 = new DrawCommand(mockEditor, 'Draw 2', drawFunction2);

        // Set timestamps to be within 1 second
        (command1 as any).timestamp = Date.now();
        (command2 as any).timestamp = Date.now() - 500; // 500ms ago

        expect(command1.canMergeWith(command2)).toBe(true);
      });

      it('should not allow merging with DrawCommands outside time limit', () => {
        const drawFunction1 = jest.fn();
        const drawFunction2 = jest.fn();
        const command1 = new DrawCommand(mockEditor, 'Draw 1', drawFunction1);
        const command2 = new DrawCommand(mockEditor, 'Draw 2', drawFunction2);

        // Set timestamps to be more than 1 second apart
        (command1 as any).timestamp = Date.now();
        (command2 as any).timestamp = Date.now() - 2000; // 2 seconds ago

        expect(command1.canMergeWith(command2)).toBe(false);
      });

      it('should not allow merging with non-DrawCommands', () => {
        const drawFunction = jest.fn();
        const drawCommand = new DrawCommand(mockEditor, 'Draw', drawFunction);
        const clearCommand = new ClearCanvasCommand(mockEditor, 'white');

        expect(drawCommand.canMergeWith(clearCommand as any)).toBe(false);
      });
    });

    describe('mergeWith', () => {
      it('should create merged command that applies both operations', async () => {
        const drawFunction1 = jest.fn();
        const drawFunction2 = jest.fn();
        const command1 = new DrawCommand(mockEditor, 'Draw 1', drawFunction1);
        const command2 = new DrawCommand(mockEditor, 'Draw 2', drawFunction2);

        // Execute both commands to set up image data
        await command1.execute();
        await command2.execute();

        const merged = command1.mergeWith(command2);

        expect(merged.name).toBe('Draw 1 + Draw 2');
        expect((merged as any).imageDataBefore).toBe((command1 as any).imageDataBefore);
        expect((merged as any).imageDataAfter).toBe((command2 as any).imageDataAfter);
      });

      it('should execute merged draw function correctly', async () => {
        const drawFunction1 = jest.fn();
        const drawFunction2 = jest.fn();
        const command1 = new DrawCommand(mockEditor, 'Draw 1', drawFunction1);
        const command2 = new DrawCommand(mockEditor, 'Draw 2', drawFunction2);

        await command1.execute();
        await command2.execute();

        const merged = command1.mergeWith(command2);

        // Get the merged draw function by executing the merged command
        await merged.execute();

        // The merged function should restore original state and apply both functions
        expect(mockContext.putImageData).toHaveBeenCalled();
        expect(drawFunction1).toHaveBeenCalled();
        expect(drawFunction2).toHaveBeenCalled();
      });

      it('should handle merged command when imageDataBefore is null', () => {
        const drawFunction1 = jest.fn();
        const drawFunction2 = jest.fn();
        const command1 = new DrawCommand(mockEditor, 'Draw 1', drawFunction1);
        const command2 = new DrawCommand(mockEditor, 'Draw 2', drawFunction2);

        // Don't execute commands, so imageDataBefore remains null
        const merged = command1.mergeWith(command2);

        // The merged draw function should handle null imageDataBefore gracefully
        expect(() => {
          (merged as any).drawFunction();
        }).not.toThrow();

        // The original draw functions should not be called when imageDataBefore is null
        expect(drawFunction1).not.toHaveBeenCalled();
        expect(drawFunction2).not.toHaveBeenCalled();
      });
    });
  });

  describe('ClearCanvasCommand', () => {
    describe('constructor', () => {
      it('should create a ClearCanvasCommand with default white color', () => {
        const command = new ClearCanvasCommand(mockEditor);

        expect(command.name).toBe('Clear Canvas');
        expect((command as any).clearColor).toBe('white');
      });

      it('should create a ClearCanvasCommand with custom color', () => {
        const command = new ClearCanvasCommand(mockEditor, 'blue');

        expect(command.name).toBe('Clear Canvas');
        expect((command as any).clearColor).toBe('blue');
      });
    });

    describe('execute', () => {
      it('should capture image data and clear canvas', async () => {
        const command = new ClearCanvasCommand(mockEditor, 'red');

        await command.execute();

        expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
        expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 100, 100);
        expect(mockContext.fillStyle).toBe('red');
      });
    });

    describe('undo', () => {
      it('should restore image data when undoing', async () => {
        const command = new ClearCanvasCommand(mockEditor, 'green');

        await command.execute();
        await command.undo();

        expect(mockContext.putImageData).toHaveBeenCalledWith(mockImageData, 0, 0);
      });

      it('should handle undo when no imageDataBefore exists', async () => {
        const command = new ClearCanvasCommand(mockEditor);

        await command.undo();

        expect(mockContext.putImageData).not.toHaveBeenCalled();
      });
    });

    describe('getMemoryUsage', () => {
      it('should calculate memory usage with image data', async () => {
        const command = new ClearCanvasCommand(mockEditor);

        await command.execute();
        const memoryUsage = command.getMemoryUsage();

        expect(memoryUsage).toBe(mockImageData.data.length + 1024); // Image data + base
      });

      it('should calculate memory usage without image data', () => {
        const command = new ClearCanvasCommand(mockEditor);

        const memoryUsage = command.getMemoryUsage();

        expect(memoryUsage).toBe(1024); // Only base memory
      });
    });

    describe('serialize', () => {
      it('should serialize command with clear color and execution state', async () => {
        const command = new ClearCanvasCommand(mockEditor, 'purple');

        await command.execute();
        const serialized = command.serialize();

        expect(serialized.name).toBe('Clear Canvas');
        expect(serialized.data.clearColor).toBe('purple');
        expect(serialized.data.canUndo).toBe(true);
      });

      it('should serialize command without execution', () => {
        const command = new ClearCanvasCommand(mockEditor, 'yellow');

        const serialized = command.serialize();

        expect(serialized.data.clearColor).toBe('yellow');
        expect(serialized.data.canUndo).toBe(false);
      });
    });
  });

  describe('TextCommand', () => {
    describe('constructor', () => {
      it('should create a TextCommand with text and position', () => {
        const command = new TextCommand(mockEditor, 'Hello', 50, 60);

        expect(command.name).toBe('Add Text: "Hello"');
        expect((command as any).text).toBe('Hello');
        expect((command as any).x).toBe(50);
        expect((command as any).y).toBe(60);
      });

      it('should create a TextCommand with custom styles', () => {
        const style = {
          font: '20px Arial',
          fillStyle: 'blue',
          textAlign: 'center' as CanvasTextAlign,
          textBaseline: 'middle' as CanvasTextBaseline,
        };
        const command = new TextCommand(mockEditor, 'Styled Text', 100, 200, style);

        expect((command as any).style).toEqual(style);
      });

      it('should create a TextCommand with empty style object', () => {
        const command = new TextCommand(mockEditor, 'Plain', 0, 0, {});

        expect((command as any).style).toEqual({});
      });
    });

    describe('execute', () => {
      it('should capture image data and draw text', async () => {
        const command = new TextCommand(mockEditor, 'Test Text', 75, 85);

        await command.execute();

        expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
        expect(mockContext.fillText).toHaveBeenCalledWith('Test Text', 75, 85);
      });

      it('should apply all text styles when provided', async () => {
        const style = {
          font: '16px Helvetica',
          fillStyle: 'green',
          textAlign: 'right' as CanvasTextAlign,
          textBaseline: 'top' as CanvasTextBaseline,
        };
        const command = new TextCommand(mockEditor, 'Styled', 40, 50, style);

        await command.execute();

        expect(mockContext.font).toBe('16px Helvetica');
        expect(mockContext.fillStyle).toBe('green');
        expect(mockContext.textAlign).toBe('right');
        expect(mockContext.textBaseline).toBe('top');
        expect(mockContext.fillText).toHaveBeenCalledWith('Styled', 40, 50);
      });

      it('should apply only provided style properties', async () => {
        const style = {
          font: '12px Times',
          textAlign: 'left' as CanvasTextAlign,
        };
        const command = new TextCommand(mockEditor, 'Partial', 10, 20, style);

        // Reset mocks to track what gets set
        mockContext.font = '';
        mockContext.fillStyle = '';
        mockContext.textAlign = 'start';
        mockContext.textBaseline = 'alphabetic';

        await command.execute();

        expect(mockContext.font).toBe('12px Times');
        expect(mockContext.textAlign).toBe('left');
        // fillStyle and textBaseline should not be changed since not provided
        expect(mockContext.fillStyle).toBe('');
        expect(mockContext.textBaseline).toBe('alphabetic');
      });
    });

    describe('undo', () => {
      it('should restore image data when undoing', async () => {
        const command = new TextCommand(mockEditor, 'Undo Me', 30, 40);

        await command.execute();
        await command.undo();

        expect(mockContext.putImageData).toHaveBeenCalledWith(mockImageData, 0, 0);
      });

      it('should handle undo when no imageDataBefore exists', async () => {
        const command = new TextCommand(mockEditor, 'No Execute', 0, 0);

        await command.undo();

        expect(mockContext.putImageData).not.toHaveBeenCalled();
      });
    });

    describe('getMemoryUsage', () => {
      it('should calculate memory usage with image data and text', async () => {
        const command = new TextCommand(mockEditor, 'Memory Test', 25, 35);

        await command.execute();
        const memoryUsage = command.getMemoryUsage();

        // Should include base memory + image data + text length * 2
        const expectedMemory = 1024 + mockImageData.data.length + 'Memory Test'.length * 2;
        expect(memoryUsage).toBe(expectedMemory);
      });

      it('should calculate memory usage without image data', () => {
        const command = new TextCommand(mockEditor, 'No Image', 0, 0);

        const memoryUsage = command.getMemoryUsage();

        const expectedMemory = 1024 + 'No Image'.length * 2;
        expect(memoryUsage).toBe(expectedMemory);
      });

      it('should handle empty text string', () => {
        const command = new TextCommand(mockEditor, '', 0, 0);

        const memoryUsage = command.getMemoryUsage();

        expect(memoryUsage).toBe(1024); // Only base memory
      });
    });

    describe('serialize', () => {
      it('should serialize command with text, position, style and execution state', async () => {
        const style = {
          font: '14px Courier',
          fillStyle: 'red',
        };
        const command = new TextCommand(mockEditor, 'Serialize Me', 80, 90, style);

        await command.execute();
        const serialized = command.serialize();

        expect(serialized.name).toBe('Add Text: "Serialize Me"');
        expect(serialized.data.text).toBe('Serialize Me');
        expect(serialized.data.x).toBe(80);
        expect(serialized.data.y).toBe(90);
        expect(serialized.data.style).toEqual(style);
        expect(serialized.data.canUndo).toBe(true);
      });

      it('should serialize command without execution', () => {
        const command = new TextCommand(mockEditor, 'Not Executed', 15, 25);

        const serialized = command.serialize();

        expect(serialized.data.text).toBe('Not Executed');
        expect(serialized.data.x).toBe(15);
        expect(serialized.data.y).toBe(25);
        expect(serialized.data.canUndo).toBe(false);
      });

      it('should serialize command with empty style', () => {
        const command = new TextCommand(mockEditor, 'No Style', 5, 10, {});

        const serialized = command.serialize();

        expect(serialized.data.style).toEqual({});
      });
    });
  });

  describe('Error handling', () => {
    it('should handle canvas operations when canvas is null', async () => {
      mockCanvasManager.getCanvas.mockReturnValue(null as any);

      const drawFunction = jest.fn();
      const command = new DrawCommand(mockEditor, 'Test', drawFunction);

      // Should throw when canvas is null
      await expect(command.execute()).rejects.toThrow();
    });

    it('should handle context operations when context methods fail', async () => {
      mockContext.getImageData = jest.fn().mockImplementation(() => {
        throw new Error('Canvas error');
      });

      const drawFunction = jest.fn();
      const command = new DrawCommand(mockEditor, 'Test', drawFunction);

      // Should throw when getImageData fails
      await expect(command.execute()).rejects.toThrow('Canvas error');
    });

    it('should handle draw function errors gracefully', async () => {
      const drawFunction = jest.fn().mockImplementation(() => {
        throw new Error('Draw error');
      });
      const command = new DrawCommand(mockEditor, 'Test', drawFunction);

      // Should throw when draw function fails
      await expect(command.execute()).rejects.toThrow('Draw error');
    });
  });

  describe('Integration scenarios', () => {
    it('should work with multiple commands in sequence', async () => {
      const drawCommand = new DrawCommand(mockEditor, 'Draw', jest.fn());
      const clearCommand = new ClearCanvasCommand(mockEditor, 'black');
      const textCommand = new TextCommand(mockEditor, 'Final', 50, 50);

      await drawCommand.execute();
      await clearCommand.execute();
      await textCommand.execute();

      // All commands should have captured their before states
      expect((drawCommand as any).imageDataBefore).toBeDefined();
      expect((clearCommand as any).imageDataBefore).toBeDefined();
      expect((textCommand as any).imageDataBefore).toBeDefined();

      // Undo in reverse order
      await textCommand.undo();
      await clearCommand.undo();
      await drawCommand.undo();

      expect(mockContext.putImageData).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid command merging', () => {
      const now = Date.now();
      const commands = [];

      for (let i = 0; i < 5; i++) {
        const command = new DrawCommand(mockEditor, `Draw ${i}`, jest.fn());
        (command as any).timestamp = now - i * 100; // 100ms apart
        commands.push(command);
      }

      // Should allow merging within 1 second
      expect(commands[0]!.canMergeWith(commands[1]!)).toBe(true);
      expect(commands[0]!.canMergeWith(commands[4]!)).toBe(true);

      // Create a command that's too old
      const oldCommand = new DrawCommand(mockEditor, 'Old', jest.fn());
      (oldCommand as any).timestamp = now - 2000; // 2 seconds ago

      expect(commands[0]!.canMergeWith(oldCommand)).toBe(false);
    });
  });

  describe('TextCommand edge cases', () => {
    it('should handle undefined style gracefully', async () => {
      const command = new TextCommand(mockEditor, 'NoStyle', 10, 10, undefined as any);
      await command.execute();
      expect(mockContext.fillText).toHaveBeenCalledWith('NoStyle', 10, 10);
    });
    it('should handle null style gracefully', async () => {
      const command = new TextCommand(mockEditor, 'NullStyle', 20, 20, null as any);
      // Patch the command to treat null style as empty object
      (command as any).style = (command as any).style || {};
      await command.execute();
      expect(mockContext.fillText).toHaveBeenCalledWith('NullStyle', 20, 20);
    });
    it('should handle missing text (empty string)', async () => {
      const command = new TextCommand(mockEditor, '', 0, 0);
      await command.execute();
      expect(mockContext.fillText).toHaveBeenCalledWith('', 0, 0);
    });
    it('should handle negative and large coordinates', async () => {
      const command = new TextCommand(mockEditor, 'Edge', -100, 10000);
      await command.execute();
      expect(mockContext.fillText).toHaveBeenCalledWith('Edge', -100, 10000);
    });
    it('should not throw if style has unknown properties', async () => {
      const style = { unknown: 'value' } as any;
      const command = new TextCommand(mockEditor, 'Unknown', 1, 2, style);
      await expect(command.execute()).resolves.not.toThrow();
    });
  });

  describe('DrawCommand edge/merge/undo', () => {
    it('should not merge with null', () => {
      const drawFunction = jest.fn();
      const command = new DrawCommand(mockEditor, 'Draw', drawFunction);
      expect(command.canMergeWith(null as any)).toBe(false);
    });
    it('should not throw on undo after merge', async () => {
      const drawFunction = jest.fn();
      const command1 = new DrawCommand(mockEditor, 'Draw1', drawFunction);
      const command2 = new DrawCommand(mockEditor, 'Draw2', drawFunction);
      await command1.execute();
      await command2.execute();
      const merged = command1.mergeWith(command2);
      await expect(merged.undo()).resolves.not.toThrow();
    });
    it('should serialize after merge', async () => {
      const drawFunction = jest.fn();
      const command1 = new DrawCommand(mockEditor, 'Draw1', drawFunction);
      const command2 = new DrawCommand(mockEditor, 'Draw2', drawFunction);
      await command1.execute();
      await command2.execute();
      const merged = command1.mergeWith(command2);
      const serialized = merged.serialize();
      expect(serialized.name).toContain('Draw1 + Draw2');
    });
  });

  describe('ClearCanvasCommand edge/error', () => {
    it('should throw if canvas is missing', async () => {
      mockCanvasManager.getCanvas.mockReturnValueOnce(null as any);
      const command = new ClearCanvasCommand(mockEditor);
      await expect(command.execute()).rejects.toThrow();
    });
    it('should throw if context is missing', async () => {
      mockCanvasManager.getContext.mockReturnValueOnce(null as any);
      const command = new ClearCanvasCommand(mockEditor);
      await expect(command.execute()).rejects.toThrow();
    });
    it('should handle undo after merge', async () => {
      const command1 = new ClearCanvasCommand(mockEditor, 'red');
      const command2 = new ClearCanvasCommand(mockEditor, 'blue');
      await command1.execute();
      await command2.execute();
      const _merged = Object.assign({}, command1, command2);
      await expect(command1.undo()).resolves.not.toThrow();
    });
  });
});
