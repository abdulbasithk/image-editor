import { Command, CommandData } from '../interfaces/Command';
import { ImageEditor } from './ImageEditor';

/**
 * Abstract base class for implementing commands using the Command pattern
 */
export abstract class BaseCommand implements Command {
  public readonly id: string;
  public readonly name: string;
  public readonly timestamp: number;
  protected editor: ImageEditor;

  constructor(editor: ImageEditor, name: string, id?: string) {
    this.editor = editor;
    this.name = name;
    this.timestamp = Date.now();
    this.id = id || this.generateId();
  }

  /**
   * Abstract method to execute the command
   */
  public abstract execute(): void | Promise<void>;

  /**
   * Abstract method to undo the command
   */
  public abstract undo(): void | Promise<void>;

  /**
   * Get memory usage in bytes (override in subclasses for accurate measurement)
   */
  public getMemoryUsage(): number {
    // Basic estimation - override in subclasses
    return 1024; // 1KB default
  } /**
   * Check if command is still valid
   */
  public isValid(): boolean {
    return this.editor !== null && this.editor !== undefined && !this.editor.isDestroyed();
  }

  /**
   * Generate unique ID for the command
   */
  protected generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Default serialization (override in subclasses for custom data)
   */
  public serialize(): CommandData {
    return {
      id: this.id,
      name: this.name,
      timestamp: this.timestamp,
      type: this.constructor.name,
      data: {},
    };
  }

  /**
   * Check if this command can be merged with another
   */
  public canMergeWith(_command: Command): boolean {
    // Default: no merging
    return false;
  }

  /**
   * Merge with another command (override in subclasses)
   */
  public mergeWith(_command: Command): Command {
    throw new Error('Merging not supported for this command type');
  }
}

/**
 * Command for grouping multiple commands together
 */
export class CommandGroup extends BaseCommand {
  private commands: Command[] = [];

  constructor(editor: ImageEditor, name: string, commands: Command[] = []) {
    super(editor, name);
    this.commands = [...commands];
  }

  public async execute(): Promise<void> {
    for (const command of this.commands) {
      await command.execute();
    }
  }

  public async undo(): Promise<void> {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      await this.commands[i]?.undo();
    }
  }
  public override getMemoryUsage(): number {
    return this.commands.reduce((total, cmd) => total + cmd.getMemoryUsage(), 0);
  }

  public addCommand(command: Command): void {
    this.commands.push(command);
  }

  public getCommands(): Command[] {
    return [...this.commands];
  }

  public override isValid(): boolean {
    return super.isValid() && this.commands.every((cmd) => cmd.isValid());
  }

  public override serialize(): CommandData {
    return {
      ...super.serialize(),
      data: {
        commands: this.commands.map((cmd) => cmd.serialize?.() || cmd.id),
      },
    };
  }
}

/**
 * No-operation command (useful for testing and placeholders)
 */
export class NoOpCommand extends BaseCommand {
  constructor(editor: ImageEditor, name = 'No Operation') {
    super(editor, name);
  }
  public override execute(): void {
    // Do nothing
  }

  public override undo(): void {
    // Do nothing
  }

  public override getMemoryUsage(): number {
    return 64; // Minimal memory usage
  }
}
