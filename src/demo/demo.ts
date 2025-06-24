// Demo entry for ImageEditor library
import { ImageEditor } from '../core/ImageEditor';
import { LoggerPlugin } from '../plugins/LoggerPlugin';
import { DrawCommand, ClearCanvasCommand, TextCommand } from '../commands/BasicCommands';

// Status update function
let statusElement: HTMLElement | null = null;

function updateStatus(message: string): void {
  if (!statusElement) {
    statusElement = document.getElementById('status') || createStatusElement();
  }
  statusElement.textContent = message;
  statusElement.title = new Date().toLocaleTimeString() + ': ' + message;
}

function createStatusElement(): HTMLElement {
  const element = document.createElement('div');
  element.id = 'status';
  element.style.cssText = `
    padding: 8px 12px;
    background: #f0f8ff;
    border: 1px solid #4CAF50;
    border-radius: 4px;
    margin: 10px 0;
    font-family: monospace;
    font-size: 12px;
    color: #333;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const container = document.getElementById('app');
  if (container) {
    container.insertBefore(element, container.firstChild);
  }

  return element;
}

// Initialize the editor when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Create a container div if it doesn't exist
  let container = document.getElementById('app');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app';
    container.style.margin = '20px';
    container.style.padding = '20px';
    container.style.border = '1px solid #ccc';
    container.style.borderRadius = '8px';
    document.body.appendChild(container);
  }

  // Create the editor instance with container options
  const editor = new ImageEditor({
    container: '#app',
    width: 800,
    height: 600,
    theme: 'auto',
    enableDragDrop: true,
    enableLoadingProgress: true,
    maxImageWidth: 1024,
    maxImageHeight: 1024,
    imageQuality: 0.9,
    // Container options
    resizable: true,
    showHeader: true,
    showToolbar: true,
    showPanel: true,
    title: 'ImageEditor Demo',
    responsive: true,
  });

  // Register and configure the logger plugin
  try {
    await editor.registerPlugin(LoggerPlugin, {
      enabled: true,
      settings: {
        logLevel: 'info',
        showTimestamp: true,
        prefix: '[ImageEditor Demo]',
      },
    });
    console.log('Logger plugin registered successfully!');
  } catch (error) {
    console.error('Failed to register logger plugin:', error);
  }

  // Demo event system
  editor.on('editor:ready', (data) => {
    console.log('Editor ready event received in demo', data);
    updateStatus('Editor ready!');
  });

  // Container events
  editor.on('container:resize', (data) => {
    console.log('Container resized:', data);
    updateStatus(`Container resized: ${data.width}x${data.height} (${data.type})`);
  });

  editor.on('container:themeChange', (data) => {
    console.log('Theme changed:', data);
    updateStatus(`Theme changed to: ${data.theme}`);
  });

  editor.on('canvas:mousedown', (data) => {
    console.log('Mouse down at:', data.point);
  });

  // Image loading event handlers
  editor.on('image:loading', (data) => {
    console.log('Loading image...', data.source);
    updateStatus('Loading image...');
  });

  editor.on('image:progress', (data) => {
    console.log(`Loading progress: ${data.percentage}%`);
    updateStatus(`Loading: ${data.percentage}%`);
  });

  editor.on('image:loaded', (data) => {
    console.log('Image loaded successfully:', data);
    updateStatus(`Image loaded: ${data.width}x${data.height} (${data.format})`);
  });

  editor.on('image:error', (data) => {
    console.error('Image loading error:', data.error);
    updateStatus(`Error: ${data.error.message || data.error}`);
  });

  // Drag and drop event handlers
  editor.on('dragdrop:enter', () => {
    console.log('Drag enter');
    updateStatus('Drop image file here...');
  });

  editor.on('dragdrop:leave', () => {
    console.log('Drag leave');
    updateStatus('Ready');
  });

  editor.on('dragdrop:drop', (data) => {
    console.log('File dropped:', data.file.name);
    updateStatus(`Loading ${data.file.name}...`);
  });

  editor.on('dragdrop:success', (data) => {
    console.log('Drag and drop successful:', data.file.name);
    updateStatus(`Successfully loaded ${data.file.name}`);
  });

  editor.on('dragdrop:error', (data) => {
    console.error('Drag and drop error:', data.error);
    updateStatus(`Drag & Drop Error: ${data.error}`);
  });

  editor.on('canvas:mousemove', (data) => {
    // Throttled mouse move events
    console.log('Mouse move at:', data.point);
  });

  editor.on('shortcut:pressed', (data) => {
    console.log('Shortcut pressed:', data.shortcut);
  });

  editor.on('tool:selected', (data) => {
    console.log('Tool selected:', data.toolName);
  });

  // Trigger some events to demonstrate plugin hooks
  setTimeout(() => {
    editor.getEventEmitter().emit('editor:ready', { timestamp: Date.now() });
    editor.getEventEmitter().emit('tool:selected', { toolName: 'brush' });
    editor.getEventEmitter().emit('canvas:resize', { width: 800, height: 600 });
  }, 1000);

  // Add some demo content
  const canvas = editor.getCanvasManager().getCanvas();
  const ctx = editor.getCanvasManager().getContext();

  // Draw a simple demo pattern
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#007acc';
  ctx.fillRect(50, 50, 100, 100);

  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.arc(300, 200, 50, 0, Math.PI * 2);
  ctx.fill();
  // Add plugin management demo buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.style.marginTop = '20px';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '10px';
  buttonContainer.style.flexWrap = 'wrap';

  // Plugin management buttons
  const deactivateBtn = document.createElement('button');
  deactivateBtn.textContent = 'Deactivate Logger';
  deactivateBtn.onclick = async () => {
    try {
      await editor.deactivatePlugin('logger');
      console.log('Logger plugin deactivated');
    } catch (error) {
      console.error('Failed to deactivate logger:', error);
    }
  };

  const activateBtn = document.createElement('button');
  activateBtn.textContent = 'Activate Logger';
  activateBtn.onclick = async () => {
    try {
      await editor.activatePlugin('logger');
      console.log('Logger plugin activated');
    } catch (error) {
      console.error('Failed to activate logger:', error);
    }
  };

  const configBtn = document.createElement('button');
  configBtn.textContent = 'Change Log Level to Debug';
  configBtn.onclick = async () => {
    try {
      await editor.configurePlugin('logger', {
        settings: { logLevel: 'debug' },
      });
      console.log('Logger configured to debug level');
    } catch (error) {
      console.error('Failed to configure logger:', error);
    }
  };

  const testBtn = document.createElement('button');
  testBtn.textContent = 'Test Plugin Events';
  testBtn.onclick = () => {
    editor.getEventEmitter().emit('tool:action', {
      toolName: 'brush',
      action: 'stroke',
      data: { x: 100, y: 100 },
    });
    editor.getEventEmitter().emit('image:exported', {
      blob: new Blob(['test'], { type: 'image/png' }),
      format: 'png',
    });
  };

  // State management demo buttons
  const drawRectBtn = document.createElement('button');
  drawRectBtn.textContent = 'Draw Rectangle';
  drawRectBtn.onclick = async () => {
    const drawCommand = new DrawCommand(editor, 'Draw Rectangle', () => {
      const ctx = editor.getCanvasManager().getContext();
      ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 50%)`;
      const x = Math.random() * 700;
      const y = Math.random() * 500;
      ctx.fillRect(x, y, 100, 80);
    });
    await editor.executeCommand(drawCommand);
    updateHistoryButtons();
  };

  const drawCircleBtn = document.createElement('button');
  drawCircleBtn.textContent = 'Draw Circle';
  drawCircleBtn.onclick = async () => {
    const drawCommand = new DrawCommand(editor, 'Draw Circle', () => {
      const ctx = editor.getCanvasManager().getContext();
      ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 50%)`;
      const x = Math.random() * 700;
      const y = Math.random() * 500;
      ctx.beginPath();
      ctx.arc(x, y, 50, 0, Math.PI * 2);
      ctx.fill();
    });
    await editor.executeCommand(drawCommand);
    updateHistoryButtons();
  };
  const addTextBtn = document.createElement('button');
  addTextBtn.textContent = 'Add Text';
  addTextBtn.onclick = async () => {
    const texts = ['Hello!', 'World', 'ImageEditor', 'Demo', 'Undo/Redo'];
    const randomText = texts[Math.floor(Math.random() * texts.length)] || 'Demo';
    const textCommand = new TextCommand(
      editor,
      randomText,
      Math.random() * 600,
      Math.random() * 400,
      {
        font: '24px Arial',
        fillStyle: `hsl(${Math.random() * 360}, 70%, 30%)`,
        textAlign: 'center',
      },
    );
    await editor.executeCommand(textCommand);
    updateHistoryButtons();
  };

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear Canvas';
  clearBtn.onclick = async () => {
    const clearCommand = new ClearCanvasCommand(editor, '#f0f0f0');
    await editor.executeCommand(clearCommand);
    updateHistoryButtons();
  };

  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Undo';
  undoBtn.disabled = true;
  undoBtn.onclick = async () => {
    await editor.undo();
    updateHistoryButtons();
  };

  const redoBtn = document.createElement('button');
  redoBtn.textContent = 'Redo';
  redoBtn.disabled = true;
  redoBtn.onclick = async () => {
    await editor.redo();
    updateHistoryButtons();
  };

  const groupBtn = document.createElement('button');
  groupBtn.textContent = 'Start Group';
  let grouping = false;
  groupBtn.onclick = () => {
    if (!grouping) {
      editor.startCommandGroup('Demo Group');
      groupBtn.textContent = 'End Group';
      grouping = true;
    } else {
      editor.endCommandGroup();
      groupBtn.textContent = 'Start Group';
      grouping = false;
      updateHistoryButtons();
    }
  };

  const clearHistoryBtn = document.createElement('button');
  clearHistoryBtn.textContent = 'Clear History';
  clearHistoryBtn.onclick = () => {
    editor.clearHistory();
    updateHistoryButtons();
  };

  // Function to update history button states
  function updateHistoryButtons() {
    undoBtn.disabled = !editor.canUndo();
    redoBtn.disabled = !editor.canRedo();

    const state = editor.getHistoryState();
    const memoryMB = (state.memoryUsage / (1024 * 1024)).toFixed(2);

    console.log(
      `History: ${state.commands.length} commands, Index: ${state.currentIndex}, Memory: ${memoryMB}MB`,
    );
  }

  // Add buttons to container
  buttonContainer.appendChild(deactivateBtn);
  buttonContainer.appendChild(activateBtn);
  buttonContainer.appendChild(configBtn);
  buttonContainer.appendChild(testBtn);

  // Add separator
  const separator = document.createElement('div');
  separator.style.width = '100%';
  separator.style.height = '1px';
  separator.style.backgroundColor = '#ccc';
  separator.style.margin = '10px 0';
  buttonContainer.appendChild(separator);

  // Image loading controls
  const loadImageBtn = document.createElement('button');
  loadImageBtn.textContent = 'Load Image';
  loadImageBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await editor.loadImage(file);
        } catch (error) {
          console.error('Failed to load image:', error);
        }
      }
    };
    input.click();
  };

  const loadSampleBtn = document.createElement('button');
  loadSampleBtn.textContent = 'Load Sample Image';
  loadSampleBtn.onclick = async () => {
    try {
      // Create a simple colored canvas as sample image
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Create a gradient background
        const gradient = ctx.createLinearGradient(0, 0, 400, 300);
        gradient.addColorStop(0, '#FF6B6B');
        gradient.addColorStop(0.5, '#4ECDC4');
        gradient.addColorStop(1, '#45B7D1');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 300);

        // Add some text
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Sample Image', 200, 150);
        ctx.font = '16px Arial';
        ctx.fillText('400x300 pixels', 200, 180);
      }

      canvas.toBlob(async (blob) => {
        if (blob) {
          await editor.loadImage(blob);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to load sample image:', error);
    }
  };

  const validateBtn = document.createElement('button');
  validateBtn.textContent = 'Validate Image';
  validateBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*'; // Accept any file to test validation
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const result = await editor.validateImage(file);
          if (result.isValid) {
            updateStatus(`✓ Valid image: ${file.name} (${file.type})`);
          } else {
            updateStatus(`✗ Invalid: ${result.error}`);
          }
        } catch (error) {
          console.error('Validation error:', error);
          updateStatus(
            `✗ Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    };
    input.click();
  };

  const dragInfoBtn = document.createElement('button');
  dragInfoBtn.textContent = 'Toggle Drag Info';
  dragInfoBtn.onclick = () => {
    const canvas = editor.getCanvasManager().getCanvas();
    const info = canvas.style.position === 'relative' ? 'hide' : 'show';

    if (info === 'show') {
      canvas.style.position = 'relative';
      canvas.style.border = '2px dashed #4CAF50';
      canvas.style.background =
        'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)';
      canvas.style.backgroundSize = '20px 20px';
      canvas.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';

      const overlay = document.createElement('div');
      overlay.id = 'drag-overlay';
      overlay.innerHTML =
        'Drag & Drop Images Here<br><small>Supports: JPEG, PNG, WebP, GIF, BMP, SVG</small>';
      overlay.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #666;
        font-family: Arial, sans-serif;
        text-align: center;
        pointer-events: none;
        font-size: 18px;
        line-height: 1.4;
      `;
      canvas.parentElement?.appendChild(overlay);
      updateStatus('Drag & Drop visual guide enabled');
    } else {
      canvas.style.position = '';
      canvas.style.border = '';
      canvas.style.background = '';
      canvas.style.backgroundSize = '';
      canvas.style.backgroundPosition = '';
      document.getElementById('drag-overlay')?.remove();
      updateStatus('Drag & Drop visual guide disabled');
    }
  };

  buttonContainer.appendChild(loadImageBtn);
  buttonContainer.appendChild(loadSampleBtn);
  buttonContainer.appendChild(validateBtn);
  buttonContainer.appendChild(dragInfoBtn);

  // Add another separator
  const separator2 = document.createElement('div');
  separator2.style.width = '100%';
  separator2.style.height = '1px';
  separator2.style.backgroundColor = '#ccc';
  separator2.style.margin = '10px 0';
  buttonContainer.appendChild(separator2);

  buttonContainer.appendChild(drawRectBtn);
  buttonContainer.appendChild(drawCircleBtn);
  buttonContainer.appendChild(addTextBtn);
  buttonContainer.appendChild(clearBtn);
  buttonContainer.appendChild(undoBtn);
  buttonContainer.appendChild(redoBtn);
  buttonContainer.appendChild(groupBtn);
  buttonContainer.appendChild(clearHistoryBtn);

  container.appendChild(buttonContainer);

  // Initial history button state
  updateHistoryButtons();

  // Listen for history events
  editor.on('history:change', (event) => {
    console.log('History event:', event.type, event);
    updateHistoryButtons();
  });

  console.log(
    'ImageEditor demo initialized successfully with plugin architecture and state management!',
  );

  // Initialize status
  updateStatus('Ready - Load an image or drag & drop files onto the canvas');

  // Add some helpful information
  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = `
    margin-top: 20px;
    padding: 15px;
    background: #f9f9f9;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
  `;
  infoDiv.innerHTML = `
    <h3 style="margin-top: 0; color: #333;">ImageEditor Demo Features:</h3>
    <ul style="margin: 10px 0; padding-left: 20px;">
      <li><strong>Image Loading:</strong> Load from file picker or drag & drop</li>
      <li><strong>Supported Formats:</strong> JPEG, PNG, WebP, GIF, BMP, SVG</li>
      <li><strong>Validation:</strong> Automatic file type and size validation</li>
      <li><strong>Progress Tracking:</strong> Visual feedback during loading</li>
      <li><strong>Optimization:</strong> Automatic resizing for large images</li>
      <li><strong>History Management:</strong> Full undo/redo with memory optimization</li>
      <li><strong>Plugin Architecture:</strong> Extensible with custom plugins</li>
      <li><strong>Event System:</strong> Comprehensive event handling</li>
      <li><strong>Container Features:</strong> Resizable, responsive, theme support</li>
    </ul>
    <p><strong>Try:</strong> Drag an image file onto the canvas, or use the buttons above!</p>
    
    <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px;">
      <h4 style="margin: 0 0 10px 0; color: #333;">Container Controls:</h4>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
        <button onclick="toggleTheme()" style="padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">Toggle Theme</button>
        <button onclick="togglePanel()" style="padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">Toggle Panel</button>
        <button onclick="setLoading()" style="padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">Test Loading</button>
        <button onclick="resizeContainer()" style="padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">Resize Container</button>
      </div>
    </div>
  `;
  container.appendChild(infoDiv);

  // Add container control functions to window for demo
  (window as any).toggleTheme = () => {
    const currentTheme =
      editor.getContainerElements().container.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    editor.setTheme(newTheme);
  };

  (window as any).togglePanel = () => {
    editor.togglePanel();
  };

  (window as any).setLoading = () => {
    editor.setLoading(true);
    setTimeout(() => {
      editor.setLoading(false);
    }, 2000);
  };

  (window as any).resizeContainer = () => {
    const size = editor.getSize();
    const newWidth = size.width === 800 ? 1000 : 800;
    const newHeight = size.height === 600 ? 700 : 600;
    editor.setSize(newWidth, newHeight);
  };
});

console.log('ImageEditor demo script loaded');
