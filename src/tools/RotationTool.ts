import { Tool } from '../interfaces/Tool';
import { ImageEditor } from '../core/ImageEditor';
import { CanvasManager } from '../core/CanvasManager';
import { Point } from '../types';

export interface RotationOptions {
  angle: number; // Rotation angle in degrees
  preserveQuality: boolean; // Use high-quality rotation
  animateRotation: boolean; // Enable rotation animation
  animationDuration: number; // Animation duration in ms
}

export class RotationTool implements Tool {
  name = 'rotation';

  private editor: ImageEditor;
  private canvasManager: CanvasManager;
  private options: RotationOptions = {
    angle: 0,
    preserveQuality: true,
    animateRotation: true,
    animationDuration: 300,
  };

  private originalImageData: ImageData | null = null;
  private isAnimating = false;

  constructor(editor: ImageEditor, canvasManager: CanvasManager) {
    this.editor = editor;
    this.canvasManager = canvasManager;
    this.setupEventListeners();
  }
  private setupEventListeners(): void {
    // Listen for image loaded events
    this.editor.on('image:loaded', () => {
      this.storeOriginalImageData();
    });
  }

  public getOptions(): RotationOptions {
    return { ...this.options };
  }

  public setOptions(options: Partial<RotationOptions>): void {
    this.options = { ...this.options, ...options };
  }
  /**
   * Rotate the image by 90 degrees clockwise
   */
  public rotateClockwise(): void {
    this.rotateBy(90);
  }

  /**
   * Rotate the image by 90 degrees counterclockwise
   */
  public rotateCounterclockwise(): void {
    this.rotateBy(-90);
  }

  /**
   * Rotate the image by 180 degrees
   */
  public rotate180(): void {
    this.rotateBy(180);
  }

  /**
   * Flip the image horizontally (mirror along vertical axis)
   */
  public flipHorizontal(): void {
    this.performFlip('horizontal');
  }

  /**
   * Flip the image vertically (mirror along horizontal axis)
   */
  public flipVertical(): void {
    this.performFlip('vertical');
  }

  /**
   * Rotate the image by a specific angle in degrees
   */
  public rotateBy(degrees: number): void {
    if (this.isAnimating) {
      return; // Prevent multiple simultaneous rotations
    }

    const canvas = this.canvasManager.getCanvas();
    const ctx = this.canvasManager.getContext();

    if (!canvas || !ctx) {
      return;
    }

    // Store current state before rotation
    this.storeOriginalImageData();

    if (this.options.animateRotation) {
      this.animateRotation(degrees);
    } else {
      const normalizedAngle = ((degrees % 360) + 360) % 360;
      this.options.angle = (this.options.angle + normalizedAngle) % 360;
      this.performRotation(degrees);
    }

    this.editor.emit('tool:action', {
      toolName: this.name,
      action: 'rotate',
      data: { angle: degrees },
    });
  }

  /**
   * Reset rotation to 0 degrees
   */
  public resetRotation(): void {
    if (this.originalImageData) {
      const canvas = this.canvasManager.getCanvas();
      const ctx = this.canvasManager.getContext();

      if (canvas && ctx) {
        // Restore original dimensions
        canvas.width = this.originalImageData.width;
        canvas.height = this.originalImageData.height;

        // Clear and restore original image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(this.originalImageData, 0, 0);

        this.options.angle = 0;
        this.editor.emit('tool:action', { toolName: this.name, action: 'reset' });
      }
    }
  }

  /**
   * Apply the current rotation settings
   */
  public applyRotation(): void {
    // The rotation is already applied, but we can trigger events
    this.editor.emit('tool:action', {
      toolName: this.name,
      action: 'apply',
      data: { angle: this.options.angle },
    });
  }

  /**
   * Store the original image data for reset functionality
   */
  private storeOriginalImageData(): void {
    const canvas = this.canvasManager.getCanvas();
    const ctx = this.canvasManager.getContext();

    if (canvas && ctx) {
      this.originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  }
  /**
   * Perform the actual rotation without animation
   */
  private performRotation(degrees: number): void {
    const canvas = this.canvasManager.getCanvas();
    const ctx = this.canvasManager.getContext();

    if (!canvas || !ctx) return;

    // Get current image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Calculate new dimensions for 90-degree rotations
    let newWidth = canvas.width;
    let newHeight = canvas.height;

    if (Math.abs(degrees) === 90 || Math.abs(degrees) === 270) {
      // Swap dimensions for 90-degree rotations
      newWidth = canvas.height;
      newHeight = canvas.width;
    }

    // Create a temporary canvas for the rotation
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;

    // Set temp canvas size to current canvas size
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Put current image data on temp canvas
    tempCtx.putImageData(imageData, 0, 0);

    // Resize main canvas to new dimensions
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Clear the main canvas
    ctx.clearRect(0, 0, newWidth, newHeight);

    // Apply rotation transformation
    ctx.save();

    // Move to center of new canvas
    ctx.translate(newWidth / 2, newHeight / 2);

    // Rotate by the specified angle
    const radiansAngle = (degrees * Math.PI) / 180;
    ctx.rotate(radiansAngle);

    // Draw the image centered
    if (this.options.preserveQuality) {
      // Use high-quality settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    ctx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);

    ctx.restore();
    this.editor.emit('tool:action', { toolName: this.name, action: 'rotationComplete' });
  }

  /**
   * Perform horizontal or vertical flip
   */
  private performFlip(direction: 'horizontal' | 'vertical'): void {
    const canvas = this.canvasManager.getCanvas();
    const ctx = this.canvasManager.getContext();

    if (!canvas || !ctx) {
      return;
    }

    // Store current state before flip
    this.storeOriginalImageData();

    // Get current image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Create a temporary canvas for the flip
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;

    // Set temp canvas size to current canvas size
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Put current image data on temp canvas
    tempCtx.putImageData(imageData, 0, 0);

    // Clear the main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply flip transformation
    ctx.save();

    if (direction === 'horizontal') {
      // Flip horizontally: scale(-1, 1) and translate
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
    } else {
      // Flip vertically: scale(1, -1) and translate
      ctx.scale(1, -1);
      ctx.translate(0, -canvas.height);
    }

    // Draw the image with flip transformation
    if (this.options.preserveQuality) {
      // Use high-quality settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    ctx.drawImage(tempCanvas, 0, 0);

    ctx.restore();

    // Trigger flip event
    this.editor.emit('tool:action', {
      toolName: this.name,
      action: 'flip',
      data: { direction },
    });
  }

  /**
   * Animate the rotation for visual feedback
   */
  private animateRotation(degrees: number): void {
    this.isAnimating = true;
    const startTime = performance.now();
    const duration = this.options.animationDuration;

    const canvas = this.canvasManager.getCanvas();
    const ctx = this.canvasManager.getContext();

    if (!canvas || !ctx) {
      this.isAnimating = false;
      return;
    }

    // Store the current image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const startAngle = 0;
    const endAngle = degrees;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeInOutCubic = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };

      const easedProgress = easeInOutCubic(progress);
      const currentAngle = startAngle + endAngle * easedProgress;

      // Clear canvas and draw rotated image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((currentAngle * Math.PI) / 180);

      // Create temp canvas for current frame
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCtx.putImageData(imageData, 0, 0);

      ctx.drawImage(tempCanvas, -canvas.width / 2, -canvas.height / 2);
      ctx.restore();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete, update angle and perform final rotation
        this.isAnimating = false;

        // Now update the angle tracking (this was moved from rotateBy method)
        const normalizedAngle = ((degrees % 360) + 360) % 360;
        this.options.angle = (this.options.angle + normalizedAngle) % 360;
        this.performRotation(degrees);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Get the current rotation angle
   */
  public getCurrentAngle(): number {
    return this.options.angle;
  }

  /**
   * Check if the image is currently being rotated
   */
  public isRotating(): boolean {
    return this.isAnimating;
  }

  // Tool lifecycle methods
  public activate(): void {
    this.storeOriginalImageData();
  }

  public deactivate(): void {
    // Cancel any ongoing animation
    this.isAnimating = false;
  }

  // Optional event handlers - no mouse interaction needed for rotation tool
  public onMouseDown?(_point: Point, _event: MouseEvent): void {
    // No mouse interaction needed for rotation tool
  }

  public onMouseMove?(_point: Point, _event: MouseEvent): void {
    // No mouse interaction needed for rotation tool
  }

  public onMouseUp?(_point: Point, _event: MouseEvent): void {
    // No mouse interaction needed for rotation tool
  }

  public onKeyDown?(key: string, event: KeyboardEvent): void {
    // Keyboard shortcuts for rotation
    if (event.ctrlKey || event.metaKey) {
      switch (key) {
        case 'ArrowLeft':
          event.preventDefault();
          this.rotateCounterclockwise();
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.rotateClockwise();
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          event.preventDefault();
          this.rotate180();
          break;
      }
    }
  }

  public cleanup(): void {
    this.originalImageData = null;
    this.isAnimating = false;
  }
}
