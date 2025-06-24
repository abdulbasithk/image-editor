import { Point } from '../types';

export interface Tool {
  name: string;
  activate(): void;
  deactivate(): void;

  // Optional event handlers
  onMouseDown?(point: Point, event: MouseEvent): void;
  onMouseMove?(point: Point, event: MouseEvent): void;
  onMouseUp?(point: Point, event: MouseEvent): void;
  onDrag?(point: Point, deltaX: number, deltaY: number, event: MouseEvent): void;
  onWheel?(point: Point, deltaY: number, ctrlKey: boolean, event: WheelEvent): void;
  onKeyDown?(key: string, event: KeyboardEvent): void;
  onKeyUp?(key: string, event: KeyboardEvent): void;
}
