import { BaseCommand } from '../core/BaseCommand';
import { ImageEditor } from '../core/ImageEditor';
import { CommandData } from '../interfaces/Command';

/**
 * Command for contrast adjustment operations
 */
export class ContrastCommand extends BaseCommand {
  private imageDataBefore: ImageData | null = null;
  private imageDataAfter: ImageData | null = null;
  private contrastValue: number;
  private previousContrastValue: number;

  constructor(editor: ImageEditor, contrastValue: number, previousContrastValue: number = 0) {
    super(editor, `Contrast ${contrastValue > 0 ? '+' : ''}${contrastValue}`);
    this.contrastValue = contrastValue;
    this.previousContrastValue = previousContrastValue;
  }

  public override async execute(): Promise<void> {
    const canvas = this.editor.getCanvasManager().getCanvas();
    const ctx = this.editor.getCanvasManager().getContext();

    // Capture state before adjustment
    this.imageDataBefore = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Apply contrast adjustment
    const adjustedImageData = this.applyContrast(this.imageDataBefore, this.contrastValue);
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
   * Apply contrast adjustment to image data
   * Contrast formula: newValue = (oldValue - 128) * factor + 128
   * @param imageData - Original image data
   * @param contrast - Contrast value (-100 to 100)
   * @returns Adjusted image data
   */
  private applyContrast(imageData: ImageData, contrast: number): ImageData {
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

      // Apply contrast formula: (pixel - 128) * factor + 128
      data[i] = Math.max(0, Math.min(255, (red - 128) * factor + 128)); // Red
      data[i + 1] = Math.max(0, Math.min(255, (green - 128) * factor + 128)); // Green
      data[i + 2] = Math.max(0, Math.min(255, (blue - 128) * factor + 128)); // Blue
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
        contrastValue: this.contrastValue,
        previousContrastValue: this.previousContrastValue,
        memoryUsage: this.getMemoryUsage(),
      },
    };
  }

  public override canMergeWith(command: ContrastCommand): boolean {
    // Allow merging with other contrast commands if they're close in time
    return (
      command instanceof ContrastCommand && this.timestamp - command.timestamp < 500 // 500ms
    );
  }

  public override mergeWith(command: ContrastCommand): ContrastCommand {
    // Create a merged command with the new contrast value
    const merged = new ContrastCommand(
      this.editor,
      command.contrastValue,
      this.previousContrastValue,
    );

    // Use the original before state and the new after state
    merged.imageDataBefore = this.imageDataBefore;
    merged.imageDataAfter = command.imageDataAfter;

    return merged;
  }

  /**
   * Get the contrast value for this command
   */
  public getContrastValue(): number {
    return this.contrastValue;
  }

  /**
   * Get the previous contrast value
   */
  public getPreviousContrastValue(): number {
    return this.previousContrastValue;
  }
}
