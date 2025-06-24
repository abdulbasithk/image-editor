/**
 * Crop Tool Implementation
 * Provides interactive crop selection with aspect ratio constraints
 */

import { Tool } from '../interfaces/Tool';
import { Point } from '../types';
import { ImageEditor } from '../core/ImageEditor';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AspectRatioPreset {
  name: string;
  ratio: number | null; // null means free crop
  displayName: string;
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { name: 'free', ratio: null, displayName: 'Free' },
  { name: 'square', ratio: 1, displayName: '1:1 Square' },
  { name: 'portrait', ratio: 3 / 4, displayName: '3:4 Portrait' },
  { name: 'landscape', ratio: 4 / 3, displayName: '4:3 Landscape' },
  { name: 'widescreen', ratio: 16 / 9, displayName: '16:9 Widescreen' },
  { name: 'cinema', ratio: 21 / 9, displayName: '21:9 Cinema' },
];

export enum CropHandle {
  TopLeft = 'tl',
  TopRight = 'tr',
  BottomLeft = 'bl',
  BottomRight = 'br',
  Top = 't',
  Right = 'r',
  Bottom = 'b',
  Left = 'l',
  Move = 'move',
}

export interface CropToolConfig {
  aspectRatio?: number | null;
  showGuides?: boolean;
  snapToGuides?: boolean;
  minCropSize?: number;
  handleSize?: number;
}

export class CropTool implements Tool {
  public readonly name = 'crop';

  private editor: ImageEditor;
  private config: Required<CropToolConfig>;
  private overlay: HTMLElement | null = null;
  private cropArea: CropArea;
  private isDragging = false;
  private dragHandle: CropHandle | null = null;
  private dragStart: Point = { x: 0, y: 0 };
  private initialCropArea: CropArea = { x: 0, y: 0, width: 0, height: 0 };
  private isActive = false;
  private showRuleOfThirds = true;

  constructor(editor: ImageEditor, config: CropToolConfig = {}) {
    this.editor = editor;
    this.config = {
      aspectRatio: null,
      showGuides: true,
      snapToGuides: false,
      minCropSize: 20,
      handleSize: 12,
      ...config,
    };

    // Initialize crop area to canvas size
    const canvas = this.editor.getCanvasManager().getCanvas();
    this.cropArea = {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    };
  }

  public activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.createOverlay();
    this.updateOverlay();

    // Reset crop area to canvas bounds
    const canvas = this.editor.getCanvasManager().getCanvas();
    this.cropArea = {
      x: canvas.width * 0.1,
      y: canvas.height * 0.1,
      width: canvas.width * 0.8,
      height: canvas.height * 0.8,
    };

    this.enforceAspectRatio();
    this.updateOverlay();
  }

  public deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.removeOverlay();
    this.isDragging = false;
    this.dragHandle = null;
  }

  public onMouseDown(point: Point, event: MouseEvent): void {
    if (!this.isActive || !this.overlay) return;

    const handle = this.getHandleAtPoint(point);
    if (handle) {
      this.isDragging = true;
      this.dragHandle = handle;
      this.dragStart = point;
      this.initialCropArea = { ...this.cropArea };

      // Prevent default to avoid text selection
      event.preventDefault();
    }
  }

  public onMouseMove(point: Point, _event: MouseEvent): void {
    if (!this.isActive) return;

    if (this.isDragging && this.dragHandle) {
      this.handleDrag(point);
      this.updateOverlay();
    } else {
      // Update cursor based on hover handle
      this.updateCursor(point);
    }
  }

  public onMouseUp(_point: Point, _event: MouseEvent): void {
    if (!this.isActive) return;

    if (this.isDragging) {
      this.isDragging = false;
      this.dragHandle = null;
    }
  }

  public onKeyDown(key: string, event: KeyboardEvent): void {
    if (!this.isActive) return;

    switch (key) {
      case 'Enter':
        this.applyCrop();
        break;
      case 'Escape':
        this.resetCrop();
        break;
      case 'r':
        if (event.ctrlKey) {
          this.resetCrop();
          event.preventDefault();
        }
        break;
    }
  }

  /**
   * Set the aspect ratio constraint
   */
  public setAspectRatio(ratio: number | null): void {
    this.config.aspectRatio = ratio;
    this.enforceAspectRatio();
    this.updateOverlay();
  }

  /**
   * Get current aspect ratio
   */
  public getAspectRatio(): number | null {
    return this.config.aspectRatio;
  }
  /**
   * Set crop area programmatically
   */
  public setCropArea(area: CropArea): void {
    const canvas = this.editor.getCanvasManager().getCanvas();

    // Validate and clamp the crop area to canvas bounds
    const clampedArea = {
      x: Math.max(0, Math.min(canvas.width, area.x)),
      y: Math.max(0, Math.min(canvas.height, area.y)),
      width: Math.max(this.config.minCropSize, Math.min(canvas.width, area.width)),
      height: Math.max(this.config.minCropSize, Math.min(canvas.height, area.height)),
    };

    // Ensure crop area doesn't exceed canvas bounds
    clampedArea.width = Math.min(clampedArea.width, canvas.width - clampedArea.x);
    clampedArea.height = Math.min(clampedArea.height, canvas.height - clampedArea.y);

    this.cropArea = clampedArea;
    this.enforceAspectRatio();
    this.updateOverlay();
  }

  /**
   * Get current crop area
   */
  public getCropArea(): CropArea {
    return { ...this.cropArea };
  }

  /**
   * Apply the crop to the image
   */
  public applyCrop(): void {
    if (!this.isActive) return;

    const canvas = this.editor.getCanvasManager().getCanvas();
    const ctx = this.editor.getCanvasManager().getContext();

    // Create new canvas with cropped dimensions
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = this.cropArea.width;
    croppedCanvas.height = this.cropArea.height;
    const croppedCtx = croppedCanvas.getContext('2d')!;

    // Draw cropped area to new canvas
    croppedCtx.drawImage(
      canvas,
      this.cropArea.x,
      this.cropArea.y,
      this.cropArea.width,
      this.cropArea.height,
      0,
      0,
      this.cropArea.width,
      this.cropArea.height,
    );

    // Replace main canvas content
    canvas.width = this.cropArea.width;
    canvas.height = this.cropArea.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(croppedCanvas, 0, 0);

    // Reset crop area
    this.cropArea = {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    };
    // Notify editor of image change
    this.editor.emit('tool:action', {
      toolName: 'crop',
      action: 'apply',
      data: { source: 'crop' },
    });

    // Deactivate tool after applying crop
    this.editor.selectTool('select');
  }

  /**
   * Reset crop area to canvas bounds
   */
  public resetCrop(): void {
    const canvas = this.editor.getCanvasManager().getCanvas();
    this.cropArea = {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    };
    this.updateOverlay();
  }

  /**
   * Toggle rule of thirds guides
   */
  public setShowGuides(show: boolean): void {
    this.showRuleOfThirds = show;
    this.updateOverlay();
  }

  /**
   * Create overlay element
   */
  private createOverlay(): void {
    if (this.overlay) return;

    const canvasContainer = this.editor.getContainerElements().canvasContainer;
    this.overlay = document.createElement('div');
    this.overlay.className = 'crop-overlay';
    this.overlay.innerHTML = this.generateOverlayHTML();
    canvasContainer.appendChild(this.overlay);
  }

  /**
   * Remove overlay element
   */
  private removeOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  /**
   * Generate overlay HTML structure
   */
  private generateOverlayHTML(): string {
    return `
      <div class="crop-darken crop-darken-top"></div>
      <div class="crop-darken crop-darken-bottom"></div>
      <div class="crop-darken crop-darken-left"></div>
      <div class="crop-darken crop-darken-right"></div>
      
      <div class="crop-selection">
        <div class="crop-guides"></div>
        
        <!-- Corner handles -->
        <div class="crop-handle crop-handle-tl" data-handle="tl"></div>
        <div class="crop-handle crop-handle-tr" data-handle="tr"></div>
        <div class="crop-handle crop-handle-bl" data-handle="bl"></div>
        <div class="crop-handle crop-handle-br" data-handle="br"></div>
        
        <!-- Edge handles -->
        <div class="crop-handle crop-handle-t" data-handle="t"></div>
        <div class="crop-handle crop-handle-r" data-handle="r"></div>
        <div class="crop-handle crop-handle-b" data-handle="b"></div>
        <div class="crop-handle crop-handle-l" data-handle="l"></div>
        
        <!-- Move handle (entire selection area) -->
        <div class="crop-handle crop-handle-move" data-handle="move"></div>
      </div>
    `;
  }

  /**
   * Update overlay position and appearance
   */
  private updateOverlay(): void {
    if (!this.overlay) return;

    const canvas = this.editor.getCanvasManager().getCanvas();
    const _canvasRect = canvas.getBoundingClientRect();

    // Update darken areas
    this.updateDarkenAreas();

    // Update selection area
    const selection = this.overlay.querySelector('.crop-selection') as HTMLElement;
    if (selection) {
      selection.style.left = `${this.cropArea.x}px`;
      selection.style.top = `${this.cropArea.y}px`;
      selection.style.width = `${this.cropArea.width}px`;
      selection.style.height = `${this.cropArea.height}px`;
    }

    // Update guides
    this.updateGuides();
  }

  /**
   * Update darken areas around crop selection
   */
  private updateDarkenAreas(): void {
    if (!this.overlay) return;

    const canvas = this.editor.getCanvasManager().getCanvas();

    const topDarken = this.overlay.querySelector('.crop-darken-top') as HTMLElement;
    const bottomDarken = this.overlay.querySelector('.crop-darken-bottom') as HTMLElement;
    const leftDarken = this.overlay.querySelector('.crop-darken-left') as HTMLElement;
    const rightDarken = this.overlay.querySelector('.crop-darken-right') as HTMLElement;

    if (topDarken) {
      topDarken.style.left = '0';
      topDarken.style.top = '0';
      topDarken.style.width = `${canvas.width}px`;
      topDarken.style.height = `${this.cropArea.y}px`;
    }

    if (bottomDarken) {
      bottomDarken.style.left = '0';
      bottomDarken.style.top = `${this.cropArea.y + this.cropArea.height}px`;
      bottomDarken.style.width = `${canvas.width}px`;
      bottomDarken.style.height = `${canvas.height - this.cropArea.y - this.cropArea.height}px`;
    }

    if (leftDarken) {
      leftDarken.style.left = '0';
      leftDarken.style.top = `${this.cropArea.y}px`;
      leftDarken.style.width = `${this.cropArea.x}px`;
      leftDarken.style.height = `${this.cropArea.height}px`;
    }

    if (rightDarken) {
      rightDarken.style.left = `${this.cropArea.x + this.cropArea.width}px`;
      rightDarken.style.top = `${this.cropArea.y}px`;
      rightDarken.style.width = `${canvas.width - this.cropArea.x - this.cropArea.width}px`;
      rightDarken.style.height = `${this.cropArea.height}px`;
    }
  }

  /**
   * Update guide lines (rule of thirds)
   */
  private updateGuides(): void {
    if (!this.overlay || !this.showRuleOfThirds) return;

    const guides = this.overlay.querySelector('.crop-guides') as HTMLElement;
    if (!guides) return;

    guides.innerHTML = `
      <!-- Vertical guides -->
      <div class="crop-guide crop-guide-vertical" style="left: 33.33%"></div>
      <div class="crop-guide crop-guide-vertical" style="left: 66.67%"></div>
      
      <!-- Horizontal guides -->
      <div class="crop-guide crop-guide-horizontal" style="top: 33.33%"></div>
      <div class="crop-guide crop-guide-horizontal" style="top: 66.67%"></div>
    `;
  }

  /**
   * Get which handle is at the given point
   */
  private getHandleAtPoint(point: Point): CropHandle | null {
    const tolerance = this.config.handleSize + 5;

    // Check corner handles first (higher priority)
    if (this.isPointNear(point, { x: this.cropArea.x, y: this.cropArea.y }, tolerance)) {
      return CropHandle.TopLeft;
    }
    if (
      this.isPointNear(
        point,
        { x: this.cropArea.x + this.cropArea.width, y: this.cropArea.y },
        tolerance,
      )
    ) {
      return CropHandle.TopRight;
    }
    if (
      this.isPointNear(
        point,
        { x: this.cropArea.x, y: this.cropArea.y + this.cropArea.height },
        tolerance,
      )
    ) {
      return CropHandle.BottomLeft;
    }
    if (
      this.isPointNear(
        point,
        { x: this.cropArea.x + this.cropArea.width, y: this.cropArea.y + this.cropArea.height },
        tolerance,
      )
    ) {
      return CropHandle.BottomRight;
    }

    // Check edge handles
    if (
      this.isPointNear(
        point,
        { x: this.cropArea.x + this.cropArea.width / 2, y: this.cropArea.y },
        tolerance,
      )
    ) {
      return CropHandle.Top;
    }
    if (
      this.isPointNear(
        point,
        { x: this.cropArea.x + this.cropArea.width, y: this.cropArea.y + this.cropArea.height / 2 },
        tolerance,
      )
    ) {
      return CropHandle.Right;
    }
    if (
      this.isPointNear(
        point,
        { x: this.cropArea.x + this.cropArea.width / 2, y: this.cropArea.y + this.cropArea.height },
        tolerance,
      )
    ) {
      return CropHandle.Bottom;
    }
    if (
      this.isPointNear(
        point,
        { x: this.cropArea.x, y: this.cropArea.y + this.cropArea.height / 2 },
        tolerance,
      )
    ) {
      return CropHandle.Left;
    }

    // Check if point is inside crop area (move handle)
    if (
      point.x >= this.cropArea.x &&
      point.x <= this.cropArea.x + this.cropArea.width &&
      point.y >= this.cropArea.y &&
      point.y <= this.cropArea.y + this.cropArea.height
    ) {
      return CropHandle.Move;
    }

    return null;
  }

  /**
   * Check if point is near target within tolerance
   */
  private isPointNear(point: Point, target: Point, tolerance: number): boolean {
    const dx = point.x - target.x;
    const dy = point.y - target.y;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  /**
   * Handle dragging operations
   */
  private handleDrag(currentPoint: Point): void {
    if (!this.dragHandle) return;

    const deltaX = currentPoint.x - this.dragStart.x;
    const deltaY = currentPoint.y - this.dragStart.y;
    const canvas = this.editor.getCanvasManager().getCanvas();

    const newCropArea = { ...this.initialCropArea };

    switch (this.dragHandle) {
      case CropHandle.Move:
        newCropArea.x = Math.max(
          0,
          Math.min(canvas.width - newCropArea.width, this.initialCropArea.x + deltaX),
        );
        newCropArea.y = Math.max(
          0,
          Math.min(canvas.height - newCropArea.height, this.initialCropArea.y + deltaY),
        );
        break;

      case CropHandle.TopLeft:
        newCropArea.x = Math.max(0, this.initialCropArea.x + deltaX);
        newCropArea.y = Math.max(0, this.initialCropArea.y + deltaY);
        newCropArea.width = this.initialCropArea.width - deltaX;
        newCropArea.height = this.initialCropArea.height - deltaY;
        break;

      case CropHandle.TopRight:
        newCropArea.y = Math.max(0, this.initialCropArea.y + deltaY);
        newCropArea.width = this.initialCropArea.width + deltaX;
        newCropArea.height = this.initialCropArea.height - deltaY;
        break;

      case CropHandle.BottomLeft:
        newCropArea.x = Math.max(0, this.initialCropArea.x + deltaX);
        newCropArea.width = this.initialCropArea.width - deltaX;
        newCropArea.height = this.initialCropArea.height + deltaY;
        break;

      case CropHandle.BottomRight:
        newCropArea.width = this.initialCropArea.width + deltaX;
        newCropArea.height = this.initialCropArea.height + deltaY;
        break;

      case CropHandle.Top:
        newCropArea.y = Math.max(0, this.initialCropArea.y + deltaY);
        newCropArea.height = this.initialCropArea.height - deltaY;
        break;

      case CropHandle.Right:
        newCropArea.width = this.initialCropArea.width + deltaX;
        break;

      case CropHandle.Bottom:
        newCropArea.height = this.initialCropArea.height + deltaY;
        break;

      case CropHandle.Left:
        newCropArea.x = Math.max(0, this.initialCropArea.x + deltaX);
        newCropArea.width = this.initialCropArea.width - deltaX;
        break;
    }

    // Ensure minimum size
    newCropArea.width = Math.max(this.config.minCropSize, newCropArea.width);
    newCropArea.height = Math.max(this.config.minCropSize, newCropArea.height);

    // Constrain to canvas bounds
    newCropArea.x = Math.max(0, Math.min(canvas.width - newCropArea.width, newCropArea.x));
    newCropArea.y = Math.max(0, Math.min(canvas.height - newCropArea.height, newCropArea.y));
    newCropArea.width = Math.min(canvas.width - newCropArea.x, newCropArea.width);
    newCropArea.height = Math.min(canvas.height - newCropArea.y, newCropArea.height);

    this.cropArea = newCropArea;
    this.enforceAspectRatio();
  }

  /**
   * Enforce aspect ratio constraint
   */
  private enforceAspectRatio(): void {
    if (!this.config.aspectRatio) return;

    const canvas = this.editor.getCanvasManager().getCanvas();
    const currentRatio = this.cropArea.width / this.cropArea.height;

    if (Math.abs(currentRatio - this.config.aspectRatio) > 0.01) {
      // Adjust dimensions to match aspect ratio
      const newWidth = this.cropArea.height * this.config.aspectRatio;
      const newHeight = this.cropArea.width / this.config.aspectRatio;

      // Choose the adjustment that keeps the crop area within bounds
      if (this.cropArea.x + newWidth <= canvas.width) {
        this.cropArea.width = newWidth;
      } else {
        this.cropArea.height = newHeight;
        if (this.cropArea.y + this.cropArea.height > canvas.height) {
          this.cropArea.height = canvas.height - this.cropArea.y;
          this.cropArea.width = this.cropArea.height * this.config.aspectRatio;
        }
      }

      // Ensure it still fits in canvas
      if (this.cropArea.x + this.cropArea.width > canvas.width) {
        this.cropArea.x = canvas.width - this.cropArea.width;
      }
      if (this.cropArea.y + this.cropArea.height > canvas.height) {
        this.cropArea.y = canvas.height - this.cropArea.height;
      }
    }
  }

  /**
   * Update cursor based on hover position
   */
  private updateCursor(point: Point): void {
    if (!this.overlay) return;

    const handle = this.getHandleAtPoint(point);
    let cursor = 'default';

    switch (handle) {
      case CropHandle.TopLeft:
      case CropHandle.BottomRight:
        cursor = 'nw-resize';
        break;
      case CropHandle.TopRight:
      case CropHandle.BottomLeft:
        cursor = 'ne-resize';
        break;
      case CropHandle.Top:
      case CropHandle.Bottom:
        cursor = 'n-resize';
        break;
      case CropHandle.Left:
      case CropHandle.Right:
        cursor = 'e-resize';
        break;
      case CropHandle.Move:
        cursor = 'move';
        break;
    }

    this.overlay.style.cursor = cursor;
  }
}
