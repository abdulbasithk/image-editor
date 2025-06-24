/**
 * Toolbar component for the ImageEditor
 * Provides tool selection, tooltips, and responsive behavior
 */

export interface ToolbarTool {
  id: string;
  name: string;
  icon: string;
  tooltip: string;
  shortcut?: string;
  group?: string;
  disabled?: boolean;
}

export interface ToolbarGroup {
  id: string;
  name: string;
  tools: ToolbarTool[];
  separator?: boolean;
}

export interface ToolbarConfig {
  groups: ToolbarGroup[];
  showTooltips?: boolean;
  showShortcuts?: boolean;
  responsive?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export interface ToolbarEvents {
  toolSelected: { toolId: string; tool: ToolbarTool };
  toolHover: { toolId: string; tool: ToolbarTool };
  toolLeave: { toolId: string; tool: ToolbarTool };
}

export class Toolbar {
  private container: HTMLElement;
  private config: ToolbarConfig;
  private selectedTool: string | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private tooltipElement: HTMLElement | null = null;
  private isMobile = false;

  constructor(container: HTMLElement, config: ToolbarConfig) {
    this.container = container;
    this.config = {
      showTooltips: true,
      showShortcuts: true,
      responsive: true,
      orientation: 'horizontal',
      ...config,
    };

    this.init();
  }

  private init(): void {
    this.setupContainer();
    this.createToolbar();
    this.setupEventListeners();
    this.setupResponsive();
    this.createTooltip();
  }

  private setupContainer(): void {
    this.container.className = `image-editor-toolbar ${this.config.orientation}`;
    this.container.setAttribute('role', 'toolbar');
    this.container.setAttribute('aria-label', 'Image editing tools');
  }

  private createToolbar(): void {
    this.config.groups.forEach((group, groupIndex) => {
      const groupElement = this.createToolGroup(group);
      this.container.appendChild(groupElement);

      // Add separator after group (except last group)
      if (group.separator && groupIndex < this.config.groups.length - 1) {
        const separator = this.createSeparator();
        this.container.appendChild(separator);
      }
    });
  }

  private createToolGroup(group: ToolbarGroup): HTMLElement {
    const groupElement = document.createElement('div');
    groupElement.className = 'toolbar-group';
    groupElement.setAttribute('data-group', group.id);
    groupElement.setAttribute('aria-label', group.name);

    group.tools.forEach((tool) => {
      const toolButton = this.createToolButton(tool);
      groupElement.appendChild(toolButton);
    });

    return groupElement;
  }

  private createToolButton(tool: ToolbarTool): HTMLElement {
    const button = document.createElement('button');
    button.className = 'toolbar-tool';
    button.setAttribute('data-tool', tool.id);
    button.setAttribute('aria-label', tool.name);
    button.setAttribute('title', this.getTooltipText(tool));
    button.disabled = tool.disabled || false;

    // Create icon
    const icon = document.createElement('span');
    icon.className = 'toolbar-tool-icon';
    icon.innerHTML = tool.icon;
    button.appendChild(icon);

    // Create label for mobile
    const label = document.createElement('span');
    label.className = 'toolbar-tool-label';
    label.textContent = tool.name;
    button.appendChild(label);

    // Add keyboard shortcut display
    if (tool.shortcut && this.config.showShortcuts) {
      const shortcut = document.createElement('span');
      shortcut.className = 'toolbar-tool-shortcut';
      shortcut.textContent = tool.shortcut;
      button.appendChild(shortcut);
    }

    // Add event listeners
    button.addEventListener('click', (e) => this.handleToolClick(e, tool));
    button.addEventListener('mouseenter', (e) => this.handleToolHover(e, tool));
    button.addEventListener('mouseleave', (e) => this.handleToolLeave(e, tool));
    button.addEventListener('focus', (e) => this.handleToolHover(e, tool));
    button.addEventListener('blur', (e) => this.handleToolLeave(e, tool));

    return button;
  }

  private createSeparator(): HTMLElement {
    const separator = document.createElement('div');
    separator.className = 'toolbar-separator';
    separator.setAttribute('role', 'separator');
    return separator;
  }

  private createTooltip(): void {
    if (!this.config.showTooltips) return;

    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'toolbar-tooltip';
    this.tooltipElement.setAttribute('role', 'tooltip');
    document.body.appendChild(this.tooltipElement);
  }

  private getTooltipText(tool: ToolbarTool): string {
    let text = tool.tooltip || tool.name;
    if (tool.shortcut && this.config.showShortcuts) {
      text += ` (${tool.shortcut})`;
    }
    return text;
  }

  private handleToolClick(event: Event, tool: ToolbarTool): void {
    event.preventDefault();

    if (tool.disabled) return;

    this.selectTool(tool.id);
    this.emit('toolSelected', { toolId: tool.id, tool });
  }

  private handleToolHover(event: Event, tool: ToolbarTool): void {
    this.showTooltip(event.target as HTMLElement, tool);
    this.emit('toolHover', { toolId: tool.id, tool });
  }

  private handleToolLeave(event: Event, tool: ToolbarTool): void {
    this.hideTooltip();
    this.emit('toolLeave', { toolId: tool.id, tool });
  }

  private showTooltip(target: HTMLElement, tool: ToolbarTool): void {
    if (!this.tooltipElement || this.isMobile) return;

    const tooltipText = this.getTooltipText(tool);
    this.tooltipElement.textContent = tooltipText;
    this.tooltipElement.style.display = 'block';

    // Position tooltip
    const rect = target.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();

    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    let top = rect.top - tooltipRect.height - 8;

    // Adjust for screen bounds
    if (left < 8) left = 8;
    if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8;
    }
    if (top < 8) {
      top = rect.bottom + 8;
    }

    this.tooltipElement.style.left = `${left}px`;
    this.tooltipElement.style.top = `${top}px`;
  }

  private hideTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.style.display = 'none';
    }
  }

  private setupEventListeners(): void {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // Hide tooltip on scroll
    window.addEventListener('scroll', () => this.hideTooltip());
    window.addEventListener('resize', () => this.hideTooltip());
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Check if we should handle this event (not in an input field)
    const target = event.target as any;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        (target as HTMLElement).isContentEditable)
    ) {
      return;
    }

    // Find tool with matching shortcut
    for (const group of this.config.groups) {
      for (const tool of group.tools) {
        if (tool.shortcut && this.matchesShortcut(event, tool.shortcut)) {
          event.preventDefault();
          this.selectTool(tool.id);
          return;
        }
      }
    }
  }
  private matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
    // Handle special case for + and - keys
    if (shortcut === 'Ctrl++' || shortcut === 'Cmd++') {
      return event.key === '+' && (event.ctrlKey || event.metaKey);
    }
    if (shortcut === 'Ctrl+-' || shortcut === 'Cmd+-') {
      return event.key === '-' && (event.ctrlKey || event.metaKey);
    }

    const parts = shortcut.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1);

    // Handle special keys
    const eventKey = event.key.toLowerCase();
    const targetKey = key;

    // Check key match
    const keyMatches = eventKey === targetKey || event.code.toLowerCase() === targetKey;

    return keyMatches && this.checkModifiers(event, modifiers);
  }

  private checkModifiers(event: KeyboardEvent, modifiers: string[]): boolean {
    const hasCtrl = modifiers.includes('ctrl') || modifiers.includes('cmd');
    const hasShift = modifiers.includes('shift');
    const hasAlt = modifiers.includes('alt');

    return (
      hasCtrl === (event.ctrlKey || event.metaKey) &&
      hasShift === event.shiftKey &&
      hasAlt === event.altKey
    );
  }

  private setupResponsive(): void {
    if (!this.config.responsive) return;

    const checkMobile = () => {
      this.isMobile = window.innerWidth <= 768;
      this.container.classList.toggle('mobile', this.isMobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
  }
  public selectTool(toolId: string): void {
    // Remove previous selection
    if (this.selectedTool) {
      const prevButton = this.container.querySelector(`[data-tool="${this.selectedTool}"]`);
      prevButton?.classList.remove('selected');
      prevButton?.setAttribute('aria-pressed', 'false');
    }

    // Add new selection
    const button = this.container.querySelector(`[data-tool="${toolId}"]`);
    if (button) {
      button.classList.add('selected');
      button.setAttribute('aria-pressed', 'true');
      this.selectedTool = toolId;

      // Find the tool object and emit event
      for (const group of this.config.groups) {
        const tool = group.tools.find((t) => t.id === toolId);
        if (tool) {
          this.emit('toolSelected', { toolId, tool });
          break;
        }
      }
    }
  }

  public getSelectedTool(): string | null {
    return this.selectedTool;
  }

  public setToolEnabled(toolId: string, enabled: boolean): void {
    const button = this.container.querySelector(`[data-tool="${toolId}"]`) as any;
    if (button) {
      button.disabled = !enabled;
    }
  }

  public updateToolConfig(newConfig: Partial<ToolbarConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.container.innerHTML = '';
    this.createToolbar();
  }

  public on<K extends keyof ToolbarEvents>(
    event: K,
    callback: (data: ToolbarEvents[K]) => void,
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off<K extends keyof ToolbarEvents>(
    event: K,
    callback: (data: ToolbarEvents[K]) => void,
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof ToolbarEvents>(event: K, data: ToolbarEvents[K]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }
  public destroy(): void {
    this.hideTooltip();
    if (this.tooltipElement && this.tooltipElement.parentNode) {
      this.tooltipElement.parentNode.removeChild(this.tooltipElement);
      this.tooltipElement = null;
    }
    this.container.innerHTML = '';
    this.eventListeners.clear();
  }
}
