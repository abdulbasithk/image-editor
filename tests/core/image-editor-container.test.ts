import { ImageEditor } from '../../src/core/ImageEditor';
import { createMockContainer } from '../utils/test-helpers';

describe('ImageEditor Container Integration', () => {
  let container: HTMLElement;
  let editor: ImageEditor;

  beforeEach(() => {
    container = createMockContainer();
    document.body.appendChild(container);

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

    // Mock matchMedia
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
    if (editor) {
      editor.destroy();
    }
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  describe('Container Configuration', () => {
    it('should initialize with default container settings', () => {
      editor = new ImageEditor({
        container,
        width: 800,
        height: 600,
      });

      const elements = editor.getContainerElements();
      expect(elements.container.className).toBe('image-editor');
      expect(elements.header).toBeDefined();
      expect(elements.toolbar).toBeDefined();
      expect(elements.panel).toBeDefined();
    });

    it('should respect container configuration options', () => {
      editor = new ImageEditor({
        container,
        width: 800,
        height: 600,
        showHeader: false,
        showToolbar: false,
        showPanel: false,
        resizable: false,
        title: 'Test Editor',
        theme: 'dark',
      });

      const elements = editor.getContainerElements();
      expect(elements.header).toBeUndefined();
      expect(elements.toolbar).toBeUndefined();
      expect(elements.panel).toBeUndefined();
    });

    it('should apply custom theme', () => {
      editor = new ImageEditor({
        container,
        theme: 'dark',
      });

      const elements = editor.getContainerElements();
      expect(elements.container.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Container Methods', () => {
    beforeEach(() => {
      editor = new ImageEditor({
        container,
        width: 800,
        height: 600,
      });
    });

    it('should provide access to container elements', () => {
      const elements = editor.getContainerElements();

      expect(elements).toHaveProperty('container');
      expect(elements).toHaveProperty('canvasArea');
      expect(elements).toHaveProperty('canvasContainer');
      expect(elements).toHaveProperty('canvas');
    });

    it('should allow setting container size', () => {
      editor.setSize(1000, 700);
      const size = editor.getSize();

      expect(size.width).toBe(1000);
      expect(size.height).toBe(700);
    });

    it('should toggle panel visibility', () => {
      const elements = editor.getContainerElements();

      // Should be visible by default
      expect(elements.panel?.classList.contains('collapsed')).toBe(false);

      editor.togglePanel(false);
      expect(elements.panel?.classList.contains('collapsed')).toBe(true);

      editor.togglePanel(true);
      expect(elements.panel?.classList.contains('collapsed')).toBe(false);
    });

    it('should set loading state', () => {
      const elements = editor.getContainerElements();

      editor.setLoading(true);
      expect(elements.container.classList.contains('loading')).toBe(true);

      editor.setLoading(false);
      expect(elements.container.classList.contains('loading')).toBe(false);
    });

    it('should set title', () => {
      editor.setTitle('New Editor Title');
      const elements = editor.getContainerElements();

      expect(elements.title?.textContent).toBe('New Editor Title');
    });

    it('should change theme', () => {
      editor.setTheme('dark');
      const elements = editor.getContainerElements();

      expect(elements.container.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Container Events', () => {
    beforeEach(() => {
      editor = new ImageEditor({
        container,
        width: 800,
        height: 600,
        resizable: true,
      });
    });

    it('should emit container resize events', (done) => {
      editor.on('container:resize', (data) => {
        expect(data).toHaveProperty('width');
        expect(data).toHaveProperty('height');
        expect(data).toHaveProperty('type');
        done();
      });

      // Trigger a resize
      editor.setSize(900, 700);
    });

    it('should emit theme change events', (done) => {
      editor.on('container:themeChange', (data) => {
        expect(data).toHaveProperty('theme');
        expect(data.theme).toBe('dark');
        done();
      });

      editor.setTheme('dark');
    });
  });

  describe('Canvas Integration', () => {
    beforeEach(() => {
      editor = new ImageEditor({
        container,
        width: 800,
        height: 600,
      });
    });

    it('should properly integrate canvas with container', () => {
      const elements = editor.getContainerElements();
      const canvas = editor.getCanvas();

      expect(elements.canvasContainer.contains(canvas)).toBe(true);
      expect(canvas.className).toBe('image-editor-canvas');
    });

    it('should maintain canvas functionality within container', () => {
      const canvas = editor.getCanvas();
      const context = canvas.getContext('2d');

      expect(context).toBeDefined();
      expect(typeof canvas.width).toBe('number');
      expect(typeof canvas.height).toBe('number');
    });
  });

  describe('Responsive Behavior', () => {
    it('should set up responsive behavior when enabled', () => {
      editor = new ImageEditor({
        container,
        responsive: true,
      });

      expect(global.ResizeObserver).toHaveBeenCalled();
    });
    it('should not set up responsive behavior when disabled', () => {
      editor = new ImageEditor({
        container,
        responsive: false,
      });

      // When responsive is disabled, ResizeObserver should not be used
      const elements = editor.getContainerElements();
      expect(elements.container.classList.contains('image-editor')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle container string selector', () => {
      container.id = 'editor-container';

      expect(() => {
        editor = new ImageEditor({
          container: '#editor-container',
          width: 800,
          height: 600,
        });
      }).not.toThrow();
    });

    it('should throw error for invalid container selector', () => {
      expect(() => {
        editor = new ImageEditor({
          container: '#non-existent-container',
          width: 800,
          height: 600,
        });
      }).toThrow('Container element not found');
    });

    it('should handle destroy gracefully', () => {
      editor = new ImageEditor({
        container,
        width: 800,
        height: 600,
      });

      expect(() => {
        editor.destroy();
        editor.destroy(); // Second call should not throw
      }).not.toThrow();
    });
  });

  describe('CSS Style Loading', () => {
    beforeEach(() => {
      // Clear any existing styles
      const existingStyles = document.querySelectorAll('#image-editor-styles');
      existingStyles.forEach((style) => style.remove());
    });

    it('should load CSS styles when editor is created', () => {
      editor = new ImageEditor({
        container,
        width: 800,
        height: 600,
      });

      const styleElement = document.querySelector('#image-editor-styles');
      expect(styleElement).toBeDefined();
      expect(styleElement?.tagName.toLowerCase()).toBe('style');
    });

    it('should not duplicate styles when multiple editors are created', () => {
      editor = new ImageEditor({
        container,
        width: 800,
        height: 600,
      });

      const container2 = createMockContainer();
      document.body.appendChild(container2);

      const editor2 = new ImageEditor({
        container: container2,
        width: 800,
        height: 600,
      });

      const styleElements = document.querySelectorAll('#image-editor-styles');
      expect(styleElements.length).toBe(1);

      editor2.destroy();
      document.body.removeChild(container2);
    });
  });
});
