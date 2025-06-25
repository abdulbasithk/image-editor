import { Tool } from '../interfaces/Tool';
import { ImageEditor } from '../core/ImageEditor';
import { CanvasManager } from '../core/CanvasManager';
import { Point } from '../types';

export interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionOptions {
  strokeColor: string;
  strokeWidth: number;
  dashLength: number;
  animationSpeed: number;
  snapToPixel: boolean;
  minSize: number;
}

export class SelectionTool implements Tool {
  name = 'selection';

  private editor: ImageEditor;
  private canvasManager: CanvasManager;
  private options: SelectionOptions = {
    strokeColor: '#000',
    strokeWidth: 1,
    dashLength: 4,
    animationSpeed: 50,
    snapToPixel: true,
    minSize: 10,
  };

  private selections: SelectionArea[] = [];
  private activeSelection: SelectionArea | null = null;
  private isDrawing = false;
  private isDragging = false;
  private isResizing = false;
  private startPoint: Point = { x: 0, y: 0 };
  private dragOffset: Point = { x: 0, y: 0 };
  private resizeHandle: string | null = null;

  // Overlay canvas for selection visualization
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayContext: CanvasRenderingContext2D | null = null;

  // Animation for marching ants
  private animationFrame: number | null = null;
  private dashOffset = 0;

  constructor(editor: ImageEditor, canvasManager: CanvasManager) {
    this.editor = editor;
    this.canvasManager = canvasManager;
    this.setupEventListeners();
  }
  private setupEventListeners(): void {
    // Listen for canvas changes - using existing events
    this.editor.on('image:loaded', () => {
      this.clearSelections();
      if (this.overlayCanvas) {
        const mainCanvas = this.canvasManager.getCanvas();
        if (mainCanvas) {
          this.overlayCanvas.width = mainCanvas.width;
          this.overlayCanvas.height = mainCanvas.height;
        }
      }
    });
  }

  public getOptions(): SelectionOptions {
    return { ...this.options };
  }

  public setOptions(options: Partial<SelectionOptions>): void {
    this.options = { ...this.options, ...options };
    this.redrawSelections();
  }
  public getSelections(): SelectionArea[] {
    return this.selections.map((selection) => ({ ...selection }));
  }

  public getActiveSelection(): SelectionArea | null {
    return this.activeSelection ? { ...this.activeSelection } : null;
  }
  public clearSelections(): void {
    this.selections = [];
    this.activeSelection = null;
    this.clearOverlay();
    this.editor.emit('tool:action', {
      toolName: this.name,
      action: 'clear',
      data: {},
    });
  }

  public selectAll(): void {
    const canvas = this.canvasManager.getCanvas();
    if (canvas) {
      const selection: SelectionArea = {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      };
      this.selections = [selection];
      this.activeSelection = selection;
      this.redrawSelections();
      this.editor.emit('tool:action', {
        toolName: this.name,
        action: 'selectAll',
        data: { selection },
      });
    }
  }

  private createOverlayCanvas(): void {
    const mainCanvas = this.canvasManager.getCanvas();
    if (!mainCanvas) return;

    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.width = mainCanvas.width;
    this.overlayCanvas.height = mainCanvas.height;

    // Position overlay over main canvas
    this.overlayCanvas.style.position = 'absolute';
    this.overlayCanvas.style.top = '0';
    this.overlayCanvas.style.left = '0';
    this.overlayCanvas.style.pointerEvents = 'none';
    this.overlayCanvas.style.zIndex = '10';

    this.overlayContext = this.overlayCanvas.getContext('2d');

    // Insert overlay after main canvas
    if (mainCanvas.parentNode) {
      mainCanvas.parentNode.insertBefore(this.overlayCanvas, mainCanvas.nextSibling);
    }
  }

  private clearOverlay(): void {
    if (this.overlayContext && this.overlayCanvas) {
      this.overlayContext.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }
  }

  private redrawSelections(): void {
    if (!this.overlayContext || !this.overlayCanvas) return;

    this.clearOverlay();

    this.selections.forEach((selection, _index) => {
      this.drawSelection(selection, selection === this.activeSelection);
    });
  }

  private drawSelection(selection: SelectionArea, isActive: boolean): void {
    if (!this.overlayContext) return;

    const ctx = this.overlayContext;

    // Draw marching ants border
    ctx.save();
    ctx.strokeStyle = this.options.strokeColor;
    ctx.lineWidth = this.options.strokeWidth;
    ctx.setLineDash([this.options.dashLength, this.options.dashLength]);
    ctx.lineDashOffset = this.dashOffset;

    // Draw selection rectangle
    ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);

    // Draw resize handles if active
    if (isActive) {
      this.drawResizeHandles(selection);
    }

    ctx.restore();
  }

  private drawResizeHandles(selection: SelectionArea): void {
    if (!this.overlayContext) return;

    const ctx = this.overlayContext;
    const handleSize = 8;
    const halfHandle = handleSize / 2;

    // Handle positions
    const handles = [
      { x: selection.x - halfHandle, y: selection.y - halfHandle, cursor: 'nw-resize' }, // top-left
      {
        x: selection.x + selection.width / 2 - halfHandle,
        y: selection.y - halfHandle,
        cursor: 'n-resize',
      }, // top-center
      {
        x: selection.x + selection.width - halfHandle,
        y: selection.y - halfHandle,
        cursor: 'ne-resize',
      }, // top-right
      {
        x: selection.x + selection.width - halfHandle,
        y: selection.y + selection.height / 2 - halfHandle,
        cursor: 'e-resize',
      }, // middle-right
      {
        x: selection.x + selection.width - halfHandle,
        y: selection.y + selection.height - halfHandle,
        cursor: 'se-resize',
      }, // bottom-right
      {
        x: selection.x + selection.width / 2 - halfHandle,
        y: selection.y + selection.height - halfHandle,
        cursor: 's-resize',
      }, // bottom-center
      {
        x: selection.x - halfHandle,
        y: selection.y + selection.height - halfHandle,
        cursor: 'sw-resize',
      }, // bottom-left
      {
        x: selection.x - halfHandle,
        y: selection.y + selection.height / 2 - halfHandle,
        cursor: 'w-resize',
      }, // middle-left
    ];

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    handles.forEach((handle) => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });
  }

  private getResizeHandle(point: Point, selection: SelectionArea): string | null {
    const handleSize = 8;
    const tolerance = handleSize / 2;

    const handles = [
      { name: 'nw', x: selection.x, y: selection.y },
      { name: 'n', x: selection.x + selection.width / 2, y: selection.y },
      { name: 'ne', x: selection.x + selection.width, y: selection.y },
      { name: 'e', x: selection.x + selection.width, y: selection.y + selection.height / 2 },
      { name: 'se', x: selection.x + selection.width, y: selection.y + selection.height },
      { name: 's', x: selection.x + selection.width / 2, y: selection.y + selection.height },
      { name: 'sw', x: selection.x, y: selection.y + selection.height },
      { name: 'w', x: selection.x, y: selection.y + selection.height / 2 },
    ];

    for (const handle of handles) {
      const distance = Math.sqrt(Math.pow(point.x - handle.x, 2) + Math.pow(point.y - handle.y, 2));
      if (distance <= tolerance) {
        return handle.name;
      }
    }

    return null;
  }

  private isPointInSelection(point: Point, selection: SelectionArea): boolean {
    return (
      point.x >= selection.x &&
      point.x <= selection.x + selection.width &&
      point.y >= selection.y &&
      point.y <= selection.y + selection.height
    );
  }

  private snapToPixel(value: number): number {
    return this.options.snapToPixel ? Math.round(value) : value;
  }
  private constrainToCanvas(
    selection: SelectionArea,
    enforceMinSize: boolean = false,
  ): SelectionArea {
    const canvas = this.canvasManager.getCanvas();
    if (!canvas) return selection;

    const result = { ...selection };

    // Constrain position
    result.x = Math.max(
      0,
      Math.min(
        result.x,
        canvas.width - (enforceMinSize ? this.options.minSize : Math.max(1, result.width)),
      ),
    );
    result.y = Math.max(
      0,
      Math.min(
        result.y,
        canvas.height - (enforceMinSize ? this.options.minSize : Math.max(1, result.height)),
      ),
    );

    // Constrain size
    if (enforceMinSize) {
      result.width = Math.max(
        this.options.minSize,
        Math.min(result.width, canvas.width - result.x),
      );
      result.height = Math.max(
        this.options.minSize,
        Math.min(result.height, canvas.height - result.y),
      );
    } else {
      result.width = Math.max(0, Math.min(result.width, canvas.width - result.x));
      result.height = Math.max(0, Math.min(result.height, canvas.height - result.y));
    }

    return result;
  }

  private startAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    const animate = () => {
      this.dashOffset -= 0.5;
      if (this.dashOffset <= -this.options.dashLength * 2) {
        this.dashOffset = 0;
      }

      this.redrawSelections();
      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  private stopAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // Tool lifecycle methods
  public activate(): void {
    this.createOverlayCanvas();
    this.startAnimation();
  }

  public deactivate(): void {
    this.stopAnimation();
    this.clearSelections();

    if (this.overlayCanvas && this.overlayCanvas.parentNode) {
      this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
    }
    this.overlayCanvas = null;
    this.overlayContext = null;
  }

  public onMouseDown(point: Point, event: MouseEvent): void {
    const canvas = this.canvasManager.getCanvas();
    if (!canvas) return;

    this.startPoint = { x: this.snapToPixel(point.x), y: this.snapToPixel(point.y) };

    // Check if clicking on active selection
    if (this.activeSelection) {
      // Check for resize handle
      this.resizeHandle = this.getResizeHandle(point, this.activeSelection);
      if (this.resizeHandle) {
        this.isResizing = true;
        return;
      }

      // Check if clicking inside selection for dragging
      if (this.isPointInSelection(point, this.activeSelection)) {
        this.isDragging = true;
        this.dragOffset = {
          x: point.x - this.activeSelection.x,
          y: point.y - this.activeSelection.y,
        };
        return;
      }
    }

    // Start new selection (unless Ctrl is held for multiple selection)
    if (!event.ctrlKey && !event.metaKey) {
      this.clearSelections();
    }

    this.isDrawing = true;
    const newSelection: SelectionArea = {
      x: this.startPoint.x,
      y: this.startPoint.y,
      width: 0,
      height: 0,
    };

    this.selections.push(newSelection);
    this.activeSelection = newSelection;
  }

  public onMouseMove(point: Point, _event: MouseEvent): void {
    const currentPoint = { x: this.snapToPixel(point.x), y: this.snapToPixel(point.y) };

    if (this.isDrawing && this.activeSelection) {
      // Update selection size
      this.activeSelection.width = currentPoint.x - this.activeSelection.x;
      this.activeSelection.height = currentPoint.y - this.activeSelection.y; // Handle negative dimensions (dragging up or left)
      if (this.activeSelection.width < 0) {
        this.activeSelection.x = currentPoint.x;
        this.activeSelection.width = Math.abs(this.activeSelection.width);
      }
      if (this.activeSelection.height < 0) {
        this.activeSelection.y = currentPoint.y;
        this.activeSelection.height = Math.abs(this.activeSelection.height);
      }

      // Apply constraints (don't enforce min size during drawing)
      this.activeSelection = this.constrainToCanvas(this.activeSelection, false);
      this.redrawSelections();
    } else if (this.isDragging && this.activeSelection) {
      // Move selection
      this.activeSelection.x = currentPoint.x - this.dragOffset.x;
      this.activeSelection.y = currentPoint.y - this.dragOffset.y;

      this.activeSelection = this.constrainToCanvas(this.activeSelection, true);
      this.redrawSelections();
    } else if (this.isResizing && this.activeSelection && this.resizeHandle) {
      // Resize selection
      this.resizeSelection(this.activeSelection, this.resizeHandle, currentPoint);
      this.activeSelection = this.constrainToCanvas(this.activeSelection, true);
      this.redrawSelections();
    }
  }
  public onMouseUp(_point: Point, _event: MouseEvent): void {
    if (this.isDrawing && this.activeSelection) {
      // Finish creating selection
      if (
        this.activeSelection.width < this.options.minSize ||
        this.activeSelection.height < this.options.minSize
      ) {
        // Remove too small selections
        const indexToRemove = this.selections.findIndex(
          (s) =>
            s.x === this.activeSelection!.x &&
            s.y === this.activeSelection!.y &&
            s.width === this.activeSelection!.width &&
            s.height === this.activeSelection!.height,
        );
        if (indexToRemove >= 0) {
          this.selections.splice(indexToRemove, 1);
        }
        this.activeSelection = null;
      } else {
        this.editor.emit('tool:action', {
          toolName: this.name,
          action: 'created',
          data: { selection: this.activeSelection },
        });
      }
    }

    if (this.activeSelection) {
      this.editor.emit('tool:action', {
        toolName: this.name,
        action: 'changed',
        data: { selections: this.selections },
      });
    }

    this.isDrawing = false;
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = null;
  }

  private resizeSelection(selection: SelectionArea, handle: string, point: Point): void {
    const originalX = selection.x;
    const originalY = selection.y;
    const originalRight = selection.x + selection.width;
    const originalBottom = selection.y + selection.height;

    switch (handle) {
      case 'nw':
        selection.x = point.x;
        selection.y = point.y;
        selection.width = originalRight - point.x;
        selection.height = originalBottom - point.y;
        break;
      case 'n':
        selection.y = point.y;
        selection.height = originalBottom - point.y;
        break;
      case 'ne':
        selection.y = point.y;
        selection.width = point.x - originalX;
        selection.height = originalBottom - point.y;
        break;
      case 'e':
        selection.width = point.x - originalX;
        break;
      case 'se':
        selection.width = point.x - originalX;
        selection.height = point.y - originalY;
        break;
      case 's':
        selection.height = point.y - originalY;
        break;
      case 'sw':
        selection.x = point.x;
        selection.width = originalRight - point.x;
        selection.height = point.y - originalY;
        break;
      case 'w':
        selection.x = point.x;
        selection.width = originalRight - point.x;
        break;
    }

    // Ensure minimum size
    if (selection.width < this.options.minSize) {
      if (handle.includes('w')) {
        selection.x = originalRight - this.options.minSize;
      }
      selection.width = this.options.minSize;
    }
    if (selection.height < this.options.minSize) {
      if (handle.includes('n')) {
        selection.y = originalBottom - this.options.minSize;
      }
      selection.height = this.options.minSize;
    }
  }

  public onKeyDown(key: string, event: KeyboardEvent): void {
    switch (key) {
      case 'a':
      case 'A':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.selectAll();
        }
        break;
      case 'Escape':
        this.clearSelections();
        break;
      case 'Delete':
      case 'Backspace':
        if (this.activeSelection) {
          this.editor.emit('tool:action', {
            toolName: this.name,
            action: 'delete',
            data: { selection: this.activeSelection },
          });
        }
        break;
      case 'Enter':
        if (this.activeSelection) {
          this.editor.emit('tool:action', {
            toolName: this.name,
            action: 'apply',
            data: { selection: this.activeSelection },
          });
        }
        break;
    }
  }

  public cleanup(): void {
    this.stopAnimation();
    this.clearSelections();

    if (this.overlayCanvas && this.overlayCanvas.parentNode) {
      this.overlayCanvas.parentNode.removeChild(this.overlayCanvas);
    }
    this.overlayCanvas = null;
    this.overlayContext = null;
  }
}
