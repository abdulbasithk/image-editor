import { ContrastCommand } from '../commands/ContrastCommand';
import { CanvasManager } from '../core/CanvasManager';
import { ImageEditor } from '../core/ImageEditor';
import { Tool } from '../interfaces/Tool';
import { Point } from '../types';
import { ToolProperties } from '../ui/PropertiesPanel';

/**
 * Tool for contrast adjustment with real-time preview
 */
export class ContrastAdjustmentTool implements Tool {
  public readonly id: string = 'contrast';
  public readonly name: string = 'Contrast Adjustment';
  public readonly category: string = 'Adjustments';
  public readonly icon: string = '◑';
  public readonly cursor: string = 'default';
  public readonly shortcut: string = 'C';

  private editor: ImageEditor;
  private canvasManager: CanvasManager;
  private currentContrast: number = 0;
  private originalImageData: ImageData | null = null;
  private isPreviewMode: boolean = false;

  constructor(editor: ImageEditor, canvasManager: CanvasManager) {
    this.editor = editor;
    this.canvasManager = canvasManager;
  }

  public activate(): void {
    // Store original image data for preview
    const canvas = this.canvasManager.getCanvas();
    const ctx = this.canvasManager.getContext();

    if (canvas && ctx) {
      this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    // Emit tool activation
    this.editor.getEventEmitter().emit('tool:activated', {
      toolId: this.id,
      toolName: this.name,
    });

    // Emit tool properties
    this.editor.getEventEmitter().emit('tool:propertiesChanged', {
      toolId: this.id,
      properties: this.getToolProperties(),
    });
  }

  public deactivate(): void {
    // Apply final contrast if in preview mode
    if (this.isPreviewMode && this.currentContrast !== 0) {
      this.applyContrast(this.currentContrast, false);
    }

    // Reset state
    this.originalImageData = null;
    this.isPreviewMode = false;
    this.currentContrast = 0;

    this.editor.getEventEmitter().emit('tool:deactivated', {
      toolId: this.id,
    });
  }

  public getToolProperties(): ToolProperties {
    return {
      toolId: this.id,
      toolName: this.name,
      groups: [
        {
          id: 'contrast-adjustment',
          title: 'Contrast',
          icon: '◑',
          controls: [
            {
              id: 'contrast',
              type: 'slider',
              label: 'Contrast',
              value: this.currentContrast,
              min: -100,
              max: 100,
              step: 1,
              tooltip: 'Adjust image contrast (-100 to +100)',
            },
            {
              id: 'preview',
              type: 'checkbox',
              label: 'Real-time Preview',
              value: this.isPreviewMode,
              tooltip: 'Enable real-time preview of contrast changes',
            },
            {
              id: 'reset',
              type: 'button',
              label: 'Reset',
              tooltip: 'Reset contrast to 0',
            },
            {
              id: 'apply',
              type: 'button',
              label: 'Apply',
              tooltip: 'Apply contrast adjustment permanently',
            },
          ],
        },
      ],
    };
  }

  public onPropertyChanged(controlId: string, value: any): void {
    switch (controlId) {
      case 'contrast':
        this.onContrastChanged(value);
        break;
      case 'preview':
        this.onPreviewModeChanged(value);
        break;
      case 'reset':
        this.onReset();
        break;
      case 'apply':
        this.onApply();
        break;
    }
  }

  private onContrastChanged(value: number): void {
    this.currentContrast = value;

    if (this.isPreviewMode) {
      this.showPreview();
    }

    // Emit contrast change event
    this.editor.getEventEmitter().emit('contrast:changed', {
      value: this.currentContrast,
    });
  }

  private onPreviewModeChanged(enabled: boolean): void {
    this.isPreviewMode = enabled;

    if (enabled) {
      this.showPreview();
    } else {
      this.restoreOriginal();
    }
  }

  private onReset(): void {
    this.currentContrast = 0;
    this.restoreOriginal();

    // Update UI
    this.editor.getEventEmitter().emit('tool:propertiesChanged', {
      toolId: this.id,
      properties: this.getToolProperties(),
    });
  }

  private onApply(): void {
    if (this.currentContrast !== 0) {
      this.applyContrast(this.currentContrast, true);
      this.onReset();
    }
  }

  private showPreview(): void {
    if (!this.originalImageData) return;

    const ctx = this.canvasManager.getContext();

    // Restore original and apply contrast
    ctx.putImageData(this.originalImageData, 0, 0);

    if (this.currentContrast !== 0) {
      const currentImageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      const adjustedImageData = this.applyContrastToImageData(
        currentImageData,
        this.currentContrast,
      );
      ctx.putImageData(adjustedImageData, 0, 0);
    }
  }

  private restoreOriginal(): void {
    if (this.originalImageData) {
      const ctx = this.canvasManager.getContext();
      ctx.putImageData(this.originalImageData, 0, 0);
    }
  }

  private async applyContrast(contrast: number, createCommand: boolean): Promise<void> {
    if (createCommand) {
      // Create and execute contrast command for undo/redo
      const command = new ContrastCommand(this.editor, contrast, 0);
      await this.editor.getHistoryManager().executeCommand(command);
    } else {
      // Just apply the contrast without creating a command
      const ctx = this.canvasManager.getContext();
      const currentImageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      const adjustedImageData = this.applyContrastToImageData(currentImageData, contrast);
      ctx.putImageData(adjustedImageData, 0, 0);
    }
  }

  private applyContrastToImageData(imageData: ImageData, contrast: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);

    // Convert contrast value (-100 to 100) to a factor
    // -100 = 0 factor (no contrast), 0 = 1 factor (no change), 100 = 2 factor (high contrast)
    const factor =
      contrast >= 0
        ? 1 + contrast / 100 // 0 to 100 -> 1 to 2
        : (100 + contrast) / 100; // -100 to 0 -> 0 to 1

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      // Apply contrast to RGB channels (skip alpha channel at i+3)
      const red = data[i]!;
      const green = data[i + 1]!;
      const blue = data[i + 2]!;

      data[i] = Math.max(0, Math.min(255, factor * (red - 128) + 128)); // Red
      data[i + 1] = Math.max(0, Math.min(255, factor * (green - 128) + 128)); // Green
      data[i + 2] = Math.max(0, Math.min(255, factor * (blue - 128) + 128)); // Blue
      // Alpha channel (i + 3) remains unchanged
    }

    return new ImageData(data, imageData.width, imageData.height);
  }

  // Tool interface methods (not used for this tool)
  public onMouseDown?(_point: Point, _event: MouseEvent): void {}
  public onMouseMove?(_point: Point, _event: MouseEvent): void {}
  public onMouseUp?(_point: Point, _event: MouseEvent): void {}
  public onKeyDown?(_key: string, _event: KeyboardEvent): void {}
  public onKeyUp?(_key: string, _event: KeyboardEvent): void {}
}
