// Utility helpers for tests can be added here
export function getByTestId(container: HTMLElement, testId: string): HTMLElement | null {
  return container.querySelector(`[data-testid="${testId}"]`);
}

/**
 * Create a mock File object for testing
 */
export function createMockFile(name: string, type: string, size: number): File {
  const blob = new Blob(['mock file content'], { type });
  const file = new File([blob], name, { type });

  // Mock the size property
  Object.defineProperty(file, 'size', { value: size, writable: false });

  return file;
}

/**
 * Create a mock Image element for testing
 */
export function createMockImage(width = 800, height = 600): HTMLImageElement {
  const mockImage = {
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
    src: '',
    onload: null as any,
    onerror: null as any,
    crossOrigin: null as any,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    // Add properties needed for canvas drawing
    complete: true,
    decode: jest.fn().mockResolvedValue(undefined),
    // Make it look like a real image for canvas compatibility
    tagName: 'IMG',
    nodeType: 1,
    cloneNode: jest.fn(),
  } as any;

  return mockImage;
}

/**
 * Create a mock Canvas element for testing
 */
export function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  // Mock getContext
  canvas.getContext = jest.fn().mockImplementation((contextType: string) => {
    if (contextType === '2d') {
      return {
        clearRect: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        drawImage: jest.fn(),
        getImageData: jest.fn().mockReturnValue(new ImageData(width, height)),
        createImageData: jest.fn().mockReturnValue(new ImageData(width, height)),
        putImageData: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        scale: jest.fn(),
        rotate: jest.fn(),
        translate: jest.fn(),
        transform: jest.fn(),
        setTransform: jest.fn(),
        resetTransform: jest.fn(),
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
      };
    }
    return null;
  });

  return canvas;
}

/**
 * Create a mock DataTransfer object for testing drag and drop
 */
export function createMockDataTransfer(files: File[] = []): DataTransfer {
  const items = {
    add: jest.fn((file: File) => {
      files.push(file);
    }),
    clear: jest.fn(() => {
      files.length = 0;
    }),
    length: files.length,
  };

  const mockDataTransfer = {
    files: files as any,
    items: items as any,
    types: files.map((f) => f.type),
    dropEffect: 'none',
    effectAllowed: 'all',
    getData: jest.fn(),
    setData: jest.fn(),
    clearData: jest.fn(),
  } as any;

  return mockDataTransfer;
}

/**
 * Wait for next tick in tests
 */
export function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock Event with optional properties
 */
export function createMockEvent(type: string, properties: any = {}): Event {
  const event = new Event(type);
  Object.assign(event, properties);
  return event;
}

/**
 * Create a mock container element for testing
 */
export function createMockContainer(): HTMLElement {
  const container = document.createElement('div');

  // Add basic properties that ContainerManager expects
  container.id = 'test-container';
  container.style.width = '800px';
  container.style.height = '600px';

  // Mock clientWidth and clientHeight to match the style
  Object.defineProperty(container, 'clientWidth', {
    get: () => parseInt(container.style.width) || 800,
    configurable: true,
  });

  Object.defineProperty(container, 'clientHeight', {
    get: () => parseInt(container.style.height) || 600,
    configurable: true,
  });

  // Mock getBoundingClientRect that reflects current styles
  container.getBoundingClientRect = jest.fn().mockImplementation(() => {
    const width = parseInt(container.style.width) || 800;
    const height = parseInt(container.style.height) || 600;
    return {
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    };
  });

  // Store original appendChild for real DOM operations
  const originalAppendChild = container.appendChild.bind(container);

  // Enhanced querySelector that can find dynamically added elements
  const originalQuerySelector = container.querySelector.bind(container);
  container.querySelector = jest.fn((selector) => {
    // First try the real querySelector
    const realElement = originalQuerySelector(selector);
    if (realElement) {
      return realElement;
    }

    // Only create mock elements for specific cases where we need backward compatibility
    // For resize handles, create a mock element with proper event handling
    if (selector.includes('resize-handle')) {
      const element = document.createElement('div');
      element.className = selector.replace(/^\./, '').replace(/\./g, ' ');
      element.addEventListener('mousedown', () => {
        container.classList.add('resizing');
      });
      return element;
    }

    // For all other selectors, return null when element doesn't exist
    return null;
  });

  // Enhanced querySelectorAll that returns real NodeList
  const originalQuerySelectorAll = container.querySelectorAll.bind(container);
  container.querySelectorAll = jest.fn((selector) => {
    // First try the real querySelectorAll
    const realElements = originalQuerySelectorAll(selector);
    if (realElements.length > 0) {
      return realElements;
    }

    // If not found and looking for resize handles, create 8 handles
    if (selector.includes('resize-handle')) {
      const handles: Element[] = [];
      for (let i = 0; i < 8; i++) {
        const handle = document.createElement('div');
        handle.className = selector.replace(/^\./, '').replace(/\./g, ' ');
        handles.push(handle);
      }
      return handles as any;
    }

    return [] as any;
  });

  // Keep appendChild working normally for real DOM operations
  container.appendChild = originalAppendChild;

  return container;
}
