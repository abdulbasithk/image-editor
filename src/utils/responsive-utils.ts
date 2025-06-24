/**
 * Responsive Utilities for ImageEditor
 * Provides JavaScript utilities for responsive behavior management
 */

export interface ResponsiveBreakpoints {
  xs: number; // 320px - Small mobile
  sm: number; // 480px - Mobile
  md: number; // 768px - Tablet
  lg: number; // 1024px - Desktop
  xl: number; // 1440px - Large desktop
}

export interface ResponsiveConfig {
  breakpoints: ResponsiveBreakpoints;
  touchDevice: boolean;
  mobileFirst: boolean;
}

export class ResponsiveManager {
  private breakpoints: ResponsiveBreakpoints;
  private currentBreakpoint: string;
  private listeners: Map<string, Function[]>;
  private resizeObserver?: ResizeObserver;
  private container: HTMLElement;

  constructor(container: HTMLElement, config?: Partial<ResponsiveConfig>) {
    this.container = container;
    this.breakpoints = {
      xs: 320,
      sm: 480,
      md: 768,
      lg: 1024,
      xl: 1440,
      ...config?.breakpoints,
    };

    this.currentBreakpoint = this.getCurrentBreakpoint();
    this.listeners = new Map();
    this.setupEventListeners();
    this.applyResponsiveClasses();
  }

  /**
   * Get the current breakpoint based on container width
   */
  public getCurrentBreakpoint(): string {
    const width = this.container.clientWidth;

    if (width >= this.breakpoints.xl) return 'xl';
    if (width >= this.breakpoints.lg) return 'lg';
    if (width >= this.breakpoints.md) return 'md';
    if (width >= this.breakpoints.sm) return 'sm';
    return 'xs';
  }

  /**
   * Check if current viewport matches a breakpoint condition
   */
  public matches(condition: string): boolean {
    const width = this.container.clientWidth;

    switch (condition) {
      case 'mobile':
        return width < this.breakpoints.md;
      case 'tablet':
        return width >= this.breakpoints.md && width < this.breakpoints.lg;
      case 'desktop':
        return width >= this.breakpoints.lg;
      case 'touch':
        return this.isTouchDevice();
      case 'landscape':
        return window.innerWidth > window.innerHeight;
      case 'portrait':
        return window.innerHeight >= window.innerWidth;
      default: {
        // Handle specific breakpoint names (xs, sm, md, lg, xl)
        const breakpointValue = this.breakpoints[condition as keyof ResponsiveBreakpoints];
        return breakpointValue ? width >= breakpointValue : false;
      }
    }
  }

  /**
   * Add listener for breakpoint changes
   */
  public onBreakpointChange(callback: (breakpoint: string) => void): void {
    if (!this.listeners.has('breakpoint')) {
      this.listeners.set('breakpoint', []);
    }
    this.listeners.get('breakpoint')!.push(callback);
  }

  /**
   * Add listener for orientation changes
   */
  public onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): void {
    if (!this.listeners.has('orientation')) {
      this.listeners.set('orientation', []);
    }
    this.listeners.get('orientation')!.push(callback);
  }

  /**
   * Detect if device supports touch
   */
  public isTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - for older browsers
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Get recommended panel layout for current breakpoint
   */
  public getPanelLayout(): 'bottom' | 'right' | 'overlay' {
    const breakpoint = this.getCurrentBreakpoint();

    if (breakpoint === 'xs' || breakpoint === 'sm') {
      return this.matches('landscape') ? 'overlay' : 'bottom';
    }

    return 'right';
  }

  /**
   * Get recommended toolbar layout for current breakpoint
   */
  public getToolbarLayout(): 'horizontal' | 'vertical' {
    return this.matches('mobile') ? 'horizontal' : 'vertical';
  }
  /**
   * Apply responsive CSS classes to container
   */
  public applyResponsiveClasses(): void {
    const breakpoint = this.getCurrentBreakpoint();
    const classes = [
      `ie-breakpoint-${breakpoint}`,
      this.matches('mobile') ? 'ie-mobile' : this.matches('tablet') ? 'ie-tablet' : 'ie-desktop',
      this.matches('touch') ? 'ie-touch' : 'ie-no-touch',
      this.matches('landscape') ? 'ie-landscape' : 'ie-portrait',
    ];

    // Remove old responsive classes
    this.container.classList.forEach((className) => {
      if (
        className.startsWith('ie-breakpoint-') ||
        className.startsWith('ie-mobile') ||
        className.startsWith('ie-tablet') ||
        className.startsWith('ie-desktop') ||
        className.startsWith('ie-touch') ||
        className.startsWith('ie-no-touch') ||
        className.startsWith('ie-landscape') ||
        className.startsWith('ie-portrait')
      ) {
        this.container.classList.remove(className);
      }
    });

    // Add new responsive classes
    classes.forEach((className) => {
      this.container.classList.add(className);
    });
  }

  /**
   * Toggle panel collapse state based on breakpoint
   */
  public shouldAutoCollapse(panelType: 'toolbar' | 'properties'): boolean {
    if (panelType === 'toolbar') {
      return false; // Toolbar should not auto-collapse
    }

    // Auto-collapse properties panel on small screens
    return this.matches('mobile') && this.matches('portrait');
  }

  /**
   * Get optimal canvas size for current container
   */
  public getOptimalCanvasSize(): { width: number; height: number } {
    const containerRect = this.container.getBoundingClientRect();
    const _breakpoint = this.getCurrentBreakpoint();

    let width = containerRect.width;
    let height = containerRect.height;

    // Adjust for toolbar and panel space
    if (this.matches('mobile')) {
      height -= 116; // Header + toolbar height
      if (!this.shouldAutoCollapse('properties')) {
        height -= 60; // Panel header height when collapsed
      }
    } else {
      width -= this.matches('desktop') ? 460 : 400; // Toolbar + panel width
    }

    return {
      width: Math.max(width, 200),
      height: Math.max(height, 200),
    };
  }

  /**
   * Setup event listeners for responsive behavior
   */
  private setupEventListeners(): void {
    // Setup ResizeObserver for container size changes
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.container);
    }

    // Setup window resize listener as fallback
    window.addEventListener('resize', this.handleResize.bind(this));

    // Setup orientation change listener
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100); // Delay to ensure orientation change is complete
    });
  }

  /**
   * Handle resize events
   */
  private handleResize(): void {
    const newBreakpoint = this.getCurrentBreakpoint();

    if (newBreakpoint !== this.currentBreakpoint) {
      const oldBreakpoint = this.currentBreakpoint;
      this.currentBreakpoint = newBreakpoint;

      this.applyResponsiveClasses();

      // Notify breakpoint change listeners
      const callbacks = this.listeners.get('breakpoint') || [];
      callbacks.forEach((callback) => callback(newBreakpoint, oldBreakpoint));
    }
  }

  /**
   * Handle orientation change events
   */
  private handleOrientationChange(): void {
    const orientation = this.matches('landscape') ? 'landscape' : 'portrait';
    this.applyResponsiveClasses();

    // Notify orientation change listeners
    const callbacks = this.listeners.get('orientation') || [];
    callbacks.forEach((callback) => callback(orientation));
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    window.removeEventListener('resize', this.handleResize.bind(this));
    window.removeEventListener('orientationchange', this.handleOrientationChange.bind(this));

    this.listeners.clear();
  }
}

/**
 * CSS-in-JS responsive utilities
 */
export class ResponsiveCSSHelper {
  private responsiveManager: ResponsiveManager;

  constructor(responsiveManager: ResponsiveManager) {
    this.responsiveManager = responsiveManager;
  }

  /**
   * Generate CSS custom properties for current breakpoint
   */
  public generateCSSProperties(): Record<string, string> {
    const breakpoint = this.responsiveManager.getCurrentBreakpoint();
    const isMobile = this.responsiveManager.matches('mobile');
    const isTouch = this.responsiveManager.matches('touch');

    return {
      '--ie-current-breakpoint': breakpoint,
      '--ie-touch-target-size': isTouch ? '48px' : '36px',
      '--ie-spacing-responsive': isMobile ? '12px' : '16px',
      '--ie-font-size-responsive': isMobile ? '16px' : '14px',
      '--ie-panel-width': this.responsiveManager.matches('desktop') ? '360px' : '320px',
      '--ie-toolbar-width': this.responsiveManager.matches('desktop') ? '100px' : '80px',
    };
  }

  /**
   * Apply responsive CSS properties to an element
   */
  public applyResponsiveStyles(element: HTMLElement): void {
    const properties = this.generateCSSProperties();

    Object.entries(properties).forEach(([property, value]) => {
      element.style.setProperty(property, value);
    });
  }
}

/**
 * Responsive media query utilities
 */
export const mediaQueries = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  touch: '(hover: none) and (pointer: coarse)',
  highContrast: '(prefers-contrast: high)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  darkMode: '(prefers-color-scheme: dark)',
  landscape: '(orientation: landscape)',
  portrait: '(orientation: portrait)',
};

/**
 * Check if a media query matches
 */
export function matchesMediaQuery(query: string): boolean {
  return window.matchMedia(query).matches;
}

/**
 * Create a responsive breakpoint observer
 */
export function createBreakpointObserver(
  breakpoints: ResponsiveBreakpoints,
  callback: (breakpoint: string) => void,
): () => void {
  const mediaQueryLists: MediaQueryList[] = [];

  Object.entries(breakpoints).forEach(([name, width]) => {
    const mql = window.matchMedia(`(min-width: ${width}px)`);

    const handler = () => {
      if (mql.matches) {
        callback(name);
      }
    };

    mql.addListener(handler);
    mediaQueryLists.push(mql);

    // Check immediately
    handler();
  });

  // Return cleanup function
  return () => {
    mediaQueryLists.forEach((mql) => {
      mql.removeListener(() => {});
    });
  };
}
