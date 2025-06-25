// Comprehensive ImageEditor Demo showcasing all features
import { ClearCanvasCommand } from '../commands/BasicCommands';
import { ImageEditor } from '../core/ImageEditor';
import { LoggerPlugin } from '../plugins/LoggerPlugin';
import { ResizeTool } from '../tools/ResizeTool';
import { RotationTool } from '../tools/RotationTool';
import { createResizeControls } from '../ui/ResizeControls';
import { createRotationControls } from '../ui/RotationControls';
import './demo.css';

// Initialize demo when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing comprehensive ImageEditor demo...');

  // Get DOM elements
  const canvasContainer = document.getElementById('canvas-container') as HTMLElement;
  const uploadArea = document.getElementById('upload-area') as HTMLElement;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const toolPropertiesContent = document.getElementById('tool-properties-content') as HTMLElement;
  const imageDimensions = document.getElementById('image-dimensions') as HTMLElement;
  const imageSize = document.getElementById('image-size') as HTMLElement;
  const imageFormat = document.getElementById('image-format') as HTMLElement;
  const statusMessage = document.getElementById('status-message') as HTMLElement;
  const currentToolDisplay = document.getElementById('current-tool') as HTMLElement;
  const mousePosition = document.getElementById('mouse-position') as HTMLElement;
  const zoomLevel = document.getElementById('zoom-level') as HTMLElement;
  const canvasSize = document.getElementById('canvas-size') as HTMLElement;

  // State
  let currentTool = 'select';
  let imageLoaded = false;
  let isDarkTheme = false;
  let zoom = 1;

  // Initialize ImageEditor
  const editor = new ImageEditor({
    container: canvasContainer,
    width: 800,
    height: 600,
    showToolbar: false,
    showPanel: false,
    responsive: true,
  });

  // Register logger plugin
  await editor.registerPlugin(LoggerPlugin, {
    enabled: true,
    settings: { logLevel: 'info', showTimestamp: true, prefix: '[Demo]' },
  });

  // Utility functions
  function updateStatus(message: string) {
    statusMessage.textContent = message;
    console.log(`[Demo] ${message}`);
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function showCanvas() {
    uploadArea.style.display = 'none';
    canvasContainer.style.display = 'block';
  }

  function updateImageInfo(data: any) {
    imageDimensions.textContent = `${data.width} × ${data.height}`;
    imageSize.textContent = data.size ? formatFileSize(data.size) : '-';
    imageFormat.textContent = data.format || '-';
    canvasSize.textContent = `${data.width} × ${data.height}`;
  }

  function selectTool(toolId: string) {
    currentTool = toolId;
    editor.selectTool(toolId);
    updateActiveToolButtons();
    updateToolProperties();
    updateStatus(`Selected ${toolId} tool`);
  }

  function updateActiveToolButtons() {
    // Update sidebar buttons
    document.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.classList.remove('active');
    });
    const sidebarBtn = document.querySelector(`[data-tool="${currentTool}"]`);
    if (sidebarBtn) sidebarBtn.classList.add('active');

    // Update toolbar buttons
    document.querySelectorAll('.demo-tool-btn').forEach((btn) => {
      btn.classList.remove('active');
    });
    const toolbarBtn = document.getElementById(`toolbar-${currentTool}`);
    if (toolbarBtn) toolbarBtn.classList.add('active'); // Update current tool display
    const toolNames: { [key: string]: string } = {
      select: 'Select Tool',
      move: 'Move Tool',
      crop: 'Crop Tool',
      resize: 'Resize Tool',
      rotation: 'Rotation Tool',
      brush: 'Brush Tool',
      text: 'Text Tool',
      shapes: 'Shapes Tool',
    };

    currentToolDisplay.textContent = toolNames[currentTool] || 'Unknown Tool';
  }

  function updateToolProperties() {
    toolPropertiesContent.innerHTML = '';
    switch (currentTool) {
      case 'resize':
        createResizeProperties();
        break;
      case 'rotation':
        createRotationProperties();
        break;
      case 'crop':
        createCropProperties();
        break;
      case 'brush':
        createBrushProperties();
        break;
      case 'text':
        createTextProperties();
        break;
      default:
        toolPropertiesContent.innerHTML = `<p style="color: #718096; font-size: 0.9rem; text-align: center; margin: 2rem 0;">No properties for ${currentTool} tool</p>`;
    }
  }

  function createResizeProperties() {
    const resizeTool = editor.getTool('resize') as ResizeTool;
    if (resizeTool) {
      const controls = createResizeControls({
        options: resizeTool.getOptions(),
        onChange: (opts) => {
          resizeTool.setOptions(opts);
          resizeTool.previewResize();
        },
        onApply: () => {
          resizeTool.applyResize();
          updateStatus('Image resized');
        },
        onReset: () => {
          resizeTool.reset();
          updateStatus('Resize reset');
        },
      });
      toolPropertiesContent.appendChild(controls);
    }
  }

  function createRotationProperties() {
    const rotationTool = editor.getTool('rotation') as RotationTool;
    if (rotationTool) {
      const controls = createRotationControls({
        rotationTool: rotationTool,
        onRotate: (angle) => {
          updateStatus(`Rotated image ${angle}°`);
        },
        onReset: () => {
          updateStatus('Rotation reset');
        },
      });
      toolPropertiesContent.appendChild(controls);
    }
  }

  function createCropProperties() {
    toolPropertiesContent.innerHTML = `
      <div class="demo-property-control">
        <label class="demo-property-label">Aspect Ratio</label>
        <select class="demo-property-input" id="crop-aspect">
          <option value="free">Free</option>
          <option value="1:1">Square (1:1)</option>
          <option value="4:3">4:3</option>
          <option value="16:9">16:9</option>
          <option value="3:2">3:2</option>
        </select>
      </div>
      <div class="demo-property-control">
        <button class="demo-btn demo-btn-primary" style="width: 100%" id="apply-crop">Apply Crop</button>
      </div>
      <div class="demo-property-control">
        <button class="demo-btn demo-btn-secondary" style="width: 100%" id="reset-crop">Reset Crop</button>
      </div>
    `;
  }

  function createBrushProperties() {
    toolPropertiesContent.innerHTML = `
      <div class="demo-property-control">
        <label class="demo-property-label">Brush Size</label>
        <input type="range" class="demo-property-slider" min="1" max="50" value="10" id="brush-size">
        <span id="brush-size-value">10px</span>
      </div>
      <div class="demo-property-control">
        <label class="demo-property-label">Brush Color</label>
        <input type="color" class="demo-property-input" value="#000000" id="brush-color">
      </div>
      <div class="demo-property-control">
        <label class="demo-property-label">Opacity</label>
        <input type="range" class="demo-property-slider" min="0" max="100" value="100" id="brush-opacity">
        <span id="brush-opacity-value">100%</span>
      </div>
    `;

    // Add event listeners
    const sizeSlider = document.getElementById('brush-size') as HTMLInputElement;
    const sizeValue = document.getElementById('brush-size-value') as HTMLElement;
    if (sizeSlider && sizeValue) {
      sizeSlider.addEventListener('input', () => {
        sizeValue.textContent = `${sizeSlider.value}px`;
      });
    }

    const opacitySlider = document.getElementById('brush-opacity') as HTMLInputElement;
    const opacityValue = document.getElementById('brush-opacity-value') as HTMLElement;
    if (opacitySlider && opacityValue) {
      opacitySlider.addEventListener('input', () => {
        opacityValue.textContent = `${opacitySlider.value}%`;
      });
    }
  }

  function createTextProperties() {
    toolPropertiesContent.innerHTML = `
      <div class="demo-property-control">
        <label class="demo-property-label">Text</label>
        <input type="text" class="demo-property-input" placeholder="Enter text..." id="text-content">
      </div>
      <div class="demo-property-control">
        <label class="demo-property-label">Font Size</label>
        <input type="range" class="demo-property-slider" min="8" max="72" value="24" id="font-size">
        <span id="font-size-value">24px</span>
      </div>
      <div class="demo-property-control">
        <label class="demo-property-label">Font Family</label>
        <select class="demo-property-input" id="font-family">
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>
      </div>
      <div class="demo-property-control">
        <label class="demo-property-label">Text Color</label>
        <input type="color" class="demo-property-input" value="#000000" id="text-color">
      </div>
      <div class="demo-property-control">
        <label class="demo-property-checkbox">
          <input type="checkbox" id="text-bold">
          <span>Bold</span>
        </label>
      </div>
      <div class="demo-property-control">
        <label class="demo-property-checkbox">
          <input type="checkbox" id="text-italic">
          <span>Italic</span>
        </label>
      </div>
    `;

    // Add event listeners
    const fontSizeSlider = document.getElementById('font-size') as HTMLInputElement;
    const fontSizeValue = document.getElementById('font-size-value') as HTMLElement;
    if (fontSizeSlider && fontSizeValue) {
      fontSizeSlider.addEventListener('input', () => {
        fontSizeValue.textContent = `${fontSizeSlider.value}px`;
      });
    }
  }

  async function loadImageFile(file: File) {
    try {
      updateStatus('Loading image...');

      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          await editor.loadImage(img.src);
          imageLoaded = true;
          showCanvas();
          updateImageInfo({
            width: img.naturalWidth,
            height: img.naturalHeight,
            size: file.size,
            format: file.type,
          });
          updateStatus('Image loaded successfully');
        };
        img.onerror = () => {
          updateStatus('Failed to load image');
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error loading image:', error);
      updateStatus('Error loading image');
    }
  }

  async function loadSampleImage() {
    try {
      // Create a sample canvas with some content
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d')!;

      // Create a gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add some shapes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(50, 50, 100, 100);
      ctx.beginPath();
      ctx.arc(300, 150, 50, 0, Math.PI * 2);
      ctx.fill();

      // Add text
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Sample Image', canvas.width / 2, canvas.height / 2);

      await editor.loadImage(canvas.toDataURL());
      imageLoaded = true;
      showCanvas();
      updateImageInfo({
        width: canvas.width,
        height: canvas.height,
        size: 0,
        format: 'image/png',
      });
      updateStatus('Sample image loaded');
    } catch (error) {
      console.error('Error loading sample image:', error);
      updateStatus('Error loading sample image');
    }
  }

  // Event Listeners

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      isDarkTheme = !isDarkTheme;
      document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
      updateStatus(`Theme: ${isDarkTheme ? 'Dark' : 'Light'}`);
    });
  }

  // File operations
  const uploadBtn = document.getElementById('upload-btn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  const btnOpen = document.getElementById('btn-open');
  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      fileInput.click();
    });
  }

  const loadSample = document.getElementById('load-sample');
  if (loadSample) {
    loadSample.addEventListener('click', () => {
      loadSampleImage();
    });
  }

  const btnSave = document.getElementById('btn-save');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      updateStatus('Save functionality would be implemented here');
    });
  }

  const btnExport = document.getElementById('btn-export');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      if (imageLoaded) {
        try {
          const canvas = editor.getCanvas();
          const link = document.createElement('a');
          link.download = 'edited-image.png';
          link.href = canvas.toDataURL();
          link.click();
          updateStatus('Image exported');
        } catch (error) {
          console.error('Error exporting image:', error);
          updateStatus('Export failed');
        }
      } else {
        updateStatus('No image to export');
      }
    });
  }

  // File input change
  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      loadImageFile(target.files[0]);
    }
  });

  // Tool selection
  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tool = (e.currentTarget as HTMLElement).dataset.tool!;
      selectTool(tool);
    });
  });

  // Toolbar tools
  document.querySelectorAll('.demo-tool-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const btnId = (e.currentTarget as HTMLElement).id;
      const tool = btnId.replace('toolbar-', '');
      selectTool(tool);
    });
  });
  // Transform operations
  const btnRotateLeft = document.getElementById('btn-rotate-left');
  if (btnRotateLeft) {
    btnRotateLeft.addEventListener('click', () => {
      if (!imageLoaded) {
        updateStatus('Please load an image first');
        return;
      }
      const rotationTool = editor.getTool('rotation') as RotationTool;
      if (rotationTool) {
        rotationTool.rotateCounterclockwise();
        updateStatus('Rotated image 90° counterclockwise');
      }
    });
  }
  const btnRotateRight = document.getElementById('btn-rotate-right');
  if (btnRotateRight) {
    btnRotateRight.addEventListener('click', () => {
      console.log('🔄 DEMO: Rotate Right button clicked');
      if (!imageLoaded) {
        updateStatus('Please load an image first');
        return;
      }
      const rotationTool = editor.getTool('rotation') as RotationTool;
      if (rotationTool) {
        console.log('🔄 DEMO: Calling rotateClockwise()');
        rotationTool.rotateClockwise();
        updateStatus('Rotated image 90° clockwise');
      }
    });
  }
  // Flip operations
  const btnFlipH = document.getElementById('btn-flip-h');
  if (btnFlipH) {
    btnFlipH.addEventListener('click', () => {
      console.log('🔄 DEMO: Flip Horizontal button clicked');
      if (!imageLoaded) {
        updateStatus('Please load an image first');
        return;
      }
      const rotationTool = editor.getTool('rotation') as RotationTool;
      if (rotationTool) {
        console.log('🔄 DEMO: Calling flipHorizontal()');
        rotationTool.flipHorizontal();
        updateStatus('Flipped image horizontally');
      }
    });
  }

  const btnFlipV = document.getElementById('btn-flip-v');
  if (btnFlipV) {
    btnFlipV.addEventListener('click', () => {
      console.log('🔄 DEMO: Flip Vertical button clicked');
      if (!imageLoaded) {
        updateStatus('Please load an image first');
        return;
      }
      const rotationTool = editor.getTool('rotation') as RotationTool;
      if (rotationTool) {
        console.log('🔄 DEMO: Calling flipVertical()');
        rotationTool.flipVertical();
        updateStatus('Flipped image vertically');
      }
    });
  } // View controls
  const btnZoomIn = document.getElementById('btn-zoom-in');
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      zoom *= 1.2;
      zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
      updateStatus(`Zoom: ${Math.round(zoom * 100)}% (Enhanced zoom via mouse wheel available)`);
    });
  }

  const btnZoomOut = document.getElementById('btn-zoom-out');
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      zoom *= 0.8;
      zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
      updateStatus(`Zoom: ${Math.round(zoom * 100)}% (Enhanced zoom via mouse wheel available)`);
    });
  }

  // History controls
  const btnUndo = document.getElementById('btn-undo');
  if (btnUndo) {
    btnUndo.addEventListener('click', () => {
      updateStatus('Undo functionality would be implemented here');
    });
  }

  const btnRedo = document.getElementById('btn-redo');
  if (btnRedo) {
    btnRedo.addEventListener('click', () => {
      updateStatus('Redo functionality would be implemented here');
    });
  }

  const btnClear = document.getElementById('btn-clear');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      const clearCommand = new ClearCanvasCommand(editor);
      editor.executeCommand(clearCommand);
      updateStatus('Canvas cleared');
    });
  }

  // Upload area click
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });

  // Drag and drop
  [uploadArea, canvasContainer].forEach((area) => {
    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.classList.add('dragover');
    });

    area.addEventListener('dragleave', () => {
      area.classList.remove('dragover');
    });

    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.classList.remove('dragover');

      const files = e.dataTransfer?.files;
      if (files && files[0]) {
        loadImageFile(files[0]);
      }
    });
  });

  // Mouse position tracking
  canvasContainer.addEventListener('mousemove', (e) => {
    const rect = canvasContainer.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    mousePosition.textContent = `${x}, ${y}`;
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'o':
          e.preventDefault();
          fileInput.click();
          break;
        case 's':
          e.preventDefault();
          updateStatus('Save shortcut pressed');
          break;
        case 'z':
          e.preventDefault();
          updateStatus('Undo shortcut pressed');
          break;
      }
    } else {
      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
          selectTool('select');
          break;
        case 'm':
          selectTool('move');
          break;
        case 'c':
          selectTool('crop');
          break;
        case 'r':
          selectTool('resize');
          break;
        case 'o':
          selectTool('rotation');
          break;
        case 'b':
          selectTool('brush');
          break;
        case 't':
          selectTool('text');
          break;
      }
    }
  });

  // Initial setup
  updateActiveToolButtons();
  updateToolProperties();
  updateStatus('ImageEditor demo ready - Upload an image or load a sample to start');

  console.log('ImageEditor demo initialized successfully');
});
