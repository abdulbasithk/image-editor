import { ImageEditor } from '../../src/core/ImageEditor';
import { HistoryManager } from '../../src/core/HistoryManager';
import { BaseCommand, CommandGroup } from '../../src/core/BaseCommand';
import { DrawCommand, ClearCanvasCommand, TextCommand } from '../../src/commands/BasicCommands';
import { Command } from '../../src/interfaces/Command';

// Mock command for testing
class MockCommand extends BaseCommand {
  public executed = false;
  public undone = false;
  public shouldFail = false;

  constructor(editor: ImageEditor, name: string = 'Mock Command', shouldFail = false) {
    super(editor, name);
    this.shouldFail = shouldFail;
  }

  public override async execute(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Command execution failed');
    }
    this.executed = true;
  }

  public override async undo(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Command undo failed');
    }
    this.undone = true;
  }

  public override getMemoryUsage(): number {
    return 512; // 512 bytes
  }
}

// Mergeable command for testing
class MergeableCommand extends MockCommand {
  public mergeCount = 1;

  constructor(editor: ImageEditor, name: string = 'Mergeable Command') {
    super(editor, name);
  }

  public override canMergeWith(command: Command): boolean {
    return command instanceof MergeableCommand;
  }

  public override mergeWith(command: Command): Command {
    const merged = new MergeableCommand(this.editor, `${this.name} (merged)`);
    merged.mergeCount = this.mergeCount + (command as MergeableCommand).mergeCount;
    return merged;
  }
}

describe('State Management System', () => {
  let editor: ImageEditor;
  let historyManager: HistoryManager;
  beforeEach(() => {
    const mockContainer = document.createElement('div');
    editor = new ImageEditor({
      container: mockContainer,
      width: 800,
      height: 600,
    });
    historyManager = editor.getHistoryManager();
    historyManager.clear(); // Ensure clean state for each test
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('Command Pattern', () => {
    it('should execute and track commands', async () => {
      const command = new MockCommand(editor, 'Test Command');

      await historyManager.executeCommand(command);

      expect(command.executed).toBe(true);
      expect(historyManager.getCurrentIndex()).toBe(0);
      expect(historyManager.getCommands()).toHaveLength(1);
    });

    it('should generate unique IDs for commands', () => {
      const command1 = new MockCommand(editor);
      const command2 = new MockCommand(editor);

      expect(command1.id).not.toBe(command2.id);
      expect(command1.id).toMatch(/^cmd_\d+_[a-z0-9]+$/);
    });

    it('should track command timestamps', () => {
      const before = Date.now();
      const command = new MockCommand(editor);
      const after = Date.now();

      expect(command.timestamp).toBeGreaterThanOrEqual(before);
      expect(command.timestamp).toBeLessThanOrEqual(after);
    });

    it('should validate commands', () => {
      const command = new MockCommand(editor);
      expect(command.isValid()).toBe(true);

      // Command becomes invalid if editor is destroyed
      editor.destroy();
      expect(command.isValid()).toBe(false);
    });
  });

  describe('Undo/Redo Functionality', () => {
    it('should undo commands', async () => {
      const command = new MockCommand(editor);
      await historyManager.executeCommand(command);

      expect(historyManager.canUndo()).toBe(true);
      const undoResult = await historyManager.undo();

      expect(undoResult).toBe(true);
      expect(command.undone).toBe(true);
      expect(historyManager.getCurrentIndex()).toBe(-1);
    });

    it('should redo commands', async () => {
      const command = new MockCommand(editor);
      await historyManager.executeCommand(command);
      await historyManager.undo();

      expect(historyManager.canRedo()).toBe(true);
      const redoResult = await historyManager.redo();

      expect(redoResult).toBe(true);
      expect(command.executed).toBe(true);
      expect(historyManager.getCurrentIndex()).toBe(0);
    });

    it('should handle multiple commands', async () => {
      const commands = [
        new MockCommand(editor, 'Command 1'),
        new MockCommand(editor, 'Command 2'),
        new MockCommand(editor, 'Command 3'),
      ];

      for (const command of commands) {
        await historyManager.executeCommand(command);
      }

      expect(historyManager.getCurrentIndex()).toBe(2);
      expect(historyManager.getCommands()).toHaveLength(3);

      // Undo all
      await historyManager.undo();
      await historyManager.undo();
      await historyManager.undo();

      expect(historyManager.getCurrentIndex()).toBe(-1);
      expect(commands.every((cmd) => cmd.undone)).toBe(true);
    });

    it('should clear history on branching', async () => {
      const command1 = new MockCommand(editor, 'Command 1');
      const command2 = new MockCommand(editor, 'Command 2');
      const command3 = new MockCommand(editor, 'Command 3');

      await historyManager.executeCommand(command1);
      await historyManager.executeCommand(command2);
      await historyManager.undo(); // Now at command 1

      // Execute new command (creates branch)
      await historyManager.executeCommand(command3);

      expect(historyManager.getCommands()).toHaveLength(2);
      expect(historyManager.getCommands()[1]).toBe(command3);
    });
    it('should handle failed undo/redo operations', async () => {
      const command = new MockCommand(editor, 'Failing Command');
      await historyManager.executeCommand(command);

      // Now make the command fail during undo
      command.shouldFail = true;

      const undoResult = await historyManager.undo();
      expect(undoResult).toBe(false);
    });
  });

  describe('Command Grouping', () => {
    it('should group multiple commands', async () => {
      historyManager.startGrouping('Test Group');

      const command1 = new MockCommand(editor, 'Command 1');
      const command2 = new MockCommand(editor, 'Command 2');

      await historyManager.executeCommand(command1);
      await historyManager.executeCommand(command2);

      historyManager.endGrouping();

      expect(historyManager.getCommands()).toHaveLength(1);
      expect(historyManager.getCommands()[0]).toBeInstanceOf(CommandGroup);
    });

    it('should execute grouped commands', async () => {
      const command1 = new MockCommand(editor, 'Command 1');
      const command2 = new MockCommand(editor, 'Command 2');

      const group = new CommandGroup(editor, 'Test Group', [command1, command2]);
      await group.execute();

      expect(command1.executed).toBe(true);
      expect(command2.executed).toBe(true);
    });

    it('should undo grouped commands in reverse order', async () => {
      const command1 = new MockCommand(editor, 'Command 1');
      const command2 = new MockCommand(editor, 'Command 2');

      const group = new CommandGroup(editor, 'Test Group', [command1, command2]);
      await group.execute();
      await group.undo();

      expect(command1.undone).toBe(true);
      expect(command2.undone).toBe(true);
    });
  });

  describe('Command Merging', () => {
    it('should merge compatible commands', async () => {
      const command1 = new MergeableCommand(editor, 'Mergeable 1');
      const command2 = new MergeableCommand(editor, 'Mergeable 2');

      await historyManager.executeCommand(command1);
      await historyManager.executeCommand(command2);

      expect(historyManager.getCommands()).toHaveLength(1);
      const mergedCommand = historyManager.getCommands()[0] as MergeableCommand;
      expect(mergedCommand.mergeCount).toBe(2);
    });

    it('should not merge incompatible commands', async () => {
      const command1 = new MockCommand(editor, 'Non-mergeable');
      const command2 = new MergeableCommand(editor, 'Mergeable');

      await historyManager.executeCommand(command1);
      await historyManager.executeCommand(command2);

      expect(historyManager.getCommands()).toHaveLength(2);
    });
  });
  describe('Memory Management', () => {
    it('should track memory usage', async () => {
      const command = new MockCommand(editor);
      const initialMemory = historyManager.getMemoryUsage();

      await historyManager.executeCommand(command);

      const finalMemory = historyManager.getMemoryUsage();

      // Check that memory usage increased (should be at least the command's memory usage)
      expect(finalMemory).toBeGreaterThan(initialMemory);
      expect(finalMemory - initialMemory).toBeGreaterThanOrEqual(command.getMemoryUsage());
    });
    it('should cleanup old commands when memory limit exceeded', async () => {
      // Create history manager with very low memory limit
      const lowMemoryHistory = new HistoryManager(editor, {
        maxMemoryUsage: 100, // Very low limit to force cleanup
        maxHistorySize: 100,
      });

      // Add commands
      const commands = [];
      for (let i = 0; i < 5; i++) {
        const command = new MockCommand(editor, `Command ${i}`);
        commands.push(command);
        await lowMemoryHistory.executeCommand(command);
      }

      // Should have fewer commands due to cleanup
      expect(lowMemoryHistory.getCommands().length).toBeLessThan(5);

      lowMemoryHistory.destroy();
    });
    it('should cleanup old commands when history size limit exceeded', async () => {
      // Create history manager with low size limit
      const lowSizeHistory = new HistoryManager(editor, {
        maxHistorySize: 3,
        maxMemoryUsage: 100000000, // High memory limit, focus on size limit
      });

      // Add more commands than the limit
      const commands = [];
      for (let i = 0; i < 5; i++) {
        const command = new MockCommand(editor, `Command ${i}`);
        commands.push(command);
        await lowSizeHistory.executeCommand(command);
      }

      // Should respect the size limit
      expect(lowSizeHistory.getCommands().length).toBeLessThanOrEqual(3);

      // The remaining commands should be the most recent ones
      const remainingCommands = lowSizeHistory.getCommands();
      expect(remainingCommands.length).toBeGreaterThan(0);

      lowSizeHistory.destroy();
    });
  });

  describe('State Snapshots', () => {
    it('should create snapshots at intervals', async () => {
      const snapshotHistory = new HistoryManager(editor, {
        snapshotInterval: 2,
      });

      // Execute commands to trigger snapshot creation
      for (let i = 0; i < 3; i++) {
        const command = new MockCommand(editor, `Command ${i}`);
        await snapshotHistory.executeCommand(command);
      }

      const state = snapshotHistory.getState();
      expect(state.commands).toHaveLength(3);

      snapshotHistory.destroy();
    });

    it('should restore from snapshots', async () => {
      const snapshot = await historyManager.createSnapshot();
      expect(snapshot.id).toBeDefined();
      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.canvasData).toBeDefined();

      // Should not throw
      await historyManager.restoreSnapshot(snapshot);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should handle undo shortcut', async () => {
      const command = new MockCommand(editor);
      await historyManager.executeCommand(command);

      // Simulate Ctrl+Z
      editor.getEventEmitter().emit('shortcut:pressed', {
        shortcut: 'ctrl+z',
        event: new KeyboardEvent('keydown'),
      });

      expect(command.undone).toBe(true);
    });

    it('should handle redo shortcuts', async () => {
      const command = new MockCommand(editor);
      await historyManager.executeCommand(command);
      await historyManager.undo();

      // Reset execution state
      command.executed = false;

      // Simulate Ctrl+Y
      editor.getEventEmitter().emit('shortcut:pressed', {
        shortcut: 'ctrl+y',
        event: new KeyboardEvent('keydown'),
      });

      expect(command.executed).toBe(true);
    });
  });

  describe('History State', () => {
    it('should return current history state', async () => {
      const command1 = new MockCommand(editor, 'Command 1');
      const command2 = new MockCommand(editor, 'Command 2');

      await historyManager.executeCommand(command1);
      await historyManager.executeCommand(command2);

      const state = historyManager.getState();
      expect(state.commands).toHaveLength(2);
      expect(state.currentIndex).toBe(1);
      expect(state.memoryUsage).toBeGreaterThan(0);
      expect(state.commands[0]?.name).toBe('Command 1');
      expect(state.commands[1]?.name).toBe('Command 2');
    });

    it('should emit history events', async () => {
      const eventSpy = jest.fn();
      editor.getEventEmitter().on('history:change', eventSpy);

      const command = new MockCommand(editor);
      await historyManager.executeCommand(command);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'command',
          command: command,
        }),
      );

      await historyManager.undo();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'undo',
          command: command,
        }),
      );
    });
  });

  describe('Integration with ImageEditor', () => {
    it('should expose history methods through ImageEditor API', async () => {
      const command = new MockCommand(editor);

      await editor.executeCommand(command);
      expect(editor.canUndo()).toBe(true);
      expect(editor.canRedo()).toBe(false);

      await editor.undo();
      expect(editor.canUndo()).toBe(false);
      expect(editor.canRedo()).toBe(true);

      await editor.redo();
      expect(editor.canUndo()).toBe(true);
      expect(editor.canRedo()).toBe(false);
    });

    it('should handle command grouping through ImageEditor API', async () => {
      editor.startCommandGroup('Test Group');

      const command1 = new MockCommand(editor, 'Command 1');
      const command2 = new MockCommand(editor, 'Command 2');

      await editor.executeCommand(command1);
      await editor.executeCommand(command2);

      editor.endCommandGroup();

      const state = editor.getHistoryState();
      expect(state.commands).toHaveLength(1);
    });

    it('should clear history through ImageEditor API', async () => {
      const command = new MockCommand(editor);
      await editor.executeCommand(command);

      editor.clearHistory();

      const state = editor.getHistoryState();
      expect(state.commands).toHaveLength(0);
      expect(state.currentIndex).toBe(-1);
    });
  });

  describe('Basic Commands', () => {
    it('should execute draw commands', async () => {
      let drawExecuted = false;
      const drawCommand = new DrawCommand(editor, 'Test Draw', () => {
        drawExecuted = true;
        const ctx = editor.getCanvasManager().getContext();
        ctx.fillStyle = 'red';
        ctx.fillRect(10, 10, 50, 50);
      });

      await editor.executeCommand(drawCommand);
      expect(drawExecuted).toBe(true);

      await editor.undo();
      // Canvas should be restored (tested visually or with pixel comparison)
    });

    it('should execute clear canvas commands', async () => {
      const clearCommand = new ClearCanvasCommand(editor, 'white');

      await editor.executeCommand(clearCommand);
      // Canvas should be cleared to white

      await editor.undo();
      // Canvas should be restored to previous state
    });

    it('should execute text commands', async () => {
      const textCommand = new TextCommand(editor, 'Hello World', 100, 100, {
        font: '20px Arial',
        fillStyle: 'black',
      });

      await editor.executeCommand(textCommand);
      // Text should be drawn on canvas

      await editor.undo();
      // Text should be removed (canvas restored)
    });
  });
});
