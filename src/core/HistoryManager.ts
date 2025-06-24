import {
  Command,
  HistoryManagerOptions,
  StateSnapshot,
  HistoryState,
  UndoRedoEvent,
} from '../interfaces/Command';
import { CommandGroup } from './BaseCommand';
import { EventEmitter } from './EventEmitter';
import { ImageEditor } from './ImageEditor';

/**
 * Manages command history for undo/redo functionality
 * Implements memory management and state snapshots
 */
export class HistoryManager {
  private editor: ImageEditor;
  private eventEmitter: EventEmitter;
  private commands: Command[] = [];
  private currentIndex: number = -1;
  private snapshots: Map<number, StateSnapshot> = new Map();
  private options: Required<HistoryManagerOptions>;
  private memoryUsage: number = 0;
  private grouping: boolean = false;
  private currentGroup: CommandGroup | null = null;

  constructor(editor: ImageEditor, options: HistoryManagerOptions = {}) {
    this.editor = editor;
    this.eventEmitter = editor.getEventEmitter();

    this.options = {
      maxHistorySize: options.maxHistorySize ?? 50,
      maxMemoryUsage: options.maxMemoryUsage ?? 100 * 1024 * 1024, // 100MB
      enableGrouping: options.enableGrouping ?? true,
      autoCleanup: options.autoCleanup ?? true,
      snapshotInterval: options.snapshotInterval ?? 10,
    };

    this.setupEventListeners();
  }
  private setupEventListeners(): void {
    // Listen for keyboard shortcuts
    this.eventEmitter.on('shortcut:pressed', (data: any) => {
      if (data.shortcut === 'ctrl+z') {
        this.undo();
      } else if (data.shortcut === 'ctrl+y' || data.shortcut === 'ctrl+shift+z') {
        this.redo();
      }
    });
  }

  /**
   * Execute a command and add it to history
   */
  public async executeCommand(command: Command): Promise<void> {
    try {
      // Clear any commands after current index (branching)
      if (this.currentIndex < this.commands.length - 1) {
        const removedCommands = this.commands.splice(this.currentIndex + 1);
        this.updateMemoryUsage(removedCommands, 'remove');
      }

      // Check if we can merge with the last command
      if (this.options.enableGrouping && this.canMergeWithLast(command)) {
        const lastCommand = this.commands[this.currentIndex];
        if (lastCommand?.mergeWith) {
          const mergedCommand = lastCommand.mergeWith(command);
          this.commands[this.currentIndex] = mergedCommand;
          this.updateMemoryUsage([lastCommand], 'remove');
          this.updateMemoryUsage([mergedCommand], 'add');
        }
      } else {
        // Add new command
        if (this.grouping && this.currentGroup) {
          this.currentGroup.addCommand(command);
          await command.execute();
        } else {
          await command.execute();
          this.addCommand(command);
        }
      }

      // Create snapshot if needed
      if (this.shouldCreateSnapshot()) {
        await this.createSnapshot();
      }

      // Cleanup if needed
      if (this.options.autoCleanup) {
        this.cleanup();
      }

      this.emitHistoryEvent('command', { command });
    } catch (error) {
      console.error('Failed to execute command:', error);
      throw error;
    }
  }

  /**
   * Undo the last command
   */
  public async undo(): Promise<boolean> {
    if (!this.canUndo()) {
      return false;
    }

    try {
      const command = this.commands[this.currentIndex];
      if (command) {
        await command.undo();
        this.currentIndex--;
        this.emitHistoryEvent('undo', { command });
        return true;
      }
    } catch (error) {
      console.error('Failed to undo command:', error);
      // Try to restore from snapshot if available
      await this.restoreFromNearestSnapshot();
    }

    return false;
  }

  /**
   * Redo the next command
   */
  public async redo(): Promise<boolean> {
    if (!this.canRedo()) {
      return false;
    }

    try {
      this.currentIndex++;
      const command = this.commands[this.currentIndex];
      if (command) {
        await command.execute();
        this.emitHistoryEvent('redo', { command });
        return true;
      }
    } catch (error) {
      console.error('Failed to redo command:', error);
      this.currentIndex--; // Revert index change
    }

    return false;
  }

  /**
   * Start grouping commands
   */
  public startGrouping(groupName: string): void {
    if (!this.options.enableGrouping) {
      return;
    }

    if (this.grouping) {
      this.endGrouping(); // End previous group
    }

    this.grouping = true;
    this.currentGroup = new CommandGroup(this.editor, groupName);
  }

  /**
   * End grouping commands and add the group to history
   */
  public endGrouping(): void {
    if (!this.grouping || !this.currentGroup) {
      return;
    }

    this.grouping = false;

    if (this.currentGroup.getCommands().length > 0) {
      this.addCommand(this.currentGroup);
    }

    this.currentGroup = null;
  }

  /**
   * Clear all history
   */
  public clear(): void {
    this.commands = [];
    this.currentIndex = -1;
    this.snapshots.clear();
    this.memoryUsage = 0;
    this.grouping = false;
    this.currentGroup = null;
    this.emitHistoryEvent('clear');
  }

  /**
   * Create a state snapshot
   */
  public async createSnapshot(): Promise<StateSnapshot> {
    const canvas = this.editor.getCanvasManager().getCanvas();
    const ctx = this.editor.getCanvasManager().getContext();

    let canvasData: ImageData | string;
    let memoryUsage = 0;

    try {
      // Try to get ImageData (memory efficient for small images)
      canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      memoryUsage = canvasData.data.length;
    } catch {
      // Fallback to data URL (for large images or cross-origin issues)
      canvasData = canvas.toDataURL('image/png');
      memoryUsage = canvasData.length * 2; // Rough estimate for string
    }

    const snapshot: StateSnapshot = {
      id: `snapshot_${Date.now()}`,
      timestamp: Date.now(),
      canvasData,
      memoryUsage,
    };

    this.snapshots.set(this.currentIndex, snapshot);
    this.memoryUsage += memoryUsage;

    this.emitHistoryEvent('snapshot', { snapshot });
    return snapshot;
  }
  /**
   * Restore from a snapshot
   */
  public async restoreSnapshot(snapshot: StateSnapshot): Promise<void> {
    const canvas = this.editor.getCanvasManager().getCanvas();
    const ctx = this.editor.getCanvasManager().getContext();

    if (typeof snapshot.canvasData === 'object' && snapshot.canvasData.data) {
      // Handle ImageData
      ctx.putImageData(snapshot.canvasData as ImageData, 0, 0);
    } else if (typeof snapshot.canvasData === 'string') {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve();
        };
        img.onerror = reject;
        img.src = snapshot.canvasData as string;
      });
    }
  }

  /**
   * Get current history state
   */
  public getState(): HistoryState {
    return {
      commands: this.commands.map(
        (cmd) =>
          cmd.serialize?.() || {
            id: cmd.id,
            name: cmd.name,
            timestamp: cmd.timestamp,
            type: 'Unknown',
            data: {},
          },
      ),
      currentIndex: this.currentIndex,
      memoryUsage: this.memoryUsage,
      maxMemoryUsage: this.options.maxMemoryUsage,
      maxHistorySize: this.options.maxHistorySize,
    };
  }
  /**
   * Check if undo is possible
   */
  public canUndo(): boolean {
    return this.currentIndex >= 0 && (this.commands[this.currentIndex]?.isValid() ?? false);
  }

  /**
   * Check if redo is possible
   */
  public canRedo(): boolean {
    return (
      this.currentIndex < this.commands.length - 1 &&
      (this.commands[this.currentIndex + 1]?.isValid() ?? false)
    );
  }

  /**
   * Get memory usage in bytes
   */
  public getMemoryUsage(): number {
    return this.memoryUsage;
  }

  /**
   * Get command history
   */
  public getCommands(): Command[] {
    return [...this.commands];
  }

  /**
   * Get current command index
   */
  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  private addCommand(command: Command): void {
    this.commands.push(command);
    this.currentIndex++;
    this.updateMemoryUsage([command], 'add');
  }

  private canMergeWithLast(command: Command): boolean {
    if (this.currentIndex < 0) return false;
    const lastCommand = this.commands[this.currentIndex];
    return lastCommand?.canMergeWith?.(command) ?? false;
  }

  private shouldCreateSnapshot(): boolean {
    return this.currentIndex % this.options.snapshotInterval === 0;
  }

  private async restoreFromNearestSnapshot(): Promise<void> {
    // Find the nearest snapshot at or before current index
    let snapshotIndex = this.currentIndex;
    while (snapshotIndex >= 0 && !this.snapshots.has(snapshotIndex)) {
      snapshotIndex--;
    }

    if (snapshotIndex >= 0) {
      const snapshot = this.snapshots.get(snapshotIndex);
      if (snapshot) {
        await this.restoreSnapshot(snapshot);
        // Re-execute commands from snapshot to current position
        for (let i = snapshotIndex + 1; i <= this.currentIndex; i++) {
          const command = this.commands[i];
          if (command?.isValid()) {
            await command.execute();
          }
        }
      }
    }
  }

  private updateMemoryUsage(commands: Command[], operation: 'add' | 'remove'): void {
    const usage = commands.reduce((total, cmd) => total + cmd.getMemoryUsage(), 0);
    this.memoryUsage += operation === 'add' ? usage : -usage;
  }

  private cleanup(): void {
    // Remove old commands if exceeding limits
    while (this.commands.length > this.options.maxHistorySize) {
      const removed = this.commands.shift();
      if (removed) {
        this.updateMemoryUsage([removed], 'remove');
        this.currentIndex--;
      }
    }

    // Remove commands if exceeding memory limit
    while (this.memoryUsage > this.options.maxMemoryUsage && this.commands.length > 1) {
      const removed = this.commands.shift();
      if (removed) {
        this.updateMemoryUsage([removed], 'remove');
        this.currentIndex--;
      }
    }

    // Cleanup old snapshots
    const validIndices = new Set();
    for (let i = 0; i < this.commands.length; i += this.options.snapshotInterval) {
      validIndices.add(i);
    }

    for (const [index, snapshot] of this.snapshots) {
      if (!validIndices.has(index)) {
        this.snapshots.delete(index);
        this.memoryUsage -= snapshot.memoryUsage;
      }
    }
  }

  private emitHistoryEvent(type: UndoRedoEvent['type'], data?: Partial<UndoRedoEvent>): void {
    const event: UndoRedoEvent = { type, ...data };
    this.eventEmitter.emit('history:change', event);
  }

  /**
   * Destroy the history manager and cleanup resources
   */
  public destroy(): void {
    this.clear();
    // Remove event listeners if needed
  }
}
