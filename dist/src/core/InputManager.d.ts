import { EventEmitter } from './EventEmitter';
export declare class InputManager {
    private canvas;
    private eventEmitter;
    private isMouseDown;
    private lastMousePosition;
    constructor(canvas: HTMLCanvasElement, eventEmitter: EventEmitter);
    private setupEventListeners;
    private handleMouseDown;
    private handleMouseMove;
    private handleMouseUp;
    private handleWheel;
    private handleTouchStart;
    private handleTouchMove;
    private handleTouchEnd;
    private handleKeyDown;
    private handleKeyUp;
    private getMousePosition;
    private getTouchPosition;
    private getShortcutString;
    private throttle;
    destroy(): void;
}
//# sourceMappingURL=InputManager.d.ts.map