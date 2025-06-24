/**
 * Container Manager - Handles the main editor container layout and resizing
 */
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

    // Apply initial theme
    this.applyTheme();

    // Setup responsive behavior
    if (this.config.responsive) {
      this.setupResponsive();
    }

    // Setup resizing
    if (this.config.resizable) {
      this.setupResizing();
    }

    // Setup theme detection
    this.setupThemeDetection();
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
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;

        // Update responsive classes
        this.elements.container.classList.toggle('mobile', width < 768);
        this.elements.container.classList.toggle('tablet', width >= 768 && width < 1024);

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
   * Setup theme detection
   */
  private setupThemeDetection(): void {
    if (this.config.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const updateTheme = () => {
        this.applyTheme(mediaQuery.matches ? 'dark' : 'light');
      };

      updateTheme();
      mediaQuery.addEventListener('change', updateTheme);
    }
  }

  /**
   * Apply theme to container
   */
  private applyTheme(theme?: 'light' | 'dark'): void {
    const targetTheme = theme || this.config.theme;

    if (targetTheme && targetTheme !== 'auto') {
      this.elements.container.setAttribute('data-theme', targetTheme);
    }
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
    this.applyTheme();
  }

  /**
   * Destroy container manager
   */
  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Remove global event listeners
    document.removeEventListener('mousemove', this.handleResizeMove.bind(this));
    document.removeEventListener('mouseup', this.stopResizing.bind(this));
  }
}
