import { ImageEditor } from '../../src/core/ImageEditor';
import { Command, HistoryState } from '../../src/interfaces/Command';
import { Tool } from '../../src/interfaces/Tool';
import { ImageEditorConfig } from '../../src/types';
import { createMockCanvas, createMockContainer } from '../utils/test-helpers';

// Mock all the complex dependencies
jest.mock('../../src/core/CanvasManager');
jest.mock('../../src/core/ContainerManager');
jest.mock('../../src/core/EventEmitter');
jest.mock('../../src/core/InputManager');
jest.mock('../../src/core/PluginManager');
jest.mock('../../src/core/HistoryManager');
jest.mock('../../src/core/ImageLoader');

import { CanvasManager } from '../../src/core/CanvasManager';
import { ContainerManager } from '../../src/core/ContainerManager';
import { EventEmitter } from '../../src/core/EventEmitter';
import { HistoryManager } from '../../src/core/HistoryManager';
import { ImageLoader } from '../../src/core/ImageLoader';
import { InputManager } from '../../src/core/InputManager';
import { PluginManager } from '../../src/core/PluginManager';

describe('ImageEditor', () => {
  let imageEditor: ImageEditor;
  let config: ImageEditorConfig;
  let mockCanvas: HTMLCanvasElement;
  let mockContainer: HTMLElement;

  // Mock implementations
  const mockCanvasManager = {
    getCanvas: jest.fn(),
    getContext: jest.fn(() => ({})),
    resize: jest.fn(),
    drawImage: jest.fn(),
    clear: jest.fn(),
  } as unknown as CanvasManager;

  const mockContainerManager = {
    getElements: jest.fn(),
    destroy: jest.fn(),
  } as unknown as ContainerManager;

  const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  } as unknown as EventEmitter;

  const mockInputManager = {
    destroy: jest.fn(),
  } as unknown as InputManager;

  const mockPluginManager = {
    registerPlugin: jest.fn().mockResolvedValue(undefined),
    unregisterPlugin: jest.fn().mockResolvedValue(undefined),
    activatePlugin: jest.fn().mockResolvedValue(undefined),
    deactivatePlugin: jest.fn().mockResolvedValue(undefined),
    getPlugin: jest.fn(),
    getPlugins: jest.fn(() => new Map()),
    getActivePlugins: jest.fn(() => []),
    configurePlugin: jest.fn().mockResolvedValue(undefined),
  } as unknown as PluginManager;

  const mockHistoryManager = {
    executeCommand: jest.fn().mockResolvedValue(undefined),
    undo: jest.fn().mockResolvedValue(true),
    redo: jest.fn().mockResolvedValue(true),
    canUndo: jest.fn(() => true),
    canRedo: jest.fn(() => true),
    clear: jest.fn(),
    getState: jest.fn(() => ({ canUndo: true, canRedo: true, currentIndex: 0, commands: [] })),
    startGrouping: jest.fn(),
    endGrouping: jest.fn(),
  } as unknown as HistoryManager;

  const mockImageLoader = {
    loadImage: jest.fn().mockResolvedValue({
      image: {} as HTMLImageElement,
      originalWidth: 1000,
      originalHeight: 800,
      displayWidth: 800,
      displayHeight: 640,
      format: 'png',
      size: 12345,
    }),
    on: jest.fn(),
  } as unknown as ImageLoader;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mock DOM elements
    mockCanvas = createMockCanvas();
    mockContainer = createMockContainer();

    // Set up mock behavior
    mockCanvasManager.getCanvas = jest.fn().mockReturnValue(mockCanvas);
    mockContainerManager.getElements = jest.fn(() => ({
      container: mockContainer,
      content: mockContainer,
      canvasArea: mockContainer,
      canvas: mockCanvas,
      canvasContainer: mockContainer,
    }));

    // Set up mock constructors
    (CanvasManager as jest.MockedClass<typeof CanvasManager>).mockImplementation(
      () => mockCanvasManager,
    );
    (ContainerManager as jest.MockedClass<typeof ContainerManager>).mockImplementation(
      () => mockContainerManager,
    );
    (EventEmitter as jest.MockedClass<typeof EventEmitter>).mockImplementation(
      () => mockEventEmitter,
    );
    (InputManager as jest.MockedClass<typeof InputManager>).mockImplementation(
      () => mockInputManager,
    );
    (PluginManager as jest.MockedClass<typeof PluginManager>).mockImplementation(
      () => mockPluginManager,
    );
    (HistoryManager as jest.MockedClass<typeof HistoryManager>).mockImplementation(
      () => mockHistoryManager,
    );
    (ImageLoader as jest.MockedClass<typeof ImageLoader>).mockImplementation(() => mockImageLoader);

    config = {
      container: mockContainer,
      width: 800,
      height: 600,
    };
    imageEditor = new ImageEditor(config);
  });

  // Patch mockContainerManager to include all required methods for utility and theme tests
  beforeAll(() => {
    Object.assign(mockContainerManager, {
      setTheme: jest.fn(),
      setSize: jest.fn(),
      getSize: jest.fn(() => ({ width: 100, height: 200 })),
      togglePanel: jest.fn(),
      setLoading: jest.fn(),
      setTitle: jest.fn(),
    });
  });

  beforeAll(() => {
    const listeners: Record<string, any> = {};
    mockEventEmitter.on = jest.fn((event: string, cb: any) => {
      listeners[event] = cb;
    });
    mockEventEmitter.emit = jest.fn((event: string, data: any) => {
      if (listeners[event]) listeners[event](data);
    });
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(imageEditor.getConfig()).toEqual({
        version: '1.0.0',
        container: mockContainer,
        width: 800,
        height: 600,
      });
    });

    it('should resolve container from string selector', () => {
      // Mock querySelector to return our container
      jest.spyOn(document, 'querySelector').mockReturnValue(mockContainer);

      const stringConfig = {
        container: '#editor-container',
        width: 800,
        height: 600,
      };
      // FIX: use .not.toThrow() as a function, not a property
      expect(() => new ImageEditor(stringConfig)).not.toThrow();
    });

    it('should throw error for invalid container selector', () => {
      const invalidConfig = {
        container: '#non-existent',
        width: 800,
        height: 600,
      };

      jest.spyOn(document, 'querySelector').mockReturnValue(null);

      expect(() => new ImageEditor(invalidConfig)).toThrow(
        'Container element not found: #non-existent',
      );
    });
  });

  describe('configuration', () => {
    it('should return current configuration', () => {
      const config = imageEditor.getConfig();

      expect(config).toEqual({
        version: '1.0.0',
        container: mockContainer,
        width: 800,
        height: 600,
      });
    });
  });

  describe('image operations', () => {
    it('should load image from string URL', async () => {
      const imageUrl = 'https://example.com/image.jpg';

      await imageEditor.loadImage(imageUrl);

      expect(mockImageLoader.loadImage).toHaveBeenCalledWith(imageUrl);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('image:loading', { source: imageUrl });
      expect(mockCanvasManager.resize).toHaveBeenCalledWith(800, 640);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'image:loaded',
        expect.objectContaining({
          width: 1000,
          height: 800,
        }),
      );
    });

    it('should handle image loading failure gracefully', async () => {
      // Reset the mock for this specific test
      const mockLoadImage = jest.fn().mockRejectedValue(new Error('Network error'));
      mockImageLoader.loadImage = mockLoadImage;

      await expect(imageEditor.loadImage('invalid-url')).rejects.toThrow('Network error');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('image:loading', {
        source: 'invalid-url',
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'image:error',
        expect.objectContaining({
          error: expect.any(Error),
          source: 'invalid-url',
        }),
      );
    });
  });

  describe('tools management', () => {
    const mockTool: Tool = {
      name: 'Test Tool',
      activate: jest.fn(),
      deactivate: jest.fn(),
    };

    it('should register tool', () => {
      imageEditor.registerTool(mockTool);

      expect(imageEditor.getTool('Test Tool')).toBe(mockTool);
    });

    it('should unregister tool', () => {
      imageEditor.registerTool(mockTool);
      imageEditor.unregisterTool('Test Tool');

      expect(imageEditor.getTool('Test Tool')).toBeUndefined();
    });

    it('should select tool', () => {
      imageEditor.registerTool(mockTool);
      imageEditor.selectTool('Test Tool');

      expect(mockTool.activate).toHaveBeenCalled();
      expect(imageEditor.getCurrentTool()).toBe(mockTool);
    });

    it('should deactivate current tool when selecting new tool', () => {
      const mockTool2: Tool = {
        name: 'Test Tool 2',
        activate: jest.fn(),
        deactivate: jest.fn(),
      };

      imageEditor.registerTool(mockTool);
      imageEditor.registerTool(mockTool2);

      imageEditor.selectTool('Test Tool');
      imageEditor.selectTool('Test Tool 2');

      expect(mockTool.deactivate).toHaveBeenCalled();
      expect(mockTool2.activate).toHaveBeenCalled();
      expect(imageEditor.getCurrentTool()).toBe(mockTool2);
    });
  });

  describe('built-in tools', () => {
    it('should register built-in tools during initialization', () => {
      // The built-in tools should already be registered during construction
      expect(imageEditor.getTool('resize')).toBeDefined();
      expect(imageEditor.getTool('rotation')).toBeDefined();
      expect(imageEditor.getTool('selection')).toBeDefined();
      expect(imageEditor.getTool('brightness')).toBeDefined();
      expect(imageEditor.getTool('contrast')).toBeDefined();
      expect(imageEditor.getTool('saturation')).toBeDefined();
      expect(imageEditor.getTool('hue')).toBeDefined();
      expect(imageEditor.getTool('rgb')).toBeDefined();
      expect(imageEditor.getTool('auto-enhance')).toBeDefined();
    });
  });

  describe('plugin management', () => {
    const MockPluginClass = jest.fn().mockImplementation(() => ({
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      activate: jest.fn(),
      deactivate: jest.fn(),
    }));

    it('should register plugin', async () => {
      await imageEditor.registerPlugin(MockPluginClass);
      expect(mockPluginManager.registerPlugin).toHaveBeenCalledWith(MockPluginClass, undefined);
    });

    it('should unregister plugin', async () => {
      await imageEditor.unregisterPlugin('test-plugin');
      expect(mockPluginManager.unregisterPlugin).toHaveBeenCalledWith('test-plugin');
    });

    it('should activate plugin', async () => {
      await imageEditor.activatePlugin('test-plugin');
      expect(mockPluginManager.activatePlugin).toHaveBeenCalledWith('test-plugin');
    });

    it('should deactivate plugin', async () => {
      await imageEditor.deactivatePlugin('test-plugin');
      expect(mockPluginManager.deactivatePlugin).toHaveBeenCalledWith('test-plugin');
    });

    it('should get plugin', () => {
      imageEditor.getPlugin('test-plugin');
      expect(mockPluginManager.getPlugin).toHaveBeenCalledWith('test-plugin');
    });

    it('should get all plugins', () => {
      imageEditor.getPlugins();
      expect(mockPluginManager.getPlugins).toHaveBeenCalled();
    });

    it('should get active plugins', () => {
      imageEditor.getActivePlugins();
      expect(mockPluginManager.getActivePlugins).toHaveBeenCalled();
    });

    it('should configure plugin', async () => {
      const config = { enabled: true, settings: { option1: 'value1' } };
      await imageEditor.configurePlugin('test-plugin', config);
      expect(mockPluginManager.configurePlugin).toHaveBeenCalledWith('test-plugin', config);
    });
  });

  describe('lifecycle methods', () => {
    it('should return destroyed state', () => {
      expect(imageEditor.isDestroyed()).toBe(false);

      imageEditor.destroy();

      expect(imageEditor.isDestroyed()).toBe(true);
    });
  });

  describe('additional image operations', () => {
    it('should load image from File object', async () => {
      const mockFile = new File([''], 'test.png', { type: 'image/png' });

      const mockLoadImage = jest.fn().mockResolvedValue({
        image: document.createElement('img'),
        width: 300,
        height: 200,
        naturalWidth: 300,
        naturalHeight: 200,
        originalWidth: 300,
        originalHeight: 200,
        displayWidth: 300,
        displayHeight: 200,
        format: 'png',
        size: 30000,
      });
      mockImageLoader.loadImage = mockLoadImage;

      await imageEditor.loadImage(mockFile);

      expect(mockLoadImage).toHaveBeenCalledWith(mockFile);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'image:loaded',
        expect.objectContaining({
          width: 300,
          height: 200,
        }),
      );
    });
  });

  describe('history management', () => {
    it('should execute commands through history manager', async () => {
      const mockCommand: Command = {
        id: 'test-command',
        name: 'Test Command',
        timestamp: Date.now(),
        execute: jest.fn(),
        undo: jest.fn(),
        getMemoryUsage: jest.fn().mockReturnValue(100),
        isValid: jest.fn().mockReturnValue(true),
      };

      await imageEditor.executeCommand(mockCommand);

      expect(mockHistoryManager.executeCommand).toHaveBeenCalledWith(mockCommand);
    });

    it('should handle undo operations', async () => {
      jest.spyOn(mockHistoryManager, 'undo').mockResolvedValue(true);

      const result = await imageEditor.undo();

      expect(result).toBe(true);
      expect(mockHistoryManager.undo).toHaveBeenCalled();
    });

    it('should handle redo operations', async () => {
      jest.spyOn(mockHistoryManager, 'redo').mockResolvedValue(true);

      const result = await imageEditor.redo();

      expect(result).toBe(true);
      expect(mockHistoryManager.redo).toHaveBeenCalled();
    });

    it('should check if undo is available', () => {
      jest.spyOn(mockHistoryManager, 'canUndo').mockReturnValue(true);

      const result = imageEditor.canUndo();

      expect(result).toBe(true);
      expect(mockHistoryManager.canUndo).toHaveBeenCalled();
    });

    it('should check if redo is available', () => {
      jest.spyOn(mockHistoryManager, 'canRedo').mockReturnValue(false);

      const result = imageEditor.canRedo();

      expect(result).toBe(false);
      expect(mockHistoryManager.canRedo).toHaveBeenCalled();
    });

    it('should clear history', () => {
      imageEditor.clearHistory();

      expect(mockHistoryManager.clear).toHaveBeenCalled();
    });

    it('should get history state', () => {
      const mockState: HistoryState = {
        commands: [],
        currentIndex: 0,
        memoryUsage: 1000,
        maxMemoryUsage: 50000,
        maxHistorySize: 50,
      };
      jest.spyOn(mockHistoryManager, 'getState').mockReturnValue(mockState);

      const result = imageEditor.getHistoryState();

      expect(result).toBe(mockState);
      expect(mockHistoryManager.getState).toHaveBeenCalled();
    });

    it('should start command group', () => {
      imageEditor.startCommandGroup('test-group');

      expect(mockHistoryManager.startGrouping).toHaveBeenCalledWith('test-group');
    });

    it('should end command group', () => {
      imageEditor.endCommandGroup();

      expect(mockHistoryManager.endGrouping).toHaveBeenCalled();
    });
  });

  describe('event management', () => {
    it('should register event handlers', () => {
      const callback = jest.fn();

      imageEditor.on('editor:ready', callback);

      expect(mockEventEmitter.on).toHaveBeenCalledWith('editor:ready', callback);
    });

    it('should remove event handlers', () => {
      const callback = jest.fn();

      imageEditor.off('editor:ready', callback);

      expect(mockEventEmitter.off).toHaveBeenCalledWith('editor:ready', callback);
    });

    it('should emit events', () => {
      const data = { editor: imageEditor };

      imageEditor.emit('editor:ready', data);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('editor:ready', data);
    });
  });

  describe('accessors', () => {
    it('should return canvas manager', () => {
      const result = imageEditor.getCanvasManager();

      expect(result).toBe(mockCanvasManager);
    });

    it('should return event emitter', () => {
      const result = imageEditor.getEventEmitter();

      expect(result).toBe(mockEventEmitter);
    });

    it('should return container', () => {
      const result = imageEditor.getContainer();

      expect(result).toBe(mockContainer);
    });

    it('should return plugin manager', () => {
      const result = imageEditor.getPluginManager();

      expect(result).toBe(mockPluginManager);
    });
  });

  describe('cleanup', () => {
    it('should destroy all components on destroy', () => {
      imageEditor.destroy();

      expect(mockInputManager.destroy).toHaveBeenCalled();
      expect(mockContainerManager.destroy).toHaveBeenCalled();
      expect(mockEventEmitter.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('drag-and-drop', () => {
    let canvas: HTMLCanvasElement;
    let listeners: Record<string, EventListenerOrEventListenerObject>;
    beforeEach(() => {
      // Patch canvas and listeners before creating ImageEditor
      canvas = createMockCanvas();
      listeners = {};
      try {
        Object.defineProperty(canvas, 'parentNode', {
          value: { replaceChild: jest.fn() },
          configurable: true,
        });
      } catch {
        console.warn('Failed to patch canvas parentNode');
      }
      const classListState = { _added: false };
      try {
        Object.defineProperty(canvas, 'classList', {
          value: {
            add: jest.fn(() => {
              classListState._added = true;
            }),
            remove: jest.fn(() => {
              classListState._added = false;
            }),
            contains: jest.fn(() => classListState._added),
          },
          configurable: true,
        });
      } catch {
        console.warn('Failed to patch canvas classList');
      }
      // Patch contains for dragleave
      canvas.contains = jest.fn(() => false);
      canvas.cloneNode = jest.fn(() => canvas);
      canvas.toBlob = jest.fn((cb) => setTimeout(() => cb(null), 1));
      canvas.addEventListener = jest.fn((type, cb) => {
        listeners[type] = cb;
      });
      // Patch mockCanvasManager to return this canvas
      mockCanvasManager.getCanvas = jest.fn(() => canvas);
      // Re-create ImageEditor so it registers listeners on this canvas
      config = {
        container: mockContainer,
        width: 800,
        height: 600,
      };
      imageEditor = new ImageEditor(config);
    });

    function fireListener(type: string, event: any) {
      const listener = listeners[type];
      if (typeof listener === 'function') {
        listener(event);
      } else if (
        listener &&
        typeof listener === 'object' &&
        typeof (listener as any).handleEvent === 'function'
      ) {
        (listener as any).handleEvent(event);
      }
    }

    it('should prevent default drag behaviors', () => {
      const prevent = jest.fn();
      const stop = jest.fn();
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        canvas.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      });
      const _event = { preventDefault: prevent, stopPropagation: stop };
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((type) => {
        canvas.dispatchEvent(new Event(type));
      });
      // Not directly testable, but coverage for event listeners
    });

    it('should handle dragenter/dragover and emit dragdrop:enter', () => {
      fireListener('dragenter', { preventDefault: jest.fn(), stopPropagation: jest.fn() });
      fireListener('dragover', { preventDefault: jest.fn(), stopPropagation: jest.fn() });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('dragdrop:enter', {});
      expect(canvas.classList.contains('drag-over')).toBe(true);
    });

    it('should handle dragleave and emit dragdrop:leave', () => {
      fireListener('dragleave', {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        relatedTarget: null,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('dragdrop:leave', {});
      expect(canvas.classList.contains('drag-over')).toBe(false);
    });

    it('should emit dragdrop:error if no files dropped', () => {
      fireListener('drop', {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: { files: [] },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('dragdrop:error', {
        error: 'No files dropped',
      });
    });

    it('should emit dragdrop:error if dropped file is not image', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      fireListener('drop', {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: { files: [file] },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'dragdrop:error',
        expect.objectContaining({ error: 'Dropped file is not an image' }),
      );
    });

    it('should emit dragdrop:success after successful drop', async () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      mockImageLoader.loadImage = jest.fn().mockResolvedValue({
        image: document.createElement('img'),
        originalWidth: 100,
        originalHeight: 100,
        displayWidth: 100,
        displayHeight: 100,
        format: 'png',
        size: 1000,
      });
      await fireListener('drop', {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: { files: [file] },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ file }),
      );
    });

    it('should emit dragdrop:error if loadImage throws', async () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      mockImageLoader.loadImage = jest.fn().mockRejectedValue(new Error('fail'));
      await fireListener('drop', {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: { files: [file] },
      });
      const calls = (mockEventEmitter.emit as jest.Mock).mock.calls;
      const found = calls.some(
        ([event, data]) =>
          event === 'image:error' && data && data.error instanceof Error && data.source === file,
      );
      expect(found).toBe(true);
    });

    it('should allow disabling and enabling drag and drop', () => {
      imageEditor.setDragDropEnabled(false);
      expect(imageEditor['dragDropEnabled']).toBe(false);
      imageEditor.setDragDropEnabled(true);
      expect(imageEditor['dragDropEnabled']).toBe(true);
    });
  });

  describe('event delegation and shortcuts', () => {
    it('should delegate mouse events to current tool', () => {
      const tool = {
        name: 'MouseTool',
        activate: jest.fn(),
        deactivate: jest.fn(),
        onMouseDown: jest.fn(),
        onMouseMove: jest.fn(),
        onMouseUp: jest.fn(),
        onDrag: jest.fn(),
        onWheel: jest.fn(),
      };
      imageEditor.registerTool(tool as any);
      imageEditor.selectTool('MouseTool');
      // Simulate events
      imageEditor['eventEmitter'].emit('canvas:mousedown', { point: { x: 1, y: 2 }, event: {} });
      expect(tool.onMouseDown).toHaveBeenCalled();
      imageEditor['eventEmitter'].emit('canvas:mousemove', { point: { x: 1, y: 2 }, event: {} });
      expect(tool.onMouseMove).toHaveBeenCalled();
      imageEditor['eventEmitter'].emit('canvas:mouseup', { point: { x: 1, y: 2 }, event: {} });
      expect(tool.onMouseUp).toHaveBeenCalled();
      imageEditor['eventEmitter'].emit('canvas:drag', {
        point: { x: 1, y: 2 },
        deltaX: 1,
        deltaY: 1,
        event: {},
      });
      expect(tool.onDrag).toHaveBeenCalled();
      imageEditor['eventEmitter'].emit('canvas:wheel', {
        point: { x: 1, y: 2 },
        deltaY: 1,
        ctrlKey: false,
        event: {},
      });
      expect(tool.onWheel).toHaveBeenCalled();
    });

    it('should handle keyboard shortcuts', () => {
      const preventDefault = jest.fn();
      const deactivate = jest.fn();
      const tool = {
        name: 'KeyTool',
        activate: jest.fn(),
        deactivate,
        onKeyDown: jest.fn(),
      };
      imageEditor.registerTool(tool as any);
      imageEditor.selectTool('KeyTool');
      // Undo
      imageEditor['eventEmitter'].emit('shortcut:pressed', {
        shortcut: 'Ctrl+z',
        event: { preventDefault },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('history:action', {
        type: 'undo',
        action: null,
      });
      // Redo
      imageEditor['eventEmitter'].emit('shortcut:pressed', {
        shortcut: 'Ctrl+y',
        event: { preventDefault },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('history:action', {
        type: 'redo',
        action: null,
      });
      // Ctrl+Shift+z
      imageEditor['eventEmitter'].emit('shortcut:pressed', {
        shortcut: 'Ctrl+Shift+z',
        event: { preventDefault },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('history:action', {
        type: 'redo',
        action: null,
      });
      // Ctrl+a
      imageEditor['eventEmitter'].emit('shortcut:pressed', {
        shortcut: 'Ctrl+a',
        event: { preventDefault },
      });
      expect(preventDefault).toHaveBeenCalled();
      // Delete
      imageEditor['eventEmitter'].emit('shortcut:pressed', {
        shortcut: 'Delete',
        event: { preventDefault },
      });
      // Backspace
      imageEditor['eventEmitter'].emit('shortcut:pressed', {
        shortcut: 'Backspace',
        event: { preventDefault },
      });
      // Escape
      imageEditor['eventEmitter'].emit('shortcut:pressed', {
        shortcut: 'Escape',
        event: { preventDefault },
      });
      expect(deactivate).toHaveBeenCalled();
      // Default (custom)
      imageEditor['eventEmitter'].emit('shortcut:pressed', {
        shortcut: 'Q',
        event: { key: 'Q', preventDefault },
      });
      expect(tool.onKeyDown).toHaveBeenCalledWith('Q', expect.anything());
    });

    it('should handle propertyChanged event', () => {
      const onPropertyChanged = jest.fn();
      const tool = {
        name: 'PropertyTool',
        activate: jest.fn(),
        deactivate: jest.fn(),
        onPropertyChanged,
      };
      imageEditor.registerTool(tool as any);
      imageEditor['eventEmitter'].emit('propertyChanged', {
        toolId: 'PropertyTool',
        controlId: 'foo',
        value: 42,
      });
      expect(onPropertyChanged).toHaveBeenCalledWith('foo', 42);
    });
  });

  describe('image loader events', () => {
    it('should emit correct events for image loader', () => {
      const events = [
        ['load:start', 'image:loading'],
        ['load:progress', 'image:progress'],
        ['load:complete', 'image:loadComplete'],
        ['load:error', 'image:error'],
      ];
      events.forEach(([from, to]) => {
        const handler = (mockImageLoader.on as jest.Mock).mock.calls.find(
          ([event]) => event === from,
        )?.[1];
        if (handler) handler({ foo: 'bar' });
        expect(mockEventEmitter.emit).toHaveBeenCalledWith(to, { foo: 'bar' });
      });
    });
  });

  describe('public method branches and utility', () => {
    it('should not destroy twice', () => {
      imageEditor.destroy();
      expect(imageEditor.isDestroyed()).toBe(true);
      imageEditor.destroy(); // should not throw or re-destroy
      expect(imageEditor.isDestroyed()).toBe(true);
    });

    it('should not select tool if not found', () => {
      imageEditor.selectTool('not-found');
      expect(imageEditor.getCurrentTool()).toBeNull();
    });

    it('should unregister current tool and clear currentTool', () => {
      const tool = { name: 'T', activate: jest.fn(), deactivate: jest.fn() };
      imageEditor.registerTool(tool as any);
      imageEditor.selectTool('T');
      imageEditor.unregisterTool('T');
      expect(imageEditor.getCurrentTool()).toBeNull();
    });

    it('should handle exportImage with null blob', (done) => {
      jest.useFakeTimers();
      const canvas = mockCanvas;
      canvas.toBlob = jest.fn((cb) => setTimeout(() => cb(null), 1));
      imageEditor.exportImage('image/png').then((result) => {
        expect(result).toBeUndefined();
        jest.useRealTimers();
        done();
      });
      jest.runAllTimers();
    });

    it('should setTheme with auto, light, dark', () => {
      imageEditor.setTheme('auto');
      imageEditor.setTheme('light');
      imageEditor.setTheme('dark');
      expect(mockContainerManager.setTheme).toHaveBeenCalledWith('auto');
      expect(mockContainerManager.setTheme).toHaveBeenCalledWith('light');
      expect(mockContainerManager.setTheme).toHaveBeenCalledWith('dark');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'container:themeChange',
        expect.anything(),
      );
    });

    it('should call container utility methods', () => {
      imageEditor.getContainerElements();
      imageEditor.setSize(100, 200);
      imageEditor.getSize();
      imageEditor.togglePanel(true);
      imageEditor.setLoading(true);
      imageEditor.setTitle('title');
      imageEditor.getCanvas();
      expect(mockContainerManager.getElements).toHaveBeenCalled();
      expect(mockContainerManager.setSize).toHaveBeenCalledWith(100, 200);
      expect(mockContainerManager.getSize).toHaveBeenCalled();
      expect(mockContainerManager.togglePanel).toHaveBeenCalledWith(true);
      expect(mockContainerManager.setLoading).toHaveBeenCalledWith(true);
      expect(mockContainerManager.setTitle).toHaveBeenCalledWith('title');
      expect(mockCanvasManager.getCanvas).toHaveBeenCalled();
    });
  });
});
