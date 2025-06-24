import { Plugin, PluginState, PluginConfig, PluginConstructor } from '../interfaces/Plugin';
import { ImageEditor } from './ImageEditor';
import { EventEmitter } from './EventEmitter';

export interface PluginManagerOptions {
  autoActivate?: boolean;
  strict?: boolean; // Strict dependency checking
  maxConcurrentOperations?: number;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private pluginConfigs: Map<string, PluginConfig> = new Map();
  private eventEmitter: EventEmitter;
  private editor: ImageEditor;
  private options: PluginManagerOptions;
  private installQueue: Promise<void> = Promise.resolve();

  constructor(editor: ImageEditor, options: PluginManagerOptions = {}) {
    this.editor = editor;
    this.eventEmitter = editor.getEventEmitter();
    this.options = {
      autoActivate: true,
      strict: true,
      maxConcurrentOperations: 5,
      ...options,
    };

    this.setupEventListeners();
  }
  private setupEventListeners(): void {
    // Hook into editor events and forward to plugins
    this.eventEmitter.on('editor:ready', () => {
      this.notifyPlugins('onEditorReady', this.editor);
    });

    this.eventEmitter.on('image:loaded', (data: any) => {
      // Note: In real implementation, we'd need to get ImageData from the event
      this.notifyPlugins('onImageLoad', data, this.editor);
    });

    this.eventEmitter.on('image:exported', (data: any) => {
      this.notifyPlugins('onImageExport', data.blob, data.format, this.editor);
    });

    this.eventEmitter.on('tool:selected', (data: any) => {
      this.notifyPlugins('onToolSelect', data.toolName, this.editor);
    });

    this.eventEmitter.on('tool:action', (data: any) => {
      this.notifyPlugins('onToolAction', data.toolName, data.action, data.data, this.editor);
    });

    // Hook into before/after events for plugins
    const originalEmit = this.eventEmitter.emit.bind(this.eventEmitter);
    this.eventEmitter.emit = (event: string, data?: any) => {
      // Call beforeEvent hooks
      const shouldContinue = this.callBeforeEventHooks(event, data);
      if (shouldContinue === false) {
        return; // Event was cancelled by a plugin
      }

      // Emit the original event
      originalEmit(event, data);

      // Call afterEvent hooks
      this.callAfterEventHooks(event, data);
    };
  }

  public async registerPlugin(
    PluginClass: PluginConstructor,
    config?: PluginConfig,
  ): Promise<void> {
    this.installQueue = this.installQueue.then(async () => {
      const plugin = new PluginClass();

      // Check if plugin is already registered
      if (this.plugins.has(plugin.name)) {
        throw new Error(`Plugin ${plugin.name} is already registered`);
      }

      // Validate plugin compatibility
      if (!plugin.isCompatible || !plugin.isCompatible(this.editor)) {
        throw new Error(`Plugin ${plugin.name} is not compatible with this editor version`);
      }

      // Check dependencies
      const missingDeps = plugin.checkDependencies ? plugin.checkDependencies(this.plugins) : [];
      if (this.options.strict && missingDeps.length > 0) {
        throw new Error(
          `Plugin ${plugin.name} has missing dependencies: ${missingDeps.join(', ')}`,
        );
      }

      // Configure plugin
      const finalConfig = { ...plugin.getDefaultConfig?.(), ...config };
      if (plugin.configure) {
        plugin.configure(finalConfig);
      }
      this.pluginConfigs.set(plugin.name, finalConfig);

      // Install plugin
      try {
        (plugin as any).setState?.(PluginState.LOADING);
        await plugin.install(this.editor, finalConfig);
        (plugin as any).setState?.(PluginState.LOADED);

        this.plugins.set(plugin.name, plugin);

        // Auto-activate if enabled and configured
        if (this.options.autoActivate && finalConfig.enabled !== false) {
          await this.activatePlugin(plugin.name);
        }

        this.eventEmitter.emit('plugin:registered', {
          name: plugin.name,
          plugin,
          config: finalConfig,
        });
      } catch (error) {
        (plugin as any).setState?.(PluginState.ERROR);
        throw new Error(`Failed to install plugin ${plugin.name}: ${error}`);
      }
    });

    return this.installQueue;
  }

  public async unregisterPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} is not registered`);
    }

    // Deactivate if active
    if (plugin.state === PluginState.ACTIVE) {
      await this.deactivatePlugin(name);
    }

    // Check for dependents
    const dependents = this.findDependents(name);
    if (this.options.strict && dependents.length > 0) {
      throw new Error(
        `Cannot unregister plugin ${name}. It has dependents: ${dependents.join(', ')}`,
      );
    }

    // Uninstall plugin
    try {
      await plugin.uninstall(this.editor);
      (plugin as any).setState?.(PluginState.UNLOADED);

      this.plugins.delete(name);
      this.pluginConfigs.delete(name);

      this.eventEmitter.emit('plugin:unregistered', { name, plugin });
    } catch (error) {
      throw new Error(`Failed to uninstall plugin ${name}: ${error}`);
    }
  }

  public async activatePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} is not registered`);
    }

    if (plugin.state === PluginState.ACTIVE) {
      return; // Already active
    }

    if (plugin.state !== PluginState.LOADED) {
      throw new Error(`Cannot activate plugin ${name} in state ${plugin.state}`);
    }

    // Activate dependencies first
    if (plugin.dependencies) {
      for (const depName of plugin.dependencies) {
        const dep = this.plugins.get(depName);
        if (dep && dep.state !== PluginState.ACTIVE) {
          await this.activatePlugin(depName);
        }
      }
    }

    await plugin.activate(this.editor);
    this.eventEmitter.emit('plugin:activated', { name, plugin });
  }

  public async deactivatePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} is not registered`);
    }

    if (plugin.state !== PluginState.ACTIVE) {
      return; // Not active
    }

    // Deactivate dependents first
    const dependents = this.findDependents(name);
    for (const depName of dependents) {
      const dep = this.plugins.get(depName);
      if (dep && dep.state === PluginState.ACTIVE) {
        await this.deactivatePlugin(depName);
      }
    }

    await plugin.deactivate(this.editor);
    this.eventEmitter.emit('plugin:deactivated', { name, plugin });
  }

  public getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  public getPlugins(): Map<string, Plugin> {
    return new Map(this.plugins);
  }

  public getActivePlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter((p) => p.state === PluginState.ACTIVE);
  }

  public getPluginConfig(name: string): PluginConfig | undefined {
    return this.pluginConfigs.get(name);
  }

  public async configurePlugin(name: string, config: PluginConfig): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} is not registered`);
    }

    const currentConfig = this.pluginConfigs.get(name) || {};
    const newConfig = { ...currentConfig, ...config };

    if (plugin.configure) {
      plugin.configure(newConfig);
    }

    this.pluginConfigs.set(name, newConfig);
    this.eventEmitter.emit('plugin:configured', { name, plugin, config: newConfig });
  }

  private findDependents(pluginName: string): string[] {
    const dependents: string[] = [];

    for (const [name, plugin] of this.plugins) {
      if (plugin.dependencies?.includes(pluginName)) {
        dependents.push(name);
      }
    }

    return dependents;
  }

  private notifyPlugins(hookName: keyof Plugin, ...args: any[]): void {
    for (const plugin of this.getActivePlugins()) {
      try {
        const hook = plugin[hookName] as Function;
        if (typeof hook === 'function') {
          hook.call(plugin, ...args);
        }
      } catch (error) {
        console.error(`Error in plugin ${plugin.name} hook ${hookName}:`, error);
      }
    }
  }

  private callBeforeEventHooks(eventName: string, data: any): boolean | void {
    for (const plugin of this.getActivePlugins()) {
      try {
        if (plugin.beforeEvent) {
          const result = plugin.beforeEvent(eventName, data, this.editor);
          if (result === false) {
            return false; // Cancel event
          }
        }
      } catch (error) {
        console.error(`Error in plugin ${plugin.name} beforeEvent hook:`, error);
      }
    }
  }

  private callAfterEventHooks(eventName: string, data: any): void {
    for (const plugin of this.getActivePlugins()) {
      try {
        if (plugin.afterEvent) {
          plugin.afterEvent(eventName, data, this.editor);
        }
      } catch (error) {
        console.error(`Error in plugin ${plugin.name} afterEvent hook:`, error);
      }
    }
  }
  public async destroy(): Promise<void> {
    // Get plugins in dependency order (dependents first, then dependencies)
    const pluginNames = Array.from(this.plugins.keys());
    const sortedNames = this.sortPluginsByDependencies(pluginNames);

    for (const name of sortedNames) {
      try {
        await this.unregisterPlugin(name);
      } catch (error) {
        // Continue with other plugins even if one fails
        console.error(`Error unregistering plugin ${name}:`, error);
      }
    }

    this.plugins.clear();
    this.pluginConfigs.clear();
  }

  private sortPluginsByDependencies(pluginNames: string[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      // Visit dependents first (reverse dependency order)
      const dependents = this.findDependents(name);
      for (const dependent of dependents) {
        if (pluginNames.includes(dependent)) {
          visit(dependent);
        }
      }

      result.push(name);
    };

    for (const name of pluginNames) {
      visit(name);
    }

    return result;
  }
}
