/**
 * Theme Manager for ImageEditor
 * Handles theme switching, persistence, and system theme detection
 */

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeConfig {
  defaultTheme?: ThemeMode;
  enableTransitions?: boolean;
  enableSystemDetection?: boolean;
  storageKey?: string;
}

export interface ThemeChangeEvent {
  theme: ResolvedTheme;
  mode: ThemeMode;
  source: 'user' | 'system' | 'storage';
}

export class ThemeManager {
  private currentMode: ThemeMode;
  private currentTheme: ResolvedTheme;
  private config: Required<ThemeConfig>;
  private listeners: ((event: ThemeChangeEvent) => void)[] = [];
  private mediaQuery?: MediaQueryList;
  private container: HTMLElement;

  constructor(container: HTMLElement, config: ThemeConfig = {}) {
    this.container = container;
    this.config = {
      defaultTheme: 'auto',
      enableTransitions: true,
      enableSystemDetection: true,
      storageKey: 'image-editor-theme',
      ...config,
    };

    // Load persisted theme or use default
    this.currentMode = this.loadPersistedTheme() || this.config.defaultTheme;
    this.currentTheme = this.resolveTheme(this.currentMode);

    // Initialize theme system
    this.init();
  }

  /**
   * Initialize the theme system
   */
  private init(): void {
    // Setup system theme detection
    if (this.config.enableSystemDetection) {
      this.setupSystemDetection();
    }

    // Apply initial theme
    this.applyTheme(this.currentTheme, 'storage');

    // Setup transitions if enabled
    if (this.config.enableTransitions) {
      this.enableThemeTransitions();
    }
  }

  /**
   * Set theme mode
   */
  public setTheme(mode: ThemeMode, notify = true): void {
    const prevMode = this.currentMode;
    const prevTheme = this.currentTheme;

    this.currentMode = mode;
    this.currentTheme = this.resolveTheme(mode);

    // Persist the theme
    this.persistTheme(mode);

    // Apply the theme
    this.applyTheme(this.currentTheme, 'user');

    // Notify listeners if theme actually changed
    if (notify && (prevMode !== mode || prevTheme !== this.currentTheme)) {
      this.notifyListeners({
        theme: this.currentTheme,
        mode: this.currentMode,
        source: 'user',
      });
    }
  }

  /**
   * Toggle between light and dark themes
   */
  public toggleTheme(): void {
    if (this.currentMode === 'auto') {
      // If in auto mode, switch to opposite of current resolved theme
      this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      this.setTheme(this.currentMode === 'dark' ? 'light' : 'dark');
    }
  }

  /**
   * Get current theme mode
   */
  public getThemeMode(): ThemeMode {
    return this.currentMode;
  }

  /**
   * Get current resolved theme
   */
  public getResolvedTheme(): ResolvedTheme {
    return this.currentTheme;
  }

  /**
   * Check if dark theme is active
   */
  public isDarkTheme(): boolean {
    return this.currentTheme === 'dark';
  }

  /**
   * Check if light theme is active
   */
  public isLightTheme(): boolean {
    return this.currentTheme === 'light';
  }

  /**
   * Check if auto theme detection is enabled
   */
  public isAutoMode(): boolean {
    return this.currentMode === 'auto';
  }

  /**
   * Add theme change listener
   */
  public on(callback: (event: ThemeChangeEvent) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove theme change listener
   */
  public off(callback: (event: ThemeChangeEvent) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get system theme preference
   */
  public getSystemTheme(): ResolvedTheme {
    if (typeof window === 'undefined') return 'light';

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * Enable smooth transitions for theme changes
   */
  public enableTransitions(): void {
    this.config.enableTransitions = true;
    this.enableThemeTransitions();
  }

  /**
   * Disable theme transitions
   */
  public disableTransitions(): void {
    this.config.enableTransitions = false;
    this.disableThemeTransitions();
  }

  /**
   * Destroy theme manager
   */
  public destroy(): void {
    // Remove system theme listener
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.handleSystemThemeChange);
    }

    // Clear listeners
    this.listeners = [];

    // Remove transitions
    this.disableThemeTransitions();

    // Remove theme attributes
    this.container.removeAttribute('data-theme');
    this.container.classList.remove('theme-transitioning');
  }

  /**
   * Resolve theme mode to actual theme
   */
  private resolveTheme(mode: ThemeMode): ResolvedTheme {
    if (mode === 'auto') {
      return this.getSystemTheme();
    }
    return mode;
  }

  /**
   * Setup system theme detection
   */
  private setupSystemDetection(): void {
    if (typeof window === 'undefined') return;

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange);
  }

  /**
   * Handle system theme change
   */
  private handleSystemThemeChange = (): void => {
    if (this.currentMode === 'auto') {
      const newTheme = this.getSystemTheme();
      if (newTheme !== this.currentTheme) {
        this.currentTheme = newTheme;
        this.applyTheme(newTheme, 'system');
        this.notifyListeners({
          theme: newTheme,
          mode: this.currentMode,
          source: 'system',
        });
      }
    }
  };

  /**
   * Apply theme to DOM
   */
  private applyTheme(theme: ResolvedTheme, source: 'user' | 'system' | 'storage'): void {
    // Add transition class if enabled
    if (this.config.enableTransitions && source === 'user') {
      this.container.classList.add('theme-transitioning');

      // Remove transition class after animation
      setTimeout(() => {
        this.container.classList.remove('theme-transitioning');
      }, 300);
    }

    // Set theme attribute
    this.container.setAttribute('data-theme', theme);

    // Update CSS custom properties
    this.updateCSSProperties(theme);
  }

  /**
   * Update CSS custom properties for theme
   */
  private updateCSSProperties(theme: ResolvedTheme): void {
    const root = this.container;

    // Set theme-specific CSS properties
    root.style.setProperty('--ie-current-theme', theme);
    root.style.setProperty('--ie-theme-is-dark', theme === 'dark' ? '1' : '0');
    root.style.setProperty('--ie-theme-is-light', theme === 'light' ? '1' : '0');

    // Set color scheme for better browser integration
    root.style.colorScheme = theme;
  }

  /**
   * Enable theme transitions
   */
  private enableThemeTransitions(): void {
    const style = document.createElement('style');
    style.id = 'theme-transitions';
    style.textContent = `
      .image-editor.theme-transitioning,
      .image-editor.theme-transitioning * {
        transition: 
          background-color 0.3s ease,
          border-color 0.3s ease,
          color 0.3s ease,
          box-shadow 0.3s ease,
          opacity 0.3s ease !important;
      }
      
      .image-editor.theme-transitioning *::before,
      .image-editor.theme-transitioning *::after {
        transition: 
          background-color 0.3s ease,
          border-color 0.3s ease,
          color 0.3s ease,
          box-shadow 0.3s ease,
          opacity 0.3s ease !important;
      }
    `;

    if (!document.getElementById('theme-transitions')) {
      document.head.appendChild(style);
    }
  }

  /**
   * Disable theme transitions
   */
  private disableThemeTransitions(): void {
    const style = document.getElementById('theme-transitions');
    if (style) {
      style.remove();
    }
  }

  /**
   * Notify all listeners of theme change
   */
  private notifyListeners(event: ThemeChangeEvent): void {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in theme change listener:', error);
      }
    });
  }

  /**
   * Persist theme to localStorage
   */
  private persistTheme(theme: ThemeMode): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.config.storageKey, theme);
      }
    } catch (error) {
      console.warn('Failed to persist theme preference:', error);
    }
  }

  /**
   * Load persisted theme from localStorage
   */
  private loadPersistedTheme(): ThemeMode | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.config.storageKey);
        if (stored && ['light', 'dark', 'auto'].includes(stored)) {
          return stored as ThemeMode;
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted theme:', error);
    }
    return null;
  }

  /**
   * Get theme info for debugging
   */
  public getThemeInfo() {
    return {
      mode: this.currentMode,
      resolvedTheme: this.currentTheme,
      systemTheme: this.getSystemTheme(),
      isAutoMode: this.isAutoMode(),
      config: this.config,
    };
  }
}

/**
 * Theme utilities
 */
export const themeUtils = {
  /**
   * Get CSS custom property value for current theme
   */
  getCSSProperty(container: HTMLElement, property: string): string {
    return getComputedStyle(container).getPropertyValue(property).trim();
  },

  /**
   * Set CSS custom property
   */
  setCSSProperty(container: HTMLElement, property: string, value: string): void {
    container.style.setProperty(property, value);
  },

  /**
   * Check if device prefers dark theme
   */
  prefersColorScheme(): ResolvedTheme {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  /**
   * Check if reduced motion is preferred
   */
  prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
};
