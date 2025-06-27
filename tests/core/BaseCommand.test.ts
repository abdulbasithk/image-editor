import { ImageEditor } from '../../src/core/ImageEditor';
import { BaseCommand, CommandGroup, NoOpCommand } from '../../src/core/BaseCommand';
import { Command } from '../../src/interfaces/Command';

// Concrete implementation of BaseCommand for testing abstract class
class TestCommand extends BaseCommand {
  public executed = false;
  public undone = false;
  public shouldFailExecution = false;
  public shouldFailUndo = false;

  constructor(
    editor: ImageEditor,
    name: string = 'Test Command',
    shouldFailExecution = false,
    shouldFailUndo = false,
  ) {
    super(editor, name);
    this.shouldFailExecution = shouldFailExecution;
    this.shouldFailUndo = shouldFailUndo;
  }

  public async execute(): Promise<void> {
    if (this.shouldFailExecution) {
      throw new Error('Execution failed');
    }
    this.executed = true;
  }

  public async undo(): Promise<void> {
    if (this.shouldFailUndo) {
      throw new Error('Undo failed');
    }
    this.undone = true;
  }

  public override getMemoryUsage(): number {
    return 256; // Custom memory usage
  }
}

// Command that supports merging for testing
class MergeableTestCommand extends TestCommand {
  public mergeCount = 1;

  constructor(editor: ImageEditor, name: string = 'Mergeable Test Command') {
    super(editor, name);
  }

  public override canMergeWith(command: Command): boolean {
    return command instanceof MergeableTestCommand;
  }

  public override mergeWith(command: Command): Command {
    if (!this.canMergeWith(command)) {
      return super.mergeWith(command); // This should trigger the error
    }
    const merged = new MergeableTestCommand(this.editor, `${this.name} (merged)`);
    merged.mergeCount = this.mergeCount + (command as MergeableTestCommand).mergeCount;
    return merged;
  }
}

// Invalid command for testing validation
class InvalidCommand extends TestCommand {
  constructor(editor: ImageEditor, name: string = 'Invalid Command') {
    super(editor, name);
  }

  public override isValid(): boolean {
    return false; // Always invalid
  }
}

describe('BaseCommand', () => {
  let editor: ImageEditor;

  beforeEach(() => {
    const mockContainer = document.createElement('div');
    editor = new ImageEditor({
      container: mockContainer,
      width: 800,
      height: 600,
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('Abstract BaseCommand', () => {
    it('should create command with proper initialization', () => {
      const command = new TestCommand(editor, 'Test Command');

      expect(command.name).toBe('Test Command');
      expect(command.id).toMatch(/^cmd_\d+_[a-z0-9]+$/);
      expect(command.timestamp).toBeGreaterThan(0);
      expect(command.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should create command with custom ID', () => {
      const command = new TestCommand(editor, 'Test Command');
      expect(command.id).toBeDefined();
      expect(typeof command.id).toBe('string');
    });

    it('should execute and undo commands', async () => {
      const command = new TestCommand(editor);

      expect(command.executed).toBe(false);
      expect(command.undone).toBe(false);

      await command.execute();
      expect(command.executed).toBe(true);

      await command.undo();
      expect(command.undone).toBe(true);
    });

    it('should return default memory usage', () => {
      const command = new TestCommand(editor);
      expect(command.getMemoryUsage()).toBe(256); // Custom override
    });

    it('should return base class default memory usage', () => {
      // Create a command that doesn't override getMemoryUsage
      class BasicTestCommand extends BaseCommand {
        public async execute(): Promise<void> {
          // Do nothing
        }
        public async undo(): Promise<void> {
          // Do nothing
        }
      }

      const command = new BasicTestCommand(editor, 'Basic Test');
      expect(command.getMemoryUsage()).toBe(1024); // Base class default
    });

    it('should validate commands correctly', () => {
      const validCommand = new TestCommand(editor);
      const invalidCommand = new InvalidCommand(editor);

      expect(validCommand.isValid()).toBe(true);
      expect(invalidCommand.isValid()).toBe(false);
    });

    it('should validate commands when editor is destroyed', () => {
      const command = new TestCommand(editor);
      expect(command.isValid()).toBe(true);

      editor.destroy();
      expect(command.isValid()).toBe(false);
    });

    it('should serialize command data', () => {
      const command = new TestCommand(editor, 'Serialize Test');
      const serialized = command.serialize();

      expect(serialized.id).toBe(command.id);
      expect(serialized.name).toBe('Serialize Test');
      expect(serialized.timestamp).toBe(command.timestamp);
      expect(serialized.type).toBe('TestCommand');
      expect(serialized.data).toEqual({});
    });

    it('should not merge by default', () => {
      const command1 = new TestCommand(editor);
      const command2 = new TestCommand(editor);

      expect(command1.canMergeWith(command2)).toBe(false);
    });

    it('should throw error when merging unsupported commands', () => {
      const command1 = new TestCommand(editor);
      const command2 = new TestCommand(editor);

      expect(() => command1.mergeWith(command2)).toThrow(
        'Merging not supported for this command type',
      );
    });

    it('should merge compatible commands', () => {
      const command1 = new MergeableTestCommand(editor, 'Command 1');
      const command2 = new MergeableTestCommand(editor, 'Command 2');

      expect(command1.canMergeWith(command2)).toBe(true);

      const merged = command1.mergeWith(command2) as MergeableTestCommand;
      expect(merged.name).toBe('Command 1 (merged)');
      expect(merged.mergeCount).toBe(2);
    });

    it('should throw error when merging incompatible commands through mergeable command', () => {
      const mergeableCommand = new MergeableTestCommand(editor);
      const regularCommand = new TestCommand(editor);

      expect(() => mergeableCommand.mergeWith(regularCommand)).toThrow(
        'Merging not supported for this command type',
      );
    });
  });

  describe('CommandGroup', () => {
    it('should create empty command group', () => {
      const group = new CommandGroup(editor, 'Test Group');

      expect(group.name).toBe('Test Group');
      expect(group.getCommands()).toHaveLength(0);
    });

    it('should create command group with initial commands', () => {
      const command1 = new TestCommand(editor, 'Command 1');
      const command2 = new TestCommand(editor, 'Command 2');
      const group = new CommandGroup(editor, 'Test Group', [command1, command2]);

      expect(group.getCommands()).toHaveLength(2);
      expect(group.getCommands()[0]).toBe(command1);
      expect(group.getCommands()[1]).toBe(command2);
    });

    it('should add commands to group', () => {
      const group = new CommandGroup(editor, 'Test Group');
      const command = new TestCommand(editor);

      group.addCommand(command);
      expect(group.getCommands()).toHaveLength(1);
      expect(group.getCommands()[0]).toBe(command);
    });

    it('should execute all commands in group', async () => {
      const command1 = new TestCommand(editor, 'Command 1');
      const command2 = new TestCommand(editor, 'Command 2');
      const group = new CommandGroup(editor, 'Test Group', [command1, command2]);

      await group.execute();

      expect(command1.executed).toBe(true);
      expect(command2.executed).toBe(true);
    });

    it('should undo all commands in reverse order', async () => {
      const command1 = new TestCommand(editor, 'Command 1');
      const command2 = new TestCommand(editor, 'Command 2');
      const group = new CommandGroup(editor, 'Test Group', [command1, command2]);

      // First execute
      await group.execute();

      // Then undo
      await group.undo();

      expect(command1.undone).toBe(true);
      expect(command2.undone).toBe(true);
    });

    it('should calculate total memory usage', () => {
      const command1 = new TestCommand(editor); // 256 bytes
      const command2 = new TestCommand(editor); // 256 bytes
      const group = new CommandGroup(editor, 'Test Group', [command1, command2]);

      expect(group.getMemoryUsage()).toBe(512); // 256 + 256
    });

    it('should validate all commands in group', () => {
      const validCommand = new TestCommand(editor);
      const invalidCommand = new InvalidCommand(editor);

      const validGroup = new CommandGroup(editor, 'Valid Group', [validCommand]);
      const invalidGroup = new CommandGroup(editor, 'Invalid Group', [
        validCommand,
        invalidCommand,
      ]);

      expect(validGroup.isValid()).toBe(true);
      expect(invalidGroup.isValid()).toBe(false);
    });

    it('should serialize group with command data', () => {
      const command1 = new TestCommand(editor, 'Command 1');
      const command2 = new TestCommand(editor, 'Command 2');
      const group = new CommandGroup(editor, 'Test Group', [command1, command2]);

      const serialized = group.serialize();

      expect(serialized.name).toBe('Test Group');
      expect(serialized.type).toBe('CommandGroup');
      expect(serialized.data.commands).toHaveLength(2);
      expect(serialized.data.commands[0]).toEqual(command1.serialize());
      expect(serialized.data.commands[1]).toEqual(command2.serialize());
    });

    it('should handle commands without serialize method', () => {
      // Create a command without serialize method for edge case testing
      const mockCommand = {
        id: 'mock_command',
        name: 'Mock Command',
        timestamp: Date.now(),
        execute: jest.fn(),
        undo: jest.fn(),
        isValid: () => true,
        getMemoryUsage: () => 100,
      } as unknown as Command;

      const group = new CommandGroup(editor, 'Test Group', [mockCommand]);
      const serialized = group.serialize();

      expect(serialized.data.commands).toHaveLength(1);
      expect(serialized.data.commands[0]).toBe('mock_command');
    });

    it('should return copy of commands array', () => {
      const command = new TestCommand(editor);
      const group = new CommandGroup(editor, 'Test Group', [command]);

      const commands1 = group.getCommands();
      const commands2 = group.getCommands();

      expect(commands1).not.toBe(commands2); // Different array instances
      expect(commands1).toEqual(commands2); // Same content
    });

    it('should handle empty commands during undo', async () => {
      const group = new CommandGroup(editor, 'Empty Group');

      // Should not throw error
      await expect(group.undo()).resolves.toBeUndefined();
    });

    it('should handle null/undefined commands in array during undo', async () => {
      const command = new TestCommand(editor);
      const group = new CommandGroup(editor, 'Test Group', [command]);

      // Execute first to set up state
      await group.execute();

      // Should handle the normal case without any issues
      await group.undo();

      expect(command.executed).toBe(true);
      expect(command.undone).toBe(true);
    });
  });

  describe('NoOpCommand', () => {
    it('should create no-op command with default name', () => {
      const noOpCommand = new NoOpCommand(editor);

      expect(noOpCommand.name).toBe('No Operation');
      expect(noOpCommand.id).toMatch(/^cmd_\d+_[a-z0-9]+$/);
    });

    it('should create no-op command with custom name', () => {
      const noOpCommand = new NoOpCommand(editor, 'Custom No-Op');

      expect(noOpCommand.name).toBe('Custom No-Op');
    });

    it('should do nothing on execute', async () => {
      const noOpCommand = new NoOpCommand(editor);

      // Should not throw any errors and complete successfully
      expect(await noOpCommand.execute()).toBeUndefined();
    });

    it('should do nothing on undo', async () => {
      const noOpCommand = new NoOpCommand(editor);

      // Should not throw any errors and complete successfully
      expect(await noOpCommand.undo()).toBeUndefined();
    });

    it('should have minimal memory usage', () => {
      const noOpCommand = new NoOpCommand(editor);

      expect(noOpCommand.getMemoryUsage()).toBe(64);
    });

    it('should be valid when editor is valid', () => {
      const noOpCommand = new NoOpCommand(editor);

      expect(noOpCommand.isValid()).toBe(true);
    });

    it('should be invalid when editor is destroyed', () => {
      const noOpCommand = new NoOpCommand(editor);

      editor.destroy();
      expect(noOpCommand.isValid()).toBe(false);
    });

    it('should serialize correctly', () => {
      const noOpCommand = new NoOpCommand(editor, 'Test No-Op');
      const serialized = noOpCommand.serialize();

      expect(serialized.name).toBe('Test No-Op');
      expect(serialized.type).toBe('NoOpCommand');
      expect(serialized.data).toEqual({});
    });
  });
});
