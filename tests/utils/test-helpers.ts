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
  // Create a real canvas element for DOM operations
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  // Mock the getContext method to return a mock 2D context
  const mockContext = {
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    beginPath: jest.fn(),
    closePath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    bezierCurveTo: jest.fn(),
    arc: jest.fn(),
    arcTo: jest.fn(),
    ellipse: jest.fn(),
    rect: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    clip: jest.fn(),
    drawImage: jest.fn(),
    putImageData: jest.fn(),
    getImageData: jest.fn().mockReturnValue({
      data: new Uint8ClampedArray(width * height * 4),
      width: width,
      height: height,
    }),
    createImageData: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    translate: jest.fn(),
    transform: jest.fn(),
    setTransform: jest.fn(),
    resetTransform: jest.fn(),
    // Properties
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    lineDashOffset: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: 'rgba(0, 0, 0, 0)',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    direction: 'inherit',
    imageSmoothingEnabled: true,
  };

  // Mock getContext
  canvas.getContext = jest.fn().mockImplementation((contextType) => {
    if (contextType === '2d') {
      return mockContext;
    }
    return null;
  });

  // Mock toDataURL
  canvas.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,mock-data');
  // Mock toBlob
  canvas.toBlob = jest.fn().mockImplementation((callback) => {
    const blob = new Blob(['mock canvas content'], { type: 'image/png' });
    callback(blob);
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

  // Mock querySelector and querySelectorAll
  const originalQuerySelector = container.querySelector.bind(container);
  const originalQuerySelectorAll = container.querySelectorAll.bind(container);

  container.querySelector = jest.fn().mockImplementation((selector) => {
    return originalQuerySelector(selector);
  });

  container.querySelectorAll = jest.fn().mockImplementation((selector) => {
    return originalQuerySelectorAll(selector);
  });

  return container;
}
