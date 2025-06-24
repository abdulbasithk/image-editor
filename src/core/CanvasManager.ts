import { Layer, Viewport, Point } from '../types';

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private layers: Layer[] = [];
  private viewport: Viewport;

  constructor(container: HTMLElement, width: number, height: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    container.appendChild(this.canvas);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not supported');
    this.context = ctx;
    this.viewport = { x: 0, y: 0, width, height, zoom: 1 };
  }

  // Canvas operations
  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.viewport.width = width;
    this.viewport.height = height;
  }

  public clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public render(): void {
    // TODO: Render all layers
  }

  // Layer management
  public addLayer(layer: Layer): void {
    this.layers.push(layer);
  }

  public removeLayer(id: string): void {
    this.layers = this.layers.filter((l) => l.id !== id);
  }

  public moveLayer(id: string, index: number): void {
    const i = this.layers.findIndex((l) => l.id === id);
    if (i === -1) return;
    const layer = this.layers[i];
    if (!layer) return;
    this.layers.splice(i, 1);
    this.layers.splice(index, 0, layer);
  }

  // Coordinate system
  public screenToCanvas(x: number, y: number): Point {
    return {
      x: (x - this.viewport.x) / this.viewport.zoom,
      y: (y - this.viewport.y) / this.viewport.zoom,
    };
  }

  public canvasToScreen(x: number, y: number): Point {
    return {
      x: x * this.viewport.zoom + this.viewport.x,
      y: y * this.viewport.zoom + this.viewport.y,
    };
  }

  // Drawing utilities
  public drawImage(image: HTMLImageElement, x: number, y: number): void {
    this.context.drawImage(image, x, y);
  }

  public getImageData(): ImageData {
    return this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  public putImageData(data: ImageData): void {
    this.context.putImageData(data, 0, 0);
  }

  // Canvas access
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getContext(): CanvasRenderingContext2D {
    return this.context;
  }

  public getViewport(): Viewport {
    return { ...this.viewport };
  }

  public setViewport(viewport: Partial<Viewport>): void {
    this.viewport = { ...this.viewport, ...viewport };
  }
}
