import { ImageEditor } from '../../src/core/ImageEditor';
import { BasePlugin } from '../../src/core/BasePlugin';
import { PluginManager } from '../../src/core/PluginManager';
import { PluginState, PluginConfig } from '../../src/interfaces/Plugin';

// Mock plugin for testing
class TestPlugin extends BasePlugin {
  public installCalled = false;
  public uninstallCalled = false;
  public activateCalled = false;
  public deactivateCalled = false;
  public configuredWith: PluginConfig | null = null;

  constructor() {
    super({
      name: 'test-plugin',
      version: '1.0.0',
      description: 'A test plugin',
      author: 'Test Author',
    });
  }

  public async install(_editor: ImageEditor, config?: PluginConfig): Promise<void> {
    this.installCalled = true;
    this.setState(PluginState.LOADED);
    if (config) {
      this.configuredWith = config;
    }
  }

  public async uninstall(_editor: ImageEditor): Promise<void> {
    this.uninstallCalled = true;
    this.setState(PluginState.UNLOADED);
  }
  public override async activate(_editor: ImageEditor): Promise<void> {
    await super.activate(_editor);
    this.activateCalled = true;
  }

  public override async deactivate(_editor: ImageEditor): Promise<void> {
    await super.deactivate(_editor);
    this.deactivateCalled = true;
  }
}

// Plugin with dependencies for testing dependency management
class DependentPlugin extends BasePlugin {
  constructor() {
    super({
      name: 'dependent-plugin',
      version: '1.0.0',
      description: 'A plugin with dependencies',
      dependencies: ['test-plugin'],
    });
  }

  public async install(_editor: ImageEditor, _config?: PluginConfig): Promise<void> {
    this.setState(PluginState.LOADED);
  }

  public async uninstall(_editor: ImageEditor): Promise<void> {
    this.setState(PluginState.UNLOADED);
  }
}

describe('Plugin Architecture', () => {
  let editor: ImageEditor;
  let pluginManager: PluginManager;
  beforeEach(() => {
    const mockContainer = document.createElement('div');
    editor = new ImageEditor({
      container: mockContainer,
      width: 800,
      height: 600,
    });
    pluginManager = editor.getPluginManager();
  });

  afterEach(async () => {
    await pluginManager.destroy();
    editor.destroy();
  });

  describe('Plugin Registration', () => {
    it('should register a plugin successfully', async () => {
      await pluginManager.registerPlugin(TestPlugin);

      const plugin = pluginManager.getPlugin('test-plugin');
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('test-plugin');
      expect(plugin?.version).toBe('1.0.0');
    });

    it('should prevent registering the same plugin twice', async () => {
      await pluginManager.registerPlugin(TestPlugin);

      await expect(pluginManager.registerPlugin(TestPlugin)).rejects.toThrow(
        'Plugin test-plugin is already registered',
      );
    });

    it('should call install method during registration', async () => {
      const TestPluginConstructor = class extends TestPlugin {};
      await pluginManager.registerPlugin(TestPluginConstructor);

      const plugin = pluginManager.getPlugin('test-plugin') as TestPlugin;
      expect(plugin.installCalled).toBe(true);
      expect(plugin.state).toBe(PluginState.ACTIVE); // Should auto-activate
    });

    it('should configure plugin during registration', async () => {
      const config = { enabled: true, settings: { color: 'red' } };
      await pluginManager.registerPlugin(TestPlugin, config);

      const plugin = pluginManager.getPlugin('test-plugin') as TestPlugin;
      expect(plugin.configuredWith).toEqual(expect.objectContaining(config));
    });
  });

  describe('Plugin Lifecycle', () => {
    let plugin: TestPlugin;

    beforeEach(async () => {
      await pluginManager.registerPlugin(TestPlugin, { enabled: false }); // Don't auto-activate
      plugin = pluginManager.getPlugin('test-plugin') as TestPlugin;
    });

    it('should activate plugin', async () => {
      expect(plugin.state).toBe(PluginState.LOADED);

      await pluginManager.activatePlugin('test-plugin');

      expect(plugin.state).toBe(PluginState.ACTIVE);
      expect(plugin.activateCalled).toBe(true);
    });

    it('should deactivate plugin', async () => {
      await pluginManager.activatePlugin('test-plugin');
      expect(plugin.state).toBe(PluginState.ACTIVE);

      await pluginManager.deactivatePlugin('test-plugin');

      expect(plugin.state).toBe(PluginState.LOADED);
      expect(plugin.deactivateCalled).toBe(true);
    });

    it('should unregister plugin', async () => {
      await pluginManager.unregisterPlugin('test-plugin');

      expect(plugin.uninstallCalled).toBe(true);
      expect(plugin.state).toBe(PluginState.UNLOADED);
      expect(pluginManager.getPlugin('test-plugin')).toBeUndefined();
    });
  });

  describe('Plugin Dependencies', () => {
    it('should handle plugin dependencies correctly', async () => {
      // Register dependency first
      await pluginManager.registerPlugin(TestPlugin);

      // Register dependent plugin
      await pluginManager.registerPlugin(DependentPlugin);

      const dependentPlugin = pluginManager.getPlugin('dependent-plugin');
      expect(dependentPlugin).toBeDefined();
      expect(dependentPlugin?.state).toBe(PluginState.ACTIVE);
    });

    it('should fail to register plugin with missing dependencies in strict mode', async () => {
      await expect(pluginManager.registerPlugin(DependentPlugin)).rejects.toThrow(
        'missing dependencies: test-plugin',
      );
    });

    it('should prevent unregistering plugin with active dependents', async () => {
      await pluginManager.registerPlugin(TestPlugin);
      await pluginManager.registerPlugin(DependentPlugin);

      await expect(pluginManager.unregisterPlugin('test-plugin')).rejects.toThrow(
        'It has dependents: dependent-plugin',
      );
    });
  });

  describe('Plugin Manager API', () => {
    beforeEach(async () => {
      await pluginManager.registerPlugin(TestPlugin);
    });

    it('should return list of all plugins', () => {
      const plugins = pluginManager.getPlugins();
      expect(plugins.size).toBe(1);
      expect(plugins.has('test-plugin')).toBe(true);
    });
    it('should return list of active plugins', () => {
      const activePlugins = pluginManager.getActivePlugins();
      expect(activePlugins).toHaveLength(1);
      expect(activePlugins[0]?.name).toBe('test-plugin');
    });

    it('should get plugin configuration', () => {
      const config = pluginManager.getPluginConfig('test-plugin');
      expect(config).toBeDefined();
      expect(config?.enabled).toBe(true); // default
    });

    it('should configure plugin', async () => {
      const newConfig = { enabled: true, settings: { theme: 'dark' } };
      await pluginManager.configurePlugin('test-plugin', newConfig);

      const config = pluginManager.getPluginConfig('test-plugin');
      expect(config?.settings?.theme).toBe('dark');
    });
  });

  describe('Plugin Hooks', () => {
    class HookTestPlugin extends BasePlugin {
      public editorReadyCalled = false;
      public toolSelectedCalled = false;
      public beforeEventCalled = false;
      public afterEventCalled = false;

      constructor() {
        super({
          name: 'hook-test-plugin',
          version: '1.0.0',
        });
      }

      public async install(_editor: ImageEditor): Promise<void> {
        this.setState(PluginState.LOADED);
      }

      public async uninstall(_editor: ImageEditor): Promise<void> {
        this.setState(PluginState.UNLOADED);
      }
      public override onEditorReady(): void {
        this.editorReadyCalled = true;
      }

      public override onToolSelect(_toolName: string): void {
        this.toolSelectedCalled = true;
      }

      public override beforeEvent(_eventName: string, _data: any): boolean | void {
        this.beforeEventCalled = true;
        if (_eventName === 'test:cancel') {
          return false; // Cancel event
        }
      }

      public override afterEvent(_eventName: string, _data: any): void {
        this.afterEventCalled = true;
      }
    }

    let hookPlugin: HookTestPlugin;

    beforeEach(async () => {
      await pluginManager.registerPlugin(HookTestPlugin);
      hookPlugin = pluginManager.getPlugin('hook-test-plugin') as HookTestPlugin;
    });

    it('should call onEditorReady hook', () => {
      editor.getEventEmitter().emit('editor:ready');
      expect(hookPlugin.editorReadyCalled).toBe(true);
    });

    it('should call onToolSelect hook', () => {
      editor.getEventEmitter().emit('tool:selected', { toolName: 'brush' });
      expect(hookPlugin.toolSelectedCalled).toBe(true);
    });

    it('should call beforeEvent and afterEvent hooks', () => {
      editor.getEventEmitter().emit('test:event', { data: 'test' });
      expect(hookPlugin.beforeEventCalled).toBe(true);
      expect(hookPlugin.afterEventCalled).toBe(true);
    });

    it('should cancel event when beforeEvent returns false', () => {
      const spy = jest.fn();
      editor.getEventEmitter().on('test:cancel', spy);

      editor.getEventEmitter().emit('test:cancel');

      expect(hookPlugin.beforeEventCalled).toBe(true);
      expect(spy).not.toHaveBeenCalled(); // Event should be cancelled
    });
  });

  describe('Error Handling', () => {
    class ErrorPlugin extends BasePlugin {
      constructor() {
        super({
          name: 'error-plugin',
          version: '1.0.0',
        });
      }

      public async install(): Promise<void> {
        throw new Error('Installation failed');
      }

      public async uninstall(): Promise<void> {
        this.setState(PluginState.UNLOADED);
      }
    }

    it('should handle plugin installation errors', async () => {
      await expect(pluginManager.registerPlugin(ErrorPlugin)).rejects.toThrow(
        'Failed to install plugin error-plugin',
      );

      expect(pluginManager.getPlugin('error-plugin')).toBeUndefined();
    });

    it('should handle errors in plugin hooks gracefully', () => {
      class FailingHookPlugin extends BasePlugin {
        constructor() {
          super({
            name: 'failing-hook-plugin',
            version: '1.0.0',
          });
        }

        public async install(): Promise<void> {
          this.setState(PluginState.LOADED);
        }

        public async uninstall(): Promise<void> {
          this.setState(PluginState.UNLOADED);
        }
        public override onEditorReady(): void {
          throw new Error('Hook failed');
        }
      }

      // Should not throw, but log error
      expect(async () => {
        await pluginManager.registerPlugin(FailingHookPlugin);
        editor.getEventEmitter().emit('editor:ready');
      }).not.toThrow();
    });
  });

  describe('Integration with ImageEditor', () => {
    it('should expose plugin methods through ImageEditor API', async () => {
      await editor.registerPlugin(TestPlugin);

      expect(editor.getPlugin('test-plugin')).toBeDefined();
      expect(editor.getPlugins().has('test-plugin')).toBe(true);
      expect(editor.getActivePlugins()).toHaveLength(1);
    });

    it('should configure plugins through ImageEditor API', async () => {
      await editor.registerPlugin(TestPlugin);
      await editor.configurePlugin('test-plugin', { settings: { test: true } });

      const config = editor.getPluginManager().getPluginConfig('test-plugin');
      expect(config?.settings?.test).toBe(true);
    });
  });
});
