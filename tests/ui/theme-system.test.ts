/**
 * @jest-environment jsdom
 */

import { ThemeToggle } from '../../src/ui/ThemeToggle';
import { ThemeManager } from '../../src/utils/ThemeManager';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Theme System', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockLocalStorage.getItem.mockReset();
    mockLocalStorage.setItem.mockReset();
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  describe('ThemeManager', () => {
    it('should initialize with default theme', () => {
      // Mock system preference to be light
      (window.matchMedia as jest.Mock).mockImplementation((query) => ({
        matches: false, // System prefers light
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const themeManager = new ThemeManager(container);

      expect(themeManager.getResolvedTheme()).toBe('light');
      expect(themeManager.getThemeMode()).toBe('auto');
    });

    it('should initialize with custom default theme', () => {
      const themeManager = new ThemeManager(container, { defaultTheme: 'dark' });

      expect(themeManager.getResolvedTheme()).toBe('dark');
      expect(themeManager.getThemeMode()).toBe('dark');
    });

    it('should load persisted theme from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');

      const themeManager = new ThemeManager(container);

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('image-editor-theme');
      expect(themeManager.getThemeMode()).toBe('dark');
      expect(themeManager.getResolvedTheme()).toBe('dark');
    });

    it('should set theme and trigger event', () => {
      const themeManager = new ThemeManager(container);
      const mockCallback = jest.fn();

      themeManager.on(mockCallback);
      themeManager.setTheme('dark');

      expect(themeManager.getResolvedTheme()).toBe('dark');
      expect(themeManager.getThemeMode()).toBe('dark');
      expect(mockCallback).toHaveBeenCalledWith({
        theme: 'dark',
        mode: 'dark',
        source: 'user',
      });
    });

    it('should persist theme to localStorage', () => {
      const themeManager = new ThemeManager(container);

      themeManager.setTheme('dark');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('image-editor-theme', 'dark');
    });

    it('should resolve auto theme based on system preference', () => {
      // Mock system preference for dark mode
      (window.matchMedia as jest.Mock).mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const themeManager = new ThemeManager(container, { defaultTheme: 'auto' });
      expect(themeManager.getResolvedTheme()).toBe('dark');
      expect(themeManager.getThemeMode()).toBe('auto');
    });

    it('should handle system theme changes', () => {
      const mockMediaQuery = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };

      (window.matchMedia as jest.Mock).mockReturnValue(mockMediaQuery);

      const themeManager = new ThemeManager(container, { defaultTheme: 'auto' });
      const mockCallback = jest.fn();
      themeManager.on(mockCallback);

      // Simulate system theme change
      mockMediaQuery.matches = true;
      const changeEvent = { matches: true } as MediaQueryListEvent;
      mockMediaQuery.addEventListener.mock.calls[0][1](changeEvent);

      expect(mockCallback).toHaveBeenCalledWith({
        theme: 'dark',
        mode: 'auto',
        source: 'system',
      });
    });
    it('should toggle theme between light and dark', () => {
      const themeManager = new ThemeManager(container, { defaultTheme: 'light' });

      themeManager.toggleTheme();
      expect(themeManager.getResolvedTheme()).toBe('dark');

      themeManager.toggleTheme();
      expect(themeManager.getResolvedTheme()).toBe('light');
    });
    it('should apply theme classes to container', () => {
      const themeManager = new ThemeManager(container);

      themeManager.setTheme('dark');
      expect(container.getAttribute('data-theme')).toBe('dark');
      expect(container.style.getPropertyValue('--ie-current-theme')).toBe('dark');

      themeManager.setTheme('light');
      expect(container.getAttribute('data-theme')).toBe('light');
      expect(container.style.getPropertyValue('--ie-current-theme')).toBe('light');
    });
    it('should enable/disable transitions', () => {
      const themeManager = new ThemeManager(container, { enableTransitions: true });
      // Transitions are implemented via injected styles, not classes
      // So we test that the setting is configured correctly
      expect(themeManager.getThemeInfo().config.enableTransitions).toBe(true);

      themeManager.disableTransitions();
      expect(themeManager.getThemeInfo().config.enableTransitions).toBe(false);
    });

    it('should remove event listeners on destroy', () => {
      const mockMediaQuery = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      (window.matchMedia as jest.Mock).mockReturnValue(mockMediaQuery);

      const themeManager = new ThemeManager(container, { defaultTheme: 'auto' });
      themeManager.destroy();

      expect(mockMediaQuery.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('ThemeToggle', () => {
    let themeManager: ThemeManager;

    beforeEach(() => {
      themeManager = new ThemeManager(container);
    });

    afterEach(() => {
      themeManager.destroy();
    });
    it('should create toggle button by default', () => {
      const _themeToggle = new ThemeToggle(container, themeManager);

      const button = container.querySelector('.theme-toggle--button');
      expect(button).toBeTruthy();
      // Default mode is 'auto', so it should show 'Auto' text
      expect(button?.textContent).toContain('Auto');
    });

    it('should create toggle switch variant', () => {
      const _themeToggle = new ThemeToggle(container, themeManager, { variant: 'switch' });

      const switchElement = container.querySelector('.theme-toggle--switch');
      expect(switchElement).toBeTruthy();
    });

    it('should create dropdown variant', () => {
      const _themeToggle = new ThemeToggle(container, themeManager, { variant: 'dropdown' });

      const dropdown = container.querySelector('.theme-toggle--dropdown');
      expect(dropdown).toBeTruthy();

      const options = container.querySelectorAll('option');
      expect(options).toHaveLength(3); // light, dark, auto
    });

    it('should handle theme changes from theme manager', () => {
      const _themeToggle = new ThemeToggle(container, themeManager);
      themeManager.setTheme('dark');

      const button = container.querySelector('.theme-toggle--button');
      expect(button?.textContent).toContain('Dark');
    });

    it('should trigger theme change on button click', () => {
      const themeToggle = new ThemeToggle(container, themeManager);
      const mockCallback = jest.fn();
      themeToggle.on('themeChange', mockCallback);

      const button = container.querySelector('.theme-toggle--button') as HTMLButtonElement;
      button.click();

      expect(mockCallback).toHaveBeenCalled();
      expect(themeManager.getResolvedTheme()).toBe('dark');
    });

    it('should update switch state on theme change', () => {
      const _themeToggle = new ThemeToggle(container, themeManager, { variant: 'switch' });

      themeManager.setTheme('dark');

      const switchInput = container.querySelector('.theme-toggle__input') as HTMLInputElement;
      expect(switchInput.checked).toBe(true);
    });

    it('should update dropdown selection on theme change', () => {
      const _themeToggle = new ThemeToggle(container, themeManager, { variant: 'dropdown' });

      themeManager.setTheme('dark');

      const dropdown = container.querySelector('.theme-toggle__select') as HTMLSelectElement;
      expect(dropdown.value).toBe('dark');
    });

    it('should support custom labels', () => {
      const customLabels = {
        light: 'Bright Mode',
        dark: 'Night Mode',
        auto: 'System Mode',
      };

      const _themeToggle = new ThemeToggle(container, themeManager, {
        variant: 'dropdown',
        labels: customLabels,
      });
      const options = container.querySelectorAll('option');
      expect(options[0]?.textContent).toBe('System Mode'); // auto is first
      expect(options[1]?.textContent).toBe('Bright Mode'); // light is second
      expect(options[2]?.textContent).toBe('Night Mode'); // dark is third
    });
    it('should handle different sizes', () => {
      const _themeToggle = new ThemeToggle(container, themeManager, { size: 'large' });

      const button = container.querySelector('.theme-toggle--button');
      expect(button?.classList.contains('theme-toggle--large')).toBe(true);
    });
    it('should hide text when showText is false', () => {
      const _themeToggle = new ThemeToggle(container, themeManager, { showText: false });

      const button = container.querySelector('.theme-toggle--button');
      const textElement = button?.querySelector('.theme-toggle__text');
      expect(textElement).toBeFalsy();
    });
    it('should hide icons when showIcons is false', () => {
      const _themeToggle = new ThemeToggle(container, themeManager, { showIcons: false });

      const button = container.querySelector('.theme-toggle--button');
      const iconElement = button?.querySelector('.theme-toggle__icon');
      expect(iconElement).toBeFalsy();
    });
    it('should remove element on destroy', () => {
      const themeToggle = new ThemeToggle(container, themeManager);

      expect(container.querySelector('.theme-toggle--button')).toBeTruthy();

      themeToggle.destroy();

      expect(container.querySelector('.theme-toggle--button')).toBeFalsy();
    });
  });

  describe('Integration', () => {
    it('should work together properly', () => {
      const themeManager = new ThemeManager(container);
      const themeToggle = new ThemeToggle(container, themeManager);
      // Test initial state
      expect(themeManager.getResolvedTheme()).toBe('light');
      // Test theme change through toggle
      const button = container.querySelector('.theme-toggle--button') as HTMLButtonElement;
      button.click();

      expect(themeManager.getResolvedTheme()).toBe('dark');
      expect(container.getAttribute('data-theme')).toBe('dark');

      // Test toggle state update
      expect(button.textContent).toContain('Dark');

      // Cleanup
      themeToggle.destroy();
      themeManager.destroy();
    });
    it('should handle CSS transitions properly', () => {
      const themeManager = new ThemeManager(container, { enableTransitions: true });

      expect(themeManager.getThemeInfo().config.enableTransitions).toBe(true);

      themeManager.setTheme('dark');

      // Should still have transitions enabled
      expect(themeManager.getThemeInfo().config.enableTransitions).toBe(true);
      expect(container.getAttribute('data-theme')).toBe('dark');

      themeManager.destroy();
    });
  });
});
