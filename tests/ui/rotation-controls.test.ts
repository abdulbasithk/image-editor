import { createRotationControls } from '../../src/ui/RotationControls';

describe('RotationControls', () => {
  let rotationTool: any;
  let onRotate: jest.Mock;
  let onReset: jest.Mock;
  let controls: HTMLElement;

  beforeEach(() => {
    rotationTool = {
      getOptions: jest.fn().mockReturnValue({
        angle: 45,
        preserveQuality: true,
        animateRotation: false,
        animationDuration: 500,
      }),
      getCurrentAngle: jest.fn().mockReturnValue(45),
      rotateCounterclockwise: jest.fn(),
      rotateClockwise: jest.fn(),
      rotate180: jest.fn(),
      flipHorizontal: jest.fn(),
      flipVertical: jest.fn(),
      setOptions: jest.fn(),
      resetRotation: jest.fn(),
    };
    onRotate = jest.fn();
    onReset = jest.fn();
    controls = createRotationControls({ rotationTool, onRotate, onReset });
    document.body.appendChild(controls);
  });

  afterEach(() => {
    controls.remove();
    jest.clearAllMocks();
  });

  it('renders all controls with correct initial values', () => {
    expect(controls.classList.contains('rotation-controls')).toBe(true);
    expect(controls.querySelector('.current-angle')!.textContent).toBe('45°');
    expect((controls.querySelector('.preserve-quality-checkbox') as HTMLInputElement).checked).toBe(
      true,
    );
    expect((controls.querySelector('.animate-rotation-checkbox') as HTMLInputElement).checked).toBe(
      false,
    );
    expect((controls.querySelector('.animation-duration-slider') as HTMLInputElement).value).toBe(
      '500',
    );
    expect(
      (controls.querySelector('.animation-duration-slider') as HTMLInputElement).disabled,
    ).toBe(true);
  });

  it('calls rotateCounterclockwise and onRotate(-90) when rotate left is clicked', () => {
    const btn = controls.querySelector('.rotate-left-btn') as HTMLButtonElement;
    btn.click();
    expect(rotationTool.rotateCounterclockwise).toHaveBeenCalled();
    expect(onRotate).toHaveBeenCalledWith(-90);
  });

  it('calls rotateClockwise and onRotate(90) when rotate right is clicked', () => {
    const btn = controls.querySelector('.rotate-right-btn') as HTMLButtonElement;
    btn.click();
    expect(rotationTool.rotateClockwise).toHaveBeenCalled();
    expect(onRotate).toHaveBeenCalledWith(90);
  });

  it('calls rotate180 and onRotate(180) when rotate 180 is clicked', () => {
    const btn = controls.querySelector('.rotate-180-btn') as HTMLButtonElement;
    btn.click();
    expect(rotationTool.rotate180).toHaveBeenCalled();
    expect(onRotate).toHaveBeenCalledWith(180);
  });

  it('calls flipHorizontal when flip horizontal is clicked', () => {
    const btn = controls.querySelector('.flip-horizontal-btn') as HTMLButtonElement;
    btn.click();
    expect(rotationTool.flipHorizontal).toHaveBeenCalled();
  });

  it('calls flipVertical when flip vertical is clicked', () => {
    const btn = controls.querySelector('.flip-vertical-btn') as HTMLButtonElement;
    btn.click();
    expect(rotationTool.flipVertical).toHaveBeenCalled();
  });

  it('calls setOptions when preserve quality is toggled', () => {
    const checkbox = controls.querySelector('.preserve-quality-checkbox') as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(rotationTool.setOptions).toHaveBeenCalledWith({ preserveQuality: false });
  });

  it('calls setOptions and enables slider when animate rotation is toggled on', () => {
    const checkbox = controls.querySelector('.animate-rotation-checkbox') as HTMLInputElement;
    const slider = controls.querySelector('.animation-duration-slider') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(rotationTool.setOptions).toHaveBeenCalledWith({ animateRotation: true });
    expect(slider.disabled).toBe(false);
  });

  it('calls setOptions and disables slider when animate rotation is toggled off', () => {
    const checkbox = controls.querySelector('.animate-rotation-checkbox') as HTMLInputElement;
    const slider = controls.querySelector('.animation-duration-slider') as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(rotationTool.setOptions).toHaveBeenCalledWith({ animateRotation: false });
    expect(slider.disabled).toBe(true);
  });

  it('calls setOptions and updates value when animation duration slider is changed', () => {
    const slider = controls.querySelector('.animation-duration-slider') as HTMLInputElement;
    const valueSpan = controls.querySelector('.animation-duration-value') as HTMLSpanElement;
    slider.value = '750';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(rotationTool.setOptions).toHaveBeenCalledWith({ animationDuration: 750 });
    expect(valueSpan.textContent).toBe('750ms');
  });

  it('calls resetRotation and onReset when reset button is clicked', () => {
    const btn = controls.querySelector('.reset-rotation-btn') as HTMLButtonElement;
    btn.click();
    expect(rotationTool.resetRotation).toHaveBeenCalled();
    expect(onReset).toHaveBeenCalled();
  });

  it('updates current angle display after rotation', () => {
    // Simulate angle change after rotation
    rotationTool.getCurrentAngle.mockReturnValue(90);
    const btn = controls.querySelector('.rotate-right-btn') as HTMLButtonElement;
    btn.click();
    const angleSpan = controls.querySelector('.current-angle') as HTMLSpanElement;
    expect(angleSpan.textContent).toBe('90°');
  });
});
