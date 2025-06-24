import { ImageEditorConfig, EditorEventKey, EditorEventData, Point } from '../types';
import { Plugin, PluginConstructor, PluginConfig } from '../interfaces/Plugin';
import { Tool } from '../interfaces/Tool';
import { Command, HistoryState } from '../interfaces/Command';
import { EventEmitter } from './EventEmitter';
import { CanvasManager } from './CanvasManager';
import { InputManager } from './InputManager';
import { PluginManager } from './PluginManager';
import { HistoryManager } from './HistoryManager';
import { ImageLoader, ImageLoadOptions, ImageLoadResult } from './ImageLoader';
import { ContainerManager, ContainerConfig, ResizeEvent } from './ContainerManager';

export class ImageEditor {
  private config: ImageEditorConfig;
  private canvasManager: CanvasManager;
  private containerManager: ContainerManager;
  private eventEmitter: EventEmitter;
  private inputManager: InputManager;
  private pluginManager: PluginManager;
  private historyManager: HistoryManager;
  private imageLoader: ImageLoader;
  private currentTool: Tool | null = null;
  private tools: Map<string, Tool> = new Map();
  private container: HTMLElement;
  private destroyed: boolean = false;
  private dragDropEnabled: boolean = true;

  constructor(config: ImageEditorConfig) {
    this.config = { version: '1.0.0', ...config };
    this.container = this.resolveContainer(config.container);

    // Initialize core components
    this.eventEmitter = new EventEmitter();

    // Create canvas for CanvasManager
    const canvas = document.createElement('canvas');
    canvas.width = config.width || 800;
    canvas.height = config.height || 600;

    // Initialize container manager with canvas
    const containerConfig: ContainerConfig = {};
    if (config.resizable !== undefined) containerConfig.resizable = config.resizable;
    if (config.showHeader !== undefined) containerConfig.showHeader = config.showHeader;
    if (config.showToolbar !== undefined) containerConfig.showToolbar = config.showToolbar;
    if (config.showPanel !== undefined) containerConfig.showPanel = config.showPanel;
    if (config.title !== undefined) containerConfig.title = config.title;
    if (config.theme !== undefined) containerConfig.theme = config.theme;
    if (config.responsive !== undefined) containerConfig.responsive = config.responsive;

    this.containerManager = new ContainerManager(
      this.container,
      canvas,
      containerConfig,
      this.handleContainerResize.bind(this),
    );

    // Get the canvas from the container elements (it should have the proper class now)
    const containerElements = this.containerManager.getElements();
    const containerCanvas = containerElements.canvas;

    // Set canvas dimensions
    containerCanvas.width = config.width || 800;
    containerCanvas.height = config.height || 600;

    // Initialize canvas manager with the canvas from container
    this.canvasManager = new CanvasManager(
      containerElements.canvasContainer,
      config.width || 800,
      config.height || 600,
      containerCanvas,
    );

    // Initialize image loader with configuration
    const imageLoadOptions: ImageLoadOptions = {
      maxWidth: config.maxImageWidth,
      maxHeight: config.maxImageHeight,
      quality: config.imageQuality || 0.9,
      enableProgress: config.enableLoadingProgress !== false,
    };
    this.imageLoader = new ImageLoader(imageLoadOptions);

    // Initialize plugin manager
    this.pluginManager = new PluginManager(this);

    // Initialize history manager
    this.historyManager = new HistoryManager(this);

    // Initialize input manager
    this.inputManager = new InputManager(this.canvasManager.getCanvas(), this.eventEmitter);

    // Setup event delegation for tool interactions
    this.setupEventDelegation();

    // Setup image loader events
    this.setupImageLoaderEvents();

    // Setup drag and drop if enabled
    if (config.enableDragDrop !== false) {
      this.setupDragAndDrop();
    }

    // Load CSS styles
    this.loadStyles();

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
  public async loadImage(source: string | File | Blob | ArrayBuffer | ImageData): Promise<void> {
    try {
      this.eventEmitter.emit('image:loading', { source });

      const result: ImageLoadResult = await this.imageLoader.loadImage(source);

      // Resize canvas to fit the image if needed
      const canvas = this.canvasManager.getCanvas();
      if (canvas.width !== result.displayWidth || canvas.height !== result.displayHeight) {
        this.canvasManager.resize(result.displayWidth, result.displayHeight);
      }

      // Draw the image on the canvas
      this.canvasManager.drawImage(result.image, 0, 0);

      this.eventEmitter.emit('image:loaded', {
        width: result.originalWidth,
        height: result.originalHeight,
        displayWidth: result.displayWidth,
        displayHeight: result.displayHeight,
        format: result.format,
        size: result.size,
        source,
      });
    } catch (error) {
      this.eventEmitter.emit('image:error', { error, source });
      throw error;
    }
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

    // Clean up container manager
    this.containerManager.destroy();

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

  /**
   * Setup image loader event handlers
   */
  private setupImageLoaderEvents(): void {
    this.imageLoader.on('load:start', (data: any) => {
      this.eventEmitter.emit('image:loading', data);
    });

    this.imageLoader.on('load:progress', (data: any) => {
      this.eventEmitter.emit('image:progress', data);
    });

    this.imageLoader.on('load:complete', (data: any) => {
      this.eventEmitter.emit('image:loadComplete', data);
    });

    this.imageLoader.on('load:error', (data: any) => {
      this.eventEmitter.emit('image:error', data);
    });
  }

  /**
   * Setup drag and drop functionality
   */
  private setupDragAndDrop(): void {
    const canvas = this.canvasManager.getCanvas();

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      canvas.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Handle drag enter and over
    ['dragenter', 'dragover'].forEach((eventName) => {
      canvas.addEventListener(eventName, () => {
        canvas.classList.add('drag-over');
        this.eventEmitter.emit('dragdrop:enter', {});
      });
    });

    // Handle drag leave
    canvas.addEventListener('dragleave', (e) => {
      // Only remove drag styling if we're actually leaving the canvas
      if (!canvas.contains(e.relatedTarget as Node)) {
        canvas.classList.remove('drag-over');
        this.eventEmitter.emit('dragdrop:leave', {});
      }
    });

    // Handle drop
    canvas.addEventListener('drop', async (e) => {
      canvas.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer?.files || []);

      if (files.length === 0) {
        this.eventEmitter.emit('dragdrop:error', { error: 'No files dropped' });
        return;
      }

      // Only handle the first file for now
      const file = files[0];

      if (!file || !file.type.startsWith('image/')) {
        this.eventEmitter.emit('dragdrop:error', {
          error: 'Dropped file is not an image',
          file,
        });
        return;
      }

      try {
        this.eventEmitter.emit('dragdrop:drop', { file });
        await this.loadImage(file);
        this.eventEmitter.emit('dragdrop:success', { file });
      } catch (error) {
        this.eventEmitter.emit('dragdrop:error', { error, file });
      }
    });
  }

  /**
   * Enable or disable drag and drop
   */
  public setDragDropEnabled(enabled: boolean): void {
    this.dragDropEnabled = enabled;
    const canvas = this.canvasManager.getCanvas();

    if (enabled) {
      this.setupDragAndDrop();
    } else {
      // Remove drag-related event listeners by cloning the canvas
      const newCanvas = canvas.cloneNode(true) as HTMLCanvasElement;
      canvas.parentNode?.replaceChild(newCanvas, canvas);
      // Update canvas reference in CanvasManager
      (this.canvasManager as any).canvas = newCanvas;
    }
  }

  /**
   * Get image loader instance
   */
  public getImageLoader(): ImageLoader {
    return this.imageLoader;
  }

  /**
   * Validate an image file before loading
   */
  public async validateImage(file: File | Blob): Promise<{ isValid: boolean; error?: string }> {
    const result = await this.imageLoader.validateImage(file);
    return {
      isValid: result.isValid,
      error: result.error,
    };
  }

  /**
   * Handle container resize events
   */
  private handleContainerResize(event: ResizeEvent): void {
    // Emit container resize event
    this.eventEmitter.emit('container:resize', {
      width: event.width,
      height: event.height,
      type: event.type,
    });

    // Update canvas if needed
    if (event.type === 'manual') {
      // For manual resize, we might want to adjust canvas size
      // This is optional based on the desired behavior
    }
  }

  /**
   * Load CSS styles for the editor
   */
  private loadStyles(): void {
    // Check if styles are already loaded
    if (document.querySelector('#image-editor-styles')) {
      return;
    }

    // Create and inject CSS
    const style = document.createElement('style');
    style.id = 'image-editor-styles';

    // Import the CSS content - in a real implementation, this would be bundled
    // For now, we'll add a minimal inline style to ensure the component works
    style.textContent = `
      .image-editor {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 400px;
        min-width: 600px;
        background: #ffffff;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        color: #212529;
        box-sizing: border-box;
      }
      .image-editor *, .image-editor *::before, .image-editor *::after {
        box-sizing: border-box;
      }
      .image-editor-content {
        display: flex;
        flex: 1;
        overflow: hidden;
      }
      .image-editor-canvas-area {
        display: flex;
        flex-direction: column;
        flex: 1;
        position: relative;
        background: #f8f9fa;
      }
      .image-editor-canvas-container {
        flex: 1;
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .image-editor-canvas {
        border: 1px solid #dee2e6;
        background: #ffffff;
        max-width: 100%;
        max-height: 100%;
      }
    `;

    document.head.appendChild(style);
  }

  // Container methods
  /**
   * Get container elements
   */
  public getContainerElements() {
    return this.containerManager.getElements();
  }

  /**
   * Set container size
   */
  public setSize(width: number, height: number): void {
    this.containerManager.setSize(width, height);
  }

  /**
   * Get container size
   */
  public getSize(): { width: number; height: number } {
    return this.containerManager.getSize();
  }

  /**
   * Toggle properties panel
   */
  public togglePanel(visible?: boolean): void {
    this.containerManager.togglePanel(visible);
  }

  /**
   * Set loading state
   */
  public setLoading(loading: boolean): void {
    this.containerManager.setLoading(loading);
  }

  /**
   * Set editor title
   */
  public setTitle(title: string): void {
    this.containerManager.setTitle(title);
  }

  /**
   * Set theme
   */
  public setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.containerManager.setTheme(theme);
    this.eventEmitter.emit('container:themeChange', {
      theme: theme === 'auto' ? 'light' : theme, // Simplified for now
    });
  }

  /**
   * Get the canvas element
   */
  public getCanvas(): HTMLCanvasElement {
    return this.canvasManager.getCanvas();
  }
}
