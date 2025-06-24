// Demo entry for ImageEditor library
import { ImageEditor } from '../core/ImageEditor';
import { LoggerPlugin } from '../plugins/LoggerPlugin';
import '../styles/container.css';
import '../styles/index.css';
import '../styles/properties-panel.css';
import '../styles/responsive.css';
import '../styles/themes.css';
import '../styles/toolbar.css';
import { ResizeTool } from '../tools/ResizeTool';
import { CanvasArea, PropertiesPanel, Toolbar, defaultToolbarConfig } from '../ui';
import { createResizeControls } from '../ui/ResizeControls';

// Initialize the demo when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Get new layout containers
  const toolbarPanel = document.getElementById('toolbar-panel')!;
  const canvasPanel = document.getElementById('canvas-panel')!;
  const propertiesPanelContainer = document.getElementById('properties-panel')!;
  const statusBar = document.getElementById('status-bar')!;
  const themeToggle = document.getElementById('theme-toggle')!;
  const openBtn = document.getElementById('open-image')!;
  const saveBtn = document.getElementById('save-image')!;
  const exportBtn = document.getElementById('export-image')!;

  // Status update function for new status bar
  function updateStatusBar(message: string) {
    statusBar.textContent = message;
    statusBar.title = new Date().toLocaleTimeString() + ': ' + message;
  }

  // Theme toggle
  themeToggle.onclick = () => {
    const root = document.documentElement;
    const isDark = root.getAttribute('data-theme') === 'dark';
    root.setAttribute('data-theme', isDark ? 'light' : 'dark');
    updateStatusBar(`Theme: ${isDark ? 'Light' : 'Dark'}`);
  };

  // Dummy open/save/export
  openBtn.onclick = () => updateStatusBar('Open image (not implemented)');
  saveBtn.onclick = () => updateStatusBar('Save image (not implemented)');
  exportBtn.onclick = () => updateStatusBar('Export image (not implemented)');

  // Create editor instance
  const editor = new ImageEditor({
    container: canvasPanel,
    width: 1240,
    height: 1240,
    showToolbar: true,
    showPanel: true,
    responsive: true,
  });

  // Register logger plugin
  await editor.registerPlugin(LoggerPlugin, {
    enabled: true,
    settings: { logLevel: 'info', showTimestamp: true, prefix: '[Demo]' },
  });

  // Setup properties panel in propertiesPanelContainer
  const propertiesPanel = new PropertiesPanel(propertiesPanelContainer, {
    collapsible: true,
    showHeader: true,
    showSearch: true,
    responsive: true,
  });
  propertiesPanel.on('propertyChanged', (data: any) => {
    updateStatusBar(`${data.controlId}: ${data.value}`);
  });
  propertiesPanel.on('toolPropertiesLoaded', (data: any) => {
    if (data.toolId === 'resize') {
      const resizeTool = editor.getTool('resize') as ResizeTool;
      if (resizeTool) {
        const panelContainer =
          (propertiesPanel as any).contentElement ||
          (propertiesPanel as any).panelElement ||
          undefined;
        if (panelContainer) {
          const prev = panelContainer.querySelector('.resize-controls');
          if (prev) prev.remove();
          const controls = createResizeControls({
            options: resizeTool.getOptions(),
            onChange: (opts) => {
              resizeTool.setOptions(opts);
              resizeTool.previewResize();
            },
            onApply: () => {
              resizeTool.applyResize();
              updateStatusBar('Image resized');
            },
            onReset: () => {
              resizeTool.reset();
              updateStatusBar('Resize reset');
            },
          });
          panelContainer.appendChild(controls);
        }
      }
    }
  });

  // Setup toolbar in toolbarPanel
  const toolbar = new Toolbar(toolbarPanel, defaultToolbarConfig);
  toolbar.on('toolSelected', ({ toolId, tool }) => {
    updateStatusBar(`Selected tool: ${tool.name}`);
    editor.selectTool(toolId);
    propertiesPanel.loadToolProperties(toolId);
  });
  // Set default tool
  toolbar.selectTool('select');

  // Setup canvas area in canvasPanel
  const canvasArea = new CanvasArea(canvasPanel, {
    enablePan: true,
    enableZoomControls: true,
    enableMinimap: true,
    showZoomInfo: true,
    fitOnLoad: true,
    minZoom: 0.1,
    maxZoom: 10,
    zoomStep: 0.1,
  });
  canvasArea.on('zoomChanged', (data: any) => {
    updateStatusBar(`Zoom: ${Math.round(data.zoom * 100)}%`);
  });
  canvasArea.on('canvasReady', () => updateStatusBar('Canvas ready'));

  // Add hidden file input for image upload
  let fileInput = document.getElementById('file-input') as HTMLInputElement | null;
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.id = 'file-input';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
  }
  openBtn.onclick = () => fileInput!.click();
  fileInput.onchange = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = function (ev) {
        const img = new window.Image();
        img.onload = function () {
          editor.loadImage(img.src);
          updateStatusBar('Image loaded: ' + file.name);
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };
});
