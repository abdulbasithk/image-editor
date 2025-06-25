import { SelectionTool, SelectionArea, SelectionOptions } from '../../src/tools/SelectionTool';
import { ImageEditor } from '../../src/core/ImageEditor';
import { CanvasManager } from '../../src/core/CanvasManager';

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  return setTimeout(callback, 16);
});
global.cancelAnimationFrame = jest.fn((id) => {
  clearTimeout(id);
});

describe('SelectionTool', () => {
  let selectionTool: SelectionTool;
  let editor: ImageEditor;
  let canvasManager: CanvasManager;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create mock canvas and context
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;

    // Create container div
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Initialize ImageEditor with test configuration
    editor = new ImageEditor({
      container: container,
      width: 800,
      height: 600,
      showToolbar: false,
      showPanel: false,
    });

    canvasManager = new CanvasManager(container, 800, 600, mockCanvas);
    selectionTool = new SelectionTool(editor, canvasManager);
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    selectionTool.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize with correct default options', () => {
      const options = selectionTool.getOptions();
      expect(options.strokeColor).toBe('#000');
      expect(options.strokeWidth).toBe(1);
      expect(options.dashLength).toBe(4);
      expect(options.animationSpeed).toBe(50);
      expect(options.snapToPixel).toBe(true);
      expect(options.minSize).toBe(10);
    });

    it('should have correct tool name', () => {
      expect(selectionTool.name).toBe('selection');
    });

    it('should start with no selections', () => {
      expect(selectionTool.getSelections()).toEqual([]);
      expect(selectionTool.getActiveSelection()).toBeNull();
    });
  });

  describe('Options Management', () => {
    it('should update options correctly', () => {
      const newOptions: Partial<SelectionOptions> = {
        strokeColor: '#ff0000',
        strokeWidth: 2,
        dashLength: 8,
        snapToPixel: false,
        minSize: 20,
      };

      selectionTool.setOptions(newOptions);
      const options = selectionTool.getOptions();

      expect(options.strokeColor).toBe('#ff0000');
      expect(options.strokeWidth).toBe(2);
      expect(options.dashLength).toBe(8);
      expect(options.snapToPixel).toBe(false);
      expect(options.minSize).toBe(20);
      expect(options.animationSpeed).toBe(50); // Should preserve existing values
    });

    it('should return a copy of options to prevent mutation', () => {
      const options1 = selectionTool.getOptions();
      const options2 = selectionTool.getOptions();

      options1.strokeColor = '#blue';
      expect(options2.strokeColor).toBe('#000');
    });
  });

  describe('Selection Management', () => {
    it('should clear all selections', () => {
      // Add some mock selections
      const selection1: SelectionArea = { x: 10, y: 10, width: 100, height: 100 };
      const selection2: SelectionArea = { x: 50, y: 50, width: 150, height: 150 };

      // Manually add selections for testing
      (selectionTool as any).selections = [selection1, selection2];
      (selectionTool as any).activeSelection = selection1;

      const emitSpy = jest.spyOn(editor, 'emit');
      selectionTool.clearSelections();

      expect(selectionTool.getSelections()).toEqual([]);
      expect(selectionTool.getActiveSelection()).toBeNull();
      expect(emitSpy).toHaveBeenCalledWith('tool:action', {
        toolName: 'selection',
        action: 'clear',
        data: {},
      });
    });

    it('should select all (entire canvas)', () => {
      const emitSpy = jest.spyOn(editor, 'emit');
      selectionTool.selectAll();

      const selections = selectionTool.getSelections();
      expect(selections).toHaveLength(1);
      expect(selections[0]).toEqual({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      });

      expect(emitSpy).toHaveBeenCalledWith('tool:action', {
        toolName: 'selection',
        action: 'selectAll',
        data: { selection: selections[0] },
      });
    });
    it('should get selection copies to prevent mutation', () => {
      selectionTool.selectAll();
      const selections1 = selectionTool.getSelections();
      const selections2 = selectionTool.getSelections();
      const active1 = selectionTool.getActiveSelection();
      const active2 = selectionTool.getActiveSelection();

      expect(selections1).toHaveLength(1);
      expect(selections2).toHaveLength(1);

      selections1[0]!.x = 999;
      expect(selections2[0]!.x).toBe(0);

      if (active1 && active2) {
        active1.x = 999;
        expect(active2.x).toBe(0);
      }
    });
  });

  describe('Tool Lifecycle', () => {
    it('should activate and create overlay canvas', () => {
      selectionTool.activate();

      // Check if overlay canvas was created
      const overlayCanvas = (selectionTool as any).overlayCanvas;
      expect(overlayCanvas).toBeTruthy();
      expect(overlayCanvas.width).toBe(800);
      expect(overlayCanvas.height).toBe(600);
    });

    it('should deactivate and clean up overlay canvas', () => {
      selectionTool.activate();
      const overlayCanvas = (selectionTool as any).overlayCanvas;

      // Add overlay to DOM for testing
      if (overlayCanvas && mockCanvas.parentNode) {
        mockCanvas.parentNode.appendChild(overlayCanvas);
      }

      selectionTool.deactivate();

      expect((selectionTool as any).overlayCanvas).toBeNull();
      expect((selectionTool as any).overlayContext).toBeNull();
      expect(selectionTool.getSelections()).toEqual([]);
    });

    it('should cleanup properly', () => {
      selectionTool.activate();
      selectionTool.selectAll();

      selectionTool.cleanup();

      expect((selectionTool as any).overlayCanvas).toBeNull();
      expect((selectionTool as any).overlayContext).toBeNull();
      expect(selectionTool.getSelections()).toEqual([]);
      expect((selectionTool as any).animationFrame).toBeNull();
    });
  });

  describe('Mouse Interaction', () => {
    beforeEach(() => {
      selectionTool.activate();
    });

    it('should start new selection on mouse down', () => {
      const point = { x: 100, y: 100 };
      const mockEvent = { ctrlKey: false, metaKey: false } as MouseEvent;

      selectionTool.onMouseDown(point, mockEvent);

      expect((selectionTool as any).isDrawing).toBe(true);
      expect((selectionTool as any).startPoint).toEqual({ x: 100, y: 100 });
      expect(selectionTool.getSelections()).toHaveLength(1);
    });

    it('should update selection during mouse move while drawing', () => {
      const startPoint = { x: 100, y: 100 };
      const movePoint = { x: 200, y: 150 };
      const mockEvent = { ctrlKey: false, metaKey: false } as MouseEvent;

      selectionTool.onMouseDown(startPoint, mockEvent);
      selectionTool.onMouseMove(movePoint, mockEvent);

      const activeSelection = selectionTool.getActiveSelection();
      expect(activeSelection).toBeTruthy();
      expect(activeSelection?.x).toBe(100);
      expect(activeSelection?.y).toBe(100);
      expect(activeSelection?.width).toBe(100);
      expect(activeSelection?.height).toBe(50);
    });

    it('should handle negative dimensions (dragging up or left)', () => {
      const startPoint = { x: 200, y: 150 };
      const movePoint = { x: 100, y: 100 };
      const mockEvent = { ctrlKey: false, metaKey: false } as MouseEvent;

      selectionTool.onMouseDown(startPoint, mockEvent);
      selectionTool.onMouseMove(movePoint, mockEvent);

      const activeSelection = selectionTool.getActiveSelection();
      expect(activeSelection).toBeTruthy();
      expect(activeSelection?.x).toBe(100);
      expect(activeSelection?.y).toBe(100);
      expect(activeSelection?.width).toBe(100);
      expect(activeSelection?.height).toBe(50);
    });

    it('should complete selection on mouse up', () => {
      const startPoint = { x: 100, y: 100 };
      const endPoint = { x: 200, y: 200 };
      const mockEvent = { ctrlKey: false, metaKey: false } as MouseEvent;
      const emitSpy = jest.spyOn(editor, 'emit');

      selectionTool.onMouseDown(startPoint, mockEvent);
      selectionTool.onMouseMove(endPoint, mockEvent);
      selectionTool.onMouseUp(endPoint, mockEvent);

      expect((selectionTool as any).isDrawing).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith('tool:action', {
        toolName: 'selection',
        action: 'created',
        data: { selection: expect.any(Object) },
      });
    });

    it('should remove selections that are too small', () => {
      const startPoint = { x: 100, y: 100 };
      const endPoint = { x: 105, y: 105 }; // Only 5x5 pixels, below minimum
      const mockEvent = { ctrlKey: false, metaKey: false } as MouseEvent;

      selectionTool.onMouseDown(startPoint, mockEvent);
      selectionTool.onMouseMove(endPoint, mockEvent);
      selectionTool.onMouseUp(endPoint, mockEvent);

      expect(selectionTool.getSelections()).toHaveLength(0);
      expect(selectionTool.getActiveSelection()).toBeNull();
    });

    it('should preserve existing selections when Ctrl is held', () => {
      // Create first selection
      const mockEvent1 = { ctrlKey: false, metaKey: false } as MouseEvent;
      selectionTool.onMouseDown({ x: 50, y: 50 }, mockEvent1);
      selectionTool.onMouseMove({ x: 100, y: 100 }, mockEvent1);
      selectionTool.onMouseUp({ x: 100, y: 100 }, mockEvent1);

      expect(selectionTool.getSelections()).toHaveLength(1);

      // Create second selection with Ctrl held
      const mockEvent2 = { ctrlKey: true, metaKey: false } as MouseEvent;
      selectionTool.onMouseDown({ x: 150, y: 150 }, mockEvent2);
      selectionTool.onMouseMove({ x: 200, y: 200 }, mockEvent2);
      selectionTool.onMouseUp({ x: 200, y: 200 }, mockEvent2);

      expect(selectionTool.getSelections()).toHaveLength(2);
    });
  });

  describe('Keyboard Interaction', () => {
    beforeEach(() => {
      selectionTool.activate();
    });

    it('should select all on Ctrl+A', () => {
      const mockEvent = { ctrlKey: true, metaKey: false, preventDefault: jest.fn() } as any;
      const emitSpy = jest.spyOn(editor, 'emit');

      selectionTool.onKeyDown('a', mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(selectionTool.getSelections()).toHaveLength(1);
      expect(emitSpy).toHaveBeenCalledWith('tool:action', {
        toolName: 'selection',
        action: 'selectAll',
        data: { selection: expect.any(Object) },
      });
    });

    it('should clear selections on Escape', () => {
      selectionTool.selectAll();
      expect(selectionTool.getSelections()).toHaveLength(1);

      const mockEvent = {} as KeyboardEvent;
      selectionTool.onKeyDown('Escape', mockEvent);

      expect(selectionTool.getSelections()).toHaveLength(0);
    });

    it('should emit delete event on Delete key', () => {
      selectionTool.selectAll();
      const emitSpy = jest.spyOn(editor, 'emit');
      const mockEvent = {} as KeyboardEvent;

      selectionTool.onKeyDown('Delete', mockEvent);

      expect(emitSpy).toHaveBeenCalledWith('tool:action', {
        toolName: 'selection',
        action: 'delete',
        data: { selection: expect.any(Object) },
      });
    });

    it('should emit apply event on Enter key', () => {
      selectionTool.selectAll();
      const emitSpy = jest.spyOn(editor, 'emit');
      const mockEvent = {} as KeyboardEvent;

      selectionTool.onKeyDown('Enter', mockEvent);

      expect(emitSpy).toHaveBeenCalledWith('tool:action', {
        toolName: 'selection',
        action: 'apply',
        data: { selection: expect.any(Object) },
      });
    });
  });

  describe('Canvas Constraints', () => {
    beforeEach(() => {
      selectionTool.activate();
    });

    it('should constrain selections to canvas bounds', () => {
      const startPoint = { x: 750, y: 550 };
      const endPoint = { x: 900, y: 700 }; // Beyond canvas bounds
      const mockEvent = { ctrlKey: false, metaKey: false } as MouseEvent;

      selectionTool.onMouseDown(startPoint, mockEvent);
      selectionTool.onMouseMove(endPoint, mockEvent);
      selectionTool.onMouseUp(endPoint, mockEvent);

      const activeSelection = selectionTool.getActiveSelection();
      expect(activeSelection).toBeTruthy();
      expect(activeSelection!.x + activeSelection!.width).toBeLessThanOrEqual(800);
      expect(activeSelection!.y + activeSelection!.height).toBeLessThanOrEqual(600);
    });

    it('should enforce minimum selection size', () => {
      selectionTool.setOptions({ minSize: 20 });

      const startPoint = { x: 100, y: 100 };
      const endPoint = { x: 115, y: 115 }; // 15x15, below minimum of 20
      const mockEvent = { ctrlKey: false, metaKey: false } as MouseEvent;

      selectionTool.onMouseDown(startPoint, mockEvent);
      selectionTool.onMouseMove(endPoint, mockEvent);
      selectionTool.onMouseUp(endPoint, mockEvent);

      expect(selectionTool.getSelections()).toHaveLength(0);
    });
  });

  describe('Pixel Snapping', () => {
    beforeEach(() => {
      selectionTool.activate();
    });

    it('should snap to pixels when enabled', () => {
      selectionTool.setOptions({ snapToPixel: true });

      const point = { x: 100.7, y: 150.3 };
      const mockEvent = { ctrlKey: false, metaKey: false } as MouseEvent;

      selectionTool.onMouseDown(point, mockEvent);

      expect((selectionTool as any).startPoint.x).toBe(101);
      expect((selectionTool as any).startPoint.y).toBe(150);
    });

    it('should not snap to pixels when disabled', () => {
      selectionTool.setOptions({ snapToPixel: false });

      const point = { x: 100.7, y: 150.3 };
      const mockEvent = { ctrlKey: false, metaKey: false } as MouseEvent;

      selectionTool.onMouseDown(point, mockEvent);

      expect((selectionTool as any).startPoint.x).toBe(100.7);
      expect((selectionTool as any).startPoint.y).toBe(150.3);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing canvas gracefully', () => {
      const invalidCanvasManager = {
        getCanvas: () => null,
        getContext: () => null,
      } as any;

      const invalidSelectionTool = new SelectionTool(editor, invalidCanvasManager);

      expect(() => {
        invalidSelectionTool.selectAll();
        invalidSelectionTool.onMouseDown({ x: 0, y: 0 }, {} as MouseEvent);
        invalidSelectionTool.onMouseMove({ x: 10, y: 10 }, {} as MouseEvent);
        invalidSelectionTool.onMouseUp({ x: 10, y: 10 }, {} as MouseEvent);
      }).not.toThrow();
    });

    it('should handle activation without canvas', () => {
      const invalidCanvasManager = {
        getCanvas: () => null,
        getContext: () => null,
      } as any;

      const invalidSelectionTool = new SelectionTool(editor, invalidCanvasManager);

      expect(() => {
        invalidSelectionTool.activate();
        invalidSelectionTool.deactivate();
      }).not.toThrow();
    });
  });

  describe('Animation System', () => {
    beforeEach(() => {
      selectionTool.activate();
    });

    it('should start animation on activation', () => {
      expect((selectionTool as any).animationFrame).toBeTruthy();
    });

    it('should stop animation on deactivation', () => {
      selectionTool.deactivate();
      expect((selectionTool as any).animationFrame).toBeNull();
    });

    it('should update dash offset during animation', (done) => {
      const initialOffset = (selectionTool as any).dashOffset;

      setTimeout(() => {
        const currentOffset = (selectionTool as any).dashOffset;
        expect(currentOffset).not.toBe(initialOffset);
        done();
      }, 50);
    });
  });
});
