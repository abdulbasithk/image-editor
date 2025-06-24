import { ResizeOptions, ResampleAlgorithm } from '../tools/ResizeTool';

export interface ResizeControlsProps {
  options: ResizeOptions;
  onChange: (options: Partial<ResizeOptions>) => void;
  onApply: () => void;
  onReset: () => void;
}

export function createResizeControls(props: ResizeControlsProps): HTMLElement {
  const container = document.createElement('div');
  container.className = 'resize-controls';

  // Width input
  const widthInput = document.createElement('input');
  widthInput.type = 'number';
  widthInput.value = String(props.options.width);
  widthInput.addEventListener('input', (e) => {
    props.onChange({ width: Number((e.target as HTMLInputElement).value) });
  });

  // Height input
  const heightInput = document.createElement('input');
  heightInput.type = 'number';
  heightInput.value = String(props.options.height);
  heightInput.addEventListener('input', (e) => {
    props.onChange({ height: Number((e.target as HTMLInputElement).value) });
  });

  // Aspect ratio lock
  const aspectLock = document.createElement('input');
  aspectLock.type = 'checkbox';
  aspectLock.checked = props.options.lockAspectRatio;
  aspectLock.addEventListener('change', (e) => {
    props.onChange({ lockAspectRatio: (e.target as HTMLInputElement).checked });
  });

  // Unit select
  const unitSelect = document.createElement('select');
  ['px', '%'].forEach((unit) => {
    const opt = document.createElement('option');
    opt.value = unit;
    opt.textContent = unit;
    if (props.options.unit === unit) opt.selected = true;
    unitSelect.appendChild(opt);
  });
  unitSelect.addEventListener('change', (e) => {
    props.onChange({ unit: (e.target as HTMLSelectElement).value as 'px' | '%' });
  });

  // Algorithm select
  const algoSelect = document.createElement('select');
  [
    { value: 'nearest', label: 'Nearest Neighbor' },
    { value: 'bilinear', label: 'Bilinear' },
    { value: 'bicubic', label: 'Bicubic' },
  ].forEach(({ value, label }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    if (props.options.algorithm === value) opt.selected = true;
    algoSelect.appendChild(opt);
  });
  algoSelect.addEventListener('change', (e) => {
    props.onChange({ algorithm: (e.target as HTMLSelectElement).value as ResampleAlgorithm });
  });

  // Apply and Reset buttons
  const applyBtn = document.createElement('button');
  applyBtn.textContent = 'Apply';
  applyBtn.onclick = props.onApply;
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset';
  resetBtn.onclick = props.onReset;

  // Append all controls
  container.append(widthInput, heightInput, aspectLock, unitSelect, algoSelect, applyBtn, resetBtn);
  return container;
}
