import { Tool } from '../interfaces/Tool';
import { CanvasManager } from '../core/CanvasManager';
import { ImageEditor } from '../core/ImageEditor';
import { resizeImageData } from '../utils/image-resize';

export type ResizeUnit = 'px' | '%';
export type ResampleAlgorithm = 'nearest' | 'bilinear' | 'bicubic';

export interface ResizeOptions {
  width: number;
  height: number;
  unit: ResizeUnit;
  lockAspectRatio: boolean;
  algorithm: ResampleAlgorithm;
}

export class ResizeTool implements Tool {
  name = 'resize';
  private editor: ImageEditor;
  private canvas: CanvasManager;
  private options: ResizeOptions;
  private originalAspectRatio: number;
  private previewImageData: ImageData | null = null;

  constructor(editor: ImageEditor, canvas: CanvasManager) {
    this.editor = editor;
    this.canvas = canvas;
    const width = canvas.getCanvas().width;
    const height = canvas.getCanvas().height;
    this.options = {
      width,
      height,
      unit: 'px',
      lockAspectRatio: true,
      algorithm: 'bicubic',
    };
    this.originalAspectRatio = width / height;
  }

  public activate(): void {
    // Show resize controls in the UI
  }

  public deactivate(): void {
    // Hide resize controls
    this.previewImageData = null;
  }

  public setOptions(options: Partial<ResizeOptions>): void {
    this.options = { ...this.options, ...options };
    if (this.options.lockAspectRatio) {
      if (options.width !== undefined) {
        this.options.height = Math.round(this.options.width / this.originalAspectRatio);
      } else if (options.height !== undefined) {
        this.options.width = Math.round(this.options.height * this.originalAspectRatio);
      }
    }
  }

  public getOptions(): ResizeOptions {
    return this.options;
  }

  public previewResize(): void {
    // Generate preview using selected algorithm
    const src = this.canvas.getImageData();
    let w = this.options.width;
    let h = this.options.height;
    if (this.options.unit === '%') {
      w = Math.round(src.width * (this.options.width / 100));
      h = Math.round(src.height * (this.options.height / 100));
    }
    this.previewImageData = resizeImageData(src, w, h, this.options.algorithm);
  }

  public applyResize(): void {
    // Actually resize the image on the canvas using selected algorithm
    const src = this.canvas.getImageData();
    let w = this.options.width;
    let h = this.options.height;
    if (this.options.unit === '%') {
      w = Math.round(src.width * (this.options.width / 100));
      h = Math.round(src.height * (this.options.height / 100));
    }
    const resized = resizeImageData(src, w, h, this.options.algorithm);
    this.canvas.resize(w, h);
    this.canvas.putImageData(resized);
    this.previewImageData = null;
  }

  public reset(): void {
    const width = this.canvas.getCanvas().width;
    const height = this.canvas.getCanvas().height;
    this.options = {
      width,
      height,
      unit: 'px',
      lockAspectRatio: true,
      algorithm: 'bicubic',
    };
    this.previewImageData = null;
  }
}
