import { BasePlugin } from '../core/BasePlugin';
import { ImageEditor } from '../core/ImageEditor';
import { PluginConfig } from '../interfaces/Plugin';

/**
 * Example logger plugin that demonstrates the plugin architecture.
 * This plugin logs various editor events to the console.
 */
export class LoggerPlugin extends BasePlugin {
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor() {
    super({
      name: 'logger',
      version: '1.0.0',
      description: 'Logs editor events to console',
      author: 'ImageEditor Team',
      keywords: ['logging', 'debug', 'events'],
    });

    this.logLevel = 'info';
  }

  public async install(_editor: ImageEditor, config?: PluginConfig): Promise<void> {
    this.setState('loaded' as any);

    if (config?.settings?.logLevel) {
      this.logLevel = config.settings.logLevel;
    }

    this.log('info', `Logger plugin installed with log level: ${this.logLevel}`);
  }

  public async uninstall(_editor: ImageEditor): Promise<void> {
    this.log('info', 'Logger plugin uninstalled');
    this.setState('unloaded' as any);
  }

  public override getDefaultConfig(): PluginConfig {
    return {
      enabled: true,
      settings: {
        logLevel: 'info',
        showTimestamp: true,
        prefix: '[ImageEditor]',
      },
    };
  }

  // Hook implementations
  public override onEditorReady(_editor: ImageEditor): void {
    this.log('info', 'Editor is ready');
  }

  public override onImageLoad(imageData: ImageData, _editor: ImageEditor): void {
    this.log('info', `Image loaded: ${imageData.width}x${imageData.height}`);
  }

  public override onImageExport(blob: Blob, format: string, _editor: ImageEditor): void {
    this.log('info', `Image exported as ${format}, size: ${blob.size} bytes`);
  }

  public override onToolSelect(toolName: string, _editor: ImageEditor): void {
    this.log('debug', `Tool selected: ${toolName}`);
  }

  public override onToolAction(
    toolName: string,
    action: string,
    data: any,
    _editor: ImageEditor,
  ): void {
    this.log('debug', `Tool action: ${toolName}.${action}`, data);
  }

  public override onCanvasRender(_context: CanvasRenderingContext2D, _editor: ImageEditor): void {
    this.log('debug', 'Canvas rendered');
  }

  public override onCanvasResize(width: number, height: number, _editor: ImageEditor): void {
    this.log('info', `Canvas resized to ${width}x${height}`);
  }

  public override beforeEvent(
    _eventName: string,
    _data: any,
    _editor: ImageEditor,
  ): boolean | void {
    this.log('debug', `Before event: ${_eventName}`, _data);
    // Don't cancel any events
  }

  public override afterEvent(_eventName: string, _data: any, _editor: ImageEditor): void {
    this.log('debug', `After event: ${_eventName}`, _data);
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.logLevel];
    const messageLevel = levels[level];

    if (messageLevel < currentLevel) {
      return; // Skip logging
    }

    const config = this.config;
    const prefix = config.settings?.prefix || '[ImageEditor]';
    const showTimestamp = config.settings?.showTimestamp !== false;

    let logMessage = message;

    if (showTimestamp) {
      const timestamp = new Date().toISOString();
      logMessage = `${timestamp} ${prefix} ${message}`;
    } else {
      logMessage = `${prefix} ${message}`;
    }

    // Use appropriate console method
    const consoleMethods = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    if (data !== undefined) {
      consoleMethods[level](logMessage, data);
    } else {
      consoleMethods[level](logMessage);
    }
  }
}
