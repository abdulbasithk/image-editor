import { BasePlugin } from '../core/BasePlugin';
import { ImageEditor } from '../core/ImageEditor';
import { PluginConfig } from '../interfaces/Plugin';
/**
 * Example logger plugin that demonstrates the plugin architecture.
 * This plugin logs various editor events to the console.
 */
export declare class LoggerPlugin extends BasePlugin {
    private logLevel;
    constructor();
    install(_editor: ImageEditor, config?: PluginConfig): Promise<void>;
    uninstall(_editor: ImageEditor): Promise<void>;
    getDefaultConfig(): PluginConfig;
    onEditorReady(_editor: ImageEditor): void;
    onImageLoad(imageData: ImageData, _editor: ImageEditor): void;
    onImageExport(blob: Blob, format: string, _editor: ImageEditor): void;
    onToolSelect(toolName: string, _editor: ImageEditor): void;
    onToolAction(toolName: string, action: string, data: any, _editor: ImageEditor): void;
    onCanvasRender(_context: CanvasRenderingContext2D, _editor: ImageEditor): void;
    onCanvasResize(width: number, height: number, _editor: ImageEditor): void;
    beforeEvent(_eventName: string, _data: any, _editor: ImageEditor): boolean | void;
    afterEvent(_eventName: string, _data: any, _editor: ImageEditor): void;
    private log;
}
//# sourceMappingURL=LoggerPlugin.d.ts.map