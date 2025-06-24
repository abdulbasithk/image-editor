// Demo entry for ImageEditor library
import { ImageEditor } from '../core/ImageEditor';
import { LoggerPlugin } from '../plugins/LoggerPlugin';
import { DrawCommand, ClearCanvasCommand, TextCommand } from '../commands/BasicCommands';

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

  // Create the editor instance
  const editor = new ImageEditor({
    container: '#app',
    width: 800,
    height: 600,
    theme: 'light',
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
  });

  editor.on('canvas:mousedown', (data) => {
    console.log('Mouse down at:', data.point);
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
});

console.log('ImageEditor demo script loaded');
