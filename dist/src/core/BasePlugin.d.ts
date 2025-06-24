import { Plugin, PluginState, PluginConfig, PluginMetadata } from '../interfaces/Plugin';
import { ImageEditor } from './ImageEditor';
export declare abstract class BasePlugin implements Plugin {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly description?: string;
    readonly author?: string;
    readonly license?: string;
    readonly homepage?: string;
    readonly keywords?: string[];
    readonly dependencies?: string[];
    readonly peerDependencies?: string[];
    readonly engines?: {
        imageEditor?: string;
        node?: string;
    };
    private _state;
    private _config;
    constructor(metadata: PluginMetadata);
    get state(): PluginState;
    protected setState(state: PluginState): void;
    get config(): PluginConfig;
    abstract install(editor: ImageEditor, config?: PluginConfig): void | Promise<void>;
    abstract uninstall(editor: ImageEditor): void | Promise<void>;
    activate(editor: ImageEditor): Promise<void>;
    deactivate(editor: ImageEditor): Promise<void>;
    configure(config: PluginConfig): void;
    getDefaultConfig(): PluginConfig;
    isCompatible(editor: ImageEditor): boolean;
    checkDependencies(availablePlugins: Map<string, Plugin>): string[];
    onInstall?(editor: ImageEditor): void | Promise<void>;
    onUninstall?(editor: ImageEditor): void | Promise<void>;
    onActivate?(editor: ImageEditor): void | Promise<void>;
    onDeactivate?(editor: ImageEditor): void | Promise<void>;
    onEditorReady?(editor: ImageEditor): void;
    onImageLoad?(imageData: ImageData, editor: ImageEditor): void;
    onImageExport?(blob: Blob, format: string, editor: ImageEditor): void;
    onToolSelect?(toolName: string, editor: ImageEditor): void;
    onToolAction?(toolName: string, action: string, data: any, editor: ImageEditor): void;
    onCanvasRender?(context: CanvasRenderingContext2D, editor: ImageEditor): void;
    onCanvasResize?(width: number, height: number, editor: ImageEditor): void;
    beforeEvent?(eventName: string, data: any, editor: ImageEditor): boolean | void;
    afterEvent?(eventName: string, data: any, editor: ImageEditor): void;
    private generateId;
}
//# sourceMappingURL=BasePlugin.d.ts.map