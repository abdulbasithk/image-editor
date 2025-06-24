import { CanvasManager } from '../../src/core/CanvasManager';
import { ImageEditor } from '../../src/core/ImageEditor';
import { ResizeTool } from '../../src/tools/ResizeTool';

describe('ResizeTool', () => {
  let canvas: HTMLCanvasElement;
  let canvasManager: CanvasManager;
  let editor: ImageEditor;
  let tool: ResizeTool;

  beforeEach(() => {
    document.body.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    document.body.appendChild(canvas);
    // Minimal container for CanvasManager
    const container = document.createElement('div');
    container.appendChild(canvas);
    canvasManager = new CanvasManager(container, 400, 300, canvas);
    editor = { getCanvasManager: () => canvasManager } as any;
    tool = new ResizeTool(editor as ImageEditor, canvasManager);
  });

  it('should initialize with correct default options', () => {
    const opts = tool.getOptions();
    expect(opts.width).toBe(400);
    expect(opts.height).toBe(300);
    expect(opts.unit).toBe('px');
    expect(opts.lockAspectRatio).toBe(true);
    expect(opts.algorithm).toBe('bicubic');
  });

  it('should update width and maintain aspect ratio when lock is enabled', () => {
    tool.setOptions({ width: 200 });
    const opts = tool.getOptions();
    expect(opts.width).toBe(200);
    expect(opts.height).toBe(Math.round(200 / (400 / 300)));
  });

  it('should update height and maintain aspect ratio when lock is enabled', () => {
    tool.setOptions({ height: 150 });
    const opts = tool.getOptions();
    expect(opts.height).toBe(150);
    expect(opts.width).toBe(Math.round(150 * (400 / 300)));
  });

  it('should allow changing unit and algorithm', () => {
    tool.setOptions({ unit: '%', algorithm: 'nearest' });
    const opts = tool.getOptions();
    expect(opts.unit).toBe('%');
    expect(opts.algorithm).toBe('nearest');
  });

  it('should generate a preview image data on previewResize', () => {
    tool.setOptions({ width: 200, height: 150 });
    expect(() => tool.previewResize()).not.toThrow();
  });

  it('should apply resize and update canvas size', () => {
    tool.setOptions({ lockAspectRatio: false });
    tool.setOptions({ width: 100, height: 50 });
    tool.applyResize();
    expect(canvas.width).toBe(100);
    expect(canvas.height).toBe(50);
  });

  it('should apply resize with aspect ratio lock and update only width', () => {
    tool.setOptions({ lockAspectRatio: true, width: 200 });
    tool.applyResize();
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(Math.round(200 / (400 / 300)));
  });

  it('should apply resize with aspect ratio lock and update only height', () => {
    tool.setOptions({ lockAspectRatio: true, height: 150 });
    tool.applyResize();
    expect(canvas.height).toBe(150);
    expect(canvas.width).toBe(Math.round(150 * (400 / 300)));
  });

  it('should preview resize and set previewImageData', () => {
    tool.setOptions({ width: 120, height: 80 });
    tool.previewResize();
    // previewImageData is private, so we just check no error thrown
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(300);
  });

  it('should reset to original canvas size', () => {
    tool.setOptions({ width: 100, height: 50 });
    tool.reset();
    const opts = tool.getOptions();
    expect(opts.width).toBe(400);
    expect(opts.height).toBe(300);
  });

  it('should toggle aspect ratio lock and allow free resize', () => {
    tool.setOptions({ lockAspectRatio: false });
    tool.setOptions({ width: 123, height: 77 });
    const opts = tool.getOptions();
    expect(opts.width).toBe(123);
    expect(opts.height).toBe(77);
  });
});
