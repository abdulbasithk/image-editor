import { BaseCommand } from '../core/BaseCommand';
import { ImageEditor } from '../core/ImageEditor';
import { CommandData } from '../interfaces/Command';

/**
 * Command for brightness adjustment operations
 */
export class BrightnessCommand extends BaseCommand {
  private imageDataBefore: ImageData | null = null;
  private imageDataAfter: ImageData | null = null;
  private brightnessValue: number;
  private previousBrightnessValue: number;

  constructor(editor: ImageEditor, brightnessValue: number, previousBrightnessValue: number = 0) {
    super(editor, `Brightness ${brightnessValue > 0 ? '+' : ''}${brightnessValue}`);
    this.brightnessValue = brightnessValue;
    this.previousBrightnessValue = previousBrightnessValue;
  }

  public override async execute(): Promise<void> {
    const canvas = this.editor.getCanvasManager().getCanvas();
    const ctx = this.editor.getCanvasManager().getContext();

    // Capture state before adjustment
    this.imageDataBefore = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Apply brightness adjustment
    const adjustedImageData = this.applyBrightness(this.imageDataBefore, this.brightnessValue);
    ctx.putImageData(adjustedImageData, 0, 0);

    // Capture state after adjustment
    this.imageDataAfter = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  public override async undo(): Promise<void> {
    if (this.imageDataBefore) {
      const ctx = this.editor.getCanvasManager().getContext();
      ctx.putImageData(this.imageDataBefore, 0, 0);
    }
  }

  /**
   * Apply brightness adjustment to image data
   * @param imageData - Original image data
   * @param brightness - Brightness value (-100 to 100)
   * @returns Adjusted image data
   */
  private applyBrightness(imageData: ImageData, brightness: number): ImageData {
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

  public override getMemoryUsage(): number {
    let usage = super.getMemoryUsage();
    if (this.imageDataBefore) {
      usage += this.imageDataBefore.data.length;
    }
    if (this.imageDataAfter) {
      usage += this.imageDataAfter.data.length;
    }
    return usage;
  }

  public override serialize(): CommandData {
    return {
      ...super.serialize(),
      data: {
        brightnessValue: this.brightnessValue,
        previousBrightnessValue: this.previousBrightnessValue,
        memoryUsage: this.getMemoryUsage(),
      },
    };
  }

  public override canMergeWith(command: BrightnessCommand): boolean {
    // Allow merging with other brightness commands if they're close in time
    return (
      command instanceof BrightnessCommand && this.timestamp - command.timestamp < 500 // 500ms
    );
  }

  public override mergeWith(command: BrightnessCommand): BrightnessCommand {
    // Create a merged command with the new brightness value
    const merged = new BrightnessCommand(
      this.editor,
      command.brightnessValue,
      this.previousBrightnessValue,
    );

    // Use the original before state and the new after state
    merged.imageDataBefore = this.imageDataBefore;
    merged.imageDataAfter = command.imageDataAfter;

    return merged;
  }

  /**
   * Get the brightness value for this command
   */
  public getBrightnessValue(): number {
    return this.brightnessValue;
  }

  /**
   * Get the previous brightness value
   */
  public getPreviousBrightnessValue(): number {
    return this.previousBrightnessValue;
  }
}
