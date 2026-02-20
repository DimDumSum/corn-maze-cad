import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (content: string) => ipcRenderer.invoke('dialog:saveFile', content),
  openBoundaryFile: () => ipcRenderer.invoke('open-boundary-file'),

  // System dialogs
  showMessage: (message: string, type: 'info' | 'warning' | 'error') =>
    ipcRenderer.invoke('dialog:showMessage', message, type),

  // App info
  getAppPath: () => ipcRenderer.invoke('app:getPath'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getApiUrl: () => ipcRenderer.invoke('get-api-url'),

  // Zoom controls (connected to menu)
  onZoomIn: (callback: () => void) =>
    ipcRenderer.on('menu:zoom-in', () => callback()),
  onZoomOut: (callback: () => void) =>
    ipcRenderer.on('menu:zoom-out', () => callback()),
  onZoomReset: (callback: () => void) =>
    ipcRenderer.on('menu:zoom-reset', () => callback()),

  // Menu events for save/load/undo/redo
  onMenuSave: (callback: () => void) =>
    ipcRenderer.on('menu:save', () => callback()),
  onMenuSaveAs: (callback: (path: string) => void) =>
    ipcRenderer.on('menu:save-as', (_event: any, path: string) => callback(path)),
  onMenuOpen: (callback: (path: string) => void) =>
    ipcRenderer.on('menu:open', (_event: any, path: string) => callback(path)),
  onMenuNew: (callback: () => void) =>
    ipcRenderer.on('menu:new', () => callback()),
  onMenuUndo: (callback: () => void) =>
    ipcRenderer.on('menu:undo', () => callback()),
  onMenuRedo: (callback: () => void) =>
    ipcRenderer.on('menu:redo', () => callback()),
});
