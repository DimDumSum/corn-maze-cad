/**
 * ImageImportDialog - Dialog for importing and vectorizing raster images
 *
 * Allows users to:
 * - Select/drop an image file
 * - Adjust threshold for black/white conversion
 * - Toggle invert (light vs dark areas carved)
 * - Set simplification level
 * - Set target size in meters
 * - Preview the vectorization
 * - Import as design elements
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, RefreshCw } from 'lucide-react';
import { useDesignStore } from '../../stores/designStore';
import * as api from '../../api/client';
import './ImageImportDialog.css';

interface ImageImportDialogProps {
  onClose: () => void;
}

interface ImportSettings {
  threshold: number;
  invert: boolean;
  simplify: number;
  targetWidth: number;
}

export function ImageImportDialog({ onClose }: ImageImportDialogProps) {
  const { addDesignElement, field } = useDesignStore();

  // Image state
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  // Settings
  const [settings, setSettings] = useState<ImportSettings>({
    threshold: 128,
    invert: false,
    simplify: 2.0,
    targetWidth: 50,
  });

  // Preview state
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [contourCount, setContourCount] = useState<number>(0);

  // Import state
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate field center for placement
  const getFieldCenter = useCallback((): [number, number] => {
    if (field?.geometry?.exterior) {
      const coords = field.geometry.exterior;
      const avgX = coords.reduce((sum: number, p: number[]) => sum + p[0], 0) / coords.length;
      const avgY = coords.reduce((sum: number, p: number[]) => sum + p[1], 0) / coords.length;
      return [avgX, avgY];
    }
    return [0, 0];
  }, [field]);

  // Load image from file
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, etc.)');
      return;
    }

    setError(null);
    setImageName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImageData(dataUrl);

      // Get image dimensions
      const img = new window.Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Fetch preview from backend
  const fetchPreview = useCallback(async () => {
    if (!imageData) return;

    setPreviewLoading(true);
    try {
      const response = await fetch(`${api.API_BASE_URL}/geometry/image-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          threshold: settings.threshold,
          invert: settings.invert,
        }),
      });

      if (!response.ok) {
        throw new Error('Preview generation failed');
      }

      const result = await response.json();
      setPreviewData(result.preview);
      setContourCount(result.contourCount || 0);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[ImageImport] Preview error:', err);
      }
      setError('Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  }, [imageData, settings.threshold, settings.invert]);

  // Debounced preview update
  useEffect(() => {
    if (!imageData) return;

    if (previewDebounceRef.current) {
      clearTimeout(previewDebounceRef.current);
    }

    previewDebounceRef.current = setTimeout(() => {
      fetchPreview();
    }, 300);

    return () => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
      }
    };
  }, [imageData, settings.threshold, settings.invert, fetchPreview]);

  // Import image as design elements
  const handleImport = useCallback(async () => {
    if (!imageData) return;

    setImporting(true);
    setError(null);

    try {
      const position = getFieldCenter();

      const response = await fetch(`${api.API_BASE_URL}/geometry/image-to-paths`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          threshold: settings.threshold,
          invert: settings.invert,
          simplify: settings.simplify,
          targetWidth: settings.targetWidth,
          position,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail?.error || 'Import failed');
      }

      const result = await response.json();

      if (import.meta.env.DEV) {
        console.log(`[ImageImport] Response: ${result.polygons?.length || 0} polygons`);
      }

      if (!result.polygons || result.polygons.length === 0) {
        setError('No shapes could be extracted from the image. Try adjusting the threshold.');
        setImporting(false);
        return;
      }

      // Add each polygon as a design element
      let addedCount = 0;
      for (const polygon of result.polygons) {
        const points = polygon.points.map((p: [number, number]) => [p[0], p[1]] as [number, number]);

        if (points.length >= 3) {
          addDesignElement({
            type: 'clipart',
            points,
            width: 0.2,
            closed: true,
          });
          addedCount++;
        }
      }

      if (import.meta.env.DEV) {
        console.log(`[ImageImport] Added ${addedCount} design elements from image`);
      }

      onClose();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[ImageImport] Import error:', err);
      }
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }, [imageData, settings, getFieldCenter, addDesignElement, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="image-import-overlay" onClick={onClose}>
      <div className="image-import-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Import Image</h2>
          <button className="close-button" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="dialog-content">
          {/* File Selection */}
          {!imageData ? (
            <div
              className="drop-zone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} />
              <p>Drop an image here or click to browse</p>
              <span>Supports PNG, JPG, GIF, BMP</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <>
              {/* Image Info */}
              <div className="image-info">
                <span className="filename">{imageName}</span>
                {imageSize && (
                  <span className="dimensions">
                    {imageSize.width} x {imageSize.height} px
                  </span>
                )}
                <button
                  className="change-image-btn"
                  onClick={() => {
                    setImageData(null);
                    setPreviewData(null);
                    setImageName('');
                    setImageSize(null);
                  }}
                >
                  Change
                </button>
              </div>

              {/* Preview Area */}
              <div className="preview-section">
                <div className="preview-container">
                  <div className="preview-label">Original</div>
                  <img src={imageData} alt="Original" className="preview-image" />
                </div>
                <div className="preview-container">
                  <div className="preview-label">
                    Vectorized {contourCount > 0 && `(${contourCount} shapes)`}
                  </div>
                  {previewLoading ? (
                    <div className="preview-loading">
                      <RefreshCw className="spin" size={24} />
                    </div>
                  ) : previewData ? (
                    <img src={previewData} alt="Preview" className="preview-image" />
                  ) : (
                    <div className="preview-placeholder">Generating preview...</div>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div className="settings-section">
                <div className="setting-row">
                  <label htmlFor="threshold">
                    Threshold: <span className="value">{settings.threshold}</span>
                  </label>
                  <input
                    type="range"
                    id="threshold"
                    min="0"
                    max="255"
                    value={settings.threshold}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, threshold: parseInt(e.target.value) }))
                    }
                  />
                  <span className="hint">Lower = less carved area</span>
                </div>

                <div className="setting-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.invert}
                      onChange={(e) => setSettings((s) => ({ ...s, invert: e.target.checked }))}
                    />
                    Invert (carve light areas instead of dark)
                  </label>
                </div>

                <div className="setting-row">
                  <label htmlFor="simplify">
                    Simplification: <span className="value">{settings.simplify}</span>
                  </label>
                  <input
                    type="range"
                    id="simplify"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={settings.simplify}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, simplify: parseFloat(e.target.value) }))
                    }
                  />
                  <span className="hint">Higher = fewer points</span>
                </div>

                <div className="setting-row">
                  <label htmlFor="targetWidth">Target Width (meters):</label>
                  <input
                    type="number"
                    id="targetWidth"
                    min="5"
                    max="500"
                    step="5"
                    value={settings.targetWidth}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, targetWidth: parseFloat(e.target.value) || 50 }))
                    }
                  />
                </div>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}
        </div>

        {/* Footer */}
        <div className="dialog-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="import-btn"
            onClick={handleImport}
            disabled={!imageData || importing}
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
