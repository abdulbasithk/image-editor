/**
 * Test suite for PropertiesPanel component
 */

import { PropertiesPanel, ToolProperties } from '../../src/ui/PropertiesPanel';

// Mock ImageData for Node.js environment
if (typeof ImageData === 'undefined') {
  (global as any).ImageData = class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  };
}

describe('PropertiesPanel', () => {
  let container: HTMLElement;
  let propertiesPanel: PropertiesPanel;

  beforeEach(() => {
    // Create container element
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    if (propertiesPanel) {
      propertiesPanel.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Initialization', () => {
    it('should create properties panel with default configuration', () => {
      propertiesPanel = new PropertiesPanel(container);

      const panelElement = container.querySelector('.properties-panel');
      expect(panelElement).toBeInTheDocument();
      expect(panelElement).toHaveAttribute('role', 'complementary');
      expect(panelElement).toHaveAttribute('aria-label', 'Properties Panel');
    });

    it('should create properties panel with custom configuration', () => {
      propertiesPanel = new PropertiesPanel(container, {
        width: 320,
        collapsible: false,
        showHeader: false,
        showSearch: false,
        responsive: false,
      });

      const panelElement = container.querySelector('.properties-panel');
      expect(panelElement).toBeInTheDocument();

      const headerElement = container.querySelector('.properties-panel__header');
      expect(headerElement).not.toBeInTheDocument();

      const searchElement = container.querySelector('.properties-panel__search');
      expect(searchElement).not.toBeInTheDocument();
    });

    it('should show header when showHeader is true', () => {
      propertiesPanel = new PropertiesPanel(container, { showHeader: true });

      const headerElement = container.querySelector('.properties-panel__header');
      expect(headerElement).toBeInTheDocument();

      const titleElement = container.querySelector('.properties-panel__title');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent('Properties');
    });

    it('should show search input when showSearch is true', () => {
      propertiesPanel = new PropertiesPanel(container, { showSearch: true });

      const searchElement = container.querySelector('.properties-panel__search-input');
      expect(searchElement).toBeInTheDocument();
      expect(searchElement).toHaveAttribute('placeholder', 'Search properties...');
    });

    it('should create toggle button when collapsible is true', () => {
      propertiesPanel = new PropertiesPanel(container, { collapsible: true });

      const toggleButton = container.querySelector('.properties-panel__toggle');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-label');
    });
  });

  describe('Tool Properties Loading', () => {
    beforeEach(() => {
      propertiesPanel = new PropertiesPanel(container);
    });

    it('should load default tool properties for select tool', () => {
      const mockCallback = jest.fn();
      propertiesPanel.on('toolPropertiesLoaded', mockCallback);

      propertiesPanel.loadToolProperties('select');

      expect(mockCallback).toHaveBeenCalledWith({
        toolId: 'select',
        properties: expect.objectContaining({
          toolId: 'select',
          toolName: 'Selection Tool',
          groups: expect.arrayContaining([
            expect.objectContaining({
              id: 'selection',
              title: 'Selection',
              controls: expect.any(Array),
            }),
          ]),
        }),
      });

      const properties = propertiesPanel.getCurrentToolProperties();
      expect(properties).not.toBeNull();
      expect(properties?.toolId).toBe('select');
    });

    it('should load default tool properties for brush tool', () => {
      propertiesPanel.loadToolProperties('brush');

      const properties = propertiesPanel.getCurrentToolProperties();
      expect(properties).not.toBeNull();
      expect(properties?.toolId).toBe('brush');
      expect(properties?.toolName).toBe('Brush Tool');
      expect(properties?.groups).toHaveLength(3); // brush-settings, color-settings, blend-mode
    });

    it('should load default tool properties for crop tool', () => {
      propertiesPanel.loadToolProperties('crop');

      const properties = propertiesPanel.getCurrentToolProperties();
      expect(properties).not.toBeNull();
      expect(properties?.toolId).toBe('crop');
      expect(properties?.toolName).toBe('Crop Tool');
    });

    it('should load default tool properties for text tool', () => {
      propertiesPanel.loadToolProperties('text');

      const properties = propertiesPanel.getCurrentToolProperties();
      expect(properties).not.toBeNull();
      expect(properties?.toolId).toBe('text');
      expect(properties?.toolName).toBe('Text Tool');
    });

    it('should show empty state for unknown tool', () => {
      propertiesPanel.loadToolProperties('unknown');

      const emptyState = container.querySelector('.properties-panel__empty');
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent('No properties available for unknown tool');
    });
  });

  describe('Property Groups Rendering', () => {
    beforeEach(() => {
      propertiesPanel = new PropertiesPanel(container);
      propertiesPanel.loadToolProperties('brush');
    });

    it('should render property groups', () => {
      const groups = container.querySelectorAll('.property-group');
      expect(groups.length).toBeGreaterThan(0);
      const firstGroup = groups[0];
      expect(firstGroup).toHaveAttribute('data-group-id');

      const header = firstGroup?.querySelector('.property-group__header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveAttribute('role', 'button');
      expect(header).toHaveAttribute('aria-expanded', 'true');

      const title = firstGroup?.querySelector('.property-group__title');
      expect(title).toBeInTheDocument();

      const toggle = firstGroup?.querySelector('.property-group__toggle');
      expect(toggle).toBeInTheDocument();

      const content = firstGroup?.querySelector('.property-group__content');
      expect(content).toBeInTheDocument();
    });

    it('should toggle group visibility when header is clicked', () => {
      const firstGroup = container.querySelector('.property-group');
      const header = firstGroup?.querySelector('.property-group__header') as HTMLElement;
      const content = firstGroup?.querySelector('.property-group__content') as HTMLElement;
      const toggle = firstGroup?.querySelector('.property-group__toggle') as HTMLElement;

      expect(content.style.display).toBe('block');
      expect(toggle.innerHTML).toBe('▼');

      // Click to collapse
      header.click();

      expect(content.style.display).toBe('none');
      expect(toggle.innerHTML).toBe('▶');
      expect(header).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      header.click();

      expect(content.style.display).toBe('block');
      expect(toggle.innerHTML).toBe('▼');
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('should emit groupToggled event when group is toggled', () => {
      const mockCallback = jest.fn();
      propertiesPanel.on('groupToggled', mockCallback);

      const firstGroup = container.querySelector('.property-group');
      const header = firstGroup?.querySelector('.property-group__header') as HTMLElement;

      header.click();

      expect(mockCallback).toHaveBeenCalledWith({
        groupId: expect.any(String),
        collapsed: true,
      });
    });
  });

  describe('Property Controls', () => {
    beforeEach(() => {
      propertiesPanel = new PropertiesPanel(container);
      propertiesPanel.loadToolProperties('brush');
    });

    it('should render slider controls', () => {
      const sliderControl = container.querySelector('[data-control-id="size"]');
      expect(sliderControl).toBeInTheDocument();

      const label = sliderControl?.querySelector('.property-control__label');
      expect(label).toHaveTextContent('Size');

      const slider = sliderControl?.querySelector('.property-control__slider') as HTMLInputElement;
      expect(slider).toBeInTheDocument();
      expect(slider.type).toBe('range');
      expect(slider.min).toBe('1');
      expect(slider.max).toBe('300');
      expect(slider.value).toBe('20');

      const valueDisplay = sliderControl?.querySelector('.property-control__value');
      expect(valueDisplay).toBeInTheDocument();
      expect(valueDisplay).toHaveTextContent('20');
    });

    it('should render dropdown controls', () => {
      const dropdownControl = container.querySelector('[data-control-id="blendMode"]');
      expect(dropdownControl).toBeInTheDocument();

      const label = dropdownControl?.querySelector('.property-control__label');
      expect(label).toHaveTextContent('Blend Mode');

      const select = dropdownControl?.querySelector(
        '.property-control__select',
      ) as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('normal');

      const options = select.querySelectorAll('option');
      expect(options.length).toBeGreaterThan(1);
    });

    it('should render color controls', () => {
      const colorControl = container.querySelector('[data-control-id="foregroundColor"]');
      expect(colorControl).toBeInTheDocument();

      const label = colorControl?.querySelector('.property-control__label');
      expect(label).toHaveTextContent('Foreground');

      const colorInput = colorControl?.querySelector(
        '.property-control__color',
      ) as HTMLInputElement;
      expect(colorInput).toBeInTheDocument();
      expect(colorInput.type).toBe('color');
      expect(colorInput.value).toBe('#000000');

      const textInput = colorControl?.querySelector(
        '.property-control__color-text',
      ) as HTMLInputElement;
      expect(textInput).toBeInTheDocument();
      expect(textInput.value).toBe('#000000');
    });

    it('should emit propertyChanged event when slider value changes', () => {
      const mockCallback = jest.fn();
      propertiesPanel.on('propertyChanged', mockCallback);

      const sliderControl = container.querySelector('[data-control-id="size"]');
      const slider = sliderControl?.querySelector('.property-control__slider') as HTMLInputElement;

      // Change slider value
      slider.value = '50';
      slider.dispatchEvent(new Event('input', { bubbles: true }));

      expect(mockCallback).toHaveBeenCalledWith({
        toolId: 'brush',
        controlId: 'size',
        value: 50,
        oldValue: 20,
      });

      const valueDisplay = sliderControl?.querySelector('.property-control__value');
      expect(valueDisplay).toHaveTextContent('50');
    });

    it('should emit propertyChanged event when dropdown value changes', () => {
      const mockCallback = jest.fn();
      propertiesPanel.on('propertyChanged', mockCallback);

      const dropdownControl = container.querySelector('[data-control-id="blendMode"]');
      const select = dropdownControl?.querySelector(
        '.property-control__select',
      ) as HTMLSelectElement;

      // Change dropdown value
      select.value = 'multiply';
      select.dispatchEvent(new Event('change', { bubbles: true }));

      expect(mockCallback).toHaveBeenCalledWith({
        toolId: 'brush',
        controlId: 'blendMode',
        value: 'multiply',
        oldValue: 'normal',
      });
    });

    it('should emit propertyChanged event when color value changes', () => {
      const mockCallback = jest.fn();
      propertiesPanel.on('propertyChanged', mockCallback);

      const colorControl = container.querySelector('[data-control-id="foregroundColor"]');
      const colorInput = colorControl?.querySelector(
        '.property-control__color',
      ) as HTMLInputElement;

      // Change color value
      colorInput.value = '#ff0000';
      colorInput.dispatchEvent(new Event('change', { bubbles: true }));

      expect(mockCallback).toHaveBeenCalledWith({
        toolId: 'brush',
        controlId: 'foregroundColor',
        value: '#ff0000',
        oldValue: '#000000',
      });

      const textInput = colorControl?.querySelector(
        '.property-control__color-text',
      ) as HTMLInputElement;
      expect(textInput.value).toBe('#ff0000');
    });
  });

  describe('Panel Toggle Functionality', () => {
    beforeEach(() => {
      propertiesPanel = new PropertiesPanel(container, { collapsible: true });
    });

    it('should toggle panel visibility', () => {
      const contentElement = container.querySelector('.properties-panel__content') as HTMLElement;
      const toggleButton = container.querySelector('.properties-panel__toggle') as HTMLElement;

      expect(propertiesPanel.isCollapsed()).toBe(false);
      expect(contentElement.style.display).toBe('block');
      expect(toggleButton.innerHTML).toBe('▼');

      // Toggle to collapsed
      propertiesPanel.togglePanel();

      expect(propertiesPanel.isCollapsed()).toBe(true);
      expect(contentElement.style.display).toBe('none');
      expect(toggleButton.innerHTML).toBe('▶');

      // Toggle back to expanded
      propertiesPanel.togglePanel();

      expect(propertiesPanel.isCollapsed()).toBe(false);
      expect(contentElement.style.display).toBe('block');
      expect(toggleButton.innerHTML).toBe('▼');
    });

    it('should emit panelToggled event when panel is toggled', () => {
      const mockCallback = jest.fn();
      propertiesPanel.on('panelToggled', mockCallback);

      propertiesPanel.togglePanel();

      expect(mockCallback).toHaveBeenCalledWith({ collapsed: true });

      propertiesPanel.togglePanel();

      expect(mockCallback).toHaveBeenCalledWith({ collapsed: false });
    });

    it('should toggle panel when toggle button is clicked', () => {
      const toggleButton = container.querySelector('.properties-panel__toggle') as HTMLElement;

      expect(propertiesPanel.isCollapsed()).toBe(false);

      toggleButton.click();

      expect(propertiesPanel.isCollapsed()).toBe(true);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      propertiesPanel = new PropertiesPanel(container, { showSearch: true });
      propertiesPanel.loadToolProperties('brush');
    });

    it('should filter properties based on search query', () => {
      const searchInput = container.querySelector(
        '.properties-panel__search-input',
      ) as HTMLInputElement;

      // Initially all controls should be visible
      const allControls = container.querySelectorAll('.property-control');
      allControls.forEach((control) => {
        expect((control as HTMLElement).style.display).not.toBe('none');
      });

      // Search for 'size'
      searchInput.value = 'size';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));

      // Only size control should be visible
      const sizeControl = container.querySelector('[data-control-id="size"]') as HTMLElement;
      expect(sizeControl.style.display).not.toBe('none');

      const hardnessControl = container.querySelector(
        '[data-control-id="hardness"]',
      ) as HTMLElement;
      expect(hardnessControl.style.display).toBe('none');
    });

    it('should hide groups with no visible controls', () => {
      const searchInput = container.querySelector(
        '.properties-panel__search-input',
      ) as HTMLInputElement;

      // Search for something that doesn't exist
      searchInput.value = 'nonexistent';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));

      // All groups should be hidden
      const groups = container.querySelectorAll('.property-group');
      groups.forEach((group) => {
        expect((group as HTMLElement).style.display).toBe('none');
      });
    });
  });

  describe('Property Value Management', () => {
    beforeEach(() => {
      propertiesPanel = new PropertiesPanel(container);
      propertiesPanel.loadToolProperties('brush');
    });

    it('should get property values', () => {
      const sizeValue = propertiesPanel.getPropertyValue('size');
      expect(sizeValue).toBe(20);

      const blendModeValue = propertiesPanel.getPropertyValue('blendMode');
      expect(blendModeValue).toBe('normal');
    });

    it('should set property values programmatically', () => {
      const mockCallback = jest.fn();
      propertiesPanel.on('propertyChanged', mockCallback);

      propertiesPanel.setPropertyValue('size', 100);

      expect(propertiesPanel.getPropertyValue('size')).toBe(100);
      expect(mockCallback).toHaveBeenCalledWith({
        toolId: 'brush',
        controlId: 'size',
        value: 100,
        oldValue: 20,
      });

      // Check that UI is updated
      const sliderControl = container.querySelector('[data-control-id="size"]');
      const slider = sliderControl?.querySelector('.property-control__slider') as HTMLInputElement;
      const valueDisplay = sliderControl?.querySelector('.property-control__value');

      expect(slider.value).toBe('100');
      expect(valueDisplay).toHaveTextContent('100');
    });
  });

  describe('Custom Tool Properties', () => {
    beforeEach(() => {
      propertiesPanel = new PropertiesPanel(container);
    });

    it('should add custom tool properties', () => {
      const customProperties: ToolProperties = {
        toolId: 'custom',
        toolName: 'Custom Tool',
        groups: [
          {
            id: 'custom-group',
            title: 'Custom Settings',
            controls: [
              {
                id: 'customControl',
                type: 'slider',
                label: 'Custom Control',
                value: 50,
                min: 0,
                max: 100,
                step: 1,
              },
            ],
          },
        ],
      };

      propertiesPanel.addCustomToolProperties('custom', customProperties);
      propertiesPanel.loadToolProperties('custom');

      const properties = propertiesPanel.getCurrentToolProperties();
      expect(properties?.toolId).toBe('custom');
      expect(properties?.toolName).toBe('Custom Tool');

      const customControl = container.querySelector('[data-control-id="customControl"]');
      expect(customControl).toBeInTheDocument();
    });

    it('should remove custom tool properties', () => {
      const customProperties: ToolProperties = {
        toolId: 'custom',
        toolName: 'Custom Tool',
        groups: [],
      };

      propertiesPanel.addCustomToolProperties('custom', customProperties);
      propertiesPanel.removeCustomToolProperties('custom');
      propertiesPanel.loadToolProperties('custom');

      const emptyState = container.querySelector('.properties-panel__empty');
      expect(emptyState).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      propertiesPanel = new PropertiesPanel(container);
      propertiesPanel.loadToolProperties('brush');
    });

    it('should have proper ARIA attributes', () => {
      const panelElement = container.querySelector('.properties-panel');
      expect(panelElement).toHaveAttribute('role', 'complementary');
      expect(panelElement).toHaveAttribute('aria-label', 'Properties Panel');

      const groupHeaders = container.querySelectorAll('.property-group__header');
      groupHeaders.forEach((header) => {
        expect(header).toHaveAttribute('role', 'button');
        expect(header).toHaveAttribute('aria-expanded');
        expect(header).toHaveAttribute('tabindex', '0');
      });
    });

    it('should handle keyboard navigation for group toggle', () => {
      const firstGroup = container.querySelector('.property-group');
      const header = firstGroup?.querySelector('.property-group__header') as HTMLElement;
      const content = firstGroup?.querySelector('.property-group__content') as HTMLElement;

      // Test Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      header.dispatchEvent(enterEvent);

      expect(content.style.display).toBe('none');

      // Test Space key
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
      header.dispatchEvent(spaceEvent);

      expect(content.style.display).toBe('block');
    });

    it('should have proper labels for form controls', () => {
      const controls = container.querySelectorAll('.property-control');
      controls.forEach((control) => {
        const label = control.querySelector('.property-control__label');
        const input = control.querySelector('input, select');

        expect(label).toBeInTheDocument();
        if (input && label) {
          const labelFor = label.getAttribute('for');
          const inputId = input.getAttribute('id');
          expect(labelFor).toBe(inputId);
        }
      });
    });
  });

  describe('Destroy', () => {
    it('should clean up properly when destroyed', () => {
      propertiesPanel = new PropertiesPanel(container);

      const panelElement = container.querySelector('.properties-panel');
      expect(panelElement).toBeInTheDocument();

      propertiesPanel.destroy();

      const panelElementAfterDestroy = container.querySelector('.properties-panel');
      expect(panelElementAfterDestroy).not.toBeInTheDocument();
    });
  });
});
