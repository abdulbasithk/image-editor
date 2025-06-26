import { BaseCommand } from '../core/BaseCommand';
import { ImageEditor } from '../core/ImageEditor';

/**
 * Auto-enhance analysis results
 */
export interface AutoEnhanceAnalysis {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}

/**
 * Command for automatic image enhancement
 */
export class AutoEnhanceCommand extends BaseCommand {
  private imageDataBefore: ImageData | null = null;
  private imageDataAfter: ImageData | null = null;
  private enhanceAnalysis: AutoEnhanceAnalysis;

  constructor(editor: ImageEditor, enhanceAnalysis?: AutoEnhanceAnalysis) {
    super(editor, 'Auto Enhance');
    this.enhanceAnalysis = enhanceAnalysis || this.analyzeImage();
  }

  public override async execute(): Promise<void> {
    const canvas = this.editor.getCanvasManager().getCanvas();
    const ctx = this.editor.getCanvasManager().getContext();

    // Capture state before enhancement
    this.imageDataBefore = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // If no analysis provided, analyze the current image
    if (!this.enhanceAnalysis) {
      this.enhanceAnalysis = this.analyzeImage();
    }

    // Apply auto-enhancement
    const enhancedImageData = this.applyAutoEnhancement(this.imageDataBefore, this.enhanceAnalysis);
    ctx.putImageData(enhancedImageData, 0, 0);

    // Capture state after enhancement
    this.imageDataAfter = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  public override async undo(): Promise<void> {
    if (this.imageDataBefore) {
      const ctx = this.editor.getCanvasManager().getContext();
      ctx.putImageData(this.imageDataBefore, 0, 0);
    }
  }

  public override getMemoryUsage(): number {
    let totalMemory = 0;

    if (this.imageDataBefore) {
      totalMemory += this.imageDataBefore.data.length;
    }

    if (this.imageDataAfter) {
      totalMemory += this.imageDataAfter.data.length;
    }

    // Add base memory for analysis object
    totalMemory += 128; // Estimated memory for analysis object

    return totalMemory;
  }

  /**
   * Get the analysis results used for enhancement
   */
  public getAnalysis(): AutoEnhanceAnalysis {
    return this.enhanceAnalysis;
  }

  /**
   * Analyze the image and determine optimal enhancement values
   */
  private analyzeImage(): AutoEnhanceAnalysis {
    const canvas = this.editor.getCanvasManager().getCanvas();
    const ctx = this.editor.getCanvasManager().getContext();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return this.calculateOptimalAdjustments(imageData);
  }

  /**
   * Calculate optimal brightness, contrast, saturation, and hue adjustments
   */
  private calculateOptimalAdjustments(imageData: ImageData): AutoEnhanceAnalysis {
    const data = imageData.data;
    const pixelCount = data.length / 4;

    // Initialize statistics
    let totalLuminance = 0;
    let totalRed = 0;
    let totalGreen = 0;
    let totalBlue = 0;
    let minLuminance = 255;
    let maxLuminance = 0;

    // Calculate basic statistics
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      // Calculate luminance (perceived brightness)
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += luminance;
      minLuminance = Math.min(minLuminance, luminance);
      maxLuminance = Math.max(maxLuminance, luminance);

      totalRed += r;
      totalGreen += g;
      totalBlue += b;
    }

    // Calculate averages
    const avgLuminance = totalLuminance / pixelCount;
    const avgRed = totalRed / pixelCount;
    const avgGreen = totalGreen / pixelCount;
    const avgBlue = totalBlue / pixelCount;

    // Calculate optimal adjustments
    const brightness = this.calculateOptimalBrightness(avgLuminance, minLuminance, maxLuminance);
    const contrast = this.calculateOptimalContrast(minLuminance, maxLuminance);
    const saturation = this.calculateOptimalSaturation(avgRed, avgGreen, avgBlue);
    const hue = this.calculateOptimalHue(avgRed, avgGreen, avgBlue);

    return {
      brightness,
      contrast,
      saturation,
      hue,
    };
  }

  /**
   * Calculate optimal brightness adjustment
   */
  private calculateOptimalBrightness(
    avgLuminance: number,
    minLuminance: number,
    maxLuminance: number,
  ): number {
    const targetLuminance = 127.5; // Target middle gray
    const currentLuminance = avgLuminance;

    // Calculate brightness adjustment to move average closer to target
    let brightnessAdjustment = ((targetLuminance - currentLuminance) / 255) * 50;

    // Prevent extreme adjustments that would clip
    const headroom = 255 - maxLuminance;
    const shadowRoom = minLuminance;

    if (brightnessAdjustment > 0) {
      // Brightening - ensure we don't clip highlights
      brightnessAdjustment = Math.min(brightnessAdjustment, (headroom / 255) * 40);
    } else {
      // Darkening - ensure we don't clip shadows
      brightnessAdjustment = Math.max(brightnessAdjustment, -(shadowRoom / 255) * 40);
    }

    // Limit to reasonable range
    return Math.max(-30, Math.min(30, brightnessAdjustment));
  }

  /**
   * Calculate optimal contrast adjustment
   */
  private calculateOptimalContrast(minLuminance: number, maxLuminance: number): number {
    const currentRange = maxLuminance - minLuminance;
    const optimalRange = 200; // Target range for good contrast

    if (currentRange < optimalRange * 0.6) {
      // Low contrast - increase it
      const contrastIncrease = ((optimalRange - currentRange) / optimalRange) * 25;
      return Math.min(25, contrastIncrease);
    } else if (currentRange > optimalRange * 1.2) {
      // High contrast - reduce it slightly
      const contrastDecrease = ((currentRange - optimalRange) / optimalRange) * -10;
      return Math.max(-15, contrastDecrease);
    }

    return 0; // Contrast is already good
  }

  /**
   * Calculate optimal saturation adjustment
   */
  private calculateOptimalSaturation(avgRed: number, avgGreen: number, avgBlue: number): number {
    // Calculate current saturation level
    const max = Math.max(avgRed, avgGreen, avgBlue);
    const min = Math.min(avgRed, avgGreen, avgBlue);
    const currentSaturation = max > 0 ? (max - min) / max : 0;

    const targetSaturation = 0.4; // Target saturation level

    if (currentSaturation < targetSaturation * 0.7) {
      // Low saturation - boost it
      const saturationBoost = ((targetSaturation - currentSaturation) / targetSaturation) * 20;
      return Math.min(25, saturationBoost);
    } else if (currentSaturation > targetSaturation * 1.3) {
      // Over-saturated - reduce it
      const saturationReduction =
        ((currentSaturation - targetSaturation) / currentSaturation) * -15;
      return Math.max(-20, saturationReduction);
    }

    return 0; // Saturation is already good
  }

  /**
   * Calculate optimal hue adjustment
   */
  private calculateOptimalHue(avgRed: number, avgGreen: number, avgBlue: number): number {
    // Calculate color temperature and apply subtle warm/cool correction
    const warmness = (avgRed - avgBlue) / 255;

    if (warmness < -0.1) {
      // Too cool/blue - add warmth
      return Math.min(10, Math.abs(warmness) * 20);
    } else if (warmness > 0.1) {
      // Too warm/red - add coolness
      return Math.max(-10, -warmness * 20);
    }

    return 0; // Color temperature is balanced
  }

  /**
   * Apply auto-enhancement to image data
   */
  private applyAutoEnhancement(imageData: ImageData, analysis: AutoEnhanceAnalysis): ImageData {
    let enhancedData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height,
    );

    // Apply adjustments in order: brightness -> contrast -> saturation -> hue
    if (analysis.brightness !== 0) {
      enhancedData = this.applyBrightness(enhancedData, analysis.brightness);
    }

    if (analysis.contrast !== 0) {
      enhancedData = this.applyContrast(enhancedData, analysis.contrast);
    }

    if (analysis.saturation !== 0) {
      enhancedData = this.applySaturation(enhancedData, analysis.saturation);
    }

    if (analysis.hue !== 0) {
      enhancedData = this.applyHue(enhancedData, analysis.hue);
    }

    return enhancedData;
  }

  /**
   * Apply brightness adjustment
   */
  private applyBrightness(imageData: ImageData, brightness: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const adjustmentValue = (brightness / 100) * 255;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i]! + adjustmentValue)); // Red
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1]! + adjustmentValue)); // Green
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2]! + adjustmentValue)); // Blue
      // Alpha remains unchanged
    }

    return new ImageData(data, imageData.width, imageData.height);
  }

  /**
   * Apply contrast adjustment
   */
  private applyContrast(imageData: ImageData, contrast: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, factor * (data[i]! - 128) + 128)); // Red
      data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1]! - 128) + 128)); // Green
      data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2]! - 128) + 128)); // Blue
      // Alpha remains unchanged
    }

    return new ImageData(data, imageData.width, imageData.height);
  }

  /**
   * Apply saturation adjustment
   */
  private applySaturation(imageData: ImageData, saturation: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const saturationFactor = 1 + saturation / 100;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      // Apply saturation
      data[i] = Math.max(0, Math.min(255, luminance + (r - luminance) * saturationFactor));
      data[i + 1] = Math.max(0, Math.min(255, luminance + (g - luminance) * saturationFactor));
      data[i + 2] = Math.max(0, Math.min(255, luminance + (b - luminance) * saturationFactor));
      // Alpha remains unchanged
    }

    return new ImageData(data, imageData.width, imageData.height);
  }

  /**
   * Apply hue adjustment
   */
  private applyHue(imageData: ImageData, hue: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const hueShift = (hue / 360) * 2 * Math.PI;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]! / 255;
      const g = data[i + 1]! / 255;
      const b = data[i + 2]! / 255;

      // Convert RGB to HSL
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s;
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
          default:
            h = 0;
        }
        h /= 6;
      }

      // Apply hue shift
      h = (h + hueShift / (2 * Math.PI)) % 1;
      if (h < 0) h += 1;

      // Convert HSL back to RGB
      const hslToRgb = (h: number, s: number, l: number) => {
        let r, g, b;

        if (s === 0) {
          r = g = b = l; // achromatic
        } else {
          const hue2rgb = (p: number, q: number, t: number) => {
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

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      };

      const [newR, newG, newB] = hslToRgb(h, s, l);
      data[i] = newR!;
      data[i + 1] = newG!;
      data[i + 2] = newB!;
      // Alpha remains unchanged
    }

    return new ImageData(data, imageData.width, imageData.height);
  }
}
