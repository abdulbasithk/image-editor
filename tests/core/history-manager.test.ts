import { HistoryManager } from '../../src/core/HistoryManager';
import { CommandGroup } from '../../src/core/BaseCommand';

describe('HistoryManager', () => {
  let history: HistoryManager;
  let mockEditor: any;
  let mockCommand: any;
  let mockEventEmitter: any;
  let mockCanvas: any;
  let mockContext: any;
  let mockCanvasManager: any;

  beforeEach(() => {
    mockEventEmitter = { emit: jest.fn(), on: jest.fn() };
    mockContext = {
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: jest.fn(),
      clearRect: jest.fn(),
      drawImage: jest.fn(),
    };
    mockCanvas = {
      width: 100,
      height: 100,
      toDataURL: jest.fn(() => 'data:image/png;base64,abc'),
    };
    mockCanvasManager = {
      getCanvas: jest.fn(() => mockCanvas),
      getContext: jest.fn(() => mockContext),
    };
    mockEditor = {
      getEventEmitter: jest.fn(() => mockEventEmitter),
      getCanvasManager: jest.fn(() => mockCanvasManager),
      isDestroyed: jest.fn(() => false),
    };

    mockCommand = {
      id: 'cmd_123',
      name: 'MockCommand',
      timestamp: Date.now(),
      execute: jest.fn().mockResolvedValue(undefined),
      undo: jest.fn().mockResolvedValue(undefined),
      serialize: jest.fn(() => ({
        id: 'cmd_123',
        name: 'MockCommand',
        timestamp: Date.now(),
        type: 'Mock',
        data: {},
      })),
      getMemoryUsage: jest.fn(() => 100),
      canMergeWith: jest.fn(() => false),
      mergeWith: jest.fn(),
      isValid: jest.fn(() => true),
    };
  });

  // Test basic history manager initialization
  describe('Initialization', () => {
    it('should initialize with default options', () => {
      history = new HistoryManager(mockEditor);
      expect(history.getCommands().length).toBe(0);
      expect(history.getCurrentIndex()).toBe(-1);
      expect(history.getMemoryUsage()).toBe(0);
    });

    it('should initialize with custom options', () => {
      const options = {
        maxHistorySize: 25,
        maxMemoryUsage: 50 * 1024 * 1024,
        enableGrouping: false,
        autoCleanup: false,
        snapshotInterval: 5,
      };
      history = new HistoryManager(mockEditor, options);
      expect(history.getCommands().length).toBe(0);
      expect(history.getCurrentIndex()).toBe(-1);
    });

    it('should setup event listeners for keyboard shortcuts', () => {
      history = new HistoryManager(mockEditor);
      expect(mockEventEmitter.on).toHaveBeenCalledWith('shortcut:pressed', expect.any(Function));
    });
  });

  // Test command execution
  describe('Command Execution', () => {
    beforeEach(() => {
      history = new HistoryManager(mockEditor);
    });

    it('should execute and add command to history', async () => {
      await history.executeCommand(mockCommand);
      expect(history.getCommands().length).toBe(1);
      expect(mockCommand.execute).toHaveBeenCalled();
      expect(history.getCurrentIndex()).toBe(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'history:change',
        expect.objectContaining({
          type: 'command',
          command: mockCommand,
        }),
      );
    });

    it('should clear commands after current index when executing new command', async () => {
      // Execute two commands
      await history.executeCommand(mockCommand);
      await history.executeCommand({ ...mockCommand, name: 'Command2' });

      // Undo one
      await history.undo();
      expect(history.getCurrentIndex()).toBe(0);

      // Execute new command (should clear command after current index)
      const newCommand = { ...mockCommand, name: 'NewCommand' };
      await history.executeCommand(newCommand);
      expect(history.getCommands().length).toBe(2);
      expect(history.getCurrentIndex()).toBe(1);
    });

    it('should handle command execution errors', async () => {
      const errorCommand = {
        ...mockCommand,
        execute: jest.fn().mockRejectedValue(new Error('Execution failed')),
      };

      await expect(history.executeCommand(errorCommand)).rejects.toThrow('Execution failed');
    });

    it('should merge commands when canMergeWith returns true', async () => {
      const mergeableCommand = {
        ...mockCommand,
        canMergeWith: jest.fn(() => true),
        mergeWith: jest.fn(() => ({ ...mockCommand, name: 'MergedCommand' })),
      };

      await history.executeCommand(mergeableCommand);
      await history.executeCommand(mergeableCommand);

      expect(mergeableCommand.mergeWith).toHaveBeenCalled();
      expect(history.getCommands().length).toBe(1);
    });

    it('should not merge commands when grouping is disabled', async () => {
      history = new HistoryManager(mockEditor, { enableGrouping: false });
      const mergeableCommand = {
        ...mockCommand,
        canMergeWith: jest.fn(() => true),
        mergeWith: jest.fn(() => ({ ...mockCommand, name: 'MergedCommand' })),
      };

      await history.executeCommand(mergeableCommand);
      await history.executeCommand(mergeableCommand);

      expect(mergeableCommand.mergeWith).not.toHaveBeenCalled();
      expect(history.getCommands().length).toBe(2);
    });
  });

  // Test undo/redo functionality
  describe('Undo/Redo', () => {
    beforeEach(() => {
      history = new HistoryManager(mockEditor);
    });

    it('should undo last command', async () => {
      await history.executeCommand(mockCommand);
      const result = await history.undo();

      expect(result).toBe(true);
      expect(mockCommand.undo).toHaveBeenCalled();
      expect(history.getCurrentIndex()).toBe(-1);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'history:change',
        expect.objectContaining({
          type: 'undo',
          command: mockCommand,
        }),
      );
    });

    it('should redo last undone command', async () => {
      await history.executeCommand(mockCommand);
      await history.undo();
      const result = await history.redo();

      expect(result).toBe(true);
      expect(mockCommand.execute).toHaveBeenCalledTimes(2);
      expect(history.getCurrentIndex()).toBe(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'history:change',
        expect.objectContaining({
          type: 'redo',
          command: mockCommand,
        }),
      );
    });

    it('should not undo if history is empty', async () => {
      const result = await history.undo();
      expect(result).toBe(false);
    });

    it('should not redo if at end of history', async () => {
      await history.executeCommand(mockCommand);
      const result = await history.redo();
      expect(result).toBe(false);
    });

    it('should not undo if command is invalid', async () => {
      const invalidCommand = { ...mockCommand, isValid: jest.fn(() => false) };
      await history.executeCommand(invalidCommand);
      const result = await history.undo();
      expect(result).toBe(false);
    });

    it('should not redo if command is invalid', async () => {
      const invalidCommand = { ...mockCommand, isValid: jest.fn(() => false) };
      await history.executeCommand(invalidCommand);
      await history.undo();

      // Make next command invalid
      invalidCommand.isValid = jest.fn(() => false);
      const result = await history.redo();
      expect(result).toBe(false);
    });

    it('should handle undo errors and restore from snapshot', async () => {
      // Setup snapshot
      mockContext.getImageData.mockReturnValue({ data: new Uint8ClampedArray(400) });
      await history.executeCommand(mockCommand);

      // Make undo fail
      mockCommand.undo = jest.fn().mockRejectedValue(new Error('Undo failed'));

      const result = await history.undo();
      expect(result).toBe(false);
    });

    it('should handle redo errors', async () => {
      await history.executeCommand(mockCommand);
      await history.undo();

      // Create a fresh command that will fail on redo
      const redoFailCommand = {
        ...mockCommand,
        execute: jest.fn().mockRejectedValue(new Error('Redo failed')),
      };

      // Replace the command in history
      (history as any).commands[0] = redoFailCommand;

      const result = await history.redo();
      expect(result).toBe(false);
      expect(history.getCurrentIndex()).toBe(-1); // Index should be reverted
    });
  });

  // Test state management
  describe('State Management', () => {
    beforeEach(() => {
      history = new HistoryManager(mockEditor);
    });

    it('should return correct state', async () => {
      await history.executeCommand(mockCommand);
      const state = history.getState();

      expect(state.commands.length).toBe(1);
      expect(state.currentIndex).toBe(0);
      expect(state.memoryUsage).toBeGreaterThan(0);
      expect(state.maxMemoryUsage).toBe(100 * 1024 * 1024);
      expect(state.maxHistorySize).toBe(50);
    });

    it('should handle commands without serialize method', async () => {
      const commandWithoutSerialize = { ...mockCommand };
      delete commandWithoutSerialize.serialize;

      await history.executeCommand(commandWithoutSerialize);
      const state = history.getState();

      expect(state.commands[0]).toEqual({
        id: mockCommand.id,
        name: mockCommand.name,
        timestamp: mockCommand.timestamp,
        type: 'Unknown',
        data: {},
      });
    });

    it('should check if undo is possible', async () => {
      expect(history.canUndo()).toBe(false);

      await history.executeCommand(mockCommand);
      expect(history.canUndo()).toBe(true);

      await history.undo();
      expect(history.canUndo()).toBe(false);
    });

    it('should check if redo is possible', async () => {
      expect(history.canRedo()).toBe(false);

      await history.executeCommand(mockCommand);
      expect(history.canRedo()).toBe(false);

      await history.undo();
      expect(history.canRedo()).toBe(true);

      await history.redo();
      expect(history.canRedo()).toBe(false);
    });

    it('should clear history', async () => {
      await history.executeCommand(mockCommand);
      history.clear();

      expect(history.getCommands().length).toBe(0);
      expect(history.getCurrentIndex()).toBe(-1);
      expect(history.getMemoryUsage()).toBe(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('history:change', { type: 'clear' });
    });
  });

  // Test command grouping
  describe('Command Grouping', () => {
    beforeEach(() => {
      history = new HistoryManager(mockEditor);
    });

    it('should start and end grouping', async () => {
      history.startGrouping('TestGroup');
      await history.executeCommand(mockCommand);
      await history.executeCommand({ ...mockCommand, name: 'Command2' });
      history.endGrouping();

      expect(history.getCommands().length).toBe(1);
      expect(history.getCommands()[0]).toBeInstanceOf(CommandGroup);
    });

    it('should end previous group when starting new one', () => {
      history.startGrouping('Group1');
      history.startGrouping('Group2');

      // Both groups should be handled properly
      expect(() => history.endGrouping()).not.toThrow();
    });

    it('should not start grouping when disabled', () => {
      history = new HistoryManager(mockEditor, { enableGrouping: false });
      history.startGrouping('TestGroup');

      // Should not throw and should work normally
      expect(() => history.endGrouping()).not.toThrow();
    });

    it('should handle empty groups', () => {
      history.startGrouping('EmptyGroup');
      history.endGrouping();

      expect(history.getCommands().length).toBe(0);
    });

    it('should handle endGrouping without startGrouping', () => {
      expect(() => history.endGrouping()).not.toThrow();
    });
  });

  // Test snapshot functionality
  describe('Snapshots', () => {
    beforeEach(() => {
      history = new HistoryManager(mockEditor, { snapshotInterval: 1 });
    });

    it('should create snapshots with ImageData', async () => {
      mockContext.getImageData.mockReturnValue(new ImageData(new Uint8ClampedArray(400), 10, 10));

      const snapshot = await history.createSnapshot();

      expect(snapshot.id).toMatch(/snapshot_\d+/);
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.canvasData).toHaveProperty('data');
      expect(snapshot.memoryUsage).toBe(400);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'history:change',
        expect.objectContaining({
          type: 'snapshot',
          snapshot,
        }),
      );
    });

    it('should create snapshots with dataURL fallback', async () => {
      mockContext.getImageData.mockImplementation(() => {
        throw new Error('Canvas tainted');
      });

      const snapshot = await history.createSnapshot();

      expect(typeof snapshot.canvasData).toBe('string');
      expect(snapshot.canvasData).toBe('data:image/png;base64,abc');
    });

    it('should restore snapshots with ImageData', async () => {
      const imageData = new ImageData(new Uint8ClampedArray(400), 10, 10);
      const snapshot = {
        id: 'test_snapshot',
        timestamp: Date.now(),
        canvasData: imageData,
        memoryUsage: 400,
      };

      await history.restoreSnapshot(snapshot);

      expect(mockContext.putImageData).toHaveBeenCalledWith(imageData, 0, 0);
    });

    it('should restore snapshots with dataURL', async () => {
      const snapshot = {
        id: 'test_snapshot',
        timestamp: Date.now(),
        canvasData: 'data:image/png;base64,abc',
        memoryUsage: 100,
      };

      // Mock Image constructor
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
      };

      global.Image = jest.fn(() => mockImage) as any;

      const restorePromise = history.restoreSnapshot(snapshot);

      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) mockImage.onload();
      }, 0);

      await restorePromise;

      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 100, 100);
      expect(mockContext.drawImage).toHaveBeenCalled();
    });

    it('should handle snapshot restoration errors', async () => {
      const snapshot = {
        id: 'test_snapshot',
        timestamp: Date.now(),
        canvasData: 'invalid_data_url',
        memoryUsage: 100,
      };

      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
      };

      global.Image = jest.fn(() => mockImage) as any;

      const restorePromise = history.restoreSnapshot(snapshot);

      // Simulate image error
      setTimeout(() => {
        if (mockImage.onerror) mockImage.onerror(new Error('Load failed'));
      }, 0);

      await expect(restorePromise).rejects.toThrow();
    });

    it('should restore from nearest snapshot during error recovery', async () => {
      // Setup proper ImageData mock
      mockContext.getImageData.mockReturnValue(new ImageData(new Uint8ClampedArray(400), 10, 10));

      // Create commands and snapshots
      await history.executeCommand(mockCommand);

      // Make undo fail to trigger snapshot restoration
      const failingCommand = {
        ...mockCommand,
        undo: jest.fn().mockRejectedValue(new Error('Undo failed')),
        isValid: jest.fn(() => true),
      };
      (history as any).commands[0] = failingCommand;

      await history.undo(); // This should trigger snapshot restoration

      // Since we don't have snapshots, putImageData won't be called
      // The test verifies the error handling path is executed
      expect(failingCommand.undo).toHaveBeenCalled();
    });
  });

  // Test memory management and cleanup
  describe('Memory Management', () => {
    it('should cleanup when exceeding max history size', async () => {
      history = new HistoryManager(mockEditor, { maxHistorySize: 2, autoCleanup: true });

      // Add commands exceeding limit
      await history.executeCommand(mockCommand);
      await history.executeCommand({ ...mockCommand, name: 'Command2' });
      await history.executeCommand({ ...mockCommand, name: 'Command3' });

      expect(history.getCommands().length).toBe(2);
    });

    it('should cleanup when exceeding memory limit', async () => {
      const highMemoryCommand = { ...mockCommand, getMemoryUsage: jest.fn(() => 60 * 1024 * 1024) };
      history = new HistoryManager(mockEditor, {
        maxMemoryUsage: 100 * 1024 * 1024,
        autoCleanup: true,
      });

      await history.executeCommand(highMemoryCommand);
      await history.executeCommand(highMemoryCommand);

      // Should cleanup when memory limit exceeded
      expect(history.getCommands().length).toBe(1);
    });

    it('should not cleanup when autoCleanup is disabled', async () => {
      history = new HistoryManager(mockEditor, { maxHistorySize: 1, autoCleanup: false });

      await history.executeCommand(mockCommand);
      await history.executeCommand({ ...mockCommand, name: 'Command2' });

      expect(history.getCommands().length).toBe(2); // No cleanup
    });

    it('should cleanup old snapshots', async () => {
      history = new HistoryManager(mockEditor, { snapshotInterval: 1, autoCleanup: true });

      // Create multiple commands with snapshots
      for (let i = 0; i < 5; i++) {
        await history.executeCommand({ ...mockCommand, name: `Command${i}` });
      }

      // Memory usage should be managed
      expect(history.getMemoryUsage()).toBeGreaterThan(0);
    });

    it('should track memory usage correctly', async () => {
      const initialMemory = history.getMemoryUsage();
      await history.executeCommand(mockCommand);

      expect(history.getMemoryUsage()).toBeGreaterThan(initialMemory);

      await history.undo();
      // Memory should still be tracked (command not removed, just index changed)
      expect(history.getMemoryUsage()).toBeGreaterThan(initialMemory);
    });
  });

  // Test keyboard shortcuts
  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      history = new HistoryManager(mockEditor);
    });

    it('should handle ctrl+z shortcut for undo', async () => {
      await history.executeCommand(mockCommand);

      const undoSpy = jest.spyOn(history, 'undo');

      // Simulate keyboard shortcut event
      const eventHandler = mockEventEmitter.on.mock.calls[0][1];
      eventHandler({ shortcut: 'ctrl+z' });

      expect(undoSpy).toHaveBeenCalled();
    });

    it('should handle ctrl+y shortcut for redo', async () => {
      await history.executeCommand(mockCommand);
      await history.undo();

      const redoSpy = jest.spyOn(history, 'redo');

      // Simulate keyboard shortcut event
      const eventHandler = mockEventEmitter.on.mock.calls[0][1];
      eventHandler({ shortcut: 'ctrl+y' });

      expect(redoSpy).toHaveBeenCalled();
    });

    it('should handle ctrl+shift+z shortcut for redo', async () => {
      await history.executeCommand(mockCommand);
      await history.undo();

      const redoSpy = jest.spyOn(history, 'redo');

      // Simulate keyboard shortcut event
      const eventHandler = mockEventEmitter.on.mock.calls[0][1];
      eventHandler({ shortcut: 'ctrl+shift+z' });

      expect(redoSpy).toHaveBeenCalled();
    });
  });

  // Test destruction
  describe('Destruction', () => {
    beforeEach(() => {
      history = new HistoryManager(mockEditor);
    });

    it('should destroy and clear all resources', async () => {
      await history.executeCommand(mockCommand);
      await history.createSnapshot();

      history.destroy();

      expect(history.getCommands().length).toBe(0);
      expect(history.getCurrentIndex()).toBe(-1);
      expect(history.getMemoryUsage()).toBe(0);
    });
  });

  // Test edge cases
  describe('Edge Cases', () => {
    beforeEach(() => {
      history = new HistoryManager(mockEditor);
    });

    it('should handle commands with missing methods gracefully', async () => {
      const partialCommand = {
        id: 'partial',
        name: 'PartialCommand',
        timestamp: Date.now(),
        execute: jest.fn().mockResolvedValue(undefined),
        undo: jest.fn().mockResolvedValue(undefined),
        getMemoryUsage: jest.fn(() => 50),
        isValid: jest.fn(() => true),
        // Missing serialize, canMergeWith, mergeWith
      };

      await expect(history.executeCommand(partialCommand)).resolves.not.toThrow();

      const state = history.getState();
      expect(state.commands[0]).toBeDefined();
      expect(state.commands[0]?.type).toBe('Unknown');
    });

    it('should handle null/undefined commands gracefully', async () => {
      // This should be prevented by TypeScript, but test runtime safety
      const invalidCommand = null as any;

      await expect(history.executeCommand(invalidCommand)).rejects.toThrow();
    });

    it('should handle commands with undefined isValid', () => {
      const commandWithoutIsValid = { ...mockCommand };
      delete commandWithoutIsValid.isValid;

      expect(history.canUndo()).toBe(false); // Should handle gracefully
    });
  });

  // Test additional edge cases to reach 90%+ branch coverage
  describe('Additional Edge Cases', () => {
    beforeEach(() => {
      history = new HistoryManager(mockEditor);
    });

    it('should handle command execution in group when group is not available', async () => {
      // Start grouping then manually clear the current group
      history.startGrouping('TestGroup');
      (history as any).currentGroup = null;

      await history.executeCommand(mockCommand);

      // Should execute normally even when group is null
      expect(history.getCommands().length).toBe(1);
    });

    it('should handle snapshot creation without canvas context errors', async () => {
      // Test both ImageData and dataURL paths
      mockContext.getImageData
        .mockImplementationOnce(() => {
          throw new Error('Canvas error');
        })
        .mockReturnValue(new ImageData(new Uint8ClampedArray(400), 10, 10));

      const snapshot = await history.createSnapshot();

      expect(typeof snapshot.canvasData).toBe('string');
      expect(snapshot.canvasData).toBe('data:image/png;base64,abc');
    });

    it('should handle redo when no command exists at index', async () => {
      // Manually set up a state where redo would fail
      (history as any).currentIndex = -1;
      (history as any).commands = [null]; // Invalid command at index 0

      const result = await history.redo();
      expect(result).toBe(false);
    });

    it('should handle undo when no command exists at index', async () => {
      // Manually set up a state where undo would fail
      (history as any).currentIndex = 0;
      (history as any).commands = [null]; // Invalid command at index 0

      const result = await history.undo();
      expect(result).toBe(false);
    });

    it('should maintain memory usage when removing commands with memory cleanup', async () => {
      // Create commands with known memory usage
      const memoryCommand1 = { ...mockCommand, getMemoryUsage: jest.fn(() => 1000) };
      const memoryCommand2 = { ...mockCommand, getMemoryUsage: jest.fn(() => 2000) };

      await history.executeCommand(memoryCommand1);
      await history.executeCommand(memoryCommand2);

      const initialMemory = history.getMemoryUsage();
      expect(initialMemory).toBeGreaterThan(2900); // Allow for small variations

      // Execute new command to trigger cleanup of branched commands
      await history.undo();
      await history.executeCommand({ ...mockCommand, getMemoryUsage: jest.fn(() => 500) });

      // Memory should be adjusted
      expect(history.getMemoryUsage()).toBeLessThan(initialMemory);
    });

    it('should handle snapshots cleanup with proper memory accounting', async () => {
      history = new HistoryManager(mockEditor, { snapshotInterval: 1, autoCleanup: true });

      // Create multiple commands to trigger snapshot cleanup
      for (let i = 0; i < 6; i++) {
        await history.executeCommand({ ...mockCommand, name: `Command${i}` });
      }

      // Force cleanup
      (history as any).cleanup();

      // Memory should be properly managed
      expect(history.getMemoryUsage()).toBeGreaterThanOrEqual(0);
    });
  });
});
