/**
 * Theme Toggle Component for ImageEditor
 * Provides UI controls for theme switching
 */

import { ThemeManager, ThemeMode, ResolvedTheme, ThemeChangeEvent } from '../utils/ThemeManager';

export interface ThemeToggleConfig {
  showText?: boolean;
  showIcons?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'button' | 'switch' | 'dropdown';
  position?: 'inline' | 'floating';
  labels?: {
    light?: string;
    dark?: string;
    auto?: string;
    toggle?: string;
  };
}

export interface ThemeToggleEvents {
  themeChange: (event: ThemeChangeEvent) => void;
}

export class ThemeToggle {
  private themeManager: ThemeManager;
  private config: Required<Omit<ThemeToggleConfig, 'labels'>> & {
    labels: Required<NonNullable<ThemeToggleConfig['labels']>>;
  };
  private container: HTMLElement;
  private element: HTMLElement;
  private listeners: Map<keyof ThemeToggleEvents, Function[]> = new Map();

  constructor(container: HTMLElement, themeManager: ThemeManager, config: ThemeToggleConfig = {}) {
    this.container = container;
    this.themeManager = themeManager;
    this.config = {
      showText: config.showText ?? true,
      showIcons: config.showIcons ?? true,
      size: config.size ?? 'medium',
      variant: config.variant ?? 'button',
      position: config.position ?? 'inline',
      labels: {
        light: config.labels?.light ?? 'Light',
        dark: config.labels?.dark ?? 'Dark',
        auto: config.labels?.auto ?? 'Auto',
        toggle: config.labels?.toggle ?? 'Toggle theme',
      },
    };

    this.element = this.createElement();
    this.setupEventListeners();
    this.updateState();
  }

  /**
   * Create the theme toggle element
   */
  private createElement(): HTMLElement {
    switch (this.config.variant) {
      case 'switch':
        return this.createSwitchElement();
      case 'dropdown':
        return this.createDropdownElement();
      default:
        return this.createButtonElement();
    }
  }

  /**
   * Create button variant
   */
  private createButtonElement(): HTMLElement {
    const button = document.createElement('button');
    button.className = `theme-toggle theme-toggle--button theme-toggle--${this.config.size}`;
    button.type = 'button';
    button.setAttribute('aria-label', this.config.labels.toggle!);
    button.title = this.config.labels.toggle!;

    if (this.config.position === 'floating') {
      button.classList.add('theme-toggle--floating');
    }

    // Create inner content
    const content = document.createElement('span');
    content.className = 'theme-toggle__content';

    if (this.config.showIcons) {
      const icon = document.createElement('span');
      icon.className = 'theme-toggle__icon';
      icon.innerHTML = this.getThemeIcon(this.themeManager.getResolvedTheme());
      content.appendChild(icon);
    }

    if (this.config.showText) {
      const text = document.createElement('span');
      text.className = 'theme-toggle__text';
      text.textContent = this.getThemeLabel(this.themeManager.getThemeMode());
      content.appendChild(text);
    }

    button.appendChild(content);

    // Add click handler
    button.addEventListener('click', () => {
      this.themeManager.toggleTheme();
    });

    this.container.appendChild(button);
    return button;
  }

  /**
   * Create switch variant
   */
  private createSwitchElement(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = `theme-toggle theme-toggle--switch theme-toggle--${this.config.size}`;

    if (this.config.position === 'floating') {
      wrapper.classList.add('theme-toggle--floating');
    }

    // Create label
    const label = document.createElement('label');
    label.className = 'theme-toggle__label';

    // Create checkbox input
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'theme-toggle__input';
    input.checked = this.themeManager.isDarkTheme();
    input.setAttribute('aria-label', this.config.labels.toggle!);

    // Create switch slider
    const slider = document.createElement('span');
    slider.className = 'theme-toggle__slider';

    if (this.config.showIcons) {
      const lightIcon = document.createElement('span');
      lightIcon.className = 'theme-toggle__icon theme-toggle__icon--light';
      lightIcon.innerHTML = this.getThemeIcon('light');

      const darkIcon = document.createElement('span');
      darkIcon.className = 'theme-toggle__icon theme-toggle__icon--dark';
      darkIcon.innerHTML = this.getThemeIcon('dark');

      slider.appendChild(lightIcon);
      slider.appendChild(darkIcon);
    }

    label.appendChild(input);
    label.appendChild(slider);

    if (this.config.showText) {
      const text = document.createElement('span');
      text.className = 'theme-toggle__text';
      text.textContent = this.config.labels.toggle!;
      wrapper.appendChild(text);
    }

    wrapper.appendChild(label);

    // Add change handler
    input.addEventListener('change', () => {
      // For switch, we only toggle between light and dark (not auto)
      this.themeManager.setTheme(input.checked ? 'dark' : 'light');
    });

    this.container.appendChild(wrapper);
    return wrapper;
  }

  /**
   * Create dropdown variant
   */
  private createDropdownElement(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = `theme-toggle theme-toggle--dropdown theme-toggle--${this.config.size}`;

    if (this.config.position === 'floating') {
      wrapper.classList.add('theme-toggle--floating');
    }

    // Create select element
    const select = document.createElement('select');
    select.className = 'theme-toggle__select';
    select.setAttribute('aria-label', 'Choose theme');

    // Create options
    const options: { value: ThemeMode; label: string }[] = [
      { value: 'auto', label: this.config.labels.auto! },
      { value: 'light', label: this.config.labels.light! },
      { value: 'dark', label: this.config.labels.dark! },
    ];

    options.forEach(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      option.selected = this.themeManager.getThemeMode() === value;
      select.appendChild(option);
    });

    // Add change handler
    select.addEventListener('change', () => {
      this.themeManager.setTheme(select.value as ThemeMode);
    });

    wrapper.appendChild(select);
    this.container.appendChild(wrapper);
    return wrapper;
  }

  /**
   * Get theme icon
   */
  private getThemeIcon(theme: ResolvedTheme): string {
    const icons = {
      light: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
      </svg>`,
      dark: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"/>
      </svg>`,
    };
    return icons[theme];
  }

  /**
   * Get theme label
   */
  private getThemeLabel(mode: ThemeMode): string {
    switch (mode) {
      case 'light':
        return this.config.labels.light!;
      case 'dark':
        return this.config.labels.dark!;
      case 'auto':
        return this.config.labels.auto!;
      default:
        return this.config.labels.toggle!;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to theme manager changes
    this.themeManager.on((event) => {
      this.updateState();
      this.emit('themeChange', event);
    });
  }

  /**
   * Update component state
   */
  private updateState(): void {
    const currentMode = this.themeManager.getThemeMode();
    const resolvedTheme = this.themeManager.getResolvedTheme();

    // Update data attributes
    this.element.setAttribute('data-theme', resolvedTheme);
    this.element.setAttribute('data-mode', currentMode);

    // Update based on variant
    switch (this.config.variant) {
      case 'button':
        this.updateButtonState(currentMode, resolvedTheme);
        break;
      case 'switch':
        this.updateSwitchState(resolvedTheme);
        break;
      case 'dropdown':
        this.updateDropdownState(currentMode);
        break;
    }
  }

  /**
   * Update button state
   */
  private updateButtonState(mode: ThemeMode, resolvedTheme: ResolvedTheme): void {
    const icon = this.element.querySelector('.theme-toggle__icon');
    const text = this.element.querySelector('.theme-toggle__text');

    if (icon) {
      icon.innerHTML = this.getThemeIcon(resolvedTheme);
    }

    if (text) {
      text.textContent = this.getThemeLabel(mode);
    }
  }

  /**
   * Update switch state
   */
  private updateSwitchState(resolvedTheme: ResolvedTheme): void {
    const input = this.element.querySelector('.theme-toggle__input') as HTMLInputElement;
    if (input) {
      input.checked = resolvedTheme === 'dark';
    }
  }

  /**
   * Update dropdown state
   */
  private updateDropdownState(mode: ThemeMode): void {
    const select = this.element.querySelector('.theme-toggle__select') as HTMLSelectElement;
    if (select) {
      select.value = mode;
    }
  }

  /**
   * Add event listener
   */
  public on<K extends keyof ThemeToggleEvents>(event: K, callback: ThemeToggleEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof ThemeToggleEvents>(event: K, callback: ThemeToggleEvents[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit<K extends keyof ThemeToggleEvents>(
    event: K,
    data: Parameters<ThemeToggleEvents[K]>[0],
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          (callback as Function)(data);
        } catch (error) {
          console.error(`Error in theme toggle ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Get the theme toggle element
   */
  public getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Show the theme toggle
   */
  public show(): void {
    this.element.style.display = '';
  }

  /**
   * Hide the theme toggle
   */
  public hide(): void {
    this.element.style.display = 'none';
  }

  /**
   * Destroy the theme toggle
   */
  public destroy(): void {
    // Remove from DOM
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    // Clear listeners
    this.listeners.clear();
  }
}
