/**
 * Container Manager - Handles the main editor container layout and resizing
 */
import { ResponsiveManager, ResponsiveCSSHelper } from '../utils/responsive-utils';
import { ThemeManager, ThemeChangeEvent } from '../utils/ThemeManager';

export interface ContainerConfig {
  resizable?: boolean;
  showHeader?: boolean;
  showToolbar?: boolean;
  showPanel?: boolean;
  title?: string;
  theme?: 'light' | 'dark' | 'auto';
  responsive?: boolean;
}

export interface ContainerElements {
  container: HTMLElement;
  header?: HTMLElement;
  title?: HTMLElement;
  actions?: HTMLElement;
  content: HTMLElement;
  toolbar?: HTMLElement;
  canvasArea: HTMLElement;
  canvasContainer: HTMLElement;
  canvas: HTMLCanvasElement;
  panel?: HTMLElement;
}

export interface ResizeEvent {
  width: number;
  height: number;
  type: 'manual' | 'responsive';
}

export class ContainerManager {
  private config: ContainerConfig;
  private elements: ContainerElements;
  private resizeObserver?: ResizeObserver;
  private responsiveManager?: ResponsiveManager;
  private responsiveCSSHelper?: ResponsiveCSSHelper;
  private themeManager?: ThemeManager;
  private isResizing = false;
  private startResize: { x: number; y: number; width: number; height: number } | null = null;
  private currentHandle: string | null = null;
  private onResize?: (event: ResizeEvent) => void;

  constructor(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    config: ContainerConfig = {},
    onResize?: (event: ResizeEvent) => void,
  ) {
    this.config = {
      resizable: true,
      showHeader: true,
      showToolbar: true,
      showPanel: true,
      title: 'Image Editor',
      theme: 'auto',
      responsive: true,
      ...config,
    };

    this.onResize = onResize;

    // Initialize container structure
    this.elements = this.createContainerStructure(container, canvas);

    // Setup theme manager
    this.setupThemeManager();

    // Setup responsive behavior
    if (this.config.responsive) {
      this.setupResponsive();
    }

    // Setup resizing
    if (this.config.resizable) {
      this.setupResizing();
    }
  }

  /**
   * Create the container HTML structure
   */
  private createContainerStructure(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
  ): ContainerElements {
    // Clear container and set up main structure
    container.innerHTML = '';
    container.className = 'image-editor';

    const elements: Partial<ContainerElements> = {
      container,
      canvas,
    };

    // Create header if enabled
    if (this.config.showHeader) {
      elements.header = this.createElement('div', 'image-editor-header');
      elements.title = this.createElement('h1', 'image-editor-title', this.config.title || '');
      elements.actions = this.createElement('div', 'image-editor-actions');

      elements.header.appendChild(elements.title);
      elements.header.appendChild(elements.actions);
      container.appendChild(elements.header);
    }

    // Create main content area
    elements.content = this.createElement('div', 'image-editor-content');
    container.appendChild(elements.content);

    // Create toolbar if enabled
    if (this.config.showToolbar) {
      elements.toolbar = this.createElement('div', 'image-editor-toolbar');
      elements.content.appendChild(elements.toolbar);
    }

    // Create canvas area
    elements.canvasArea = this.createElement('div', 'image-editor-canvas-area');
    elements.canvasContainer = this.createElement('div', 'image-editor-canvas-container');

    if (canvas) {
      canvas.className = 'image-editor-canvas';
      elements.canvasContainer.appendChild(canvas);
    }

    elements.canvasArea.appendChild(elements.canvasContainer);
    elements.content.appendChild(elements.canvasArea);

    // Create properties panel if enabled
    if (this.config.showPanel) {
      elements.panel = this.createElement('div', 'image-editor-panel');
      elements.content.appendChild(elements.panel);
    }

    return elements as ContainerElements;
  }

  /**
   * Create a DOM element with class and optional text content
   */
  private createElement(tag: string, className: string, textContent?: string): HTMLElement {
    const element = document.createElement(tag);
    element.className = className;
    if (textContent) {
      element.textContent = textContent;
    }
    return element;
  }

  /**
   * Setup resizing functionality
   */
  private setupResizing(): void {
    // Create resize handles
    const handles = [
      'resize-top',
      'resize-right',
      'resize-bottom',
      'resize-left',
      'resize-nw resize-corner',
      'resize-ne resize-corner',
      'resize-sw resize-corner',
      'resize-se resize-corner',
    ];

    handles.forEach((handleClass) => {
      const handle = this.createElement('div', `image-editor-resize-handle ${handleClass}`);
      this.elements.container.appendChild(handle);
      handle.addEventListener('mousedown', (e) => {
        const handleName = handleClass.split(' ')[0];
        if (handleName) {
          this.startResizing(e, handleName);
        }
      });
    });

    // Add global mouse events
    document.addEventListener('mousemove', this.handleResizeMove.bind(this));
    document.addEventListener('mouseup', this.stopResizing.bind(this));
  }

  /**
   * Start resizing operation
   */
  private startResizing(event: MouseEvent, handle: string): void {
    event.preventDefault();
    this.isResizing = true;
    this.currentHandle = handle;

    const rect = this.elements.container.getBoundingClientRect();
    this.startResize = {
      x: event.clientX,
      y: event.clientY,
      width: rect.width,
      height: rect.height,
    };

    this.elements.container.classList.add('resizing');
    document.body.style.cursor = getComputedStyle(event.target as HTMLElement).cursor;
  }

  /**
   * Handle resize mouse move
   */
  private handleResizeMove(event: MouseEvent): void {
    if (!this.isResizing || !this.startResize || !this.currentHandle) return;

    const deltaX = event.clientX - this.startResize.x;
    const deltaY = event.clientY - this.startResize.y;

    let newWidth = this.startResize.width;
    let newHeight = this.startResize.height;

    // Calculate new dimensions based on handle
    switch (this.currentHandle) {
      case 'resize-right':
      case 'resize-ne':
      case 'resize-se':
        newWidth = this.startResize.width + deltaX;
        break;
      case 'resize-left':
      case 'resize-nw':
      case 'resize-sw':
        newWidth = this.startResize.width - deltaX;
        break;
    }

    switch (this.currentHandle) {
      case 'resize-bottom':
      case 'resize-sw':
      case 'resize-se':
        newHeight = this.startResize.height + deltaY;
        break;
      case 'resize-top':
      case 'resize-nw':
      case 'resize-ne':
        newHeight = this.startResize.height - deltaY;
        break;
    }

    // Apply size constraints
    const minWidth = 600;
    const minHeight = 400;
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;

    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    // Apply new size
    this.setSize(newWidth, newHeight);
  }

  /**
   * Stop resizing operation
   */
  private stopResizing(): void {
    if (!this.isResizing) return;

    this.isResizing = false;
    this.currentHandle = null;
    this.startResize = null;

    this.elements.container.classList.remove('resizing');
    document.body.style.cursor = '';

    // Emit resize event
    const rect = this.elements.container.getBoundingClientRect();
    if (this.onResize) {
      this.onResize({
        width: rect.width,
        height: rect.height,
        type: 'manual',
      });
    }
  }

  /**
   * Setup responsive behavior
   */
  private setupResponsive(): void {
    // Initialize responsive manager
    this.responsiveManager = new ResponsiveManager(this.elements.container);
    this.responsiveCSSHelper = new ResponsiveCSSHelper(this.responsiveManager);

    // Apply initial responsive styles
    this.responsiveCSSHelper.applyResponsiveStyles(this.elements.container);

    // Listen for breakpoint changes
    this.responsiveManager.onBreakpointChange((newBreakpoint: string) => {
      this.handleBreakpointChange(newBreakpoint);
    });

    // Listen for orientation changes
    this.responsiveManager.onOrientationChange((orientation) => {
      this.handleOrientationChange(orientation);
    });

    // Setup ResizeObserver for container size changes
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Update responsive styles
        this.responsiveCSSHelper?.applyResponsiveStyles(this.elements.container);

        // Update panel and toolbar layouts
        this.updateResponsiveLayout();

        // Emit resize event
        if (this.onResize && !this.isResizing) {
          this.onResize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
            type: 'responsive',
          });
        }
      }
    });

    this.resizeObserver.observe(this.elements.container);
  }

  /**
   * Handle breakpoint changes
   */
  private handleBreakpointChange(_newBreakpoint: string): void {
    // Update layout based on new breakpoint
    this.updateResponsiveLayout();

    // Auto-collapse panels on mobile
    if (this.responsiveManager?.matches('mobile')) {
      this.autoCollapsePanelsForMobile();
    } else {
      this.expandPanelsForDesktop();
    }

    // Update canvas size for optimal display
    this.updateCanvasForBreakpoint();
  }

  /**
   * Handle orientation changes
   */
  private handleOrientationChange(orientation: 'portrait' | 'landscape'): void {
    // Update layout for orientation
    this.updateResponsiveLayout();

    // Special handling for mobile landscape
    if (this.responsiveManager?.matches('mobile') && orientation === 'landscape') {
      this.setupMobileLandscapeLayout();
    }
  }

  /**
   * Update responsive layout based on current breakpoint
   */
  private updateResponsiveLayout(): void {
    if (!this.responsiveManager) return;

    const panelLayout = this.responsiveManager.getPanelLayout();
    const toolbarLayout = this.responsiveManager.getToolbarLayout();

    // Update panel layout
    if (this.elements.panel) {
      this.elements.panel.setAttribute('data-layout', panelLayout);

      if (panelLayout === 'bottom') {
        this.elements.panel.classList.add('properties-panel--mobile');
      } else {
        this.elements.panel.classList.remove('properties-panel--mobile');
      }
    }

    // Update toolbar layout
    if (this.elements.toolbar) {
      this.elements.toolbar.setAttribute('data-layout', toolbarLayout);
    }

    // Update container classes for CSS targeting
    this.elements.container.setAttribute('data-panel-layout', panelLayout);
    this.elements.container.setAttribute('data-toolbar-layout', toolbarLayout);
  }

  /**
   * Auto-collapse panels for mobile view
   */
  private autoCollapsePanelsForMobile(): void {
    if (!this.responsiveManager) return;

    if (this.elements.panel) {
      const shouldCollapse = this.responsiveManager.shouldAutoCollapse('properties');
      if (shouldCollapse) {
        this.elements.panel.classList.add('collapsed');
      }
    }
  }

  /**
   * Expand panels for desktop view
   */
  private expandPanelsForDesktop(): void {
    if (this.elements.panel) {
      this.elements.panel.classList.remove('collapsed');
    }
  }

  /**
   * Setup mobile landscape layout
   */
  private setupMobileLandscapeLayout(): void {
    if (this.elements.panel) {
      // In landscape mobile, show panel as overlay on the right
      this.elements.panel.style.position = 'fixed';
      this.elements.panel.style.right = '0';
      this.elements.panel.style.top = '0';
      this.elements.panel.style.bottom = '0';
      this.elements.panel.style.width = '280px';
      this.elements.panel.style.height = '100%';
    }
  }

  /**
   * Update canvas size for current breakpoint
   */
  private updateCanvasForBreakpoint(): void {
    if (!this.responsiveManager) return;

    const optimalSize = this.responsiveManager.getOptimalCanvasSize();

    // Update canvas container max dimensions
    if (this.elements.canvasContainer) {
      this.elements.canvasContainer.style.maxWidth = `${optimalSize.width}px`;
      this.elements.canvasContainer.style.maxHeight = `${optimalSize.height}px`;
    }
  }

  /**
   * Setup theme manager
   */
  private setupThemeManager(): void {
    this.themeManager = new ThemeManager(this.elements.container, {
      defaultTheme: this.config.theme || 'auto',
      enableTransitions: true,
      enableSystemDetection: true,
      storageKey: 'image-editor-theme',
    });

    // Listen for theme changes
    this.themeManager.on((event: ThemeChangeEvent) => {
      this.handleThemeChange(event);
    });
  }

  /**
   * Handle theme change events
   */
  private handleThemeChange(event: ThemeChangeEvent): void {
    // Update config
    this.config.theme = event.mode;
  }

  /**
   * Set container size
   */
  public setSize(width: number, height: number): void {
    // Apply minimum size constraints
    const minWidth = 600;
    const minHeight = 400;

    const constrainedWidth = Math.max(width, minWidth);
    const constrainedHeight = Math.max(height, minHeight);

    this.elements.container.style.width = `${constrainedWidth}px`;
    this.elements.container.style.height = `${constrainedHeight}px`;

    // Trigger resize callback if available
    if (this.onResize) {
      this.onResize({
        width: constrainedWidth,
        height: constrainedHeight,
        type: 'manual',
      });
    }
  }

  /**
   * Get container elements
   */
  public getElements(): ContainerElements {
    return this.elements;
  }

  /**
   * Get container size
   */
  public getSize(): { width: number; height: number } {
    const rect = this.elements.container.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  }

  /**
   * Toggle panel visibility
   */
  public togglePanel(visible?: boolean): void {
    if (!this.elements.panel) return;

    const isCurrentlyVisible = !this.elements.panel.classList.contains('collapsed');
    const shouldBeVisible = visible !== undefined ? visible : !isCurrentlyVisible;

    this.elements.panel.classList.toggle('collapsed', !shouldBeVisible);
  }

  /**
   * Set loading state
   */
  public setLoading(loading: boolean): void {
    this.elements.container.classList.toggle('loading', loading);
  }

  /**
   * Update title
   */
  public setTitle(title: string): void {
    if (this.elements.title) {
      this.elements.title.textContent = title;
    }
  }

  /**
   * Set theme
   */
  public setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.config.theme = theme;
    if (this.themeManager) {
      this.themeManager.setTheme(theme);
    }
  }

  /**
   * Get theme manager
   */
  public getThemeManager(): ThemeManager | undefined {
    return this.themeManager;
  }

  /**
   * Destroy container manager
   */
  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Clean up responsive manager
    if (this.responsiveManager) {
      this.responsiveManager.destroy();
    }

    // Clean up theme manager
    if (this.themeManager) {
      this.themeManager.destroy();
    }

    // Remove global event listeners
    document.removeEventListener('mousemove', this.handleResizeMove.bind(this));
    document.removeEventListener('mouseup', this.stopResizing.bind(this));
  }
}
