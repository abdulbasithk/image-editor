/**
 * Default toolbar configuration for ImageEditor
 * Provides common image editing tools organized in logical groups
 */

import { ToolbarConfig } from './Toolbar';

// SVG Icons for tools
export const ToolbarIcons = {
  select: `<svg viewBox="0 0 24 24"><path d="M2 2v6h2V4h4V2H2zm16 0v2h4v4h2V2h-6zM4 18H2v6h6v-2H4v-4zm16 4h-4v2h6v-6h-2v4z"/></svg>`,
  move: `<svg viewBox="0 0 24 24"><path d="M13 6v5h5V9.5l3.5 3.5-3.5 3.5V14h-5v5h1.5L10 22.5 6.5 19H8v-5H3v1.5L-.5 12 3 8.5V10h5V5H6.5L10 1.5 13.5 5H12z"/></svg>`,
  crop: `<svg viewBox="0 0 24 24"><path d="M7 3H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H9V9h10V7H9V3h-2z"/></svg>`,
  resize: `<svg viewBox="0 0 24 24"><path d="M22 14v-2c0-1.1-.9-2-2-2h-2v2h2v2h-2v2h2c1.1 0 2-.9 2-2zM8 6V4c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2z"/></svg>`,
  rotate: `<svg viewBox="0 0 24 24"><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6z"/></svg>`,
  flip: `<svg viewBox="0 0 24 24"><path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zm2 8h-2v2c1 0 2-1 2-2zM13 3h-2v18h2V3zm8-2h-2v2h2V1zm0 4h-2v2h2V5zM1 7h2v2H1V7zm0-4h2v2H1V3zm2 12H1v2h2v-2z"/></svg>`,
  brush: `<svg viewBox="0 0 24 24"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3z"/></svg>`,
  eraser: `<svg viewBox="0 0 24 24"><path d="M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4.008 4.008 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l8.49-8.56c.79-.78 2.05-.78 2.84 0z"/></svg>`,
  text: `<svg viewBox="0 0 24 24"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg>`,
  shapes: `<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  zoomIn: `<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/><path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/></svg>`,
  zoomOut: `<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/><path d="M7 9h5v1H7z"/></svg>`,
  fit: `<svg viewBox="0 0 24 24"><path d="M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5z"/></svg>`,
  undo: `<svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>`,
  redo: `<svg viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>`,
  save: `<svg viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>`,
  export: `<svg viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>`,
};

export const defaultToolbarConfig: ToolbarConfig = {
  groups: [
    {
      id: 'selection',
      name: 'Selection Tools',
      separator: true,
      tools: [
        {
          id: 'selection',
          name: 'Select',
          icon: ToolbarIcons.select,
          tooltip: 'Selection tool (V)',
          shortcut: 'V',
        },
        {
          id: 'move',
          name: 'Move',
          icon: ToolbarIcons.move,
          tooltip: 'Move tool',
          shortcut: 'M',
        },
      ],
    },
    {
      id: 'transform',
      name: 'Transform Tools',
      separator: true,
      tools: [
        {
          id: 'crop',
          name: 'Crop',
          icon: ToolbarIcons.crop,
          tooltip: 'Crop tool',
          shortcut: 'C',
        },
        {
          id: 'resize',
          name: 'Resize',
          icon: ToolbarIcons.resize,
          tooltip: 'Resize tool',
          shortcut: 'R',
        },
        {
          id: 'rotate',
          name: 'Rotate',
          icon: ToolbarIcons.rotate,
          tooltip: 'Rotate image',
          shortcut: 'R',
        },
        {
          id: 'flip',
          name: 'Flip',
          icon: ToolbarIcons.flip,
          tooltip: 'Flip image',
          shortcut: 'F',
        },
      ],
    },
    {
      id: 'drawing',
      name: 'Drawing Tools',
      separator: true,
      tools: [
        {
          id: 'brush',
          name: 'Brush',
          icon: ToolbarIcons.brush,
          tooltip: 'Brush tool',
          shortcut: 'B',
        },
        {
          id: 'eraser',
          name: 'Eraser',
          icon: ToolbarIcons.eraser,
          tooltip: 'Eraser tool',
          shortcut: 'E',
        },
        {
          id: 'text',
          name: 'Text',
          icon: ToolbarIcons.text,
          tooltip: 'Text tool',
          shortcut: 'T',
        },
        {
          id: 'shapes',
          name: 'Shapes',
          icon: ToolbarIcons.shapes,
          tooltip: 'Shape tools',
          shortcut: 'U',
        },
      ],
    },
    {
      id: 'view',
      name: 'View Controls',
      separator: true,
      tools: [
        {
          id: 'zoom-in',
          name: 'Zoom In',
          icon: ToolbarIcons.zoomIn,
          tooltip: 'Zoom in',
          shortcut: 'Ctrl++',
        },
        {
          id: 'zoom-out',
          name: 'Zoom Out',
          icon: ToolbarIcons.zoomOut,
          tooltip: 'Zoom out',
          shortcut: 'Ctrl+-',
        },
        {
          id: 'fit',
          name: 'Fit to Screen',
          icon: ToolbarIcons.fit,
          tooltip: 'Fit to screen',
          shortcut: 'Ctrl+0',
        },
      ],
    },
    {
      id: 'history',
      name: 'History',
      separator: true,
      tools: [
        {
          id: 'undo',
          name: 'Undo',
          icon: ToolbarIcons.undo,
          tooltip: 'Undo last action',
          shortcut: 'Ctrl+Z',
        },
        {
          id: 'redo',
          name: 'Redo',
          icon: ToolbarIcons.redo,
          tooltip: 'Redo last action',
          shortcut: 'Ctrl+Y',
        },
      ],
    },
    {
      id: 'file',
      name: 'File Operations',
      separator: false,
      tools: [
        {
          id: 'save',
          name: 'Save',
          icon: ToolbarIcons.save,
          tooltip: 'Save image',
          shortcut: 'Ctrl+S',
        },
        {
          id: 'export',
          name: 'Export',
          icon: ToolbarIcons.export,
          tooltip: 'Export image',
          shortcut: 'Ctrl+E',
        },
      ],
    },
  ],
  showTooltips: true,
  showShortcuts: true,
  responsive: true,
  orientation: 'horizontal',
};

// Compact toolbar for mobile/small screens
export const compactToolbarConfig: ToolbarConfig = {
  groups: [
    {
      id: 'essential',
      name: 'Essential Tools',
      separator: true,
      tools: [
        {
          id: 'select',
          name: 'Select',
          icon: ToolbarIcons.select,
          tooltip: 'Selection tool',
        },
        {
          id: 'crop',
          name: 'Crop',
          icon: ToolbarIcons.crop,
          tooltip: 'Crop image',
        },
        {
          id: 'brush',
          name: 'Brush',
          icon: ToolbarIcons.brush,
          tooltip: 'Brush tool',
        },
        {
          id: 'text',
          name: 'Text',
          icon: ToolbarIcons.text,
          tooltip: 'Text tool',
        },
      ],
    },
    {
      id: 'actions',
      name: 'Actions',
      separator: false,
      tools: [
        {
          id: 'undo',
          name: 'Undo',
          icon: ToolbarIcons.undo,
          tooltip: 'Undo',
        },
        {
          id: 'redo',
          name: 'Redo',
          icon: ToolbarIcons.redo,
          tooltip: 'Redo',
        },
        {
          id: 'save',
          name: 'Save',
          icon: ToolbarIcons.save,
          tooltip: 'Save',
        },
      ],
    },
  ],
  showTooltips: true,
  showShortcuts: false,
  responsive: true,
  orientation: 'horizontal',
};

// Vertical toolbar configuration
export const verticalToolbarConfig: ToolbarConfig = {
  groups: [
    {
      id: 'tools',
      name: 'Tools',
      separator: true,
      tools: [
        {
          id: 'select',
          name: 'Select',
          icon: ToolbarIcons.select,
          tooltip: 'Selection tool',
          shortcut: 'V',
        },
        {
          id: 'crop',
          name: 'Crop',
          icon: ToolbarIcons.crop,
          tooltip: 'Crop image',
          shortcut: 'C',
        },
        {
          id: 'brush',
          name: 'Brush',
          icon: ToolbarIcons.brush,
          tooltip: 'Brush tool',
          shortcut: 'B',
        },
        {
          id: 'text',
          name: 'Text',
          icon: ToolbarIcons.text,
          tooltip: 'Text tool',
          shortcut: 'T',
        },
      ],
    },
    {
      id: 'view',
      name: 'View',
      separator: false,
      tools: [
        {
          id: 'zoom-in',
          name: 'Zoom In',
          icon: ToolbarIcons.zoomIn,
          tooltip: 'Zoom in',
          shortcut: 'Ctrl++',
        },
        {
          id: 'zoom-out',
          name: 'Zoom Out',
          icon: ToolbarIcons.zoomOut,
          tooltip: 'Zoom out',
          shortcut: 'Ctrl+-',
        },
      ],
    },
  ],
  showTooltips: true,
  showShortcuts: true,
  responsive: true,
  orientation: 'vertical',
};
