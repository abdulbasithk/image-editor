// Jest setup for DOM testing
import '@testing-library/jest-dom';

// Global mocks for container functionality
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

global.getComputedStyle = jest.fn().mockReturnValue({
  cursor: 'pointer',
});

// Mock ImageData for canvas tests
if (typeof ImageData === 'undefined') {
  global.ImageData = class MockImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight?: number, height?: number) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth;
        this.width = widthOrHeight!;
        this.height = height!;
      } else {
        this.width = dataOrWidth;
        this.height = widthOrHeight!;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      }
    }
  } as any;
}

// Mock HTMLImageElement for Node environment
if (typeof HTMLImageElement === 'undefined') {
  global.HTMLImageElement = class MockHTMLImageElement {
    width: number = 0;
    height: number = 0;
    complete: boolean = true;
    naturalWidth: number = 0;
    naturalHeight: number = 0;
    src: string = '';
    crossOrigin: string | null = null;
    onload: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    addEventListener = jest.fn();
    removeEventListener = jest.fn();
    dispatchEvent = jest.fn();
    decode = jest.fn().mockResolvedValue(undefined);
    tagName = 'IMG';
    nodeType = 1;
    cloneNode = jest.fn();
  } as any;
}

// Mock Blob for Node environment
if (typeof Blob === 'undefined') {
  global.Blob = class MockBlob {
    size: number = 0;
    type: string = '';

    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      this.type = options?.type || '';
      this.size = parts
        ? parts.reduce((size, part) => {
            if (typeof part === 'string') return size + part.length;
            if (part instanceof ArrayBuffer) return size + part.byteLength;
            if ('byteLength' in part) return size + part.byteLength;
            return size;
          }, 0)
        : 0;
    }

    slice() {
      return new Blob();
    }
  } as any;
}

// Mock File for Node environment
if (typeof File === 'undefined') {
  global.File = class MockFile extends Blob {
    name: string;
    lastModified: number;

    constructor(parts: BlobPart[], name: string, options?: FilePropertyBag) {
      super(parts, options);
      this.name = name;
      this.lastModified = options?.lastModified || Date.now();
    }
  } as any;
}

// Mock URL for file operations
if (typeof URL === 'undefined') {
  global.URL = {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn(),
  } as any;
}

// Mock FileReader for file operations
if (typeof FileReader === 'undefined') {
  global.FileReader = class MockFileReader {
    readAsDataURL = jest.fn();
    readAsArrayBuffer = jest.fn();
    result: string | ArrayBuffer | null = null;
    onload: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    addEventListener = jest.fn();
    removeEventListener = jest.fn();
  } as any;
}

// Mock performance for timing operations
if (typeof performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  } as any;
}

// Create comprehensive document mock
const mockDocument = {
  createElement: jest.fn().mockImplementation((tagName: string) => {
    const element = {
      tagName: tagName.toUpperCase(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(),
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
      style: {},
      innerHTML: '',
      textContent: '',
      id: '',
      className: '',
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(),
        toggle: jest.fn(),
      },
    };

    // Canvas-specific mocking
    if (tagName.toLowerCase() === 'canvas') {
      const mockContext = {
        clearRect: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        drawImage: jest.fn(),
        getImageData: jest.fn().mockReturnValue(new ImageData(1, 1)),
        putImageData: jest.fn(),
        createImageData: jest.fn().mockReturnValue(new ImageData(1, 1)),
        beginPath: jest.fn(),
        closePath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        arc: jest.fn(),
        rect: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        scale: jest.fn(),
        rotate: jest.fn(),
        setTransform: jest.fn(),
        transform: jest.fn(),
        fillStyle: '#000000',
        strokeStyle: '#000000',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
        globalAlpha: 1,
      };

      Object.assign(element, {
        width: 300,
        height: 150,
        getContext: jest.fn().mockImplementation((type: string) => {
          if (type === '2d') return mockContext;
          return null;
        }),
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock-data'),
        toBlob: jest.fn().mockImplementation((callback: (blob: Blob) => void) => {
          callback(new Blob(['mock canvas content'], { type: 'image/png' }));
        }),
      });
    }

    // Div-specific mocking for containers
    if (tagName.toLowerCase() === 'div') {
      Object.assign(element, {
        clientWidth: 800,
        clientHeight: 600,
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 0,
          top: 0,
          right: 800,
          bottom: 600,
          width: 800,
          height: 600,
          x: 0,
          y: 0,
        }),
        contains: jest.fn(),
      });
    }

    return element;
  }),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
  },
  head: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
};

// Set global document
global.document = mockDocument as any;

// Mock window object
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
  document: mockDocument,
  location: {
    href: 'http://localhost',
    origin: 'http://localhost',
  },
  requestAnimationFrame: jest.fn((callback) => setTimeout(callback, 16)),
  cancelAnimationFrame: jest.fn(),
};

global.window = mockWindow as any;

// Mock matchMedia for theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Touch and TouchEvent APIs
Object.defineProperty(window, 'Touch', {
  writable: true,
  value: jest.fn().mockImplementation((init) => ({
    identifier: init.identifier || 0,
    target: init.target,
    clientX: init.clientX || 0,
    clientY: init.clientY || 0,
    pageX: init.pageX || init.clientX || 0,
    pageY: init.pageY || init.clientY || 0,
    screenX: init.screenX || init.clientX || 0,
    screenY: init.screenY || init.clientY || 0,
    radiusX: init.radiusX || 1,
    radiusY: init.radiusY || 1,
    rotationAngle: init.rotationAngle || 0,
    force: init.force || 1,
  })),
});

Object.defineProperty(window, 'TouchEvent', {
  writable: true,
  value: class MockTouchEvent extends Event {
    touches: Touch[];
    targetTouches: Touch[];
    changedTouches: Touch[];

    constructor(type: string, init: any = {}) {
      super(type, init);
      this.touches = init.touches || [];
      this.targetTouches = init.targetTouches || [];
      this.changedTouches = init.changedTouches || [];
    }
  },
});

// Export the mocks for use in tests
export { mockDocument, mockWindow };
