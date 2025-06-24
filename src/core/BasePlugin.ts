import { Plugin, PluginState, PluginConfig, PluginMetadata } from '../interfaces/Plugin';
import { ImageEditor } from './ImageEditor';

export abstract class BasePlugin implements Plugin {
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly description?: string;
  public readonly author?: string;
  public readonly license?: string;
  public readonly homepage?: string;
  public readonly keywords?: string[];
  public readonly dependencies?: string[];
  public readonly peerDependencies?: string[];
  public readonly engines?: {
    imageEditor?: string;
    node?: string;
  };

  private _state: PluginState = PluginState.UNLOADED;
  private _config: PluginConfig = {};

  constructor(metadata: PluginMetadata) {
    this.id = this.generateId(metadata.name, metadata.version);
    this.name = metadata.name;
    this.version = metadata.version;
    this.description = metadata.description;
    this.author = metadata.author;
    this.license = metadata.license;
    this.homepage = metadata.homepage;
    this.keywords = metadata.keywords;
    this.dependencies = metadata.dependencies;
    this.peerDependencies = metadata.peerDependencies;
    this.engines = metadata.engines;
  }

  public get state(): PluginState {
    return this._state;
  }

  protected setState(state: PluginState): void {
    this._state = state;
  }

  public get config(): PluginConfig {
    return { ...this._config };
  }

  // Abstract methods to be implemented by concrete plugins
  public abstract install(editor: ImageEditor, config?: PluginConfig): void | Promise<void>;
  public abstract uninstall(editor: ImageEditor): void | Promise<void>;

  // Default implementations
  public async activate(editor: ImageEditor): Promise<void> {
    if (this._state !== PluginState.LOADED) {
      throw new Error(`Cannot activate plugin ${this.name} in state ${this._state}`);
    }

    this.setState(PluginState.ACTIVE);

    if (this.onActivate) {
      await this.onActivate(editor);
    }
  }

  public async deactivate(editor: ImageEditor): Promise<void> {
    if (this._state !== PluginState.ACTIVE) {
      throw new Error(`Cannot deactivate plugin ${this.name} in state ${this._state}`);
    }

    if (this.onDeactivate) {
      await this.onDeactivate(editor);
    }

    this.setState(PluginState.LOADED);
  }

  public configure(config: PluginConfig): void {
    this._config = { ...this._config, ...config };
  }

  public getDefaultConfig(): PluginConfig {
    return {
      enabled: true,
      settings: {},
    };
  }

  public isCompatible(editor: ImageEditor): boolean {
    // Check engine compatibility
    if (this.engines?.imageEditor) {
      // Simple version check - in production, use semver
      const requiredVersion = this.engines.imageEditor;
      const editorVersion = editor.getConfig().version || '1.0.0';

      // Basic compatibility check (should use proper semver in production)
      if (requiredVersion !== '*' && requiredVersion !== editorVersion) {
        return false;
      }
    }

    return true;
  }

  public checkDependencies(availablePlugins: Map<string, Plugin>): string[] {
    const missingDependencies: string[] = [];

    if (this.dependencies) {
      for (const dependency of this.dependencies) {
        if (!availablePlugins.has(dependency)) {
          missingDependencies.push(dependency);
        }
      }
    }

    return missingDependencies;
  }

  // Hook methods (can be overridden by concrete plugins)
  public onInstall?(editor: ImageEditor): void | Promise<void>;
  public onUninstall?(editor: ImageEditor): void | Promise<void>;
  public onActivate?(editor: ImageEditor): void | Promise<void>;
  public onDeactivate?(editor: ImageEditor): void | Promise<void>;
  public onEditorReady?(editor: ImageEditor): void;
  public onImageLoad?(imageData: ImageData, editor: ImageEditor): void;
  public onImageExport?(blob: Blob, format: string, editor: ImageEditor): void;
  public onToolSelect?(toolName: string, editor: ImageEditor): void;
  public onToolAction?(toolName: string, action: string, data: any, editor: ImageEditor): void;
  public onCanvasRender?(context: CanvasRenderingContext2D, editor: ImageEditor): void;
  public onCanvasResize?(width: number, height: number, editor: ImageEditor): void;
  public beforeEvent?(eventName: string, data: any, editor: ImageEditor): boolean | void;
  public afterEvent?(eventName: string, data: any, editor: ImageEditor): void;

  private generateId(name: string, version: string): string {
    return `${name}@${version}`;
  }
}
