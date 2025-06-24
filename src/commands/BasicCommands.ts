import { BaseCommand } from '../core/BaseCommand';
import { ImageEditor } from '../core/ImageEditor';
import { CommandData } from '../interfaces/Command';

/**
 * Command for drawing operations on the canvas
 */
export class DrawCommand extends BaseCommand {
  private imageDataBefore: ImageData | null = null;
  private imageDataAfter: ImageData | null = null;
  private drawFunction: () => void;

  constructor(editor: ImageEditor, name: string, drawFunction: () => void) {
    super(editor, name);
    this.drawFunction = drawFunction;
  }

  public override async execute(): Promise<void> {
    const canvas = this.editor.getCanvasManager().getCanvas();
    const ctx = this.editor.getCanvasManager().getContext();

    // Capture state before drawing
    this.imageDataBefore = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Execute the drawing operation
    this.drawFunction();

    // Capture state after drawing
    this.imageDataAfter = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  public override async undo(): Promise<void> {
    if (this.imageDataBefore) {
      const ctx = this.editor.getCanvasManager().getContext();
      ctx.putImageData(this.imageDataBefore, 0, 0);
    }
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
        canExecute: this.imageDataBefore !== null,
        memoryUsage: this.getMemoryUsage(),
      },
    };
  }

  public override canMergeWith(command: DrawCommand): boolean {
    // Allow merging with other draw commands if they're close in time
    return command instanceof DrawCommand && this.timestamp - command.timestamp < 1000; // 1 second
  }

  public override mergeWith(command: DrawCommand): DrawCommand {
    // Create a merged command that applies both operations
    const mergedDrawFunction = () => {
      if (this.imageDataBefore) {
        const ctx = this.editor.getCanvasManager().getContext();
        ctx.putImageData(this.imageDataBefore, 0, 0);
        this.drawFunction();
        command.drawFunction();
      }
    };

    const merged = new DrawCommand(
      this.editor,
      `${this.name} + ${command.name}`,
      mergedDrawFunction,
    );

    // Use the original before state and the new after state
    merged.imageDataBefore = this.imageDataBefore;
    merged.imageDataAfter = command.imageDataAfter;

    return merged;
  }
}

/**
 * Command for canvas clearing operations
 */
export class ClearCanvasCommand extends BaseCommand {
  private imageDataBefore: ImageData | null = null;
  private clearColor: string;

  constructor(editor: ImageEditor, clearColor: string = 'white') {
    super(editor, 'Clear Canvas');
    this.clearColor = clearColor;
  }

  public override async execute(): Promise<void> {
    const canvas = this.editor.getCanvasManager().getCanvas();
    const ctx = this.editor.getCanvasManager().getContext();

    // Capture state before clearing
    this.imageDataBefore = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Clear the canvas
    ctx.fillStyle = this.clearColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  public override async undo(): Promise<void> {
    if (this.imageDataBefore) {
      const ctx = this.editor.getCanvasManager().getContext();
      ctx.putImageData(this.imageDataBefore, 0, 0);
    }
  }

  public override getMemoryUsage(): number {
    let usage = super.getMemoryUsage();
    if (this.imageDataBefore) {
      usage += this.imageDataBefore.data.length;
    }
    return usage;
  }

  public override serialize(): CommandData {
    return {
      ...super.serialize(),
      data: {
        clearColor: this.clearColor,
        canUndo: this.imageDataBefore !== null,
      },
    };
  }
}

/**
 * Command for text operations
 */
export class TextCommand extends BaseCommand {
  private imageDataBefore: ImageData | null = null;
  private text: string;
  private x: number;
  private y: number;
  private style: {
    font?: string;
    fillStyle?: string;
    textAlign?: CanvasTextAlign;
    textBaseline?: CanvasTextBaseline;
  };

  constructor(
    editor: ImageEditor,
    text: string,
    x: number,
    y: number,
    style: {
      font?: string;
      fillStyle?: string;
      textAlign?: CanvasTextAlign;
      textBaseline?: CanvasTextBaseline;
    } = {},
  ) {
    super(editor, `Add Text: "${text}"`);
    this.text = text;
    this.x = x;
    this.y = y;
    this.style = style;
  }

  public override async execute(): Promise<void> {
    const canvas = this.editor.getCanvasManager().getCanvas();
    const ctx = this.editor.getCanvasManager().getContext();

    // Capture state before adding text
    this.imageDataBefore = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Apply text styles
    if (this.style.font) ctx.font = this.style.font;
    if (this.style.fillStyle) ctx.fillStyle = this.style.fillStyle;
    if (this.style.textAlign) ctx.textAlign = this.style.textAlign;
    if (this.style.textBaseline) ctx.textBaseline = this.style.textBaseline;

    // Draw the text
    ctx.fillText(this.text, this.x, this.y);
  }

  public override async undo(): Promise<void> {
    if (this.imageDataBefore) {
      const ctx = this.editor.getCanvasManager().getContext();
      ctx.putImageData(this.imageDataBefore, 0, 0);
    }
  }

  public override getMemoryUsage(): number {
    let usage = super.getMemoryUsage();
    if (this.imageDataBefore) {
      usage += this.imageDataBefore.data.length;
    }
    usage += this.text.length * 2; // String memory estimation
    return usage;
  }

  public override serialize(): CommandData {
    return {
      ...super.serialize(),
      data: {
        text: this.text,
        x: this.x,
        y: this.y,
        style: this.style,
        canUndo: this.imageDataBefore !== null,
      },
    };
  }
}
