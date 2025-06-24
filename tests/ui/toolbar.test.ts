/**
 * @jest-environment jsdom
 */

import { Toolbar, ToolbarConfig } from '../../src/ui/Toolbar';
import { defaultToolbarConfig, compactToolbarConfig } from '../../src/ui/ToolbarConfig';

describe('Toolbar', () => {
  let container: HTMLElement;
  let toolbar: Toolbar;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (toolbar) {
      toolbar.destroy();
    }
    document.body.removeChild(container);
  });

  describe('Initialization', () => {
    it('should create toolbar with default config', () => {
      toolbar = new Toolbar(container, defaultToolbarConfig);

      expect(container.classList.contains('image-editor-toolbar')).toBe(true);
      expect(container.getAttribute('role')).toBe('toolbar');
      expect(container.getAttribute('aria-label')).toBe('Image editing tools');
    });

    it('should apply orientation class', () => {
      const config: ToolbarConfig = {
        ...defaultToolbarConfig,
        orientation: 'vertical',
      };
      toolbar = new Toolbar(container, config);

      expect(container.classList.contains('vertical')).toBe(true);
    });

    it('should create tool groups and tools', () => {
      toolbar = new Toolbar(container, defaultToolbarConfig);

      const groups = container.querySelectorAll('.toolbar-group');
      expect(groups.length).toBe(defaultToolbarConfig.groups.length);

      const tools = container.querySelectorAll('.toolbar-tool');
      const expectedToolCount = defaultToolbarConfig.groups.reduce(
        (count, group) => count + group.tools.length,
        0,
      );
      expect(tools.length).toBe(expectedToolCount);
    });

    it('should create separators between groups', () => {
      toolbar = new Toolbar(container, defaultToolbarConfig);

      const separators = container.querySelectorAll('.toolbar-separator');
      const expectedSeparators = defaultToolbarConfig.groups.filter(
        (group, index) => group.separator && index < defaultToolbarConfig.groups.length - 1,
      ).length;
      expect(separators.length).toBe(expectedSeparators);
    });
  });

  describe('Tool Buttons', () => {
    beforeEach(() => {
      toolbar = new Toolbar(container, defaultToolbarConfig);
    });

    it('should create tool buttons with correct attributes', () => {
      const selectTool = container.querySelector('[data-tool="select"]') as HTMLButtonElement;

      expect(selectTool).toBeTruthy();
      expect(selectTool.getAttribute('aria-label')).toBe('Select');
      expect(selectTool.disabled).toBe(false);
    });

    it('should display tool icons', () => {
      const selectTool = container.querySelector('[data-tool="select"]') as HTMLButtonElement;
      const icon = selectTool.querySelector('.toolbar-tool-icon');

      expect(icon).toBeTruthy();
      expect(icon?.innerHTML).toContain('svg');
    });

    it('should handle disabled tools', () => {
      const config: ToolbarConfig = {
        groups: [
          {
            id: 'test',
            name: 'Test',
            tools: [
              {
                id: 'disabled-tool',
                name: 'Disabled',
                icon: '<svg></svg>',
                tooltip: 'Disabled tool',
                disabled: true,
              },
            ],
          },
        ],
      };

      toolbar.destroy();
      toolbar = new Toolbar(container, config);

      const disabledTool = container.querySelector(
        '[data-tool="disabled-tool"]',
      ) as HTMLButtonElement;
      expect(disabledTool.disabled).toBe(true);
    });
  });

  describe('Tool Selection', () => {
    beforeEach(() => {
      toolbar = new Toolbar(container, defaultToolbarConfig);
    });

    it('should select tool programmatically', () => {
      toolbar.selectTool('select');

      const selectTool = container.querySelector('[data-tool="select"]');
      expect(selectTool?.classList.contains('selected')).toBe(true);
      expect(selectTool?.getAttribute('aria-pressed')).toBe('true');
      expect(toolbar.getSelectedTool()).toBe('select');
    });

    it('should deselect previous tool when selecting new one', () => {
      toolbar.selectTool('select');
      toolbar.selectTool('crop');

      const selectTool = container.querySelector('[data-tool="select"]');
      const cropTool = container.querySelector('[data-tool="crop"]');

      expect(selectTool?.classList.contains('selected')).toBe(false);
      expect(selectTool?.getAttribute('aria-pressed')).toBe('false');
      expect(cropTool?.classList.contains('selected')).toBe(true);
      expect(cropTool?.getAttribute('aria-pressed')).toBe('true');
    });

    it('should emit toolSelected event on click', () => {
      const mockCallback = jest.fn();
      toolbar.on('toolSelected', mockCallback);

      const selectTool = container.querySelector('[data-tool="select"]') as HTMLButtonElement;
      selectTool.click();

      expect(mockCallback).toHaveBeenCalledWith({
        toolId: 'select',
        tool: expect.objectContaining({ id: 'select' }),
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      toolbar = new Toolbar(container, defaultToolbarConfig);
    });

    it('should handle single key shortcuts', () => {
      const mockCallback = jest.fn();
      toolbar.on('toolSelected', mockCallback);

      const event = new KeyboardEvent('keydown', { key: 'v' });
      document.dispatchEvent(event);

      expect(mockCallback).toHaveBeenCalledWith({
        toolId: 'select',
        tool: expect.objectContaining({ id: 'select' }),
      });
    });
    it('should handle modifier key shortcuts', () => {
      const mockCallback = jest.fn();
      toolbar.on('toolSelected', mockCallback);

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
      });
      document.dispatchEvent(event);

      expect(mockCallback).toHaveBeenCalledWith({
        toolId: 'undo',
        tool: expect.objectContaining({ id: 'undo' }),
      });
    });
    it('should not trigger shortcuts when typing in input fields', () => {
      const mockCallback = jest.fn();
      toolbar.on('toolSelected', mockCallback);

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'v',
        bubbles: true,
      });

      // Dispatch event from the input element
      input.dispatchEvent(event);

      expect(mockCallback).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });
  });

  describe('Tooltips', () => {
    beforeEach(() => {
      toolbar = new Toolbar(container, defaultToolbarConfig);
    });

    it('should create tooltip element', () => {
      const tooltip = document.querySelector('.toolbar-tooltip');
      expect(tooltip).toBeTruthy();
      expect(tooltip?.getAttribute('role')).toBe('tooltip');
    });

    it('should show tooltip on hover', () => {
      const selectTool = container.querySelector('[data-tool="select"]') as HTMLButtonElement;
      const tooltip = document.querySelector('.toolbar-tooltip') as HTMLElement;

      selectTool.dispatchEvent(new Event('mouseenter'));

      expect(tooltip.style.display).toBe('block');
      expect(tooltip.textContent).toContain('Selection tool');
    });

    it('should hide tooltip on leave', () => {
      const selectTool = container.querySelector('[data-tool="select"]') as HTMLButtonElement;
      const tooltip = document.querySelector('.toolbar-tooltip') as HTMLElement;

      selectTool.dispatchEvent(new Event('mouseenter'));
      selectTool.dispatchEvent(new Event('mouseleave'));

      expect(tooltip.style.display).toBe('none');
    });

    it('should include shortcuts in tooltip text', () => {
      const selectTool = container.querySelector('[data-tool="select"]') as HTMLButtonElement;
      const tooltip = document.querySelector('.toolbar-tooltip') as HTMLElement;

      selectTool.dispatchEvent(new Event('mouseenter'));

      expect(tooltip.textContent).toContain('(V)');
    });
  });

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      toolbar = new Toolbar(container, defaultToolbarConfig);
    });

    it('should add mobile class on small screens', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      window.dispatchEvent(new Event('resize'));

      expect(container.classList.contains('mobile')).toBe(true);
    });

    it('should remove mobile class on large screens', () => {
      // Set mobile first
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });
      window.dispatchEvent(new Event('resize'));

      // Then resize to desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
      window.dispatchEvent(new Event('resize'));

      expect(container.classList.contains('mobile')).toBe(false);
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      toolbar = new Toolbar(container, defaultToolbarConfig);
    });

    it('should update toolbar configuration', () => {
      const originalToolCount = container.querySelectorAll('.toolbar-tool').length;

      toolbar.updateToolConfig(compactToolbarConfig);

      const newToolCount = container.querySelectorAll('.toolbar-tool').length;
      expect(newToolCount).toBeLessThan(originalToolCount);
    });

    it('should enable/disable tools', () => {
      const selectTool = container.querySelector('[data-tool="select"]') as HTMLButtonElement;

      toolbar.setToolEnabled('select', false);
      expect(selectTool.disabled).toBe(true);

      toolbar.setToolEnabled('select', true);
      expect(selectTool.disabled).toBe(false);
    });
  });

  describe('Event Management', () => {
    beforeEach(() => {
      toolbar = new Toolbar(container, defaultToolbarConfig);
    });

    it('should add and remove event listeners', () => {
      const mockCallback = jest.fn();

      toolbar.on('toolSelected', mockCallback);
      toolbar.selectTool('select');
      expect(mockCallback).toHaveBeenCalledTimes(1);

      toolbar.off('toolSelected', mockCallback);
      toolbar.selectTool('crop');
      expect(mockCallback).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should emit hover events', () => {
      const hoverCallback = jest.fn();
      const leaveCallback = jest.fn();

      toolbar.on('toolHover', hoverCallback);
      toolbar.on('toolLeave', leaveCallback);

      const selectTool = container.querySelector('[data-tool="select"]') as HTMLButtonElement;

      selectTool.dispatchEvent(new Event('mouseenter'));
      expect(hoverCallback).toHaveBeenCalledWith({
        toolId: 'select',
        tool: expect.objectContaining({ id: 'select' }),
      });

      selectTool.dispatchEvent(new Event('mouseleave'));
      expect(leaveCallback).toHaveBeenCalledWith({
        toolId: 'select',
        tool: expect.objectContaining({ id: 'select' }),
      });
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      toolbar = new Toolbar(container, defaultToolbarConfig);

      const tooltip = document.querySelector('.toolbar-tooltip');
      expect(tooltip).toBeTruthy();

      toolbar.destroy();

      expect(container.innerHTML).toBe('');
      expect(document.querySelector('.toolbar-tooltip')).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      toolbar = new Toolbar(container, defaultToolbarConfig);
    });

    it('should have proper ARIA attributes', () => {
      expect(container.getAttribute('role')).toBe('toolbar');
      expect(container.getAttribute('aria-label')).toBe('Image editing tools');

      const groups = container.querySelectorAll('.toolbar-group');
      groups.forEach((group) => {
        expect(group.getAttribute('aria-label')).toBeTruthy();
      });

      const tools = container.querySelectorAll('.toolbar-tool');
      tools.forEach((tool) => {
        expect(tool.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('should handle focus events for keyboard navigation', () => {
      const hoverCallback = jest.fn();
      const leaveCallback = jest.fn();

      toolbar.on('toolHover', hoverCallback);
      toolbar.on('toolLeave', leaveCallback);

      const selectTool = container.querySelector('[data-tool="select"]') as HTMLButtonElement;

      selectTool.dispatchEvent(new Event('focus'));
      expect(hoverCallback).toHaveBeenCalled();

      selectTool.dispatchEvent(new Event('blur'));
      expect(leaveCallback).toHaveBeenCalled();
    });

    it('should update aria-pressed for selected tools', () => {
      const selectTool = container.querySelector('[data-tool="select"]') as HTMLButtonElement;

      expect(selectTool.getAttribute('aria-pressed')).toBeFalsy();

      toolbar.selectTool('select');
      expect(selectTool.getAttribute('aria-pressed')).toBe('true');
    });
  });
});
