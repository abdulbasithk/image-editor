/**
 * Canvas Area component for the ImageEditor
 * Provides zoomable canvas viewport with pan functionality and zoom controls
 */

import { EventEmitter } from '../core/EventEmitter';
import { Point, Viewport } from '../types';

export interface ZoomLevel {
  value: number;
  label: string;
}

export interface CanvasAreaConfig {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  enablePan?: boolean;
  enableZoomControls?: boolean;
  enableMinimap?: boolean;
  showZoomInfo?: boolean;
  fitOnLoad?: boolean;
}

export interface CanvasAreaEvents {
  zoomChanged: { zoom: number; viewport: Viewport };
  panChanged: { viewport: Viewport };
  canvasReady: { canvas: HTMLCanvasElement };
  fitToScreen: { zoom: number };
  actualSize: { zoom: number };
}

export class CanvasArea extends EventEmitter {
  private container: HTMLElement;
  private config: Required<CanvasAreaConfig>;
  private viewport: Viewport;
  private canvas!: HTMLCanvasElement;
  private canvasContainer!: HTMLElement;
  private zoomControls!: HTMLElement;
  private minimap: HTMLElement | null = null;
  private isPanning = false;
  private lastPanPoint: Point = { x: 0, y: 0 };
  private imageData: ImageData | null = null;

  // Default zoom levels
  private zoomLevels: ZoomLevel[] = [
    { value: 0.1, label: '10%' },
    { value: 0.25, label: '25%' },
    { value: 0.5, label: '50%' },
    { value: 0.75, label: '75%' },
    { value: 1.0, label: '100%' },
    { value: 1.25, label: '125%' },
    { value: 1.5, label: '150%' },
    { value: 2.0, label: '200%' },
    { value: 3.0, label: '300%' },
    { value: 5.0, label: '500%' },
  ];

  constructor(container: HTMLElement, config: CanvasAreaConfig = {}) {
    super();

    this.container = container;
    this.config = {
      minZoom: config.minZoom ?? 0.1,
      maxZoom: config.maxZoom ?? 10,
      zoomStep: config.zoomStep ?? 0.1,
      enablePan: config.enablePan ?? true,
      enableZoomControls: config.enableZoomControls ?? true,
      enableMinimap: config.enableMinimap ?? true,
      showZoomInfo: config.showZoomInfo ?? true,
      fitOnLoad: config.fitOnLoad ?? true,
    };

    this.viewport = {
      x: 0,
      y: 0,
      width: container.clientWidth,
      height: container.clientHeight,
      zoom: 1,
    };

    this.createCanvasArea();
    this.attachEventListeners();
  }

  private createCanvasArea(): void {
    // Create main canvas area structure
    this.container.className = 'image-editor-canvas-area';
    this.container.innerHTML = `
      <div class="canvas-viewport" role="img" aria-label="Image canvas">
        <div class="canvas-container">
          <canvas class="main-canvas" tabindex="0" role="img" aria-label="Editable image canvas"></canvas>
        </div>
      </div>
      <div class="canvas-controls">
        <div class="zoom-controls" role="toolbar" aria-label="Zoom controls">
          <button class="zoom-out-btn" aria-label="Zoom out" data-zoom="out">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13H5v-2h14v2z"/>
            </svg>
          </button>
          <div class="zoom-slider-container">
            <input type="range" class="zoom-slider" 
                   min="${this.config.minZoom}" 
                   max="${this.config.maxZoom}" 
                   step="${this.config.zoomStep}"
                   value="1"
                   aria-label="Zoom level">
          </div>
          <button class="zoom-in-btn" aria-label="Zoom in" data-zoom="in">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
          <div class="zoom-info">
            <select class="zoom-select" aria-label="Select zoom level">
              ${this.zoomLevels
                .map(
                  (level) =>
                    `<option value="${level.value}" ${level.value === 1 ? 'selected' : ''}>${level.label}</option>`,
                )
                .join('')}
            </select>
          </div>
          <button class="fit-screen-btn" aria-label="Fit to screen" data-action="fit">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 3H3v6h2V5h4V3zM3 15v6h6v-2H5v-4H3zM15 3v2h4v4h2V3h-6zM19 15v4h-4v2h6v-6h-2z"/>
            </svg>
          </button>
          <button class="actual-size-btn" aria-label="Actual size (100%)" data-action="actual">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Get element references
    this.canvasContainer = this.container.querySelector('.canvas-container') as HTMLElement;
    this.canvas = this.container.querySelector('.main-canvas') as HTMLCanvasElement;
    this.zoomControls = this.container.querySelector('.zoom-controls') as HTMLElement;

    // Set up canvas
    this.setupCanvas();

    // Create minimap if enabled
    if (this.config.enableMinimap) {
      this.createMinimap();
    }

    // Hide controls if disabled
    if (!this.config.enableZoomControls) {
      this.zoomControls.style.display = 'none';
    }
  }

  private setupCanvas(): void {
    const rect = this.canvasContainer.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    // Handle high-DPI displays
    const devicePixelRatio = window.devicePixelRatio || 1;
    const context = this.canvas.getContext('2d');
    if (context) {
      this.canvas.width = rect.width * devicePixelRatio;
      this.canvas.height = rect.height * devicePixelRatio;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      context.scale(devicePixelRatio, devicePixelRatio);
    }

    this.emit('canvasReady', { canvas: this.canvas });
  }

  private createMinimap(): void {
    const minimapHtml = `
      <div class="minimap" role="region" aria-label="Image overview">
        <canvas class="minimap-canvas" aria-hidden="true"></canvas>
        <div class="minimap-viewport" aria-hidden="true"></div>
      </div>
    `;

    this.container.insertAdjacentHTML('beforeend', minimapHtml);
    this.minimap = this.container.querySelector('.minimap') as HTMLElement;
  }

  private attachEventListeners(): void {
    // Zoom controls
    const zoomOutBtn = this.container.querySelector('.zoom-out-btn') as HTMLButtonElement;
    const zoomInBtn = this.container.querySelector('.zoom-in-btn') as HTMLButtonElement;
    const zoomSlider = this.container.querySelector('.zoom-slider') as HTMLInputElement;
    const zoomSelect = this.container.querySelector('.zoom-select') as HTMLSelectElement;
    const fitBtn = this.container.querySelector('.fit-screen-btn') as HTMLButtonElement;
    const actualBtn = this.container.querySelector('.actual-size-btn') as HTMLButtonElement;

    zoomOutBtn.addEventListener('click', () => this.zoomOut());
    zoomInBtn.addEventListener('click', () => this.zoomIn());
    zoomSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.setZoom(parseFloat(target.value));
    });
    zoomSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.setZoom(parseFloat(target.value));
    });
    fitBtn.addEventListener('click', () => this.fitToScreen());
    actualBtn.addEventListener('click', () => this.actualSize());

    // Canvas mouse events for panning
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));

    // Keyboard shortcuts
    this.canvas.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleMouseDown(event: MouseEvent): void {
    if (!this.config.enablePan) return;

    this.isPanning = true;
    this.lastPanPoint = { x: event.clientX, y: event.clientY };
    this.canvas.style.cursor = 'grabbing';
    event.preventDefault();
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isPanning || !this.config.enablePan) return;

    const deltaX = event.clientX - this.lastPanPoint.x;
    const deltaY = event.clientY - this.lastPanPoint.y;

    this.pan(deltaX, deltaY);

    this.lastPanPoint = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  }

  private handleMouseUp(event: MouseEvent): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
      event.preventDefault();
    }
  }

  private handleWheel(event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey) {
      // Zoom with Ctrl+scroll
      event.preventDefault();
      const delta = event.deltaY > 0 ? -this.config.zoomStep : this.config.zoomStep;
      const newZoom = Math.max(
        this.config.minZoom,
        Math.min(this.config.maxZoom, this.viewport.zoom + delta),
      );
      this.setZoom(newZoom);
    }
  }
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1 && this.config.enablePan) {
      this.isPanning = true;
      const touch = event.touches[0];
      if (touch) {
        this.lastPanPoint = { x: touch.clientX, y: touch.clientY };
      }
      event.preventDefault();
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1 && this.isPanning && this.config.enablePan) {
      const touch = event.touches[0];
      if (touch) {
        const deltaX = touch.clientX - this.lastPanPoint.x;
        const deltaY = touch.clientY - this.lastPanPoint.y;

        this.pan(deltaX, deltaY);
        this.lastPanPoint = { x: touch.clientX, y: touch.clientY };
      }
      event.preventDefault();
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      this.isPanning = false;
      event.preventDefault();
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Check if we should handle this event (not in an input field)
    const target = event.target as any;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
    ) {
      return;
    }

    switch (event.key) {
      case '+':
      case '=':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.zoomIn();
        }
        break;
      case '-':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.zoomOut();
        }
        break;
      case '0':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.fitToScreen();
        }
        break;
      case '1':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.actualSize();
        }
        break;
    }
  }

  private handleResize(): void {
    const rect = this.canvasContainer.getBoundingClientRect();
    this.viewport.width = rect.width;
    this.viewport.height = rect.height;
    this.setupCanvas();
  }

  private pan(deltaX: number, deltaY: number): void {
    this.viewport.x += deltaX;
    this.viewport.y += deltaY;

    this.updateCanvasTransform();
    this.updateMinimap();
    this.emit('panChanged', { viewport: { ...this.viewport } });
  }

  private updateCanvasTransform(): void {
    const context = this.canvas.getContext('2d');
    if (context) {
      context.setTransform(
        this.viewport.zoom,
        0,
        0,
        this.viewport.zoom,
        this.viewport.x,
        this.viewport.y,
      );
    }
  }

  private updateZoomControls(): void {
    const slider = this.container.querySelector('.zoom-slider') as HTMLInputElement;
    const select = this.container.querySelector('.zoom-select') as HTMLSelectElement;

    if (slider) {
      slider.value = this.viewport.zoom.toString();
    }

    if (select) {
      const closestLevel = this.zoomLevels.reduce((prev, curr) =>
        Math.abs(curr.value - this.viewport.zoom) < Math.abs(prev.value - this.viewport.zoom)
          ? curr
          : prev,
      );
      select.value = closestLevel.value.toString();
    }
  }

  private updateMinimap(): void {
    if (!this.minimap || !this.imageData) return;

    const minimapCanvas = this.minimap.querySelector('.minimap-canvas') as HTMLCanvasElement;
    const minimapViewport = this.minimap.querySelector('.minimap-viewport') as HTMLElement;

    if (!minimapCanvas || !minimapViewport) return;

    // Update minimap canvas with scaled image
    const context = minimapCanvas.getContext('2d');
    if (context && this.imageData) {
      const _scale = Math.min(
        minimapCanvas.width / this.imageData.width,
        minimapCanvas.height / this.imageData.height,
      );
      context.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
      // Draw scaled image representation
    }

    // Update viewport indicator
    const scaleX = minimapCanvas.width / (this.viewport.width / this.viewport.zoom);
    const scaleY = minimapCanvas.height / (this.viewport.height / this.viewport.zoom);

    minimapViewport.style.left = -this.viewport.x * scaleX + 'px';
    minimapViewport.style.top = -this.viewport.y * scaleY + 'px';
    minimapViewport.style.width = (this.viewport.width * scaleX) / this.viewport.zoom + 'px';
    minimapViewport.style.height = (this.viewport.height * scaleY) / this.viewport.zoom + 'px';
  }

  // Public API methods
  public setZoom(zoom: number): void {
    const oldZoom = this.viewport.zoom;
    this.viewport.zoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, zoom));

    if (oldZoom !== this.viewport.zoom) {
      this.updateCanvasTransform();
      this.updateZoomControls();
      this.updateMinimap();
      this.emit('zoomChanged', { zoom: this.viewport.zoom, viewport: { ...this.viewport } });
    }
  }

  public zoomIn(): void {
    this.setZoom(this.viewport.zoom + this.config.zoomStep);
  }

  public zoomOut(): void {
    this.setZoom(this.viewport.zoom - this.config.zoomStep);
  }

  public fitToScreen(): void {
    if (!this.imageData) {
      this.setZoom(1);
      return;
    }

    const scaleX = this.viewport.width / this.imageData.width;
    const scaleY = this.viewport.height / this.imageData.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

    this.setZoom(scale);
    this.centerImage();
    this.emit('fitToScreen', { zoom: scale });
  }

  public actualSize(): void {
    this.setZoom(1);
    this.centerImage();
    this.emit('actualSize', { zoom: 1 });
  }

  public centerImage(): void {
    if (!this.imageData) return;

    const centerX = (this.viewport.width - this.imageData.width * this.viewport.zoom) / 2;
    const centerY = (this.viewport.height - this.imageData.height * this.viewport.zoom) / 2;

    this.viewport.x = centerX;
    this.viewport.y = centerY;

    this.updateCanvasTransform();
    this.updateMinimap();
    this.emit('panChanged', { viewport: { ...this.viewport } });
  }

  public getZoom(): number {
    return this.viewport.zoom;
  }

  public getViewport(): Viewport {
    return { ...this.viewport };
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public setImageData(imageData: ImageData): void {
    this.imageData = imageData;
    if (this.config.fitOnLoad) {
      this.fitToScreen();
    }
    this.updateMinimap();
  }

  public updateConfig(newConfig: Partial<CanvasAreaConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.enableZoomControls !== undefined) {
      this.zoomControls.style.display = newConfig.enableZoomControls ? 'flex' : 'none';
    }

    if (newConfig.enableMinimap !== undefined) {
      if (newConfig.enableMinimap && !this.minimap) {
        this.createMinimap();
      } else if (!newConfig.enableMinimap && this.minimap) {
        this.minimap.remove();
        this.minimap = null;
      }
    }
  }

  public destroy(): void {
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize.bind(this));

    // Clear container
    this.container.innerHTML = '';
    this.container.className = '';
  }
}
