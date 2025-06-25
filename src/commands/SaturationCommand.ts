import { BaseCommand } from '../core/BaseCommand';
import { ImageEditor } from '../core/ImageEditor';

/**
 * Command for adjusting image saturation
 */
export class SaturationCommand extends BaseCommand {
  private originalImageData: ImageData | null = null;
  private saturation: number;
  private canvasX: number;
  private canvasY: number;

  constructor(editor: ImageEditor, saturation: number, timestamp?: string) {
    const commandName =
      saturation > 0
        ? `Saturation +${saturation}`
        : saturation < 0
          ? `Saturation ${saturation}`
          : 'Saturation 0';

    super(editor, commandName, timestamp);
    this.saturation = saturation;
    this.canvasX = 0;
    this.canvasY = 0;
  }

  async execute(): Promise<void> {
    const canvasManager = this.editor.getCanvasManager();
    const canvas = canvasManager.getCanvas();
    const ctx = canvasManager.getContext();

    if (!canvas || !ctx) {
      throw new Error('Canvas not available');
    }

    // Capture current image data for undo
    this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.canvasX = 0;
    this.canvasY = 0;

    // Apply saturation adjustment
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const adjustedImageData = this.applySaturationToImageData(currentImageData, this.saturation);
    ctx.putImageData(adjustedImageData, this.canvasX, this.canvasY);
  }

  async undo(): Promise<void> {
    if (!this.originalImageData) {
      throw new Error('No original image data to restore');
    }

    const canvasManager = this.editor.getCanvasManager();
    const ctx = canvasManager.getContext();
    ctx.putImageData(this.originalImageData, this.canvasX, this.canvasY);
  }

  override getMemoryUsage(): number {
    // Base command overhead plus image data
    let memory = 200; // Base overhead
    if (this.originalImageData) {
      memory += this.originalImageData.data.length * 4; // 4 bytes per pixel (RGBA)
    }
    return memory;
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
}
