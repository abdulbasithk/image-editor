export interface ImageEditorConfig {
  container: string | HTMLElement;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  tools?: string[];
  plugins?: any[];
  version?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export interface Layer {
  id: string;
  visible: boolean;
  // Add more properties as needed
}

// Event system types
export interface EditorEventMap {
  // Canvas events
  'canvas:mousedown': { point: Point; event: MouseEvent };
  'canvas:mousemove': { point: Point; event: MouseEvent };
  'canvas:mouseup': { point: Point; event: MouseEvent };
  'canvas:drag': { point: Point; deltaX: number; deltaY: number; event: MouseEvent };
  'canvas:wheel': { point: Point; deltaY: number; ctrlKey: boolean; event: WheelEvent };
  'canvas:touchstart': { point: Point; event: TouchEvent };
  'canvas:touchmove': { point: Point; event: TouchEvent };
  'canvas:touchend': { event: TouchEvent };

  // Keyboard events
  'keyboard:down': { key: string; event: KeyboardEvent };
  'keyboard:up': { key: string; event: KeyboardEvent };
  'shortcut:pressed': { shortcut: string; event: KeyboardEvent };

  // Editor events
  'editor:ready': { editor: any };
  'editor:destroy': {};
  'image:loaded': { width: number; height: number; source: string };
  'image:exported': { format: string; blob: Blob };

  // Tool events
  'tool:selected': { toolName: string; previousTool?: string };
  'tool:action': { toolName: string; action: string; data?: any };
  // Plugin events
  'plugin:registered': { name: string; plugin: any };
  'plugin:unregistered': { name: string };

  // History events
  'history:change': {
    type: 'undo' | 'redo' | 'clear' | 'snapshot' | 'command';
    command?: any;
    snapshot?: any;
  };
  'history:action': { type: 'undo' | 'redo'; action: any };
  'history:clear': {};
}

export type EditorEventKey = keyof EditorEventMap;
export type EditorEventData<T extends EditorEventKey> = EditorEventMap[T];
