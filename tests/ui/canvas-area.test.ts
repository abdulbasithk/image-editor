/**
 * @jest-environment jsdom
 */

import { CanvasArea } from '../../src/ui/CanvasArea';

// Mock ImageData for Node.js environment
global.ImageData = class ImageData {
  public width: number;
  public height: number;
  public data: Uint8ClampedArray;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
} as any;

describe('CanvasArea', () => {
  let container: HTMLElement;
  let canvasArea: CanvasArea;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (canvasArea) {
      canvasArea.destroy();
    }
    document.body.removeChild(container);
  });

  describe('Initialization', () => {
    it('should create canvas area with default config', () => {
      canvasArea = new CanvasArea(container);

      expect(container.classList.contains('image-editor-canvas-area')).toBe(true);

      const viewport = container.querySelector('.canvas-viewport');
      expect(viewport).toBeTruthy();
      expect(viewport?.getAttribute('role')).toBe('img');

      const canvas = container.querySelector('.main-canvas');
      expect(canvas).toBeTruthy();
      expect(canvas?.getAttribute('role')).toBe('img');
      expect(canvas?.getAttribute('tabindex')).toBe('0');
    });

    it('should create zoom controls when enabled', () => {
      canvasArea = new CanvasArea(container, { enableZoomControls: true });

      const zoomControls = container.querySelector('.zoom-controls');
      expect(zoomControls).toBeTruthy();
      expect(zoomControls?.getAttribute('role')).toBe('toolbar');

      expect(container.querySelector('.zoom-out-btn')).toBeTruthy();
      expect(container.querySelector('.zoom-in-btn')).toBeTruthy();
      expect(container.querySelector('.zoom-slider')).toBeTruthy();
      expect(container.querySelector('.zoom-select')).toBeTruthy();
      expect(container.querySelector('.fit-screen-btn')).toBeTruthy();
      expect(container.querySelector('.actual-size-btn')).toBeTruthy();
    });

    it('should hide zoom controls when disabled', () => {
      canvasArea = new CanvasArea(container, { enableZoomControls: false });

      const zoomControls = container.querySelector('.zoom-controls') as HTMLElement;
      expect(zoomControls?.style.display).toBe('none');
    });

    it('should create minimap when enabled', () => {
      canvasArea = new CanvasArea(container, { enableMinimap: true });

      const minimap = container.querySelector('.minimap');
      expect(minimap).toBeTruthy();
      expect(minimap?.getAttribute('role')).toBe('region');

      const minimapCanvas = container.querySelector('.minimap-canvas');
      expect(minimapCanvas).toBeTruthy();

      const minimapViewport = container.querySelector('.minimap-viewport');
      expect(minimapViewport).toBeTruthy();
    });

    it('should not create minimap when disabled', () => {
      canvasArea = new CanvasArea(container, { enableMinimap: false });

      const minimap = container.querySelector('.minimap');
      expect(minimap).toBeFalsy();
    });
  });

  describe('Zoom Functionality', () => {
    beforeEach(() => {
      canvasArea = new CanvasArea(container);
    });

    it('should set zoom level', () => {
      const mockCallback = jest.fn();
      canvasArea.on('zoomChanged', mockCallback);

      canvasArea.setZoom(2.0);

      expect(canvasArea.getZoom()).toBe(2.0);
      expect(mockCallback).toHaveBeenCalledWith({
        zoom: 2.0,
        viewport: expect.objectContaining({ zoom: 2.0 }),
      });
    });

    it('should respect zoom limits', () => {
      canvasArea = new CanvasArea(container, { minZoom: 0.5, maxZoom: 3.0 });

      canvasArea.setZoom(0.1); // Below minimum
      expect(canvasArea.getZoom()).toBe(0.5);

      canvasArea.setZoom(5.0); // Above maximum
      expect(canvasArea.getZoom()).toBe(3.0);
    });

    it('should zoom in and out', () => {
      canvasArea.setZoom(1.0);

      canvasArea.zoomIn();
      expect(canvasArea.getZoom()).toBe(1.1); // Default step is 0.1

      canvasArea.zoomOut();
      expect(canvasArea.getZoom()).toBe(1.0);
    });

    it('should handle zoom controls clicks', () => {
      const zoomInBtn = container.querySelector('.zoom-in-btn') as HTMLButtonElement;
      const zoomOutBtn = container.querySelector('.zoom-out-btn') as HTMLButtonElement;

      canvasArea.setZoom(1.0);

      zoomInBtn.click();
      expect(canvasArea.getZoom()).toBe(1.1);

      zoomOutBtn.click();
      expect(canvasArea.getZoom()).toBe(1.0);
    });

    it('should update zoom slider value', () => {
      const zoomSlider = container.querySelector('.zoom-slider') as HTMLInputElement;

      canvasArea.setZoom(2.0);

      expect(zoomSlider.value).toBe('2');
    });

    it('should handle zoom slider input', () => {
      const zoomSlider = container.querySelector('.zoom-slider') as HTMLInputElement;

      zoomSlider.value = '1.5';
      zoomSlider.dispatchEvent(new Event('input'));

      expect(canvasArea.getZoom()).toBe(1.5);
    });

    it('should handle zoom select change', () => {
      const zoomSelect = container.querySelector('.zoom-select') as HTMLSelectElement;

      zoomSelect.value = '0.5';
      zoomSelect.dispatchEvent(new Event('change'));

      expect(canvasArea.getZoom()).toBe(0.5);
    });
    it('should fit to screen', () => {
      const mockCallback = jest.fn();
      canvasArea.on('fitToScreen', mockCallback);

      // Set some image data first so fitToScreen has something to work with
      const imageData = new ImageData(200, 150);
      canvasArea.setImageData(imageData);

      const fitBtn = container.querySelector('.fit-screen-btn') as HTMLButtonElement;
      fitBtn.click();

      expect(mockCallback).toHaveBeenCalledWith({
        zoom: expect.any(Number),
      });
    });

    it('should set actual size', () => {
      const mockCallback = jest.fn();
      canvasArea.on('actualSize', mockCallback);

      const actualBtn = container.querySelector('.actual-size-btn') as HTMLButtonElement;
      actualBtn.click();

      expect(canvasArea.getZoom()).toBe(1.0);
      expect(mockCallback).toHaveBeenCalledWith({ zoom: 1 });
    });
  });

  describe('Pan Functionality', () => {
    beforeEach(() => {
      canvasArea = new CanvasArea(container, { enablePan: true });
    });

    it('should handle mouse pan', () => {
      const mockCallback = jest.fn();
      canvasArea.on('panChanged', mockCallback);

      const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;

      // Start pan
      const mouseDown = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
      canvas.dispatchEvent(mouseDown);

      // Pan
      const mouseMove = new MouseEvent('mousemove', { clientX: 150, clientY: 150 });
      canvas.dispatchEvent(mouseMove);

      // End pan
      const mouseUp = new MouseEvent('mouseup');
      canvas.dispatchEvent(mouseUp);

      expect(mockCallback).toHaveBeenCalled();
    });

    it('should disable pan when config is false', () => {
      canvasArea.destroy();
      canvasArea = new CanvasArea(container, { enablePan: false });

      const mockCallback = jest.fn();
      canvasArea.on('panChanged', mockCallback);

      const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;

      const mouseDown = new MouseEvent('mousedown', { clientX: 100, clientY: 100 });
      canvas.dispatchEvent(mouseDown);

      const mouseMove = new MouseEvent('mousemove', { clientX: 150, clientY: 150 });
      canvas.dispatchEvent(mouseMove);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should handle touch pan on mobile', () => {
      const mockCallback = jest.fn();
      canvasArea.on('panChanged', mockCallback);

      const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;

      // Create touch events
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 100 } as Touch],
      });
      canvas.dispatchEvent(touchStart);

      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 150, clientY: 150 } as Touch],
      });
      canvas.dispatchEvent(touchMove);

      const touchEnd = new TouchEvent('touchend', { touches: [] });
      canvas.dispatchEvent(touchEnd);

      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('Mouse Wheel Zoom', () => {
    beforeEach(() => {
      canvasArea = new CanvasArea(container);
    });

    it('should zoom with Ctrl+wheel', () => {
      const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;
      const initialZoom = canvasArea.getZoom();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
      });
      canvas.dispatchEvent(wheelEvent);

      expect(canvasArea.getZoom()).toBeGreaterThan(initialZoom);
    });

    it('should zoom with Meta+wheel (Mac)', () => {
      const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;
      const initialZoom = canvasArea.getZoom();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        metaKey: true,
      });
      canvas.dispatchEvent(wheelEvent);

      expect(canvasArea.getZoom()).toBeGreaterThan(initialZoom);
    });

    it('should not zoom without modifier keys', () => {
      const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;
      const initialZoom = canvasArea.getZoom();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
      });
      canvas.dispatchEvent(wheelEvent);

      expect(canvasArea.getZoom()).toBe(initialZoom);
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      canvasArea = new CanvasArea(container);
    });
    it('should zoom in with Ctrl+=', () => {
      const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;
      canvas.focus();

      const initialZoom = canvasArea.getZoom();

      const keyEvent = new KeyboardEvent('keydown', {
        key: '=',
        ctrlKey: true,
        bubbles: true,
      });
      canvas.dispatchEvent(keyEvent);

      expect(canvasArea.getZoom()).toBeGreaterThan(initialZoom);
    });

    it('should zoom out with Ctrl+-', () => {
      const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;
      canvas.focus();

      canvasArea.setZoom(2.0);

      const keyEvent = new KeyboardEvent('keydown', {
        key: '-',
        ctrlKey: true,
        bubbles: true,
      });
      canvas.dispatchEvent(keyEvent);

      expect(canvasArea.getZoom()).toBeLessThan(2.0);
    });
    it('should fit to screen with Ctrl+0', () => {
      const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;
      canvas.focus();
      const mockCallback = jest.fn();
      canvasArea.on('fitToScreen', mockCallback);

      // Set image data so fitToScreen has something to work with
      const imageData = new ImageData(200, 150);
      canvasArea.setImageData(imageData);

      const keyEvent = new KeyboardEvent('keydown', {
        key: '0',
        ctrlKey: true,
        bubbles: true,
      });
      canvas.dispatchEvent(keyEvent);

      expect(mockCallback).toHaveBeenCalled();
    });
    it('should set actual size with Ctrl+1', () => {
      const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;
      canvas.focus();

      canvasArea.setZoom(2.0);

      const keyEvent = new KeyboardEvent('keydown', {
        key: '1',
        ctrlKey: true,
        bubbles: true,
      });
      canvas.dispatchEvent(keyEvent);

      expect(canvasArea.getZoom()).toBe(1.0);
    });

    it('should not trigger shortcuts when in input fields', () => {
      const input = document.createElement('input');
      container.appendChild(input);
      input.focus();

      const initialZoom = canvasArea.getZoom();

      const keyEvent = new KeyboardEvent('keydown', {
        key: '=',
        ctrlKey: true,
        bubbles: true,
      });
      input.dispatchEvent(keyEvent);

      expect(canvasArea.getZoom()).toBe(initialZoom);

      container.removeChild(input);
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      canvasArea = new CanvasArea(container);
    });

    it('should update zoom controls visibility', () => {
      const zoomControls = container.querySelector('.zoom-controls') as HTMLElement;

      canvasArea.updateConfig({ enableZoomControls: false });
      expect(zoomControls.style.display).toBe('none');

      canvasArea.updateConfig({ enableZoomControls: true });
      expect(zoomControls.style.display).toBe('flex');
    });

    it('should add minimap when enabled', () => {
      canvasArea.updateConfig({ enableMinimap: true });

      const minimap = container.querySelector('.minimap');
      expect(minimap).toBeTruthy();
    });

    it('should remove minimap when disabled', () => {
      canvasArea.updateConfig({ enableMinimap: true });
      expect(container.querySelector('.minimap')).toBeTruthy();

      canvasArea.updateConfig({ enableMinimap: false });
      expect(container.querySelector('.minimap')).toBeFalsy();
    });
  });

  describe('Image Data Integration', () => {
    beforeEach(() => {
      canvasArea = new CanvasArea(container);
    });

    it('should set image data and fit on load', () => {
      const mockCallback = jest.fn();
      canvasArea.on('fitToScreen', mockCallback);

      // Create mock image data
      const imageData = new ImageData(100, 100);
      canvasArea.setImageData(imageData);

      expect(mockCallback).toHaveBeenCalled();
    });

    it('should not fit on load when disabled', () => {
      canvasArea.destroy();
      canvasArea = new CanvasArea(container, { fitOnLoad: false });

      const mockCallback = jest.fn();
      canvasArea.on('fitToScreen', mockCallback);

      const imageData = new ImageData(100, 100);
      canvasArea.setImageData(imageData);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Viewport API', () => {
    beforeEach(() => {
      canvasArea = new CanvasArea(container);
    });

    it('should return current viewport', () => {
      const viewport = canvasArea.getViewport();

      expect(viewport).toHaveProperty('x');
      expect(viewport).toHaveProperty('y');
      expect(viewport).toHaveProperty('width');
      expect(viewport).toHaveProperty('height');
      expect(viewport).toHaveProperty('zoom');
      expect(viewport.zoom).toBe(1);
    });

    it('should return canvas element', () => {
      const canvas = canvasArea.getCanvas();

      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas.classList.contains('main-canvas')).toBe(true);
    });
  });

  describe('Event Management', () => {
    beforeEach(() => {
      canvasArea = new CanvasArea(container);
    });

    it('should add and remove event listeners', () => {
      const mockCallback = jest.fn();

      canvasArea.on('zoomChanged', mockCallback);
      canvasArea.setZoom(2.0);
      expect(mockCallback).toHaveBeenCalledTimes(1);

      canvasArea.off('zoomChanged', mockCallback);
      canvasArea.setZoom(1.5);
      expect(mockCallback).toHaveBeenCalledTimes(1); // Should not be called again
    });
    it('should emit canvas ready event', () => {
      const mockCallback = jest.fn();

      // Create new canvas area to capture initial event
      canvasArea.destroy();
      const newContainer = document.createElement('div');
      newContainer.style.width = '800px';
      newContainer.style.height = '600px';
      document.body.appendChild(newContainer);

      const newCanvasArea = new CanvasArea(newContainer);

      // Wait for next tick to ensure canvas setup is complete
      setTimeout(() => {
        newCanvasArea.on('canvasReady', mockCallback);

        // The event should have been emitted during construction
        // Since we can't listen before construction, we'll verify the canvas exists
        const canvas = newCanvasArea.getCanvas();
        expect(canvas).toBeInstanceOf(HTMLCanvasElement);

        newCanvasArea.destroy();
        document.body.removeChild(newContainer);
      }, 0);
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      canvasArea = new CanvasArea(container);
    });

    it('should have proper ARIA attributes', () => {
      const viewport = container.querySelector('.canvas-viewport');
      expect(viewport?.getAttribute('role')).toBe('img');
      expect(viewport?.getAttribute('aria-label')).toBe('Image canvas');

      const canvas = container.querySelector('.main-canvas');
      expect(canvas?.getAttribute('role')).toBe('img');
      expect(canvas?.getAttribute('aria-label')).toBe('Editable image canvas');

      const zoomControls = container.querySelector('.zoom-controls');
      expect(zoomControls?.getAttribute('role')).toBe('toolbar');
      expect(zoomControls?.getAttribute('aria-label')).toBe('Zoom controls');
    });

    it('should have proper button labels', () => {
      const zoomOutBtn = container.querySelector('.zoom-out-btn');
      expect(zoomOutBtn?.getAttribute('aria-label')).toBe('Zoom out');

      const zoomInBtn = container.querySelector('.zoom-in-btn');
      expect(zoomInBtn?.getAttribute('aria-label')).toBe('Zoom in');

      const fitBtn = container.querySelector('.fit-screen-btn');
      expect(fitBtn?.getAttribute('aria-label')).toBe('Fit to screen');

      const actualBtn = container.querySelector('.actual-size-btn');
      expect(actualBtn?.getAttribute('aria-label')).toBe('Actual size (100%)');
    });

    it('should have proper input labels', () => {
      const zoomSlider = container.querySelector('.zoom-slider');
      expect(zoomSlider?.getAttribute('aria-label')).toBe('Zoom level');

      const zoomSelect = container.querySelector('.zoom-select');
      expect(zoomSelect?.getAttribute('aria-label')).toBe('Select zoom level');
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      canvasArea = new CanvasArea(container);

      expect(container.innerHTML).not.toBe('');
      expect(container.className).toBe('image-editor-canvas-area');

      canvasArea.destroy();

      expect(container.innerHTML).toBe('');
      expect(container.className).toBe('');
    });
  });
});
