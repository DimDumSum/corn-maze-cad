import { useState, useEffect } from 'react';

/**
 * Hook to detect if running in Electron and provide access to Electron APIs
 *
 * @returns Object with:
 *   - isElectron: boolean - true if running in Electron
 *   - electronAPI: ElectronAPI | null - access to Electron IPC methods
 *   - getApiUrl: () => Promise<string> - get backend API URL (works in both Electron and browser)
 */
export function useElectron() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if window.electronAPI exists (set by preload script)
    setIsElectron(typeof window !== 'undefined' && 'electronAPI' in window);
  }, []);

  /**
   * Get the backend API URL
   * - In Electron: asks the main process for the URL
   * - In browser: returns localhost URL for development
   */
  const getApiUrl = async (): Promise<string> => {
    if (isElectron && window.electronAPI) {
      try {
        return await window.electronAPI.getApiUrl();
      } catch (error) {
        console.warn('Failed to get API URL from Electron, falling back to localhost:', error);
        return 'http://localhost:8000';
      }
    }
    // Fallback for browser dev mode
    return 'http://localhost:8000';
  };

  /**
   * Open a file dialog for importing GIS boundary files
   */
  const openBoundaryFile = async (): Promise<{
    path: string;
    buffer?: number[];
    files?: Record<string, number[]>;
  } | null> => {
    if (isElectron && window.electronAPI) {
      try {
        return await window.electronAPI.openBoundaryFile();
      } catch (error) {
        console.error('Failed to open boundary file dialog:', error);
        return null;
      }
    }
    // Browser mode - not supported, use <input type="file"> instead
    console.warn('File dialog not available in browser mode. Use <input type="file"> instead.');
    return null;
  };

  return {
    isElectron,
    electronAPI: isElectron ? window.electronAPI : null,
    getApiUrl,
    openBoundaryFile,
  };
}
