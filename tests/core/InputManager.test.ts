import { InputManager } from '../../src/core/InputManager';
import { EventEmitter } from '../../src/core/EventEmitter';

describe('InputManager', () => {
  let inputManager: InputManager;
  let eventEmitter: EventEmitter;
  let canvas: HTMLCanvasElement;
  let canvasAddEventListenerSpy: jest.SpyInstance;
  let documentAddEventListenerSpy: jest.SpyInstance;
  let canvasRemoveEventListenerSpy: jest.SpyInstance;
  let documentRemoveEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create real canvas element
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Mock getBoundingClientRect for consistent positioning
    canvas.getBoundingClientRect = jest.fn().mockReturnValue({
      left: 10,
      top: 20,
      width: 800,
      height: 600,
    });

    // Set up spies
    canvasAddEventListenerSpy = jest.spyOn(canvas, 'addEventListener');
    documentAddEventListenerSpy = jest.spyOn(document, 'addEventListener');
    canvasRemoveEventListenerSpy = jest.spyOn(canvas, 'removeEventListener');
    documentRemoveEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    eventEmitter = new EventEmitter();
    inputManager = new InputManager(canvas, eventEmitter);
  });

  afterEach(() => {
    // Clean up spies
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should setup event listeners on canvas and document', () => {
      expect(canvasAddEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(canvasAddEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(canvasAddEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(canvasAddEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function));
      expect(canvasAddEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(canvasAddEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(canvasAddEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
      expect(documentAddEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(documentAddEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    });
  });

  describe('mouse events', () => {
    it('should handle mouse events', () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      // Create a mock mouse event
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 110,
        clientY: 120,
      });

      // Trigger the event by dispatching it to the canvas
      canvas.dispatchEvent(mouseEvent);

      // The InputManager should emit canvas events
      expect(emitSpy).toHaveBeenCalledWith(
        'canvas:mousedown',
        expect.objectContaining({
          point: { x: 100, y: 100 }, // clientX/Y minus canvas offset
          event: mouseEvent,
        }),
      );
    });
  });

  describe('keyboard events', () => {
    it('should handle keyboard events', () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      // Create a mock keyboard event
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'a',
        ctrlKey: true,
      });

      // Trigger the event by dispatching it to the document
      document.dispatchEvent(keyEvent);

      // The InputManager should emit shortcut and keyboard events as per the actual implementation
      expect(emitSpy).toHaveBeenCalledWith(
        'shortcut:pressed',
        expect.objectContaining({
          shortcut: 'Ctrl+a',
          event: keyEvent,
        }),
      );
      expect(emitSpy).toHaveBeenCalledWith(
        'keyboard:down',
        expect.objectContaining({
          key: 'a',
          event: keyEvent,
        }),
      );
    });
  });

  describe('touch events', () => {
    it('should handle touch events', () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      // Create a mock touch event
      const touchEvent = new TouchEvent('touchstart', {
        touches: [
          new Touch({
            identifier: 0,
            target: canvas,
            clientX: 110,
            clientY: 120,
            radiusX: 1,
            radiusY: 1,
            rotationAngle: 0,
            force: 1,
          }),
        ],
      });

      // Trigger the event by dispatching it to the canvas
      canvas.dispatchEvent(touchEvent);

      // The InputManager should emit touch events
      expect(emitSpy).toHaveBeenCalledWith(
        'canvas:touchstart',
        expect.objectContaining({
          point: { x: 100, y: 100 }, // 110 - 10, 120 - 20 (clientX/Y minus rect.left/top)
          event: touchEvent,
        }),
      );
    });
  });

  describe('wheel events', () => {
    it('should handle wheel events', () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      // Create a mock wheel event
      const wheelEvent = new WheelEvent('wheel', {
        clientX: 110,
        clientY: 120,
        deltaY: 100,
      });

      // Trigger the event by dispatching it to the canvas
      canvas.dispatchEvent(wheelEvent);

      // The InputManager should emit wheel events
      expect(emitSpy).toHaveBeenCalledWith(
        'canvas:wheel',
        expect.objectContaining({
          point: { x: 100, y: 100 }, // 110 - 10, 120 - 20 (clientX/Y minus rect.left/top)
          deltaY: 100,
          ctrlKey: false,
          event: wheelEvent,
        }),
      );
    });
  });

  describe('destroy', () => {
    it('should remove all event listeners', () => {
      inputManager.destroy();

      expect(canvasRemoveEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(canvasRemoveEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(canvasRemoveEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(canvasRemoveEventListenerSpy).toHaveBeenCalledWith('wheel', expect.any(Function));
      expect(canvasRemoveEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(canvasRemoveEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(canvasRemoveEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
      expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    });
  });

  describe('coordinate calculation', () => {
    it('should calculate mouse position correctly', () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      // Test different positions
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 60, // canvas left (10) + 50
        clientY: 80, // canvas top (20) + 60
      });

      canvas.dispatchEvent(mouseEvent);

      expect(emitSpy).toHaveBeenCalledWith(
        'canvas:mousedown',
        expect.objectContaining({
          point: { x: 50, y: 60 },
        }),
      );
    });
  });

  describe('throttling', () => {
    it('should throttle mouse move events', () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      // Create multiple mouse move events in quick succession
      for (let i = 0; i < 5; i++) {
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: 110 + i,
          clientY: 120 + i,
        });
        canvas.dispatchEvent(mouseEvent);
      }

      // Due to throttling, not all events should be emitted
      const mouseMoveEmits = emitSpy.mock.calls.filter((call) => call[0] === 'canvas:mousemove');
      expect(mouseMoveEmits.length).toBeLessThan(5);
    });
  });
});
