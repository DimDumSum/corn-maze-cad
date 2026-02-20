"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    openFile: () => electron_1.ipcRenderer.invoke('dialog:openFile'),
    saveFile: (content) => electron_1.ipcRenderer.invoke('dialog:saveFile', content),
    openBoundaryFile: () => electron_1.ipcRenderer.invoke('open-boundary-file'),
    // System dialogs
    showMessage: (message, type) => electron_1.ipcRenderer.invoke('dialog:showMessage', message, type),
    // App info
    getAppPath: () => electron_1.ipcRenderer.invoke('app:getPath'),
    getVersion: () => electron_1.ipcRenderer.invoke('app:getVersion'),
    getApiUrl: () => electron_1.ipcRenderer.invoke('get-api-url'),
    // Zoom controls (connected to menu)
    onZoomIn: (callback) => electron_1.ipcRenderer.on('menu:zoom-in', () => callback()),
    onZoomOut: (callback) => electron_1.ipcRenderer.on('menu:zoom-out', () => callback()),
    onZoomReset: (callback) => electron_1.ipcRenderer.on('menu:zoom-reset', () => callback()),
    // Menu events for save/load/undo/redo
    onMenuSave: (callback) => electron_1.ipcRenderer.on('menu:save', () => callback()),
    onMenuSaveAs: (callback) => electron_1.ipcRenderer.on('menu:save-as', (_event, path) => callback(path)),
    onMenuOpen: (callback) => electron_1.ipcRenderer.on('menu:open', (_event, path) => callback(path)),
    onMenuNew: (callback) => electron_1.ipcRenderer.on('menu:new', () => callback()),
    onMenuUndo: (callback) => electron_1.ipcRenderer.on('menu:undo', () => callback()),
    onMenuRedo: (callback) => electron_1.ipcRenderer.on('menu:redo', () => callback()),
});
