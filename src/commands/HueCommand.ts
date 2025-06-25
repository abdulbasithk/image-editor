import { BaseCommand } from '../core/BaseCommand';
import { ImageEditor } from '../core/ImageEditor';

/**
 * Command for adjusting image hue
 */
export class HueCommand extends BaseCommand {
  private originalImageData: ImageData | null = null;
  private hueShift: number;
  private canvasX: number;
  private canvasY: number;

  constructor(editor: ImageEditor, hueShift: number, timestamp?: string) {
    const commandName =
      hueShift > 0 ? `Hue +${hueShift}°` : hueShift < 0 ? `Hue ${hueShift}°` : 'Hue 0°';

    super(editor, commandName, timestamp);
    this.hueShift = hueShift;
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

    // Apply hue adjustment
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const adjustedImageData = this.applyHueToImageData(currentImageData, this.hueShift);
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
}
