// Main ImageEditor Library Entry Point
export { ImageEditor } from './core/ImageEditor';
export { CanvasManager } from './core/CanvasManager';
export { EventEmitter } from './core/EventEmitter';
export { InputManager } from './core/InputManager';
export { PluginManager } from './core/PluginManager';
export { HistoryManager } from './core/HistoryManager';
export { BasePlugin } from './core/BasePlugin';
export { BaseCommand, CommandGroup, NoOpCommand } from './core/BaseCommand';

// Interfaces
export type { Plugin, PluginConstructor, PluginConfig, PluginState } from './interfaces/Plugin';
export type { Tool } from './interfaces/Tool';
export type {
  Command,
  HistoryManagerOptions,
  HistoryState,
  StateSnapshot,
} from './interfaces/Command';

// Types
export type {
  ImageEditorConfig,
  Point,
  Layer,
  Viewport,
  EditorEventKey,
  EditorEventData,
  EditorEventMap,
} from './types';

// Basic Commands
export { DrawCommand, ClearCanvasCommand, TextCommand } from './commands/BasicCommands';

// Plugins
export { LoggerPlugin } from './plugins/LoggerPlugin';

// Version
export const VERSION = '1.0.0';
