import { ImageEditor } from '../core/ImageEditor';
export declare enum PluginState {
    UNLOADED = "unloaded",
    LOADING = "loading",
    LOADED = "loaded",
    ACTIVE = "active",
    ERROR = "error"
}
export interface PluginMetadata {
    name: string;
    version: string;
    description?: string;
    author?: string;
    license?: string;
    homepage?: string;
    keywords?: string[];
    dependencies?: string[];
    peerDependencies?: string[];
    engines?: {
        imageEditor?: string;
        node?: string;
    };
}
export interface PluginHooks {
    onInstall?: (editor: ImageEditor) => void | Promise<void>;
    onUninstall?: (editor: ImageEditor) => void | Promise<void>;
    onActivate?: (editor: ImageEditor) => void | Promise<void>;
    onDeactivate?: (editor: ImageEditor) => void | Promise<void>;
    onEditorReady?: (editor: ImageEditor) => void;
    onImageLoad?: (imageData: ImageData, editor: ImageEditor) => void;
    onImageExport?: (blob: Blob, format: string, editor: ImageEditor) => void;
    onToolSelect?: (toolName: string, editor: ImageEditor) => void;
    onToolAction?: (toolName: string, action: string, data: any, editor: ImageEditor) => void;
    onCanvasRender?: (context: CanvasRenderingContext2D, editor: ImageEditor) => void;
    onCanvasResize?: (width: number, height: number, editor: ImageEditor) => void;
    beforeEvent?: (eventName: string, data: any, editor: ImageEditor) => boolean | void;
    afterEvent?: (eventName: string, data: any, editor: ImageEditor) => void;
}
export interface PluginConfig {
    enabled?: boolean;
    settings?: Record<string, any>;
}
export interface Plugin extends PluginMetadata, PluginHooks {
    readonly state: PluginState;
    readonly id: string;
    install(editor: ImageEditor, config?: PluginConfig): void | Promise<void>;
    uninstall(editor: ImageEditor): void | Promise<void>;
    activate(editor: ImageEditor): void | Promise<void>;
    deactivate(editor: ImageEditor): void | Promise<void>;
    configure?(config: PluginConfig): void;
    getDefaultConfig?(): PluginConfig;
    isCompatible?(editor: ImageEditor): boolean;
    checkDependencies?(availablePlugins: Map<string, Plugin>): string[];
}
export interface PluginConstructor {
    new (): Plugin;
}
export interface PluginRegistry {
    [key: string]: PluginConstructor;
}
//# sourceMappingURL=Plugin.d.ts.map