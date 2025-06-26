import { AutoEnhanceCommand, AutoEnhanceAnalysis } from '../commands/AutoEnhanceCommand';
import { CanvasManager } from '../core/CanvasManager';
import { ImageEditor } from '../core/ImageEditor';
import { Tool } from '../interfaces/Tool';
import { Point } from '../types';
import { ToolProperties } from '../ui/PropertiesPanel';

/**
 * Tool for automatic image enhancement with preview
 */
export class AutoEnhanceTool implements Tool {
  public readonly id: string = 'auto-enhance';
  public readonly name: string = 'Auto Enhance';
  public readonly category: string = 'Adjustments';
  public readonly icon: string = '✨';
  public readonly cursor: string = 'default';
  public readonly shortcut: string = 'E';

  private editor: ImageEditor;
  private canvasManager: CanvasManager;
  private originalImageData: ImageData | null = null;
  private isPreviewMode: boolean = false;
  private currentAnalysis: AutoEnhanceAnalysis | null = null;
  private isAnalyzing: boolean = false;

  constructor(editor: ImageEditor, canvasManager: CanvasManager) {
    this.editor = editor;
    this.canvasManager = canvasManager;
  }

  public activate(): void {
    // Store original image data for preview
    const canvas = this.canvasManager.getCanvas();
    const ctx = this.canvasManager.getContext();

    if (canvas && ctx) {
      this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Analyze the image automatically
      this.analyzeImage();
    }

    // Emit tool activation
    this.editor.getEventEmitter().emit('tool:activated', {
      toolId: this.id,
      toolName: this.name,
    });

    // Emit tool properties
    this.editor.getEventEmitter().emit('tool:propertiesChanged', {
      toolId: this.id,
      properties: this.getToolProperties(),
    });
  }

  public deactivate(): void {
    // If preview is active, restore original image
    if (this.isPreviewMode) {
      this.restoreOriginal();
    }

    // Reset state
    this.originalImageData = null;
    this.isPreviewMode = false;
    this.currentAnalysis = null;
    this.isAnalyzing = false;

    this.editor.getEventEmitter().emit('tool:deactivated', {
      toolId: this.id,
    });
  }

  public getToolProperties(): ToolProperties {
    return {
      toolId: this.id,
      toolName: this.name,
      groups: [
        {
          id: 'auto-enhance',
          title: 'Auto Enhancement',
          icon: '✨',
          controls: [
            {
              id: 'status',
              type: 'input',
              label: 'Status',
              value: this.getStatusText(),
              disabled: true,
              tooltip: 'Current auto-enhance analysis status',
            },
            {
              id: 'analysis',
              type: 'input',
              label: 'Proposed Changes',
              value: this.getAnalysisText(),
              disabled: true,
              tooltip: 'Proposed enhancement adjustments',
            },
            {
              id: 'preview',
              type: 'checkbox',
              label: 'Show Preview',
              value: this.isPreviewMode,
              disabled: this.isAnalyzing || !this.currentAnalysis,
              tooltip: 'Preview the auto-enhancement results',
            },
            {
              id: 'analyze',
              type: 'button',
              label: 'Re-analyze',
              disabled: this.isAnalyzing,
              tooltip: 'Re-analyze the image for optimal enhancement',
            },
            {
              id: 'apply',
              type: 'button',
              label: 'Apply Enhancement',
              disabled: this.isAnalyzing || !this.currentAnalysis,
              tooltip: 'Apply the auto-enhancement permanently',
            },
            {
              id: 'reset',
              type: 'button',
              label: 'Reset',
              tooltip: 'Reset to original image',
            },
          ],
        },
      ],
    };
  }

  public onPropertyChanged(controlId: string, value: any): void {
    switch (controlId) {
      case 'preview':
        this.onPreviewModeChanged(value);
        break;
      case 'analyze':
        this.analyzeImage();
        break;
      case 'apply':
        this.onApply();
        break;
      case 'reset':
        this.onReset();
        break;
    }
  }

  private getStatusText(): string {
    if (this.isAnalyzing) {
      return 'Analyzing image...';
    }
    if (!this.currentAnalysis) {
      return 'No analysis available';
    }
    return 'Analysis complete';
  }

  private getAnalysisText(): string {
    if (this.isAnalyzing) {
      return 'Please wait...';
    }
    if (!this.currentAnalysis) {
      return 'Click "Re-analyze" to start';
    }

    const { brightness, contrast, saturation, hue } = this.currentAnalysis;
    const parts = [];

    if (Math.abs(brightness) > 0.5) {
      parts.push(`Brightness: ${brightness > 0 ? '+' : ''}${brightness.toFixed(1)}`);
    }
    if (Math.abs(contrast) > 0.5) {
      parts.push(`Contrast: ${contrast > 0 ? '+' : ''}${contrast.toFixed(1)}`);
    }
    if (Math.abs(saturation) > 0.5) {
      parts.push(`Saturation: ${saturation > 0 ? '+' : ''}${saturation.toFixed(1)}`);
    }
    if (Math.abs(hue) > 0.5) {
      parts.push(`Hue: ${hue > 0 ? '+' : ''}${hue.toFixed(1)}`);
    }

    if (parts.length === 0) {
      return 'Image looks good as-is';
    }

    return parts.join(', ');
  }

  private async analyzeImage(): Promise<void> {
    this.isAnalyzing = true;
    this.currentAnalysis = null;

    // Update UI to show analyzing state
    this.editor.getEventEmitter().emit('tool:propertiesChanged', {
      toolId: this.id,
      properties: this.getToolProperties(),
    });

    try {
      // Simulate async analysis (in a real implementation, this might be more complex)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create a command to get the analysis (without executing it)
      const command = new AutoEnhanceCommand(this.editor);

      // Get the analysis by creating the command and accessing its analysis
      // We'll need to temporarily execute it to get the analysis, then undo
      const canvas = this.canvasManager.getCanvas();
      const ctx = this.canvasManager.getContext();
      const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      await command.execute();
      this.currentAnalysis = command.getAnalysis();

      // Restore original image after analysis
      ctx.putImageData(originalData, 0, 0);

      // Emit analysis complete event
      this.editor.getEventEmitter().emit('autoEnhance:analysisComplete', {
        analysis: this.currentAnalysis,
      });
    } catch (error) {
      console.error('Auto-enhance analysis failed:', error);
      this.currentAnalysis = null;
    } finally {
      this.isAnalyzing = false;

      // Update UI
      this.editor.getEventEmitter().emit('tool:propertiesChanged', {
        toolId: this.id,
        properties: this.getToolProperties(),
      });
    }
  }

  private onPreviewModeChanged(enabled: boolean): void {
    this.isPreviewMode = enabled;

    if (enabled && this.currentAnalysis) {
      this.showPreview();
    } else {
      this.restoreOriginal();
    }

    // Emit preview state change event
    this.editor.getEventEmitter().emit('autoEnhance:previewChanged', {
      enabled,
      analysis: this.currentAnalysis,
    });
  }

  private onReset(): void {
    this.restoreOriginal();
    this.isPreviewMode = false;
    this.currentAnalysis = null;

    // Update UI
    this.editor.getEventEmitter().emit('tool:propertiesChanged', {
      toolId: this.id,
      properties: this.getToolProperties(),
    });
  }

  private async onApply(): Promise<void> {
    if (!this.currentAnalysis) {
      return;
    }

    try {
      // Restore original image first (in case preview is active)
      this.restoreOriginal();

      // Create and execute auto-enhance command
      const command = new AutoEnhanceCommand(this.editor, this.currentAnalysis);
      await this.editor.getHistoryManager().executeCommand(command);

      // Reset state after applying
      this.onReset();

      // Emit apply event
      this.editor.getEventEmitter().emit('autoEnhance:applied', {
        analysis: this.currentAnalysis,
      });
    } catch (error) {
      console.error('Failed to apply auto-enhancement:', error);
    }
  }

  private showPreview(): void {
    if (!this.originalImageData || !this.currentAnalysis) {
      return;
    }

    try {
      const ctx = this.canvasManager.getContext();

      // Restore original image
      ctx.putImageData(this.originalImageData, 0, 0);

      // Create a temporary command to apply the enhancement for preview
      const _tempCommand = new AutoEnhanceCommand(this.editor, this.currentAnalysis);

      // Apply the enhancement (we'll manually apply it for preview)
      const canvas = this.canvasManager.getCanvas();
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const enhancedImageData = this.applyAutoEnhancement(currentImageData, this.currentAnalysis);
      ctx.putImageData(enhancedImageData, 0, 0);
    } catch (error) {
      console.error('Failed to show auto-enhancement preview:', error);
      this.restoreOriginal();
    }
  }

  private restoreOriginal(): void {
    if (this.originalImageData) {
      const ctx = this.canvasManager.getContext();
      ctx.putImageData(this.originalImageData, 0, 0);
    }
  }

  /**
   * Apply auto-enhancement to image data (simplified version for preview)
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
   * Apply brightness adjustment (simplified for preview)
   */
  private applyBrightness(imageData: ImageData, brightness: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const adjustmentValue = (brightness / 100) * 255;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i]! + adjustmentValue));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1]! + adjustmentValue));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2]! + adjustmentValue));
    }

    return new ImageData(data, imageData.width, imageData.height);
  }

  /**
   * Apply contrast adjustment (simplified for preview)
   */
  private applyContrast(imageData: ImageData, contrast: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, factor * (data[i]! - 128) + 128));
      data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1]! - 128) + 128));
      data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2]! - 128) + 128));
    }

    return new ImageData(data, imageData.width, imageData.height);
  }

  /**
   * Apply saturation adjustment (simplified for preview)
   */
  private applySaturation(imageData: ImageData, saturation: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const saturationFactor = 1 + saturation / 100;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      data[i] = Math.max(0, Math.min(255, luminance + (r - luminance) * saturationFactor));
      data[i + 1] = Math.max(0, Math.min(255, luminance + (g - luminance) * saturationFactor));
      data[i + 2] = Math.max(0, Math.min(255, luminance + (b - luminance) * saturationFactor));
    }

    return new ImageData(data, imageData.width, imageData.height);
  }

  /**
   * Apply hue adjustment (simplified for preview)
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
        h = s = 0;
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
          r = g = b = l;
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
    }

    return new ImageData(data, imageData.width, imageData.height);
  }

  // Tool interface methods (not used for this tool)
  public onMouseDown?(_point: Point, _event: MouseEvent): void {}
  public onMouseMove?(_point: Point, _event: MouseEvent): void {}
  public onMouseUp?(_point: Point, _event: MouseEvent): void {}
  public onKeyDown?(_key: string, _event: KeyboardEvent): void {}
  public onKeyUp?(_key: string, _event: KeyboardEvent): void {}
}
