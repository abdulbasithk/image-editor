import { ImageEditorConfig, EditorEventKey, EditorEventData, Point } from '../types';
import { Plugin, PluginConstructor, PluginConfig } from '../interfaces/Plugin';
import { Tool } from '../interfaces/Tool';
import { Command, HistoryState } from '../interfaces/Command';
import { EventEmitter } from './EventEmitter';
import { CanvasManager } from './CanvasManager';
import { InputManager } from './InputManager';
import { PluginManager } from './PluginManager';
import { HistoryManager } from './HistoryManager';

export class ImageEditor {
  private config: ImageEditorConfig;
  private canvasManager: CanvasManager;
  private eventEmitter: EventEmitter;
  private inputManager: InputManager;
  private pluginManager: PluginManager;
  private historyManager: HistoryManager;
  private currentTool: Tool | null = null;
  private tools: Map<string, Tool> = new Map();
  private container: HTMLElement;
  private destroyed: boolean = false;

  constructor(config: ImageEditorConfig) {
    this.config = { version: '1.0.0', ...config };
    this.container = this.resolveContainer(config.container);

    // Initialize core components
    this.eventEmitter = new EventEmitter();
    this.canvasManager = new CanvasManager(
      this.container,
      config.width || 800,
      config.height || 600,
    ); // Initialize plugin manager
    this.pluginManager = new PluginManager(this);

    // Initialize history manager
    this.historyManager = new HistoryManager(this);

    // Initialize input manager
    this.inputManager = new InputManager(this.canvasManager.getCanvas(), this.eventEmitter);

    // Setup event delegation for tool interactions
    this.setupEventDelegation();

    // Emit ready event
    this.eventEmitter.emit('editor:ready', { editor: this });
  }
  private resolveContainer(container: string | HTMLElement): HTMLElement {
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (!element) {
        throw new Error(`Container element not found: ${container}`);
      }
      return element as HTMLElement;
    }
    return container;
  }
  private setupEventDelegation(): void {
    // Delegate canvas events to current tool
    this.eventEmitter.on('canvas:mousedown', (data: { point: Point; event: MouseEvent }) => {
      if (this.currentTool && this.currentTool.onMouseDown) {
        this.currentTool.onMouseDown(data.point, data.event);
      }
      this.eventEmitter.emit('tool:action', {
        toolName: this.currentTool?.name || 'none',
        action: 'mousedown',
        data,
      });
    });

    this.eventEmitter.on('canvas:mousemove', (data: { point: Point; event: MouseEvent }) => {
      if (this.currentTool && this.currentTool.onMouseMove) {
        this.currentTool.onMouseMove(data.point, data.event);
      }
    });

    this.eventEmitter.on('canvas:mouseup', (data: { point: Point; event: MouseEvent }) => {
      if (this.currentTool && this.currentTool.onMouseUp) {
        this.currentTool.onMouseUp(data.point, data.event);
      }
      this.eventEmitter.emit('tool:action', {
        toolName: this.currentTool?.name || 'none',
        action: 'mouseup',
        data,
      });
    });

    this.eventEmitter.on(
      'canvas:drag',
      (data: { point: Point; deltaX: number; deltaY: number; event: MouseEvent }) => {
        if (this.currentTool && this.currentTool.onDrag) {
          this.currentTool.onDrag(data.point, data.deltaX, data.deltaY, data.event);
        }
        this.eventEmitter.emit('tool:action', {
          toolName: this.currentTool?.name || 'none',
          action: 'drag',
          data,
        });
      },
    );

    this.eventEmitter.on(
      'canvas:wheel',
      (data: { point: Point; deltaY: number; ctrlKey: boolean; event: WheelEvent }) => {
        if (this.currentTool && this.currentTool.onWheel) {
          this.currentTool.onWheel(data.point, data.deltaY, data.ctrlKey, data.event);
        }
      },
    );

    // Handle keyboard shortcuts
    this.eventEmitter.on('shortcut:pressed', (data: { shortcut: string; event: KeyboardEvent }) => {
      this.handleShortcut(data.shortcut, data.event);
    });
  }

  private handleShortcut(shortcut: string, event: KeyboardEvent): void {
    // Handle common keyboard shortcuts
    switch (shortcut) {
      case 'Ctrl+z':
        this.eventEmitter.emit('history:action', { type: 'undo', action: null });
        break;
      case 'Ctrl+y':
      case 'Ctrl+Shift+z':
        this.eventEmitter.emit('history:action', { type: 'redo', action: null });
        break;
      case 'Ctrl+a':
        // Select all functionality
        event.preventDefault();
        break;
      case 'Delete':
      case 'Backspace':
        // Delete selected content
        break;
      case 'Escape':
        // Cancel current operation
        if (this.currentTool && this.currentTool.deactivate) {
          this.currentTool.deactivate();
        }
        break;
      default:
        // Allow tools to handle custom shortcuts
        if (this.currentTool && this.currentTool.onKeyDown) {
          this.currentTool.onKeyDown(event.key, event);
        }
        break;
    }
  }
  // Core methods
  public async loadImage(source: string | File | ImageData): Promise<void> {
    // TODO: Implement image loading
    if (typeof source === 'string') {
      const img = new Image();
      return new Promise((resolve, reject) => {
        img.onload = () => {
          this.canvasManager.drawImage(img, 0, 0);
          this.eventEmitter.emit('image:loaded', {
            width: img.width,
            height: img.height,
            source: source as string,
          });
          resolve();
        };
        img.onerror = reject;
        img.src = source;
      });
    }
    // TODO: Handle File and ImageData sources
  }

  public async exportImage(format: string, quality?: number): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = this.canvasManager.getCanvas();
      canvas.toBlob(
        (blob) => {
          if (blob) {
            this.eventEmitter.emit('image:exported', { format, blob });
            resolve(blob);
          }
        },
        format,
        quality,
      );
    });
  }
  public destroy(): void {
    if (this.destroyed) {
      return;
    }

    // Clean up event listeners
    this.inputManager.destroy();

    // Clear history
    this.historyManager.clear();

    // Mark as destroyed
    this.destroyed = true;

    // Emit destroyed event
    this.eventEmitter.emit('editor:destroyed', { editor: this });
    this.eventEmitter.removeAllListeners();
  }

  // Tool methods
  public selectTool(toolName: string): void {
    const previousTool = this.currentTool?.name;

    // Deactivate current tool
    if (this.currentTool) {
      this.currentTool.deactivate();
    }

    // Activate new tool
    const tool = this.tools.get(toolName);
    if (tool) {
      this.currentTool = tool;
      tool.activate();
      this.eventEmitter.emit('tool:selected', { toolName, previousTool });
    }
  }

  public getCurrentTool(): Tool | null {
    return this.currentTool;
  }

  public registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  public unregisterTool(toolName: string): void {
    if (this.currentTool?.name === toolName) {
      this.currentTool = null;
    }
    this.tools.delete(toolName);
  }

  // Event methods with proper typing
  public on<K extends EditorEventKey>(
    event: K,
    callback: (data: EditorEventData<K>) => void,
  ): void {
    this.eventEmitter.on(event, callback);
  }

  public off<K extends EditorEventKey>(
    event: K,
    callback: (data: EditorEventData<K>) => void,
  ): void {
    this.eventEmitter.off(event, callback);
  }

  public emit<K extends EditorEventKey>(event: K, data: EditorEventData<K>): void {
    this.eventEmitter.emit(event, data);
  }

  // Accessors for core components
  public getCanvasManager(): CanvasManager {
    return this.canvasManager;
  }

  public getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  public getContainer(): HTMLElement {
    return this.container;
  }
  public getConfig(): ImageEditorConfig {
    return { ...this.config };
  }

  // Plugin methods
  public async registerPlugin(
    PluginClass: PluginConstructor,
    config?: PluginConfig,
  ): Promise<void> {
    return this.pluginManager.registerPlugin(PluginClass, config);
  }

  public async unregisterPlugin(name: string): Promise<void> {
    return this.pluginManager.unregisterPlugin(name);
  }

  public async activatePlugin(name: string): Promise<void> {
    return this.pluginManager.activatePlugin(name);
  }

  public async deactivatePlugin(name: string): Promise<void> {
    return this.pluginManager.deactivatePlugin(name);
  }

  public getPlugin(name: string): Plugin | undefined {
    return this.pluginManager.getPlugin(name);
  }

  public getPlugins(): Map<string, Plugin> {
    return this.pluginManager.getPlugins();
  }

  public getActivePlugins(): Plugin[] {
    return this.pluginManager.getActivePlugins();
  }

  public async configurePlugin(name: string, config: PluginConfig): Promise<void> {
    return this.pluginManager.configurePlugin(name, config);
  }
  public getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  // History management methods
  public async executeCommand(command: Command): Promise<void> {
    return this.historyManager.executeCommand(command);
  }

  public async undo(): Promise<boolean> {
    return this.historyManager.undo();
  }

  public async redo(): Promise<boolean> {
    return this.historyManager.redo();
  }

  public canUndo(): boolean {
    return this.historyManager.canUndo();
  }

  public canRedo(): boolean {
    return this.historyManager.canRedo();
  }

  public clearHistory(): void {
    this.historyManager.clear();
  }

  public getHistoryState(): HistoryState {
    return this.historyManager.getState();
  }

  public startCommandGroup(name: string): void {
    this.historyManager.startGrouping(name);
  }

  public endCommandGroup(): void {
    this.historyManager.endGrouping();
  }
  public getHistoryManager(): HistoryManager {
    return this.historyManager;
  }

  // Lifecycle methods
  public isDestroyed(): boolean {
    return this.destroyed;
  }
}
