// Demo entry for ImageEditor library
import { ImageEditor } from '../core/ImageEditor';
import { LoggerPlugin } from '../plugins/LoggerPlugin';
import { DrawCommand, ClearCanvasCommand } from '../commands/BasicCommands';
import { Toolbar, defaultToolbarConfig, CanvasArea, PropertiesPanel } from '../ui';

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
    background: #e8f5e8;
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

// Setup toolbar function
function setupToolbar(container: HTMLElement, _editor: ImageEditor): Toolbar {
  const toolbarContainer = document.createElement('div');
  toolbarContainer.id = 'toolbar';
  toolbarContainer.style.marginBottom = '10px';
  container.appendChild(toolbarContainer);

  const toolbar = new Toolbar(toolbarContainer, defaultToolbarConfig);

  // Handle tool selection
  toolbar.on('toolSelected', ({ toolId, tool }) => {
    console.log(`Selected tool: ${tool.name} (${toolId})`);
    updateStatus(`Selected tool: ${tool.name}`);

    // Handle different tools
    switch (toolId) {
      case 'select':
        updateStatus('Selection tool activated');
        break;
      case 'crop':
        updateStatus('Crop tool activated');
        break;
      case 'brush':
        updateStatus('Brush tool activated');
        break;
      case 'text':
        updateStatus('Text tool activated');
        break;
      case 'zoom-in':
        updateStatus('Zoom In activated');
        break;
      case 'zoom-out':
        updateStatus('Zoom Out activated');
        break;
      case 'fit':
        updateStatus('Fit to screen activated');
        break;
      case 'undo':
        _editor.undo();
        break;
      case 'redo':
        _editor.redo();
        break;
      case 'save':
        updateStatus('Save feature not implemented yet');
        break;
      case 'export':
        updateStatus('Export feature not implemented yet');
        break;
      default:
        updateStatus(`Tool ${toolId} not implemented yet`);
    }
  });

  // Update toolbar state based on editor state
  _editor.on('history:change', () => {
    const canUndo = _editor.canUndo();
    const canRedo = _editor.canRedo();

    toolbar.setToolEnabled('undo', canUndo);
    toolbar.setToolEnabled('redo', canRedo);
  });

  // Set default tool
  toolbar.selectTool('select');

  return toolbar;
}

// Setup canvas area function
function setupCanvasArea(container: HTMLElement, _editor: ImageEditor): CanvasArea {
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'demo-canvas-container';
  canvasContainer.style.cssText = `
    flex: 1;
    min-height: 400px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    margin: 8px 0;
    background: #f8f9fa;
    display: flex;
    flex-direction: column;
  `;
  container.appendChild(canvasContainer);

  // Initialize canvas area with full feature set
  const canvasArea = new CanvasArea(canvasContainer, {
    enablePan: true,
    enableZoomControls: true,
    enableMinimap: true,
    showZoomInfo: true,
    fitOnLoad: true,
    minZoom: 0.1,
    maxZoom: 10,
    zoomStep: 0.1,
  });

  // Connect canvas area events
  canvasArea.on('zoomChanged', (data: any) => {
    const { zoom } = data;
    updateStatus(`Zoom: ${Math.round(zoom * 100)}%`);
  });

  canvasArea.on('panChanged', () => {
    updateStatus('Canvas panned');
  });

  canvasArea.on('canvasReady', (data: any) => {
    const { canvas } = data;
    updateStatus('Canvas ready for editing');

    // Draw some demo content on the canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Clear with light background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw a grid pattern
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw some demo shapes
      ctx.fillStyle = '#007acc';
      ctx.fillRect(100, 100, 150, 100);

      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(350, 150, 60, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4ecdc4';
      ctx.fillRect(150, 250, 200, 80);

      // Add some text
      ctx.fillStyle = '#333';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ImageEditor Demo', canvas.width / 2, 50);
      ctx.font = '16px Arial';
      ctx.fillText('Zoom, pan, and explore!', canvas.width / 2, 380);
    }
  });

  canvasArea.on('fitToScreen', (data: any) => {
    const { zoom } = data;
    updateStatus(`Fit to screen: ${Math.round(zoom * 100)}%`);
  });

  canvasArea.on('actualSize', (data: any) => {
    const { zoom } = data;
    updateStatus(`Actual size: ${Math.round(zoom * 100)}%`);
  });

  // Create mock image data for testing
  setTimeout(() => {
    const mockImageData = new ImageData(800, 600);
    canvasArea.setImageData(mockImageData);
    updateStatus('Demo canvas initialized');
  }, 500);
  return canvasArea;
}

// Setup properties panel function
function setupPropertiesPanel(container: HTMLElement, _editor: ImageEditor): PropertiesPanel {
  const propertiesPanelContainer = document.createElement('div');
  propertiesPanelContainer.className = 'demo-properties-container';
  propertiesPanelContainer.style.cssText = `
    width: 280px;
    min-width: 280px;
    margin: 8px 0 8px 8px;
  `;
  container.appendChild(propertiesPanelContainer);

  // Initialize properties panel
  const propertiesPanel = new PropertiesPanel(propertiesPanelContainer, {
    collapsible: true,
    showHeader: true,
    showSearch: true,
    responsive: true,
  });

  // Connect properties panel events
  propertiesPanel.on('propertyChanged', (data: any) => {
    const { toolId, controlId, value, oldValue } = data;
    console.log(
      `Property changed - Tool: ${toolId}, Control: ${controlId}, Value: ${value}, Old: ${oldValue}`,
    );
    updateStatus(`${controlId}: ${value}`);
  });

  propertiesPanel.on('groupToggled', (data: any) => {
    const { groupId, collapsed } = data;
    console.log(`Group toggled - ${groupId}: ${collapsed ? 'collapsed' : 'expanded'}`);
  });

  propertiesPanel.on('panelToggled', (data: any) => {
    const { collapsed } = data;
    console.log(`Properties panel ${collapsed ? 'collapsed' : 'expanded'}`);
    updateStatus(`Properties panel ${collapsed ? 'collapsed' : 'expanded'}`);
  });

  propertiesPanel.on('toolPropertiesLoaded', (data: any) => {
    const { toolId } = data;
    console.log(`Properties loaded for tool: ${toolId}`);
    updateStatus(`Properties loaded for ${toolId} tool`);
  });

  // Load default tool properties
  propertiesPanel.loadToolProperties('select');

  return propertiesPanel;
}

// Add demo control buttons
function addDemoButtons(container: HTMLElement, editor: ImageEditor): void {
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    margin-top: 20px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    padding: 15px;
    background: #f9f9f9;
    border-radius: 8px;
  `;

  // History buttons
  const drawBtn = document.createElement('button');
  drawBtn.textContent = 'Draw Rectangle';
  drawBtn.style.cssText =
    'padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
  drawBtn.onclick = async () => {
    const drawCommand = new DrawCommand(editor, 'Draw Rectangle', () => {
      const ctx = editor.getCanvasManager().getContext();
      ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 50%)`;
      const x = Math.random() * 600;
      const y = Math.random() * 400;
      ctx.fillRect(x, y, 100, 80);
    });
    await editor.executeCommand(drawCommand);
    updateStatus('Rectangle drawn');
  };

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear Canvas';
  clearBtn.style.cssText =
    'padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
  clearBtn.onclick = async () => {
    const clearCommand = new ClearCanvasCommand(editor, '#f0f0f0');
    await editor.executeCommand(clearCommand);
    updateStatus('Canvas cleared');
  };

  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Undo';
  undoBtn.style.cssText =
    'padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
  undoBtn.onclick = async () => {
    await editor.undo();
    updateStatus('Undone');
  };

  const redoBtn = document.createElement('button');
  redoBtn.textContent = 'Redo';
  redoBtn.style.cssText =
    'padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;';
  redoBtn.onclick = async () => {
    await editor.redo();
    updateStatus('Redone');
  };

  buttonContainer.appendChild(drawBtn);
  buttonContainer.appendChild(clearBtn);
  buttonContainer.appendChild(undoBtn);
  buttonContainer.appendChild(redoBtn);

  container.appendChild(buttonContainer);

  // Add info section
  const infoDiv = document.createElement('div');
  infoDiv.style.cssText = `
    margin-top: 20px;
    padding: 15px;
    background: #f0f8ff;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
  `;
  infoDiv.innerHTML = `
    <h3 style="margin-top: 0; color: #333;">ImageEditor Demo Features:</h3>
    <ul style="margin: 10px 0; padding-left: 20px;">
      <li><strong>Toolbar:</strong> Tool selection with hover tooltips and keyboard shortcuts</li>
      <li><strong>Canvas Area:</strong> Zoomable viewport with pan, zoom controls, and minimap</li>
      <li><strong>Properties Panel:</strong> Dynamic tool properties with collapsible sections and form controls</li>
      <li><strong>Zoom Controls:</strong> Zoom in/out buttons, slider, mouse wheel, fit-to-screen</li>
      <li><strong>Pan & Navigate:</strong> Drag to pan, minimap for quick navigation</li>
      <li><strong>History:</strong> Undo/redo with visual feedback</li>
      <li><strong>Demo Content:</strong> Grid pattern and sample shapes for testing</li>
    </ul>
    <p><strong>Try:</strong> Select different tools to see dynamic properties, use zoom controls, and test the demo buttons!</p>
  `;
  container.appendChild(infoDiv);
}

// Initialize the demo when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing ImageEditor demo...');

  // Get or create the app container
  let container = document.getElementById('app');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
  }
  // Set container styles for demo layout
  container.style.cssText = `
    margin: 20px auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
    max-width: 1400px;
    min-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
    background: white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;

  // Add title
  const title = document.createElement('h1');
  title.textContent = 'ImageEditor Demo';
  title.style.cssText = `
    margin: 0 0 20px 0;
    color: #333;
    font-family: Arial, sans-serif;
    text-align: center;
  `;
  container.appendChild(title);

  // Initialize status
  updateStatus('Initializing ImageEditor demo...');

  try {
    // Create a simple editor instance (we'll build our own UI)
    const editor = new ImageEditor({
      container: container,
      width: 800,
      height: 600,
    });

    // Register the logger plugin
    await editor.registerPlugin(LoggerPlugin, {
      enabled: true,
      settings: {
        logLevel: 'info',
        showTimestamp: true,
        prefix: '[Demo]',
      },
    });

    // Set up event handlers
    editor.on('editor:ready', () => {
      updateStatus('Editor ready!');
    });

    editor.on('history:change', () => {
      console.log('History changed');
    }); // Setup UI components
    const toolbar = setupToolbar(container, editor);

    // Create main content area for canvas and properties
    const mainContent = document.createElement('div');
    mainContent.className = 'demo-main-content';
    mainContent.style.cssText = `
      display: flex;
      flex: 1;
      gap: 0;
      min-height: 500px;
    `;
    container.appendChild(mainContent);

    const canvasArea = setupCanvasArea(mainContent, editor);
    const propertiesPanel = setupPropertiesPanel(mainContent, editor);

    // Add demo buttons
    addDemoButtons(container, editor); // Connect toolbar tools to canvas area and properties panel
    toolbar.on('toolSelected', ({ toolId }) => {
      // Update properties panel for selected tool
      propertiesPanel.loadToolProperties(toolId);

      // Handle canvas area zoom tools
      switch (toolId) {
        case 'zoom-in':
          canvasArea.zoomIn();
          break;
        case 'zoom-out':
          canvasArea.zoomOut();
          break;
        case 'fit':
          canvasArea.fitToScreen();
          break;
      }
    });

    updateStatus('Demo initialized successfully!');
    console.log('ImageEditor demo loaded successfully!');
  } catch (error) {
    console.error('Failed to initialize demo:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

console.log('ImageEditor demo script loaded');
