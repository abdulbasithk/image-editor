import { BrightnessCommand } from '../commands/BrightnessCommand';
import { CanvasManager } from '../core/CanvasManager';
import { ImageEditor } from '../core/ImageEditor';
import { Tool } from '../interfaces/Tool';
import { Point } from '../types';
import { ToolProperties } from '../ui/PropertiesPanel';

/**
 * Tool for brightness adjustment with real-time preview
 */
export class BrightnessAdjustmentTool implements Tool {
  public readonly id: string = 'brightness';
  public readonly name: string = 'Brightness Adjustment';
  public readonly category: string = 'Adjustments';
  public readonly icon: string = '☀️';
  public readonly cursor: string = 'default';
  public readonly shortcut: string = 'B';

  private editor: ImageEditor;
  private canvasManager: CanvasManager;
  private currentBrightness: number = 0;
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
    this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

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
    // Apply final brightness if in preview mode
    if (this.isPreviewMode && this.currentBrightness !== 0) {
      this.applyBrightness(this.currentBrightness, false);
    }

    // Reset state
    this.originalImageData = null;
    this.isPreviewMode = false;
    this.currentBrightness = 0;

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
          id: 'brightness-adjustment',
          title: 'Brightness',
          icon: '☀️',
          controls: [
            {
              id: 'brightness',
              type: 'slider',
              label: 'Brightness',
              value: this.currentBrightness,
              min: -100,
              max: 100,
              step: 1,
              tooltip: 'Adjust image brightness (-100 to +100)',
            },
            {
              id: 'preview',
              type: 'checkbox',
              label: 'Real-time Preview',
              value: this.isPreviewMode,
              tooltip: 'Enable real-time preview of brightness changes',
            },
            {
              id: 'reset',
              type: 'button',
              label: 'Reset',
              tooltip: 'Reset brightness to 0',
            },
            {
              id: 'apply',
              type: 'button',
              label: 'Apply',
              tooltip: 'Apply brightness adjustment permanently',
            },
          ],
        },
      ],
    };
  }

  public onPropertyChanged(controlId: string, value: any): void {
    switch (controlId) {
      case 'brightness':
        this.onBrightnessChanged(value);
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

  private onBrightnessChanged(value: number): void {
    this.currentBrightness = value;

    if (this.isPreviewMode) {
      this.showPreview();
    }

    // Emit brightness change event
    this.editor.getEventEmitter().emit('brightness:changed', {
      value: this.currentBrightness,
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
    this.currentBrightness = 0;
    this.restoreOriginal();

    // Update UI
    this.editor.getEventEmitter().emit('tool:propertiesChanged', {
      toolId: this.id,
      properties: this.getToolProperties(),
    });
  }

  private onApply(): void {
    if (this.currentBrightness !== 0) {
      this.applyBrightness(this.currentBrightness, true);
      this.onReset();
    }
  }

  private showPreview(): void {
    if (!this.originalImageData) return;

    const ctx = this.canvasManager.getContext();

    // Restore original and apply brightness
    ctx.putImageData(this.originalImageData, 0, 0);

    if (this.currentBrightness !== 0) {
      const currentImageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      const adjustedImageData = this.applyBrightnessToImageData(
        currentImageData,
        this.currentBrightness,
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

  private async applyBrightness(brightness: number, createCommand: boolean): Promise<void> {
    if (createCommand) {
      // Create and execute brightness command for undo/redo
      const command = new BrightnessCommand(this.editor, brightness, 0);
      await this.editor.getHistoryManager().executeCommand(command);
    } else {
      // Just apply the brightness without creating a command
      const ctx = this.canvasManager.getContext();
      const currentImageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      const adjustedImageData = this.applyBrightnessToImageData(currentImageData, brightness);
      ctx.putImageData(adjustedImageData, 0, 0);
    }
  }

  private applyBrightnessToImageData(imageData: ImageData, brightness: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const adjustmentValue = (brightness / 100) * 255;

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      // Apply brightness to RGB channels (skip alpha channel at i+3)
      const red = data[i]!;
      const green = data[i + 1]!;
      const blue = data[i + 2]!;

      data[i] = Math.max(0, Math.min(255, red + adjustmentValue)); // Red
      data[i + 1] = Math.max(0, Math.min(255, green + adjustmentValue)); // Green
      data[i + 2] = Math.max(0, Math.min(255, blue + adjustmentValue)); // Blue
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
