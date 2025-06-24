import { Command, HistoryManagerOptions, StateSnapshot, HistoryState } from '../interfaces/Command';
import { ImageEditor } from './ImageEditor';
/**
 * Manages command history for undo/redo functionality
 * Implements memory management and state snapshots
 */
export declare class HistoryManager {
    private editor;
    private eventEmitter;
    private commands;
    private currentIndex;
    private snapshots;
    private options;
    private memoryUsage;
    private grouping;
    private currentGroup;
    constructor(editor: ImageEditor, options?: HistoryManagerOptions);
    private setupEventListeners;
    /**
     * Execute a command and add it to history
     */
    executeCommand(command: Command): Promise<void>;
    /**
     * Undo the last command
     */
    undo(): Promise<boolean>;
    /**
     * Redo the next command
     */
    redo(): Promise<boolean>;
    /**
     * Start grouping commands
     */
    startGrouping(groupName: string): void;
    /**
     * End grouping commands and add the group to history
     */
    endGrouping(): void;
    /**
     * Clear all history
     */
    clear(): void;
    /**
     * Create a state snapshot
     */
    createSnapshot(): Promise<StateSnapshot>;
    /**
     * Restore from a snapshot
     */
    restoreSnapshot(snapshot: StateSnapshot): Promise<void>;
    /**
     * Get current history state
     */
    getState(): HistoryState;
    /**
     * Check if undo is possible
     */
    canUndo(): boolean;
    /**
     * Check if redo is possible
     */
    canRedo(): boolean;
    /**
     * Get memory usage in bytes
     */
    getMemoryUsage(): number;
    /**
     * Get command history
     */
    getCommands(): Command[];
    /**
     * Get current command index
     */
    getCurrentIndex(): number;
    private addCommand;
    private canMergeWithLast;
    private shouldCreateSnapshot;
    private restoreFromNearestSnapshot;
    private updateMemoryUsage;
    private cleanup;
    private emitHistoryEvent;
    /**
     * Destroy the history manager and cleanup resources
     */
    destroy(): void;
}
//# sourceMappingURL=HistoryManager.d.ts.map