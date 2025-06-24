/**
 * Command pattern interfaces for undo/redo functionality
 */
export interface Command {
    /**
     * Unique identifier for the command
     */
    readonly id: string;
    /**
     * Human-readable name for the command (for UI display)
     */
    readonly name: string;
    /**
     * Timestamp when the command was created
     */
    readonly timestamp: number;
    /**
     * Execute the command
     */
    execute(): void | Promise<void>;
    /**
     * Undo the command (reverse the operation)
     */
    undo(): void | Promise<void>;
    /**
     * Get the memory footprint of this command in bytes
     */
    getMemoryUsage(): number;
    /**
     * Check if this command can be merged with another command
     * (useful for grouping similar operations like continuous brush strokes)
     */
    canMergeWith?(command: Command): boolean;
    /**
     * Merge this command with another command
     */
    mergeWith?(command: Command): Command;
    /**
     * Serialize command data for storage/restoration
     */
    serialize?(): CommandData;
    /**
     * Check if command is still valid (e.g., references still exist)
     */
    isValid(): boolean;
}
export interface CommandData {
    id: string;
    name: string;
    timestamp: number;
    type: string;
    data: any;
}
export interface CommandGroup {
    id: string;
    name: string;
    commands: Command[];
    timestamp: number;
}
export interface HistoryState {
    commands: CommandData[];
    currentIndex: number;
    memoryUsage: number;
    maxMemoryUsage: number;
    maxHistorySize: number;
}
export interface StateSnapshot {
    id: string;
    timestamp: number;
    canvasData: ImageData | string;
    layers?: LayerSnapshot[];
    metadata?: Record<string, any>;
    memoryUsage: number;
}
export interface LayerSnapshot {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    blendMode: string;
    data: ImageData | string;
}
export interface HistoryManagerOptions {
    maxHistorySize?: number;
    maxMemoryUsage?: number;
    enableGrouping?: boolean;
    autoCleanup?: boolean;
    snapshotInterval?: number;
}
export interface UndoRedoEvent {
    type: 'undo' | 'redo' | 'clear' | 'snapshot' | 'command';
    command?: Command;
    commandGroup?: CommandGroup;
    snapshot?: StateSnapshot;
}
//# sourceMappingURL=Command.d.ts.map