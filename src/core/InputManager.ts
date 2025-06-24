import { EventEmitter } from './EventEmitter';
import { Point } from '../types';

export class InputManager {
  private canvas: HTMLCanvasElement;
  private eventEmitter: EventEmitter;
  private isMouseDown = false;
  private lastMousePosition: Point = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement, eventEmitter: EventEmitter) {
    this.canvas = canvas;
    this.eventEmitter = eventEmitter;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.throttle(this.handleMouseMove.bind(this), 16));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.throttle(this.handleTouchMove.bind(this), 16));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    this.isMouseDown = true;
    const point = this.getMousePosition(event);
    this.lastMousePosition = point;
    this.eventEmitter.emit('canvas:mousedown', { point, event });
  }

  private handleMouseMove(event: MouseEvent): void {
    const point = this.getMousePosition(event);
    if (this.isMouseDown) {
      this.eventEmitter.emit('canvas:drag', {
        point,
        deltaX: point.x - this.lastMousePosition.x,
        deltaY: point.y - this.lastMousePosition.y,
        event,
      });
    } else {
      this.eventEmitter.emit('canvas:mousemove', { point, event });
    }
    this.lastMousePosition = point;
  }

  private handleMouseUp(event: MouseEvent): void {
    this.isMouseDown = false;
    const point = this.getMousePosition(event);
    this.eventEmitter.emit('canvas:mouseup', { point, event });
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    const point = this.getMousePosition(event);
    this.eventEmitter.emit('canvas:wheel', {
      point,
      deltaY: event.deltaY,
      ctrlKey: event.ctrlKey,
      event,
    });
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) {
      const point = this.getTouchPosition(touch);
      this.eventEmitter.emit('canvas:touchstart', { point, event });
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) {
      const point = this.getTouchPosition(touch);
      this.eventEmitter.emit('canvas:touchmove', { point, event });
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.eventEmitter.emit('canvas:touchend', { event });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Check for keyboard shortcuts
    const shortcut = this.getShortcutString(event);
    this.eventEmitter.emit('shortcut:pressed', { shortcut, event });
    this.eventEmitter.emit('keyboard:down', { key: event.key, event });
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.eventEmitter.emit('keyboard:up', { key: event.key, event });
  }

  private getMousePosition(event: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private getTouchPosition(touch: Touch): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  private getShortcutString(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    parts.push(event.key);
    return parts.join('+');
  }

  private throttle(func: Function, delay: number): (...args: any[]) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastExecTime = 0;
    return (...args: any[]) => {
      const currentTime = Date.now();
      if (currentTime - lastExecTime > delay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(
          () => {
            func(...args);
            lastExecTime = Date.now();
          },
          delay - (currentTime - lastExecTime),
        );
      }
    };
  }

  public destroy(): void {
    // Remove all event listeners
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }
}
