import { BaseCommand } from '../core/BaseCommand';
import { ImageEditor } from '../core/ImageEditor';

/**
 * Command for RGB channel adjustments
 */
export class RGBCommand extends BaseCommand {
  private redAdjustment: number;
  private greenAdjustment: number;
  private blueAdjustment: number;
  private beforeImageData: ImageData | null = null;

  constructor(
    editor: ImageEditor,
    redAdjustment: number,
    greenAdjustment: number,
    blueAdjustment: number,
  ) {
    const adjustmentSummary = [];
    if (redAdjustment !== 0)
      adjustmentSummary.push(`R${redAdjustment > 0 ? '+' : ''}${redAdjustment}`);
    if (greenAdjustment !== 0)
      adjustmentSummary.push(`G${greenAdjustment > 0 ? '+' : ''}${greenAdjustment}`);
    if (blueAdjustment !== 0)
      adjustmentSummary.push(`B${blueAdjustment > 0 ? '+' : ''}${blueAdjustment}`);

    const name =
      adjustmentSummary.length > 0
        ? `RGB Adjust (${adjustmentSummary.join(', ')})`
        : 'RGB Adjust (no change)';

    super(editor, name, 'rgb-adjust');
    this.redAdjustment = redAdjustment;
    this.greenAdjustment = greenAdjustment;
    this.blueAdjustment = blueAdjustment;
  }

  public async execute(): Promise<void> {
    const canvasManager = this.editor.getCanvasManager();
    const ctx = canvasManager.getContext();
    const canvas = canvasManager.getCanvas();

    // Store current state for undo
    this.beforeImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Apply RGB adjustments
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const adjustedImageData = this.applyRGBAdjustments(currentImageData);
    ctx.putImageData(adjustedImageData, 0, 0);

    // Emit RGB adjustment event
    this.editor.getEventEmitter().emit('rgb:applied', {
      red: this.redAdjustment,
      green: this.greenAdjustment,
      blue: this.blueAdjustment,
    });
  }

  public async undo(): Promise<void> {
    if (!this.beforeImageData) {
      throw new Error('No before state available for undo');
    }

    const canvasManager = this.editor.getCanvasManager();
    const ctx = canvasManager.getContext();
    ctx.putImageData(this.beforeImageData, 0, 0);

    // Emit undo event
    this.editor.getEventEmitter().emit('rgb:undone', {
      red: this.redAdjustment,
      green: this.greenAdjustment,
      blue: this.blueAdjustment,
    });
  }

  public override getMemoryUsage(): number {
    // Return memory usage based on stored image data
    if (this.beforeImageData) {
      return this.beforeImageData.data.length;
    }
    return super.getMemoryUsage();
  }

  private applyRGBAdjustments(imageData: ImageData): ImageData {
    const data = new Uint8ClampedArray(imageData.data);

    // Convert percentage adjustments to actual values
    const redValue = (this.redAdjustment / 100) * 255;
    const greenValue = (this.greenAdjustment / 100) * 255;
    const blueValue = (this.blueAdjustment / 100) * 255;

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
}
