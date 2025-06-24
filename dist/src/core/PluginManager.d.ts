import { Plugin, PluginConfig, PluginConstructor } from '../interfaces/Plugin';
import { ImageEditor } from './ImageEditor';
export interface PluginManagerOptions {
    autoActivate?: boolean;
    strict?: boolean;
    maxConcurrentOperations?: number;
}
export declare class PluginManager {
    private plugins;
    private pluginConfigs;
    private eventEmitter;
    private editor;
    private options;
    private installQueue;
    constructor(editor: ImageEditor, options?: PluginManagerOptions);
    private setupEventListeners;
    registerPlugin(PluginClass: PluginConstructor, config?: PluginConfig): Promise<void>;
    unregisterPlugin(name: string): Promise<void>;
    activatePlugin(name: string): Promise<void>;
    deactivatePlugin(name: string): Promise<void>;
    getPlugin(name: string): Plugin | undefined;
    getPlugins(): Map<string, Plugin>;
    getActivePlugins(): Plugin[];
    getPluginConfig(name: string): PluginConfig | undefined;
    configurePlugin(name: string, config: PluginConfig): Promise<void>;
    private findDependents;
    private notifyPlugins;
    private callBeforeEventHooks;
    private callAfterEventHooks;
    destroy(): Promise<void>;
    private sortPluginsByDependencies;
}
//# sourceMappingURL=PluginManager.d.ts.map