import { RotationTool } from '../tools/RotationTool';

export interface RotationControlsConfig {
  rotationTool: RotationTool;
  onRotate?: (angle: number) => void;
  onReset?: () => void;
}

/**
 * Create rotation controls UI for the properties panel
 */
export function createRotationControls(config: RotationControlsConfig): HTMLElement {
  const { rotationTool, onRotate, onReset } = config;
  const options = rotationTool.getOptions();

  const container = document.createElement('div');
  container.className = 'rotation-controls';
  container.innerHTML = `
    <div class="demo-property-control">
      <label class="demo-property-label">Rotation Controls</label>
      <div class="rotation-buttons">
        <button type="button" class="demo-btn demo-btn-secondary rotate-left-btn" title="Rotate 90° counterclockwise">
          ↺ 90°
        </button>
        <button type="button" class="demo-btn demo-btn-secondary rotate-right-btn" title="Rotate 90° clockwise">
          ↻ 90°
        </button>        <button type="button" class="demo-btn demo-btn-secondary rotate-180-btn" title="Rotate 180°">
          ↻ 180°
        </button>
      </div>
    </div>
    
    <div class="demo-property-control">
      <label class="demo-property-label">Flip Controls</label>
      <div class="flip-buttons">
        <button type="button" class="demo-btn demo-btn-secondary flip-horizontal-btn" title="Flip horizontally">
          ↔️ Flip H
        </button>
        <button type="button" class="demo-btn demo-btn-secondary flip-vertical-btn" title="Flip vertically">
          ↕️ Flip V
        </button>
      </div>
    </div>
    
    <div class="demo-property-control">
      <label class="demo-property-label">Current Angle</label>
      <div class="demo-property-value">
        <span class="current-angle">${options.angle}°</span>
      </div>
    </div>
    
    <div class="demo-property-control">
      <label class="demo-property-checkbox">
        <input type="checkbox" class="preserve-quality-checkbox" ${options.preserveQuality ? 'checked' : ''} />
        <span>High quality rotation</span>
      </label>
    </div>
    
    <div class="demo-property-control">
      <label class="demo-property-checkbox">
        <input type="checkbox" class="animate-rotation-checkbox" ${options.animateRotation ? 'checked' : ''} />
        <span>Animate rotation</span>
      </label>
    </div>
    
    <div class="demo-property-control">
      <label class="demo-property-label" for="animation-duration">Animation Duration (ms)</label>
      <input 
        type="range" 
        id="animation-duration" 
        class="demo-property-slider animation-duration-slider"
        min="100" 
        max="1000" 
        step="50"
        value="${options.animationDuration}"
        ${!options.animateRotation ? 'disabled' : ''}
      />
      <span class="demo-property-value animation-duration-value">${options.animationDuration}ms</span>
    </div>
    
    <div class="demo-property-control">
      <button type="button" class="demo-btn demo-btn-danger reset-rotation-btn">
        🔄 Reset Rotation
      </button>
    </div>
  `;
  // Get elements
  const rotateLeftBtn = container.querySelector('.rotate-left-btn') as HTMLButtonElement;
  const rotateRightBtn = container.querySelector('.rotate-right-btn') as HTMLButtonElement;
  const rotate180Btn = container.querySelector('.rotate-180-btn') as HTMLButtonElement;
  const flipHorizontalBtn = container.querySelector('.flip-horizontal-btn') as HTMLButtonElement;
  const flipVerticalBtn = container.querySelector('.flip-vertical-btn') as HTMLButtonElement;
  const currentAngleSpan = container.querySelector('.current-angle') as HTMLSpanElement;
  const preserveQualityCheckbox = container.querySelector(
    '.preserve-quality-checkbox',
  ) as HTMLInputElement;
  const animateRotationCheckbox = container.querySelector(
    '.animate-rotation-checkbox',
  ) as HTMLInputElement;
  const animationDurationSlider = container.querySelector(
    '.animation-duration-slider',
  ) as HTMLInputElement;
  const animationDurationValue = container.querySelector(
    '.animation-duration-value',
  ) as HTMLSpanElement;
  const resetRotationBtn = container.querySelector('.reset-rotation-btn') as HTMLButtonElement;

  // Event handlers
  rotateLeftBtn.addEventListener('click', () => {
    rotationTool.rotateCounterclockwise();
    updateCurrentAngle();
    onRotate?.(-90);
  });

  rotateRightBtn.addEventListener('click', () => {
    rotationTool.rotateClockwise();
    updateCurrentAngle();
    onRotate?.(90);
  });
  rotate180Btn.addEventListener('click', () => {
    rotationTool.rotate180();
    updateCurrentAngle();
    onRotate?.(180);
  });

  flipHorizontalBtn.addEventListener('click', () => {
    rotationTool.flipHorizontal();
    // Note: flips don't change the rotation angle, so no need to update angle display
  });

  flipVerticalBtn.addEventListener('click', () => {
    rotationTool.flipVertical();
    // Note: flips don't change the rotation angle, so no need to update angle display
  });

  preserveQualityCheckbox.addEventListener('change', () => {
    rotationTool.setOptions({ preserveQuality: preserveQualityCheckbox.checked });
  });

  animateRotationCheckbox.addEventListener('change', () => {
    const isAnimated = animateRotationCheckbox.checked;
    rotationTool.setOptions({ animateRotation: isAnimated });
    animationDurationSlider.disabled = !isAnimated;
  });

  animationDurationSlider.addEventListener('input', () => {
    const duration = parseInt(animationDurationSlider.value);
    animationDurationValue.textContent = `${duration}ms`;
    rotationTool.setOptions({ animationDuration: duration });
  });

  resetRotationBtn.addEventListener('click', () => {
    rotationTool.resetRotation();
    updateCurrentAngle();
    onReset?.();
  });

  // Update current angle display
  function updateCurrentAngle() {
    const currentAngle = rotationTool.getCurrentAngle();
    currentAngleSpan.textContent = `${currentAngle}°`;
  }

  return container;
}
