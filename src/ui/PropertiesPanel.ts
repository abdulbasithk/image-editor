/**
 * Properties Panel component for the ImageEditor
 * Provides dynamic tool-specific properties with collapsible sections
 */

import { EventEmitter } from '../core/EventEmitter';

export interface PropertyControl {
  id: string;
  type: 'slider' | 'input' | 'dropdown' | 'checkbox' | 'color' | 'button';
  label: string;
  value?: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: any; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  tooltip?: string;
}

export interface PropertyGroup {
  id: string;
  title: string;
  controls: PropertyControl[];
  collapsed?: boolean;
  icon?: string;
}

export interface ToolProperties {
  toolId: string;
  toolName: string;
  groups: PropertyGroup[];
}

export interface PropertiesPanelConfig {
  width?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  showHeader?: boolean;
  showSearch?: boolean;
  responsive?: boolean;
}

export interface PropertiesPanelEvents {
  propertyChanged: {
    toolId: string;
    controlId: string;
    value: any;
    oldValue: any;
  };
  groupToggled: {
    groupId: string;
    collapsed: boolean;
  };
  panelToggled: {
    collapsed: boolean;
  };
  toolPropertiesLoaded: {
    toolId: string;
    properties: ToolProperties;
  };
}

export class PropertiesPanel extends EventEmitter {
  private container: HTMLElement;
  private config: Required<PropertiesPanelConfig>;
  private panelElement!: HTMLElement;
  private headerElement!: HTMLElement;
  private contentElement!: HTMLElement;
  private searchElement: HTMLElement | null = null;
  private currentToolProperties: ToolProperties | null = null;
  private collapsed = false;
  private propertyValues: Map<string, any> = new Map();

  // Default tool properties for common tools
  private defaultToolProperties: Map<string, ToolProperties> = new Map([
    [
      'select',
      {
        toolId: 'select',
        toolName: 'Selection Tool',
        groups: [
          {
            id: 'selection',
            title: 'Selection',
            controls: [
              {
                id: 'selectionMode',
                type: 'dropdown',
                label: 'Mode',
                value: 'replace',
                options: [
                  { value: 'replace', label: 'Replace' },
                  { value: 'add', label: 'Add to Selection' },
                  { value: 'subtract', label: 'Subtract from Selection' },
                  { value: 'intersect', label: 'Intersect with Selection' },
                ],
              },
              {
                id: 'feather',
                type: 'slider',
                label: 'Feather',
                value: 0,
                min: 0,
                max: 50,
                step: 1,
              },
              {
                id: 'antiAlias',
                type: 'checkbox',
                label: 'Anti-alias',
                value: true,
              },
            ],
          },
        ],
      },
    ],
    [
      'brush',
      {
        toolId: 'brush',
        toolName: 'Brush Tool',
        groups: [
          {
            id: 'brush-settings',
            title: 'Brush Settings',
            controls: [
              {
                id: 'size',
                type: 'slider',
                label: 'Size',
                value: 20,
                min: 1,
                max: 300,
                step: 1,
              },
              {
                id: 'hardness',
                type: 'slider',
                label: 'Hardness',
                value: 100,
                min: 0,
                max: 100,
                step: 1,
              },
              {
                id: 'opacity',
                type: 'slider',
                label: 'Opacity',
                value: 100,
                min: 0,
                max: 100,
                step: 1,
              },
              {
                id: 'flow',
                type: 'slider',
                label: 'Flow',
                value: 100,
                min: 1,
                max: 100,
                step: 1,
              },
            ],
          },
          {
            id: 'color-settings',
            title: 'Color',
            controls: [
              {
                id: 'foregroundColor',
                type: 'color',
                label: 'Foreground',
                value: '#000000',
              },
              {
                id: 'backgroundColor',
                type: 'color',
                label: 'Background',
                value: '#ffffff',
              },
            ],
          },
          {
            id: 'blend-mode',
            title: 'Blending',
            controls: [
              {
                id: 'blendMode',
                type: 'dropdown',
                label: 'Blend Mode',
                value: 'normal',
                options: [
                  { value: 'normal', label: 'Normal' },
                  { value: 'multiply', label: 'Multiply' },
                  { value: 'screen', label: 'Screen' },
                  { value: 'overlay', label: 'Overlay' },
                  { value: 'soft-light', label: 'Soft Light' },
                  { value: 'hard-light', label: 'Hard Light' },
                ],
              },
            ],
          },
        ],
      },
    ],
    [
      'crop',
      {
        toolId: 'crop',
        toolName: 'Crop Tool',
        groups: [
          {
            id: 'crop-settings',
            title: 'Crop Settings',
            controls: [
              {
                id: 'aspectRatio',
                type: 'dropdown',
                label: 'Aspect Ratio',
                value: 'free',
                options: [
                  { value: 'free', label: 'Free' },
                  { value: '1:1', label: '1:1 (Square)' },
                  { value: '4:3', label: '4:3' },
                  { value: '16:9', label: '16:9' },
                  { value: '3:2', label: '3:2' },
                  { value: 'custom', label: 'Custom' },
                ],
              },
              {
                id: 'width',
                type: 'input',
                label: 'Width',
                value: '',
                placeholder: 'px',
              },
              {
                id: 'height',
                type: 'input',
                label: 'Height',
                value: '',
                placeholder: 'px',
              },
              {
                id: 'deleteOutside',
                type: 'checkbox',
                label: 'Delete Cropped Pixels',
                value: true,
              },
            ],
          },
          {
            id: 'crop-guides',
            title: 'Guides',
            controls: [
              {
                id: 'showGuides',
                type: 'checkbox',
                label: 'Show Rule of Thirds',
                value: true,
              },
              {
                id: 'snapToGuides',
                type: 'checkbox',
                label: 'Snap to Guides',
                value: false,
              },
            ],
          },
        ],
      },
    ],
    [
      'text',
      {
        toolId: 'text',
        toolName: 'Text Tool',
        groups: [
          {
            id: 'text-formatting',
            title: 'Text Formatting',
            controls: [
              {
                id: 'fontFamily',
                type: 'dropdown',
                label: 'Font',
                value: 'Arial',
                options: [
                  { value: 'Arial', label: 'Arial' },
                  { value: 'Helvetica', label: 'Helvetica' },
                  { value: 'Times New Roman', label: 'Times New Roman' },
                  { value: 'Georgia', label: 'Georgia' },
                  { value: 'Verdana', label: 'Verdana' },
                  { value: 'Courier New', label: 'Courier New' },
                ],
              },
              {
                id: 'fontSize',
                type: 'slider',
                label: 'Size',
                value: 24,
                min: 8,
                max: 200,
                step: 1,
              },
              {
                id: 'fontWeight',
                type: 'dropdown',
                label: 'Weight',
                value: 'normal',
                options: [
                  { value: 'normal', label: 'Normal' },
                  { value: 'bold', label: 'Bold' },
                  { value: '100', label: 'Thin' },
                  { value: '300', label: 'Light' },
                  { value: '500', label: 'Medium' },
                  { value: '700', label: 'Bold' },
                  { value: '900', label: 'Black' },
                ],
              },
              {
                id: 'textAlign',
                type: 'dropdown',
                label: 'Alignment',
                value: 'left',
                options: [
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Right' },
                  { value: 'justify', label: 'Justify' },
                ],
              },
            ],
          },
          {
            id: 'text-style',
            title: 'Style',
            controls: [
              {
                id: 'textColor',
                type: 'color',
                label: 'Text Color',
                value: '#000000',
              },
              {
                id: 'strokeColor',
                type: 'color',
                label: 'Stroke Color',
                value: '#ffffff',
              },
              {
                id: 'strokeWidth',
                type: 'slider',
                label: 'Stroke Width',
                value: 0,
                min: 0,
                max: 20,
                step: 0.5,
              },
            ],
          },
        ],
      },
    ],
  ]);

  constructor(container: HTMLElement, config: PropertiesPanelConfig = {}) {
    super();
    this.container = container;
    this.config = {
      width: config.width || 280,
      collapsible: config.collapsible ?? true,
      defaultCollapsed: config.defaultCollapsed ?? false,
      showHeader: config.showHeader ?? true,
      showSearch: config.showSearch ?? true,
      responsive: config.responsive ?? true,
    };

    this.collapsed = this.config.defaultCollapsed;
    this.createPanel();
    this.attachEventListeners();
  }

  private createPanel(): void {
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'properties-panel';
    this.panelElement.setAttribute('role', 'complementary');
    this.panelElement.setAttribute('aria-label', 'Properties Panel');

    if (this.config.showHeader) {
      this.createHeader();
    }

    this.createContent();
    this.container.appendChild(this.panelElement);
  }

  private createHeader(): void {
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'properties-panel__header';

    const title = document.createElement('h3');
    title.className = 'properties-panel__title';
    title.textContent = 'Properties';

    if (this.config.collapsible) {
      const toggleButton = document.createElement('button');
      toggleButton.className = 'properties-panel__toggle';
      toggleButton.setAttribute('aria-label', this.collapsed ? 'Expand panel' : 'Collapse panel');
      toggleButton.innerHTML = this.collapsed ? '▶' : '▼';

      toggleButton.addEventListener('click', () => {
        this.togglePanel();
      });

      this.headerElement.appendChild(title);
      this.headerElement.appendChild(toggleButton);
    } else {
      this.headerElement.appendChild(title);
    }

    this.panelElement.appendChild(this.headerElement);
  }

  private createContent(): void {
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'properties-panel__content';
    this.contentElement.style.display = this.collapsed ? 'none' : 'block';

    if (this.config.showSearch) {
      this.createSearchInput();
    }

    this.panelElement.appendChild(this.contentElement);
  }
  private createSearchInput(): void {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'properties-panel__search';

    this.searchElement = document.createElement('input');
    const searchInput = this.searchElement as HTMLInputElement;
    searchInput.type = 'text';
    searchInput.placeholder = 'Search properties...';
    searchInput.className = 'properties-panel__search-input';
    searchInput.setAttribute('aria-label', 'Search properties');

    searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      this.filterProperties(query);
    });

    searchContainer.appendChild(this.searchElement);
    this.contentElement.appendChild(searchContainer);
  }

  private filterProperties(query: string): void {
    if (!this.currentToolProperties) return;

    const groups = this.contentElement.querySelectorAll('.property-group');
    groups.forEach((group) => {
      const groupElement = group as HTMLElement;
      const controls = group.querySelectorAll('.property-control');
      let hasVisibleControls = false;

      controls.forEach((control) => {
        const controlElement = control as HTMLElement;
        const label =
          control.querySelector('.property-control__label')?.textContent?.toLowerCase() || '';
        const isVisible = label.includes(query);

        controlElement.style.display = isVisible ? 'block' : 'none';
        if (isVisible) hasVisibleControls = true;
      });

      groupElement.style.display = hasVisibleControls ? 'block' : 'none';
    });
  }

  public loadToolProperties(toolId: string): void {
    const properties = this.defaultToolProperties.get(toolId);
    if (!properties) {
      this.showEmptyState(toolId);
      return;
    }

    this.currentToolProperties = properties;
    this.renderProperties(properties);
    this.emit('toolPropertiesLoaded', { toolId, properties });
  }
  private showEmptyState(toolId: string): void {
    const searchContainer = this.contentElement.querySelector('.properties-panel__search');
    let nextSibling = searchContainer?.nextSibling;

    // Remove existing content except search
    while (nextSibling) {
      const toRemove = nextSibling;
      const next = nextSibling.nextSibling;
      if (toRemove.nodeType === Node.ELEMENT_NODE) {
        toRemove.parentNode?.removeChild(toRemove);
      }
      nextSibling = next;
    }

    const emptyState = document.createElement('div');
    emptyState.className = 'properties-panel__empty';
    emptyState.innerHTML = `
      <div class="properties-panel__empty-icon">⚙️</div>
      <p>No properties available for ${toolId} tool</p>
    `;

    this.contentElement.appendChild(emptyState);
  }

  private renderProperties(properties: ToolProperties): void {
    // Clear existing content except search
    const searchContainer = this.contentElement.querySelector('.properties-panel__search');
    const children = Array.from(this.contentElement.children);
    children.forEach((child) => {
      if (child !== searchContainer) {
        child.remove();
      }
    });

    properties.groups.forEach((group) => {
      const groupElement = this.createPropertyGroup(group);
      this.contentElement.appendChild(groupElement);
    });
  }

  private createPropertyGroup(group: PropertyGroup): HTMLElement {
    const groupElement = document.createElement('div');
    groupElement.className = 'property-group';
    groupElement.setAttribute('data-group-id', group.id);

    const headerElement = document.createElement('div');
    headerElement.className = 'property-group__header';
    headerElement.setAttribute('role', 'button');
    headerElement.setAttribute('aria-expanded', (!group.collapsed).toString());
    headerElement.setAttribute('tabindex', '0');

    const titleElement = document.createElement('h4');
    titleElement.className = 'property-group__title';
    titleElement.textContent = group.title;

    const toggleElement = document.createElement('span');
    toggleElement.className = 'property-group__toggle';
    toggleElement.innerHTML = group.collapsed ? '▶' : '▼';

    headerElement.appendChild(titleElement);
    headerElement.appendChild(toggleElement);

    const contentElement = document.createElement('div');
    contentElement.className = 'property-group__content';
    contentElement.style.display = group.collapsed ? 'none' : 'block';

    group.controls.forEach((control) => {
      const controlElement = this.createPropertyControl(control);
      contentElement.appendChild(controlElement);
    });

    // Toggle functionality
    const toggleGroup = () => {
      const isCollapsed = contentElement.style.display === 'none';
      contentElement.style.display = isCollapsed ? 'block' : 'none';
      toggleElement.innerHTML = isCollapsed ? '▼' : '▶';
      headerElement.setAttribute('aria-expanded', isCollapsed.toString());

      this.emit('groupToggled', {
        groupId: group.id,
        collapsed: !isCollapsed,
      });
    };

    headerElement.addEventListener('click', toggleGroup);
    headerElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleGroup();
      }
    });

    groupElement.appendChild(headerElement);
    groupElement.appendChild(contentElement);

    return groupElement;
  }

  private createPropertyControl(control: PropertyControl): HTMLElement {
    const controlElement = document.createElement('div');
    controlElement.className = 'property-control';
    controlElement.setAttribute('data-control-id', control.id);

    const labelElement = document.createElement('label');
    labelElement.className = 'property-control__label';
    labelElement.textContent = control.label;
    labelElement.setAttribute('for', `control-${control.id}`);

    let inputElement: HTMLElement;

    switch (control.type) {
      case 'slider':
        inputElement = this.createSliderControl(control);
        break;
      case 'input':
        inputElement = this.createInputControl(control);
        break;
      case 'dropdown':
        inputElement = this.createDropdownControl(control);
        break;
      case 'checkbox':
        inputElement = this.createCheckboxControl(control);
        break;
      case 'color':
        inputElement = this.createColorControl(control);
        break;
      case 'button':
        inputElement = this.createButtonControl(control);
        break;
      default:
        inputElement = this.createInputControl(control);
    }

    if (control.tooltip) {
      controlElement.setAttribute('title', control.tooltip);
    }

    controlElement.appendChild(labelElement);
    controlElement.appendChild(inputElement);

    return controlElement;
  }

  private createSliderControl(control: PropertyControl): HTMLElement {
    const container = document.createElement('div');
    container.className = 'property-control__slider-container';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `control-${control.id}`;
    slider.className = 'property-control__slider';
    slider.min = control.min?.toString() || '0';
    slider.max = control.max?.toString() || '100';
    slider.step = control.step?.toString() || '1';
    slider.value = control.value?.toString() || '0';
    slider.disabled = control.disabled || false;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'property-control__value';
    valueDisplay.textContent = control.value?.toString() || '0';

    slider.addEventListener('input', (e) => {
      const newValue = parseFloat((e.target as HTMLInputElement).value);
      const oldValue = this.propertyValues.get(control.id);
      valueDisplay.textContent = newValue.toString();
      this.propertyValues.set(control.id, newValue);

      this.emit('propertyChanged', {
        toolId: this.currentToolProperties?.toolId || '',
        controlId: control.id,
        value: newValue,
        oldValue,
      });
    });

    container.appendChild(slider);
    container.appendChild(valueDisplay);

    // Store initial value
    this.propertyValues.set(control.id, control.value);

    return container;
  }

  private createInputControl(control: PropertyControl): HTMLElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `control-${control.id}`;
    input.className = 'property-control__input';
    input.value = control.value?.toString() || '';
    input.placeholder = control.placeholder || '';
    input.disabled = control.disabled || false;

    input.addEventListener('change', (e) => {
      const newValue = (e.target as HTMLInputElement).value;
      const oldValue = this.propertyValues.get(control.id);
      this.propertyValues.set(control.id, newValue);

      this.emit('propertyChanged', {
        toolId: this.currentToolProperties?.toolId || '',
        controlId: control.id,
        value: newValue,
        oldValue,
      });
    });

    // Store initial value
    this.propertyValues.set(control.id, control.value);

    return input;
  }

  private createDropdownControl(control: PropertyControl): HTMLElement {
    const select = document.createElement('select');
    select.id = `control-${control.id}`;
    select.className = 'property-control__select';
    select.disabled = control.disabled || false;

    control.options?.forEach((option) => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      optionElement.selected = option.value === control.value;
      select.appendChild(optionElement);
    });

    select.addEventListener('change', (e) => {
      const newValue = (e.target as HTMLSelectElement).value;
      const oldValue = this.propertyValues.get(control.id);
      this.propertyValues.set(control.id, newValue);

      this.emit('propertyChanged', {
        toolId: this.currentToolProperties?.toolId || '',
        controlId: control.id,
        value: newValue,
        oldValue,
      });
    });

    // Store initial value
    this.propertyValues.set(control.id, control.value);

    return select;
  }

  private createCheckboxControl(control: PropertyControl): HTMLElement {
    const container = document.createElement('div');
    container.className = 'property-control__checkbox-container';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `control-${control.id}`;
    checkbox.className = 'property-control__checkbox';
    checkbox.checked = control.value || false;
    checkbox.disabled = control.disabled || false;

    checkbox.addEventListener('change', (e) => {
      const newValue = (e.target as HTMLInputElement).checked;
      const oldValue = this.propertyValues.get(control.id);
      this.propertyValues.set(control.id, newValue);

      this.emit('propertyChanged', {
        toolId: this.currentToolProperties?.toolId || '',
        controlId: control.id,
        value: newValue,
        oldValue,
      });
    });

    container.appendChild(checkbox);

    // Store initial value
    this.propertyValues.set(control.id, control.value);

    return container;
  }

  private createColorControl(control: PropertyControl): HTMLElement {
    const container = document.createElement('div');
    container.className = 'property-control__color-container';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.id = `control-${control.id}`;
    colorInput.className = 'property-control__color';
    colorInput.value = control.value || '#000000';
    colorInput.disabled = control.disabled || false;

    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'property-control__color-text';
    textInput.value = control.value || '#000000';
    textInput.placeholder = '#000000';

    colorInput.addEventListener('change', (e) => {
      const newValue = (e.target as HTMLInputElement).value;
      const oldValue = this.propertyValues.get(control.id);
      textInput.value = newValue;
      this.propertyValues.set(control.id, newValue);

      this.emit('propertyChanged', {
        toolId: this.currentToolProperties?.toolId || '',
        controlId: control.id,
        value: newValue,
        oldValue,
      });
    });

    textInput.addEventListener('change', (e) => {
      const newValue = (e.target as HTMLInputElement).value;
      const oldValue = this.propertyValues.get(control.id);
      colorInput.value = newValue;
      this.propertyValues.set(control.id, newValue);

      this.emit('propertyChanged', {
        toolId: this.currentToolProperties?.toolId || '',
        controlId: control.id,
        value: newValue,
        oldValue,
      });
    });

    container.appendChild(colorInput);
    container.appendChild(textInput);

    // Store initial value
    this.propertyValues.set(control.id, control.value);

    return container;
  }

  private createButtonControl(control: PropertyControl): HTMLElement {
    const button = document.createElement('button');
    button.id = `control-${control.id}`;
    button.className = 'property-control__button';
    button.textContent = control.label;
    button.disabled = control.disabled || false;

    button.addEventListener('click', () => {
      this.emit('propertyChanged', {
        toolId: this.currentToolProperties?.toolId || '',
        controlId: control.id,
        value: 'clicked',
        oldValue: null,
      });
    });

    return button;
  }

  private attachEventListeners(): void {
    // Handle responsive behavior
    if (this.config.responsive) {
      const handleResize = () => {
        const isMobile = window.innerWidth < 768;
        this.panelElement.classList.toggle('properties-panel--mobile', isMobile);
      };

      window.addEventListener('resize', handleResize);
      handleResize(); // Initial check
    }
  }

  public togglePanel(): void {
    this.collapsed = !this.collapsed;
    this.contentElement.style.display = this.collapsed ? 'none' : 'block';

    if (this.headerElement) {
      const toggleButton = this.headerElement.querySelector('.properties-panel__toggle');
      if (toggleButton) {
        toggleButton.innerHTML = this.collapsed ? '▶' : '▼';
        toggleButton.setAttribute('aria-label', this.collapsed ? 'Expand panel' : 'Collapse panel');
      }
    }

    this.panelElement.classList.toggle('properties-panel--collapsed', this.collapsed);
    this.emit('panelToggled', { collapsed: this.collapsed });
  }

  public isCollapsed(): boolean {
    return this.collapsed;
  }

  public setPropertyValue(controlId: string, value: any): void {
    const oldValue = this.propertyValues.get(controlId);
    this.propertyValues.set(controlId, value);

    // Update the UI control
    const controlElement = this.contentElement.querySelector(`[data-control-id="${controlId}"]`);
    if (controlElement) {
      const input = controlElement.querySelector('input, select') as
        | HTMLInputElement
        | HTMLSelectElement;
      if (input) {
        if (input.type === 'checkbox') {
          (input as HTMLInputElement).checked = value;
        } else {
          input.value = value;
        }

        // Update value display for sliders
        if (input.type === 'range') {
          const valueDisplay = controlElement.querySelector('.property-control__value');
          if (valueDisplay) {
            valueDisplay.textContent = value.toString();
          }
        }
      }
    }

    this.emit('propertyChanged', {
      toolId: this.currentToolProperties?.toolId || '',
      controlId,
      value,
      oldValue,
    });
  }

  public getPropertyValue(controlId: string): any {
    return this.propertyValues.get(controlId);
  }

  public getCurrentToolProperties(): ToolProperties | null {
    return this.currentToolProperties;
  }

  public addCustomToolProperties(toolId: string, properties: ToolProperties): void {
    this.defaultToolProperties.set(toolId, properties);
  }

  public removeCustomToolProperties(toolId: string): void {
    this.defaultToolProperties.delete(toolId);
  }

  public destroy(): void {
    this.panelElement.remove();
    this.removeAllListeners();
  }
}
