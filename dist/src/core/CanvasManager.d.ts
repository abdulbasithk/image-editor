import { Layer, Viewport, Point } from '../types';
export declare class CanvasManager {
    private canvas;
    private context;
    private layers;
    private viewport;
    constructor(container: HTMLElement, width: number, height: number);
    resize(width: number, height: number): void;
    clear(): void;
    render(): void;
    addLayer(layer: Layer): void;
    removeLayer(id: string): void;
    moveLayer(id: string, index: number): void;
    screenToCanvas(x: number, y: number): Point;
    canvasToScreen(x: number, y: number): Point;
    drawImage(image: HTMLImageElement, x: number, y: number): void;
    getImageData(): ImageData;
    putImageData(data: ImageData): void;
    getCanvas(): HTMLCanvasElement;
    getContext(): CanvasRenderingContext2D;
    getViewport(): Viewport;
    setViewport(viewport: Partial<Viewport>): void;
}
//# sourceMappingURL=CanvasManager.d.ts.map