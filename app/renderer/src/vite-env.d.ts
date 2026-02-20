/// <reference types="vite/client" />

interface ElectronAPI {
  openFile: () => Promise<string | null>;
  saveFile: (content: string) => Promise<string | null>;
  openBoundaryFile: () => Promise<{
    path: string;
    buffer?: number[];  // Single file
    files?: Record<string, number[]>;  // Shapefile bundle
  } | null>;
  showMessage: (message: string, type: 'info' | 'warning' | 'error') => Promise<void>;
  getAppPath: () => Promise<string>;
  getVersion: () => Promise<string>;
  getApiUrl: () => Promise<string>;
  onZoomIn: (callback: () => void) => void;
  onZoomOut: (callback: () => void) => void;
  onZoomReset: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
