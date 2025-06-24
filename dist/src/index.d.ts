export { ImageEditor } from './core/ImageEditor';
export { CanvasManager } from './core/CanvasManager';
export { EventEmitter } from './core/EventEmitter';
export { InputManager } from './core/InputManager';
export { PluginManager } from './core/PluginManager';
export { HistoryManager } from './core/HistoryManager';
export { BasePlugin } from './core/BasePlugin';
export { BaseCommand, CommandGroup, NoOpCommand } from './core/BaseCommand';
export type { Plugin, PluginConstructor, PluginConfig, PluginState } from './interfaces/Plugin';
export type { Tool } from './interfaces/Tool';
export type { Command, HistoryManagerOptions, HistoryState, StateSnapshot } from './interfaces/Command';
export type { ImageEditorConfig, Point, Layer, Viewport, EditorEventKey, EditorEventData, EditorEventMap, } from './types';
export { DrawCommand, ClearCanvasCommand, TextCommand } from './commands/BasicCommands';
export { LoggerPlugin } from './plugins/LoggerPlugin';
export declare const VERSION = "1.0.0";
//# sourceMappingURL=index.d.ts.map