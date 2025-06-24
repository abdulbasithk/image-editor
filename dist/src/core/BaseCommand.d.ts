import { Command, CommandData } from '../interfaces/Command';
import { ImageEditor } from './ImageEditor';
/**
 * Abstract base class for implementing commands using the Command pattern
 */
export declare abstract class BaseCommand implements Command {
    readonly id: string;
    readonly name: string;
    readonly timestamp: number;
    protected editor: ImageEditor;
    constructor(editor: ImageEditor, name: string, id?: string);
    /**
     * Abstract method to execute the command
     */
    abstract execute(): void | Promise<void>;
    /**
     * Abstract method to undo the command
     */
    abstract undo(): void | Promise<void>;
    /**
     * Get memory usage in bytes (override in subclasses for accurate measurement)
     */
    getMemoryUsage(): number; /**
     * Check if command is still valid
     */
    isValid(): boolean;
    /**
     * Generate unique ID for the command
     */
    protected generateId(): string;
    /**
     * Default serialization (override in subclasses for custom data)
     */
    serialize(): CommandData;
    /**
     * Check if this command can be merged with another
     */
    canMergeWith(_command: Command): boolean;
    /**
     * Merge with another command (override in subclasses)
     */
    mergeWith(_command: Command): Command;
}
/**
 * Command for grouping multiple commands together
 */
export declare class CommandGroup extends BaseCommand {
    private commands;
    constructor(editor: ImageEditor, name: string, commands?: Command[]);
    execute(): Promise<void>;
    undo(): Promise<void>;
    getMemoryUsage(): number;
    addCommand(command: Command): void;
    getCommands(): Command[];
    isValid(): boolean;
    serialize(): CommandData;
}
/**
 * No-operation command (useful for testing and placeholders)
 */
export declare class NoOpCommand extends BaseCommand {
    constructor(editor: ImageEditor, name?: string);
    execute(): void;
    undo(): void;
    getMemoryUsage(): number;
}
//# sourceMappingURL=BaseCommand.d.ts.map