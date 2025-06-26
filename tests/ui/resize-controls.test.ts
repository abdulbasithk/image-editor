import { ResizeOptions } from '../../src/tools/ResizeTool';
import { createResizeControls } from '../../src/ui/ResizeControls';

describe('ResizeControls', () => {
  let options: ResizeOptions;
  let onChange: jest.Mock;
  let onApply: jest.Mock;
  let onReset: jest.Mock;
  let controls: HTMLElement;

  beforeEach(() => {
    options = {
      width: 800,
      height: 600,
      lockAspectRatio: true,
      unit: 'px',
      algorithm: 'bilinear',
    };
    onChange = jest.fn();
    onApply = jest.fn();
    onReset = jest.fn();
    controls = createResizeControls({ options, onChange, onApply, onReset });
    document.body.appendChild(controls);
  });

  afterEach(() => {
    controls.remove();
    jest.clearAllMocks();
  });

  it('renders all controls with correct initial values', () => {
    const [widthInput, heightInput, aspectLock, unitSelect, algoSelect, applyBtn, resetBtn] =
      controls.children;
    expect(widthInput).toBeInstanceOf(HTMLInputElement);
    expect((widthInput as HTMLInputElement).value).toBe('800');
    expect(heightInput).toBeInstanceOf(HTMLInputElement);
    expect((heightInput as HTMLInputElement).value).toBe('600');
    expect(aspectLock).toBeInstanceOf(HTMLInputElement);
    expect((aspectLock as HTMLInputElement).checked).toBe(true);
    expect(unitSelect).toBeInstanceOf(HTMLSelectElement);
    expect((unitSelect as HTMLSelectElement).value).toBe('px');
    expect(algoSelect).toBeInstanceOf(HTMLSelectElement);
    expect((algoSelect as HTMLSelectElement).value).toBe('bilinear');
    expect(applyBtn).toBeInstanceOf(HTMLButtonElement);
    expect(resetBtn).toBeInstanceOf(HTMLButtonElement);
  });

  it('calls onChange when width is changed', () => {
    const widthInput = controls.children[0] as HTMLInputElement;
    widthInput.value = '1024';
    widthInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith({ width: 1024 });
  });

  it('calls onChange when height is changed', () => {
    const heightInput = controls.children[1] as HTMLInputElement;
    heightInput.value = '768';
    heightInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith({ height: 768 });
  });

  it('calls onChange when aspect ratio lock is toggled', () => {
    const aspectLock = controls.children[2] as HTMLInputElement;
    aspectLock.checked = false;
    aspectLock.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith({ lockAspectRatio: false });
  });

  it('calls onChange when unit is changed', () => {
    const unitSelect = controls.children[3] as HTMLSelectElement;
    unitSelect.value = '%';
    unitSelect.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith({ unit: '%' });
  });

  it('calls onChange when algorithm is changed', () => {
    const algoSelect = controls.children[4] as HTMLSelectElement;
    algoSelect.value = 'bicubic';
    algoSelect.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith({ algorithm: 'bicubic' });
  });

  it('calls onApply when Apply button is clicked', () => {
    const applyBtn = controls.children[5] as HTMLButtonElement;
    applyBtn.click();
    expect(onApply).toHaveBeenCalled();
  });

  it('calls onReset when Reset button is clicked', () => {
    const resetBtn = controls.children[6] as HTMLButtonElement;
    resetBtn.click();
    expect(onReset).toHaveBeenCalled();
  });

  it('updates control values when options change', () => {
    // Simulate re-render with new options
    const newOptions: ResizeOptions = {
      width: 400,
      height: 300,
      lockAspectRatio: false,
      unit: '%',
      algorithm: 'nearest',
    };
    const newControls = createResizeControls({ options: newOptions, onChange, onApply, onReset });
    document.body.appendChild(newControls);
    const [widthInput, heightInput, aspectLock, unitSelect, algoSelect] = newControls.children;
    expect((widthInput as HTMLInputElement).value).toBe('400');
    expect((heightInput as HTMLInputElement).value).toBe('300');
    expect((aspectLock as HTMLInputElement).checked).toBe(false);
    expect((unitSelect as HTMLSelectElement).value).toBe('%');
    expect((algoSelect as HTMLSelectElement).value).toBe('nearest');
    newControls.remove();
  });
});
