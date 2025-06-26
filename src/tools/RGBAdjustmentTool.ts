import { RGBCommand } from '../commands/RGBCommand';
import { CanvasManager } from '../core/CanvasManager';
import { ImageEditor } from '../core/ImageEditor';
import { Tool } from '../interfaces/Tool';
import { Point } from '../types';
import { ToolProperties } from '../ui/PropertiesPanel';

/**
 * Tool for RGB channel adjustments with real-time preview
 */
export class RGBAdjustmentTool implements Tool {
  public readonly id: string = 'rgb-adjustment';
  public readonly name: string = 'RGB Channel Adjustment';
  public readonly category: string = 'Adjustments';
  public readonly icon: string = '🎨';
  public readonly cursor: string = 'default';
  public readonly shortcut: string = 'R';

  private editor: ImageEditor;
  private canvasManager: CanvasManager;
  private currentRed: number = 0;
  private currentGreen: number = 0;
  private currentBlue: number = 0;
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
    // Apply final RGB adjustments if in preview mode
    if (
      this.isPreviewMode &&
      (this.currentRed !== 0 || this.currentGreen !== 0 || this.currentBlue !== 0)
    ) {
      this.applyRGBAdjustments(this.currentRed, this.currentGreen, this.currentBlue, false);
    }

    // Reset state
    this.originalImageData = null;
    this.isPreviewMode = false;
    this.currentRed = 0;
    this.currentGreen = 0;
    this.currentBlue = 0;

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
          id: 'rgb-adjustment',
          title: 'RGB Channels',
          icon: '🎨',
          controls: [
            {
              id: 'red',
              type: 'slider',
              label: 'Red Channel',
              value: this.currentRed,
              min: -100,
              max: 100,
              step: 1,
              tooltip: 'Adjust red channel intensity (-100 to +100)',
            },
            {
              id: 'green',
              type: 'slider',
              label: 'Green Channel',
              value: this.currentGreen,
              min: -100,
              max: 100,
              step: 1,
              tooltip: 'Adjust green channel intensity (-100 to +100)',
            },
            {
              id: 'blue',
              type: 'slider',
              label: 'Blue Channel',
              value: this.currentBlue,
              min: -100,
              max: 100,
              step: 1,
              tooltip: 'Adjust blue channel intensity (-100 to +100)',
            },
            {
              id: 'preview',
              type: 'checkbox',
              label: 'Real-time Preview',
              value: this.isPreviewMode,
              tooltip: 'Enable real-time preview of RGB channel changes',
            },
            {
              id: 'reset',
              type: 'button',
              label: 'Reset',
              tooltip: 'Reset all RGB channels to 0',
            },
            {
              id: 'apply',
              type: 'button',
              label: 'Apply',
              tooltip: 'Apply RGB channel adjustments permanently',
            },
          ],
        },
      ],
    };
  }

  public onPropertyChanged(controlId: string, value: any): void {
    switch (controlId) {
      case 'red':
        this.onRedChanged(value);
        break;
      case 'green':
        this.onGreenChanged(value);
        break;
      case 'blue':
        this.onBlueChanged(value);
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

  private onRedChanged(value: number): void {
    this.currentRed = value;
    this.updatePreview();

    // Emit red channel change event
    this.editor.getEventEmitter().emit('rgb:redChanged', {
      value: this.currentRed,
    });
  }

  private onGreenChanged(value: number): void {
    this.currentGreen = value;
    this.updatePreview();

    // Emit green channel change event
    this.editor.getEventEmitter().emit('rgb:greenChanged', {
      value: this.currentGreen,
    });
  }

  private onBlueChanged(value: number): void {
    this.currentBlue = value;
    this.updatePreview();

    // Emit blue channel change event
    this.editor.getEventEmitter().emit('rgb:blueChanged', {
      value: this.currentBlue,
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
    this.currentRed = 0;
    this.currentGreen = 0;
    this.currentBlue = 0;
    this.restoreOriginal();

    // Update UI
    this.editor.getEventEmitter().emit('tool:propertiesChanged', {
      toolId: this.id,
      properties: this.getToolProperties(),
    });
  }

  private onApply(): void {
    if (this.currentRed !== 0 || this.currentGreen !== 0 || this.currentBlue !== 0) {
      this.applyRGBAdjustments(this.currentRed, this.currentGreen, this.currentBlue, true);
      this.onReset();
    }
  }

  private updatePreview(): void {
    if (this.isPreviewMode) {
      this.showPreview();
    }
  }

  private showPreview(): void {
    if (!this.originalImageData) return;

    const ctx = this.canvasManager.getContext();
    const canvas = this.canvasManager.getCanvas();

    // Restore original and apply RGB adjustments
    ctx.putImageData(this.originalImageData, 0, 0);

    if (this.currentRed !== 0 || this.currentGreen !== 0 || this.currentBlue !== 0) {
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const adjustedImageData = this.applyRGBAdjustmentsToImageData(
        currentImageData,
        this.currentRed,
        this.currentGreen,
        this.currentBlue,
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

  private async applyRGBAdjustments(
    red: number,
    green: number,
    blue: number,
    createCommand: boolean,
  ): Promise<void> {
    if (createCommand) {
      // Create and execute RGB command for undo/redo
      const command = new RGBCommand(this.editor, red, green, blue);
      await this.editor.getHistoryManager().executeCommand(command);
    } else {
      // Just apply the RGB adjustments without creating a command
      const ctx = this.canvasManager.getContext();
      const canvas = this.canvasManager.getCanvas();
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const adjustedImageData = this.applyRGBAdjustmentsToImageData(
        currentImageData,
        red,
        green,
        blue,
      );
      ctx.putImageData(adjustedImageData, 0, 0);
    }
  }

  private applyRGBAdjustmentsToImageData(
    imageData: ImageData,
    red: number,
    green: number,
    blue: number,
  ): ImageData {
    const data = new Uint8ClampedArray(imageData.data);

    // Convert percentage adjustments to actual values
    const redValue = (red / 100) * 255;
    const greenValue = (green / 100) * 255;
    const blueValue = (blue / 100) * 255;

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      // Apply adjustments to each channel independently
      data[i] = Math.max(0, Math.min(255, data[i]! + redValue)); // Red
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1]! + greenValue)); // Green
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2]! + blueValue)); // Blue
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
