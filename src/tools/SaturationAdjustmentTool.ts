import { SaturationCommand } from '../commands/SaturationCommand';
import { CanvasManager } from '../core/CanvasManager';
import { ImageEditor } from '../core/ImageEditor';
import { Tool } from '../interfaces/Tool';
import { Point } from '../types';

/**
 * Tool for adjusting image saturation with real-time preview
 */
export class SaturationAdjustmentTool implements Tool {
  public readonly id = 'saturation';
  public readonly name = 'Saturation Adjustment';
  public readonly icon = '🎨';

  private editor: ImageEditor;
  private canvasManager: CanvasManager;
  private isActive = false;
  private originalImageData: ImageData | null = null;
  private currentSaturation = 0;
  private previewEnabled = false;

  constructor(editor: ImageEditor) {
    this.editor = editor;
    this.canvasManager = editor.getCanvasManager();
  }

  activate(): void {
    this.isActive = true;

    // Store original image data for preview
    const canvas = this.canvasManager.getCanvas();
    const ctx = this.canvasManager.getContext();

    if (canvas && ctx) {
      this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    // Emit activation event
    this.editor.getEventEmitter().emit('tool:activated', {
      toolId: this.id,
      toolName: this.name,
    });

    // Emit properties changed event to update UI
    this.editor.getEventEmitter().emit('tool:propertiesChanged', {
      toolId: this.id,
      properties: this.getToolProperties(),
    });
  }

  deactivate(): void {
    this.isActive = false;
    this.restoreOriginal();
    this.originalImageData = null;
    this.currentSaturation = 0;
    this.previewEnabled = false;
  }

  getToolProperties() {
    return {
      saturation: {
        type: 'range',
        label: 'Saturation',
        value: this.currentSaturation,
        min: -100,
        max: 100,
        step: 1,
      },
      preview: {
        type: 'boolean',
        label: 'Real-time Preview',
        value: this.previewEnabled,
      },
      actions: {
        type: 'actions',
        buttons: [
          { id: 'reset', label: 'Reset', style: 'secondary' },
          { id: 'apply', label: 'Apply', style: 'primary' },
        ],
      },
    };
  }

  onPropertyChanged(property: string, value: any): void {
    switch (property) {
      case 'saturation':
        this.currentSaturation = value;
        if (this.previewEnabled) {
          this.showPreview();
        }
        break;
      case 'preview':
        this.previewEnabled = value;
        if (this.previewEnabled) {
          this.showPreview();
        } else {
          this.restoreOriginal();
        }
        break;
      case 'reset':
        this.onReset();
        break;
      case 'apply':
        this.onApply();
        break;
    }
  }

  private onReset(): void {
    this.currentSaturation = 0;
    this.restoreOriginal();

    // Update UI
    this.editor.getEventEmitter().emit('tool:propertiesChanged', {
      toolId: this.id,
      properties: this.getToolProperties(),
    });
  }

  private onApply(): void {
    if (this.currentSaturation !== 0) {
      this.applySaturation(this.currentSaturation, true);
      this.onReset();
    }
  }

  private showPreview(): void {
    if (!this.originalImageData) return;

    const ctx = this.canvasManager.getContext();

    // Restore original and apply saturation
    ctx.putImageData(this.originalImageData, 0, 0);

    if (this.currentSaturation !== 0) {
      const currentImageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      const adjustedImageData = this.applySaturationToImageData(
        currentImageData,
        this.currentSaturation,
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

  private async applySaturation(saturation: number, createCommand: boolean): Promise<void> {
    if (createCommand) {
      // Create and execute saturation command for undo/redo
      const command = new SaturationCommand(this.editor, saturation);
      await this.editor.getHistoryManager().executeCommand(command);
    } else {
      // Just apply the saturation without creating a command
      const ctx = this.canvasManager.getContext();
      const currentImageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      const adjustedImageData = this.applySaturationToImageData(currentImageData, saturation);
      ctx.putImageData(adjustedImageData, 0, 0);
    }
  }

  private applySaturationToImageData(imageData: ImageData, saturation: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);

    // Convert saturation value (-100 to 100) to a factor
    // -100 = 0 factor (grayscale), 0 = 1 factor (no change), 100 = 2 factor (high saturation)
    const factor =
      saturation >= 0
        ? 1 + saturation / 100 // 0 to 100 -> 1 to 2
        : (100 + saturation) / 100; // -100 to 0 -> 0 to 1

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      const red = data[i]!;
      const green = data[i + 1]!;
      const blue = data[i + 2]!;

      // Convert RGB to HSL
      const hsl = this.rgbToHsl(red, green, blue);

      // Adjust saturation
      hsl.s = Math.max(0, Math.min(1, hsl.s * factor));

      // Convert back to RGB
      const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);

      data[i] = Math.max(0, Math.min(255, Math.round(rgb.r))); // Red
      data[i + 1] = Math.max(0, Math.min(255, Math.round(rgb.g))); // Green
      data[i + 2] = Math.max(0, Math.min(255, Math.round(rgb.b))); // Blue
      // Alpha channel (i + 3) remains unchanged
    }

    return new ImageData(data, imageData.width, imageData.height);
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h, s, l };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: r * 255,
      g: g * 255,
      b: b * 255,
    };
  }

  // Tool interface methods (not used for this tool)
  public onMouseDown?(_point: Point, _event: MouseEvent): void {}
  public onMouseMove?(_point: Point, _event: MouseEvent): void {}
  public onMouseUp?(_point: Point, _event: MouseEvent): void {}
  public onKeyDown?(_key: string, _event: KeyboardEvent): void {}
  public onKeyUp?(_key: string, _event: KeyboardEvent): void {}
}
