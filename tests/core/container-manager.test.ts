import { ContainerManager, ContainerConfig, ResizeEvent } from '../../src/core/ContainerManager';
import { createMockCanvas, createMockContainer } from '../utils/test-helpers';

describe('ContainerManager', () => {
  let container: HTMLElement;
  let canvas: HTMLCanvasElement;
  let containerManager: ContainerManager;
  let resizeCallback: jest.Mock<void, [ResizeEvent]>;

  beforeEach(() => {
    container = createMockContainer();
    canvas = createMockCanvas();
    resizeCallback = jest.fn();

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
      unobserve: jest.fn(),
    }));

    // Mock getComputedStyle
    global.getComputedStyle = jest.fn().mockReturnValue({
      cursor: 'pointer',
    });

    // Mock matchMedia for theme detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    if (containerManager) {
      containerManager.destroy();
    }
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create container manager with default config', () => {
      containerManager = new ContainerManager(container, canvas);

      expect(container.classList.contains('image-editor')).toBe(true);
      expect(container.children.length).toBeGreaterThan(0);
    });

    it('should create container manager with custom config', () => {
      const config: ContainerConfig = {
        resizable: false,
        showHeader: false,
        showToolbar: false,
        showPanel: false,
        title: 'Custom Editor',
        theme: 'dark',
        responsive: false,
      };

      containerManager = new ContainerManager(container, canvas, config);

      expect(container.className).toBe('image-editor');
      expect(container.getAttribute('data-theme')).toBe('dark');
    });

    it('should create proper HTML structure with all components', () => {
      containerManager = new ContainerManager(container, canvas);
      const elements = containerManager.getElements();

      expect(elements.container).toBe(container);
      expect(elements.header).toBeDefined();
      expect(elements.title).toBeDefined();
      expect(elements.actions).toBeDefined();
      expect(elements.content).toBeDefined();
      expect(elements.toolbar).toBeDefined();
      expect(elements.canvasArea).toBeDefined();
      expect(elements.canvasContainer).toBeDefined();
      expect(elements.panel).toBeDefined();
    });

    it('should create minimal structure when components are disabled', () => {
      const config: ContainerConfig = {
        showHeader: false,
        showToolbar: false,
        showPanel: false,
      };

      containerManager = new ContainerManager(container, canvas, config);
      const elements = containerManager.getElements();

      expect(elements.header).toBeUndefined();
      expect(elements.toolbar).toBeUndefined();
      expect(elements.panel).toBeUndefined();
      expect(elements.content).toBeDefined();
      expect(elements.canvasArea).toBeDefined();
    });
  });

  describe('Theme Management', () => {
    beforeEach(() => {
      containerManager = new ContainerManager(container, canvas);
    });

    it('should apply light theme', () => {
      containerManager.setTheme('light');
      expect(container.getAttribute('data-theme')).toBe('light');
    });

    it('should apply dark theme', () => {
      containerManager.setTheme('dark');
      expect(container.getAttribute('data-theme')).toBe('dark');
    });

    it('should handle auto theme with matchMedia', () => {
      // Mock dark mode preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query.includes('dark'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const config: ContainerConfig = { theme: 'auto' };
      containerManager = new ContainerManager(container, canvas, config);

      expect(container.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      containerManager = new ContainerManager(container, canvas, {}, resizeCallback);
    });

    it('should set up ResizeObserver when responsive is enabled', () => {
      expect(global.ResizeObserver).toHaveBeenCalled();
    });

    it('should add mobile class for small widths', () => {
      // Set container to small width
      container.style.width = '500px';

      // Get access to the ResponsiveManager instance and trigger responsive class update
      const responsiveManager = (containerManager as any).responsiveManager;
      responsiveManager.applyResponsiveClasses();

      expect(container.classList.contains('ie-mobile')).toBe(true);
    });

    it('should add tablet class for medium widths', () => {
      // Set container to tablet width
      container.style.width = '800px';

      // Get access to the ResponsiveManager instance and trigger responsive class update
      const responsiveManager = (containerManager as any).responsiveManager;
      responsiveManager.applyResponsiveClasses();

      expect(container.classList.contains('ie-tablet')).toBe(true);
    });

    it('should call resize callback when responsive resize occurs', () => {
      // The ContainerManager creates a ResizeObserver (calls[1]) after ResponsiveManager creates one (calls[0])
      const observerCallback = (global.ResizeObserver as jest.Mock).mock.calls[1][0];
      observerCallback([
        {
          contentRect: { width: 800, height: 600 },
        },
      ]);

      expect(resizeCallback).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        type: 'responsive',
      });
    });
  });

  describe('Manual Resizing', () => {
    beforeEach(() => {
      containerManager = new ContainerManager(
        container,
        canvas,
        { resizable: true },
        resizeCallback,
      );
    });

    it('should create resize handles when resizable is enabled', () => {
      const handles = container.querySelectorAll('.image-editor-resize-handle');
      expect(handles.length).toBe(8); // 4 sides + 4 corners
    });

    it('should start resizing on handle mousedown', () => {
      const handle = container.querySelector('.image-editor-resize-handle.resize-right');
      expect(handle).toBeDefined();

      if (handle) {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 100,
        });

        handle.dispatchEvent(mouseEvent);
        expect(container.classList.contains('resizing')).toBe(true);
      }
    });

    it('should handle resize move correctly', () => {
      // Start resize
      const handle = container.querySelector('.image-editor-resize-handle.resize-right');
      if (handle) {
        const startEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 100,
        });
        handle.dispatchEvent(startEvent);

        // Mock container getBoundingClientRect
        jest.spyOn(container, 'getBoundingClientRect').mockReturnValue({
          width: 800,
          height: 600,
          top: 0,
          left: 0,
          right: 800,
          bottom: 600,
          x: 0,
          y: 0,
          toJSON: jest.fn(),
        });

        // Simulate mouse move
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 100,
        });
        document.dispatchEvent(moveEvent);

        // Check if size was updated
        expect(container.style.width).toBeTruthy();
      }
    });

    it('should stop resizing on mouseup', () => {
      // Start resize
      const handle = container.querySelector('.image-editor-resize-handle.resize-right');
      if (handle) {
        const startEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 100,
        });
        handle.dispatchEvent(startEvent);

        // Stop resize
        const stopEvent = new MouseEvent('mouseup');
        document.dispatchEvent(stopEvent);

        expect(container.classList.contains('resizing')).toBe(false);
      }
    });

    it('should apply size constraints during resize', () => {
      containerManager.setSize(500, 300); // Below minimum
      const size = containerManager.getSize();

      // Should enforce minimum constraints
      expect(size.width).toBeGreaterThanOrEqual(600);
      expect(size.height).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Container Control Methods', () => {
    beforeEach(() => {
      containerManager = new ContainerManager(container, canvas);
    });

    it('should set and get container size', () => {
      containerManager.setSize(1000, 800);
      const size = containerManager.getSize();

      expect(size.width).toBe(1000);
      expect(size.height).toBe(800);
    });

    it('should toggle panel visibility', () => {
      const elements = containerManager.getElements();

      // Panel should be visible by default
      expect(elements.panel?.classList.contains('collapsed')).toBe(false);

      // Toggle to hidden
      containerManager.togglePanel(false);
      expect(elements.panel?.classList.contains('collapsed')).toBe(true);

      // Toggle to visible
      containerManager.togglePanel(true);
      expect(elements.panel?.classList.contains('collapsed')).toBe(false);

      // Auto toggle
      containerManager.togglePanel();
      expect(elements.panel?.classList.contains('collapsed')).toBe(true);
    });

    it('should handle panel toggle when panel is disabled', () => {
      containerManager = new ContainerManager(container, canvas, { showPanel: false });

      // Should not throw error when panel doesn't exist
      expect(() => containerManager.togglePanel()).not.toThrow();
    });

    it('should set loading state', () => {
      containerManager.setLoading(true);
      expect(container.classList.contains('loading')).toBe(true);

      containerManager.setLoading(false);
      expect(container.classList.contains('loading')).toBe(false);
    });

    it('should set title', () => {
      const elements = containerManager.getElements();
      containerManager.setTitle('New Title');

      expect(elements.title?.textContent).toBe('New Title');
    });

    it('should handle title setting when header is disabled', () => {
      containerManager = new ContainerManager(container, canvas, { showHeader: false });

      // Should not throw error when title element doesn't exist
      expect(() => containerManager.setTitle('New Title')).not.toThrow();
    });
  });

  describe('Element Access', () => {
    beforeEach(() => {
      containerManager = new ContainerManager(container, canvas);
    });

    it('should return all container elements', () => {
      const elements = containerManager.getElements();

      expect(elements).toHaveProperty('container');
      expect(elements).toHaveProperty('header');
      expect(elements).toHaveProperty('title');
      expect(elements).toHaveProperty('actions');
      expect(elements).toHaveProperty('content');
      expect(elements).toHaveProperty('toolbar');
      expect(elements).toHaveProperty('canvasArea');
      expect(elements).toHaveProperty('canvasContainer');
      expect(elements).toHaveProperty('canvas');
      expect(elements).toHaveProperty('panel');
    });

    it('should include canvas element in returned elements', () => {
      const elements = containerManager.getElements();
      expect(elements.canvas).toBe(canvas);
    });
  });

  describe('Cleanup and Destruction', () => {
    beforeEach(() => {
      containerManager = new ContainerManager(container, canvas, { responsive: true });
    });

    it('should clean up ResizeObserver on destroy', () => {
      const observerInstance = {
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn(),
      };

      (global.ResizeObserver as jest.Mock).mockReturnValue(observerInstance);

      containerManager = new ContainerManager(container, canvas, { responsive: true });
      containerManager.destroy();

      expect(observerInstance.disconnect).toHaveBeenCalled();
    });

    it('should remove global event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      containerManager.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing canvas gracefully', () => {
      const nullCanvas = null as any;
      expect(() => {
        containerManager = new ContainerManager(container, nullCanvas);
      }).not.toThrow();
    });

    it('should handle resize without callback', () => {
      containerManager = new ContainerManager(container, canvas, { resizable: true });

      // Should not throw when no callback is provided
      const handle = container.querySelector('.image-editor-resize-handle.resize-right');
      if (handle) {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 100,
        });
        handle.dispatchEvent(mouseEvent);

        const stopEvent = new MouseEvent('mouseup');
        document.dispatchEvent(stopEvent);
      }

      expect(() => containerManager.getSize()).not.toThrow();
    });

    it('should handle invalid handle names during resize', () => {
      containerManager = new ContainerManager(container, canvas, { resizable: true });

      // Create a handle with invalid class
      const invalidHandle = document.createElement('div');
      invalidHandle.className = 'image-editor-resize-handle invalid-handle';
      container.appendChild(invalidHandle);

      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
      });

      // Should not throw with invalid handle
      expect(() => invalidHandle.dispatchEvent(mouseEvent)).not.toThrow();
    });
  });

  describe('Accessibility and Standards', () => {
    beforeEach(() => {
      containerManager = new ContainerManager(container, canvas);
    });

    it('should create semantic HTML structure', () => {
      const elements = containerManager.getElements();

      expect(elements.title?.tagName.toLowerCase()).toBe('h1');
      expect(elements.container.className).toContain('image-editor');
      expect(elements.content?.className).toContain('content');
    });

    it('should maintain proper DOM hierarchy', () => {
      const elements = containerManager.getElements();

      expect(elements.container.contains(elements.header!)).toBe(true);
      expect(elements.container.contains(elements.content)).toBe(true);
      expect(elements.content.contains(elements.canvasArea)).toBe(true);
      expect(elements.canvasArea.contains(elements.canvasContainer)).toBe(true);
      expect(elements.canvasContainer.contains(elements.canvas)).toBe(true);
    });
  });
});
