// Main ImageEditor Library Entry Point

// Import styles
import './styles/index.css';

export { ImageEditor } from './core/ImageEditor';
export { CanvasManager } from './core/CanvasManager';
export { ContainerManager } from './core/ContainerManager';
export { EventEmitter } from './core/EventEmitter';
export { InputManager } from './core/InputManager';
export { PluginManager } from './core/PluginManager';
export { HistoryManager } from './core/HistoryManager';
export { ImageLoader } from './core/ImageLoader';
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

// ImageLoader types
export type {
  ImageLoadOptions,
  ImageLoadResult,
  ImageValidationResult,
  ImageLoadProgress,
} from './core/ImageLoader';

// Basic Commands
export { DrawCommand, ClearCanvasCommand, TextCommand } from './commands/BasicCommands';

// Tools
export { CropTool } from './tools/CropTool';
export { ResizeTool } from './tools/ResizeTool';

// Plugins
export { LoggerPlugin } from './plugins/LoggerPlugin';

// UI Components
export { Toolbar } from './ui/Toolbar';
export type { ToolbarTool, ToolbarGroup, ToolbarConfig, ToolbarEvents } from './ui/Toolbar';
export { CanvasArea } from './ui/CanvasArea';
export type { ZoomLevel, CanvasAreaConfig, CanvasAreaEvents } from './ui/CanvasArea';
export { PropertiesPanel } from './ui/PropertiesPanel';
export { createResizeControls } from './ui/ResizeControls';
export type {
  PropertyControl,
  PropertyGroup,
  ToolProperties,
  PropertiesPanelConfig,
  PropertiesPanelEvents,
} from './ui/PropertiesPanel';
export {
  defaultToolbarConfig,
  compactToolbarConfig,
  verticalToolbarConfig,
  ToolbarIcons,
} from './ui/ToolbarConfig';
export { ThemeToggle } from './ui/ThemeToggle';
export type { ThemeToggleConfig, ThemeToggleEvents } from './ui/ThemeToggle';

// Theme System
export { ThemeManager } from './utils/ThemeManager';
export type { ThemeMode, ResolvedTheme, ThemeConfig, ThemeChangeEvent } from './utils/ThemeManager';

// Responsive System
export {
  ResponsiveManager,
  ResponsiveCSSHelper,
  mediaQueries,
  matchesMediaQuery,
  createBreakpointObserver,
} from './utils/responsive-utils';
export type { ResponsiveBreakpoints, ResponsiveConfig } from './utils/responsive-utils';

// Version
export const VERSION = '1.0.0';
