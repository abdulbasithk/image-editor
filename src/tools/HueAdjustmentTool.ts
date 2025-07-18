import { Tool } from '../interfaces/Tool';
import { ImageEditor } from '../core/ImageEditor';
import { CanvasManager } from '../core/CanvasManager';
import { EventEmitter } from '../core/EventEmitter';
import { HueCommand } from '../commands/HueCommand';

/**
 * Tool for adjusting image hue with real-time preview
 */
export class HueAdjustmentTool implements Tool {
  readonly id = 'hue';
  readonly name = 'Hue Adjustment';
  readonly category = 'adjustment';

  private editor: ImageEditor;
  private canvasManager: CanvasManager;
  private eventEmitter: EventEmitter;

  private currentHue: number = 0; // -180 to 180 degrees
  private originalImageData: ImageData | null = null;
  private isPreviewMode: boolean = false;

  constructor(editor: ImageEditor) {
    this.editor = editor;
    this.canvasManager = editor.getCanvasManager();
    this.eventEmitter = editor.getEventEmitter();
  }

  activate(): void {
    // Store original image data for preview
    const canvas = this.canvasManager.getCanvas();
    const ctx = this.canvasManager.getContext();

    if (canvas && ctx) {
      this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    // Emit tool activation event
    this.eventEmitter.emit('tool:activated', {
      toolId: this.id,
      toolName: this.name,
    });

    // Emit initial properties
    this.eventEmitter.emit('tool:propertiesChanged', {
      toolId: this.id,
      properties: this.getToolProperties(),
    });
  }

  deactivate(): void {
    // Restore original image if in preview mode
    if (this.isPreviewMode && this.originalImageData) {
      const ctx = this.canvasManager.getContext();
      ctx.putImageData(this.originalImageData, 0, 0);
    }

    // Reset state
    this.currentHue = 0;
    this.originalImageData = null;
    this.isPreviewMode = false;

    // Emit tool deactivation event
    this.eventEmitter.emit('tool:deactivated', {
      toolId: this.id,
    });
  }

  getToolProperties() {
    return {
      hue: {
        type: 'slider',
        label: 'Hue',
        value: this.currentHue,
        min: -180,
        max: 180,
        step: 1,
        unit: '°',
      },
      preview: {
        type: 'checkbox',
        label: 'Preview',
        value: this.isPreviewMode,
      },
      reset: {
        type: 'button',
        label: 'Reset',
      },
      apply: {
        type: 'button',
        label: 'Apply',
      },
    };
  }

  onPropertyChanged(property: string, value: any): void {
    switch (property) {
      case 'hue':
        this.currentHue = value;
        if (this.isPreviewMode) {
          this.showPreview();
        }
        break;
      case 'preview':
        this.isPreviewMode = value;
        if (this.isPreviewMode) {
          this.showPreview();
        } else {
          this.hidePreview();
        }
        break;
      case 'reset':
        this.onReset();
        break;
      case 'apply':
        this.onApply();
        break;
    }

    // Emit properties changed event
    this.eventEmitter.emit('tool:propertiesChanged', {
      toolId: this.id,
      properties: this.getToolProperties(),
    });
  }

  private onReset(): void {
    this.currentHue = 0;
    if (this.originalImageData) {
      const ctx = this.canvasManager.getContext();
      ctx.putImageData(this.originalImageData, 0, 0);
    }
  }

  private onApply(): void {
    if (this.currentHue !== 0) {
      this.applyHue(this.currentHue, true);
      this.onReset();
    }
  }

  private showPreview(): void {
    if (!this.originalImageData) return;

    const ctx = this.canvasManager.getContext();
    if (this.currentHue === 0) {
      // If hue is 0, just restore original
      ctx.putImageData(this.originalImageData, 0, 0);
    } else {
      // Apply hue adjustment for preview
      const adjustedImageData = this.applyHueToImageData(this.originalImageData, this.currentHue);
      ctx.putImageData(adjustedImageData, 0, 0);
    }
  }

  private hidePreview(): void {
    if (this.originalImageData) {
      const ctx = this.canvasManager.getContext();
      ctx.putImageData(this.originalImageData, 0, 0);
    }
  }

  private async applyHue(hue: number, createCommand: boolean): Promise<void> {
    if (createCommand) {
      // Create and execute hue command for undo/redo
      const command = new HueCommand(this.editor, hue);
      await this.editor.getHistoryManager().executeCommand(command);
    } else {
      // Just apply the hue without creating a command
      const ctx = this.canvasManager.getContext();
      const currentImageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      const adjustedImageData = this.applyHueToImageData(currentImageData, hue);
      ctx.putImageData(adjustedImageData, 0, 0);
    }
  }

  private applyHueToImageData(imageData: ImageData, hueShift: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);

    // Convert degrees to 0-1 range for HSL calculation
    const hueShiftNormalized = hueShift / 360;

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      const red = data[i]!;
      const green = data[i + 1]!;
      const blue = data[i + 2]!;

      // Convert RGB to HSL
      const hsl = this.rgbToHsl(red, green, blue);

      // Adjust hue (wrap around 0-1)
      hsl.h = (hsl.h + hueShiftNormalized) % 1;
      if (hsl.h < 0) hsl.h += 1;

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

  // Optional Tool interface methods
  onMouseDown?: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
  onMouseUp?: (event: MouseEvent) => void;
  onKeyDown?: (key: string, event: KeyboardEvent) => void;
  onKeyUp?: (key: string, event: KeyboardEvent) => void;
}
