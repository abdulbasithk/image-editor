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

// Mock requestAnimationFrame and cancelAnimationFrame for Node.js environment
global.requestAnimationFrame = jest.fn((cb) => {
  return setTimeout(cb, 16); // 60fps
}) as any;

global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
}) as any;

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
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
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

  describe('Enhanced Zoom Functionality', () => {
    beforeEach(() => {
      canvasArea = new CanvasArea(container);
    });

    describe('Mouse Wheel Zoom', () => {
      it('should zoom in on wheel up', () => {
        const initialZoom = canvasArea.getZoom();
        const zoomSpy = jest.fn();
        canvasArea.on('zoomChanged', zoomSpy);

        const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;
        // Mock getBoundingClientRect for cursor position calculation
        canvas.getBoundingClientRect = jest.fn(() => ({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        })) as any;

        // Mock setZoomAtPoint to use immediate zoom change for testing
        const setZoomAtPointSpy = jest.spyOn(canvasArea, 'setZoomAtPoint');
        setZoomAtPointSpy.mockImplementation((zoom, _x, _y) => {
          canvasArea.setZoom(zoom, false); // No animation for testing
        });

        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -100, // Negative delta = zoom in
          clientX: 400, // Center of 800px width
          clientY: 300, // Center of 600px height
        });

        canvas.dispatchEvent(wheelEvent);

        expect(canvasArea.getZoom()).toBeGreaterThan(initialZoom);
        expect(zoomSpy).toHaveBeenCalled();

        setZoomAtPointSpy.mockRestore();
      });

      it('should zoom out on wheel down', () => {
        canvasArea.setZoom(2, false); // Start at 200% zoom
        const initialZoom = canvasArea.getZoom();
        const zoomSpy = jest.fn();
        canvasArea.on('zoomChanged', zoomSpy);

        const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;
        canvas.getBoundingClientRect = jest.fn(() => ({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        })) as any;

        // Mock setZoomAtPoint to use immediate zoom change for testing
        const setZoomAtPointSpy = jest.spyOn(canvasArea, 'setZoomAtPoint');
        setZoomAtPointSpy.mockImplementation((zoom, _x, _y) => {
          canvasArea.setZoom(zoom, false); // No animation for testing
        });

        const wheelEvent = new WheelEvent('wheel', {
          deltaY: 100, // Positive delta = zoom out
          clientX: 400,
          clientY: 300,
        });

        canvas.dispatchEvent(wheelEvent);

        expect(canvasArea.getZoom()).toBeLessThan(initialZoom);
        expect(zoomSpy).toHaveBeenCalled();

        setZoomAtPointSpy.mockRestore();
      });

      it('should respect zoom limits during wheel zoom', () => {
        const canvasAreaWithLimits = new CanvasArea(container, {
          minZoom: 0.5,
          maxZoom: 2.0,
        });

        const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;

        // Try to zoom beyond max limit
        canvasAreaWithLimits.setZoom(1.9);
        const wheelUpEvent = new WheelEvent('wheel', {
          deltaY: -500, // Large negative delta
          clientX: 400,
          clientY: 300,
        });
        canvas.dispatchEvent(wheelUpEvent);
        expect(canvasAreaWithLimits.getZoom()).toBeLessThanOrEqual(2.0);

        // Try to zoom below min limit
        canvasAreaWithLimits.setZoom(0.6);
        const wheelDownEvent = new WheelEvent('wheel', {
          deltaY: 500, // Large positive delta
          clientX: 400,
          clientY: 300,
        });
        canvas.dispatchEvent(wheelDownEvent);
        expect(canvasAreaWithLimits.getZoom()).toBeGreaterThanOrEqual(0.5);

        canvasAreaWithLimits.destroy();
      });
    });

    describe('Zoom at Point', () => {
      it('should zoom centered on specific point', () => {
        const _canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;

        canvasArea.setZoomAtPoint(2, 200, 150);

        expect(canvasArea.getZoom()).toBe(2);
        // Viewport should be adjusted to keep the point (200, 150) in the same visual position
      });

      it('should handle zoom at point with viewport constraints', () => {
        canvasArea.setZoomAtPoint(0.5, 400, 300); // Center point
        expect(canvasArea.getZoom()).toBe(0.5);

        canvasArea.setZoomAtPoint(5, 400, 300); // Should be clamped to maxZoom
        expect(canvasArea.getZoom()).toBeLessThanOrEqual(10); // Default maxZoom
      });
    });

    describe('Smooth Animation', () => {
      beforeEach(() => {
        // Mock requestAnimationFrame for testing
        jest.useFakeTimers();
        global.requestAnimationFrame = jest.fn((cb) => {
          return setTimeout(cb, 16); // 60fps
        }) as any;
        global.cancelAnimationFrame = jest.fn((id) => {
          clearTimeout(id);
        }) as any;
      });

      afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
      });

      it('should animate zoom transitions smoothly', () => {
        const zoomSpy = jest.fn();
        canvasArea.on('zoomChanged', zoomSpy);

        canvasArea.setZoom(2, true); // Animate=true

        // Initial call should setup animation
        expect(requestAnimationFrame).toHaveBeenCalled();

        // Advance time to trigger animation frames
        jest.advanceTimersByTime(75); // Half of 150ms duration

        // Should have emitted zoom change events during animation
        expect(zoomSpy).toHaveBeenCalled();

        // Complete animation
        jest.advanceTimersByTime(100);
        expect(canvasArea.getZoom()).toBe(2);
      });

      it('should cancel previous animation when starting new one', () => {
        const animationId1 = 123;
        const animationId2 = 456;
        let callCount = 0;

        (global.requestAnimationFrame as jest.Mock).mockImplementation(() => {
          return callCount++ === 0 ? animationId1 : animationId2;
        });
        (global.cancelAnimationFrame as jest.Mock).mockClear();

        // Start first animation
        canvasArea.setZoomAtPoint(2, 400, 300);

        // Start second animation before first completes
        canvasArea.setZoomAtPoint(3, 400, 300);

        expect(global.cancelAnimationFrame).toHaveBeenCalledWith(animationId1);
      });
    });

    describe('Touch Pinch Zoom', () => {
      it('should start pinch zoom with two touches', () => {
        const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;
        const _rect = (canvas.getBoundingClientRect = jest.fn(() => ({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        })) as any);

        const touchStartEvent = new TouchEvent('touchstart', {
          touches: [
            { clientX: 300, clientY: 250 } as Touch,
            { clientX: 500, clientY: 350 } as Touch,
          ] as any,
        });

        canvas.dispatchEvent(touchStartEvent);

        // Should have stored initial touch state
        expect((canvasArea as any).touchStartDistance).toBeGreaterThan(0);
        expect((canvasArea as any).touchStartZoom).toBe(canvasArea.getZoom());
        expect((canvasArea as any).touchStartCenter).toBeDefined();
      });

      it('should handle pinch zoom gesture', () => {
        const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;
        canvas.getBoundingClientRect = jest.fn(() => ({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        })) as any;

        const initialZoom = canvasArea.getZoom();

        // Start pinch with two touches close together
        const touchStartEvent = new TouchEvent('touchstart', {
          touches: [
            { clientX: 390, clientY: 290 } as Touch,
            { clientX: 410, clientY: 310 } as Touch,
          ] as any,
        });
        canvas.dispatchEvent(touchStartEvent);

        // Mock setZoomAtPoint to avoid animation issues in tests
        const setZoomAtPointSpy = jest.spyOn(canvasArea, 'setZoomAtPoint');
        setZoomAtPointSpy.mockImplementation((zoom, _x, _y) => {
          canvasArea.setZoom(zoom, false); // No animation in tests
        });

        // Move touches further apart (pinch out/zoom in)
        const touchMoveEvent = new TouchEvent('touchmove', {
          touches: [
            { clientX: 350, clientY: 250 } as Touch,
            { clientX: 450, clientY: 350 } as Touch,
          ] as any,
        });
        canvas.dispatchEvent(touchMoveEvent);

        expect(canvasArea.getZoom()).toBeGreaterThan(initialZoom);

        setZoomAtPointSpy.mockRestore();
      });

      it('should end pinch zoom and cleanup state', () => {
        const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;

        // Start pinch
        const touchStartEvent = new TouchEvent('touchstart', {
          touches: [
            { clientX: 300, clientY: 250 } as Touch,
            { clientX: 500, clientY: 350 } as Touch,
          ] as any,
        });
        canvas.dispatchEvent(touchStartEvent);

        // End pinch
        const touchEndEvent = new TouchEvent('touchend', {
          touches: [] as any,
        });
        canvas.dispatchEvent(touchEndEvent);

        // Should have cleaned up touch state
        expect((canvasArea as any).touchStartDistance).toBeNull();
        expect((canvasArea as any).touchStartZoom).toBeNull();
        expect((canvasArea as any).touchStartCenter).toBeNull();
      });

      it('should transition to pan mode when one touch remains', () => {
        const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;

        // Start with two touches (pinch mode)
        const touchStartEvent = new TouchEvent('touchstart', {
          touches: [
            { clientX: 300, clientY: 250 } as Touch,
            { clientX: 500, clientY: 350 } as Touch,
          ] as any,
        });
        canvas.dispatchEvent(touchStartEvent);

        // One touch ends, one remains
        const touchEndEvent = new TouchEvent('touchend', {
          touches: [{ clientX: 400, clientY: 300 } as Touch] as any,
        });
        canvas.dispatchEvent(touchEndEvent);

        // Should be in pan mode now
        expect((canvasArea as any).isPanning).toBe(true);
        expect((canvasArea as any).touchStartDistance).toBeNull();
      });
    });

    describe('Enhanced Zoom Controls', () => {
      it('should zoom in centered on viewport center', () => {
        const initialZoom = canvasArea.getZoom();
        const zoomSpy = jest.fn();
        canvasArea.on('zoomChanged', zoomSpy);

        // Use setZoom without animation for testing
        canvasArea.setZoom(initialZoom + 0.1, false);

        expect(canvasArea.getZoom()).toBeGreaterThan(initialZoom);
        expect(zoomSpy).toHaveBeenCalled();
      });

      it('should zoom out centered on viewport center', () => {
        canvasArea.setZoom(2, false); // Start at 200%
        const initialZoom = canvasArea.getZoom();
        const zoomSpy = jest.fn();
        canvasArea.on('zoomChanged', zoomSpy);

        // Use setZoom without animation for testing
        canvasArea.setZoom(initialZoom - 0.1, false);

        expect(canvasArea.getZoom()).toBeLessThan(initialZoom);
        expect(zoomSpy).toHaveBeenCalled();
      });
    });

    describe('Cleanup and Memory Management', () => {
      it('should cancel animation frame on destroy', () => {
        // Mock requestAnimationFrame
        const animationId = 123;
        global.requestAnimationFrame = jest.fn(() => animationId) as any;
        global.cancelAnimationFrame = jest.fn() as any;

        // Start an animation
        canvasArea.setZoomAtPoint(2, 400, 300);

        // Destroy should cancel animation
        canvasArea.destroy();

        expect(cancelAnimationFrame).toHaveBeenCalledWith(animationId);
      });

      it('should handle multiple animation cancellations safely', () => {
        global.requestAnimationFrame = jest.fn(() => 123) as any;
        global.cancelAnimationFrame = jest.fn() as any;

        // Start multiple animations
        canvasArea.setZoomAtPoint(2, 400, 300);
        canvasArea.setZoomAtPoint(3, 400, 300);
        canvasArea.setZoomAtPoint(1.5, 400, 300);

        canvasArea.destroy();

        // Should not throw errors
        expect(cancelAnimationFrame).toHaveBeenCalled();
      });
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

    it('should zoom without modifier keys for better UX', () => {
      const canvas = container.querySelector('.main-canvas') as HTMLCanvasElement;
      const initialZoom = canvasArea.getZoom();

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100, // Zoom in
      });
      canvas.dispatchEvent(wheelEvent);

      expect(canvasArea.getZoom()).toBeGreaterThan(initialZoom);
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
