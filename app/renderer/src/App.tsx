/**
 * Main App Component - Fully Integrated with Zustand stores, tools, and API
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import { Toolbar, type ExportFormat } from './components/Toolbar/Toolbar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { KeyboardHelp } from './components/KeyboardHelp/KeyboardHelp';
import { useUiStore } from './stores/uiStore';
import { useConstraintStore } from './stores/constraintStore';
import { useDesignStore } from './stores/designStore';
import { useTool } from './tools';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { renderSnapIndicator, renderGuideLines } from './snapping/SnapVisuals';
import * as api from './api/client';
import { drawGrid, calculateBounds, zoomToFit } from './utils/canvas';
import './App.css';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zustand stores - Use selectors to avoid unnecessary re-renders
  const camera = useUiStore((state) => state.camera);
  const showGrid = useUiStore((state) => state.showGrid);
  const gridSize = useUiStore((state) => state.gridSize);
  const setMouseWorldPos = useUiStore((state) => state.setMouseWorldPos);
  const setCamera = useUiStore((state) => state.setCamera);

  const field = useDesignStore((state) => state.field);
  const maze = useDesignStore((state) => state.maze);
  const setField = useDesignStore((state) => state.setField);
  const setMaze = useDesignStore((state) => state.setMaze);

  const constraints = useConstraintStore();

  // Get current tool
  const tool = useTool();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onShowHelp: () => setShowHelp(true),
  });

  // Handle Esc key to close help modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showHelp) {
          setShowHelp(false);
        } else if (error) {
          setError(null);
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showHelp, error]);

  // === API HANDLERS ===
  const handleImportField = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use demo mode for now - in production, would use file dialog
      const result = await api.importFieldDemo();

      if (result.error) {
        setError(result.error);
        return;
      }

      setField(result);

      // Zoom to fit the field
      if (result.geometry) {
        const canvas = canvasRef.current;
        if (canvas) {
          const bounds = calculateBounds(result.geometry);
          const newCamera = zoomToFit(bounds, canvas.width, canvas.height);
          setCamera(newCamera);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import field');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMaze = async () => {
    if (!field) {
      setError('Import a field boundary first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use pathWidthMin as the maze spacing (grid line distance)
      const spacing = constraints.pathWidthMin || 10.0;
      const result = await api.generateMaze(spacing);

      if (result.error) {
        setError(result.error);
        return;
      }

      // Set maze directly (computed result from backend)
      setMaze(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate maze');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!field) {
      setError('Import a field boundary first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      switch (format) {
        case 'kml': {
          const result = await api.exportKml();
          if (result.error) { setError(result.error); return; }
          const paths = [result.boundary_path, result.walls_path].filter(Boolean).join('\n');
          alert(`KML exported:\n${paths}`);
          break;
        }
        case 'png': {
          const result = await api.exportPng();
          if (result.error) { setError(result.error); return; }
          alert(`PNG exported:\n${result.png_path}\n${result.json_path}`);
          break;
        }
        case 'shapefile': {
          if (!maze) { setError('Generate a maze first'); return; }
          const result = await api.exportShapefile();
          if (result.error) { setError(result.error); return; }
          alert(`Shapefile exported to:\n${result.path}`);
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export');
    } finally {
      setLoading(false);
    }
  };

  // === COORDINATE TRANSFORMATION ===
  const screenToWorld = (screenX: number, screenY: number): [number, number] => {
    // Convert from screen coordinates to world coordinates
    const worldX = (screenX - camera.x) / camera.scale;
    const worldY = (screenY - camera.y) / camera.scale;
    return [worldX, worldY];
  };

  // === RENDERING ===
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply camera transform
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, camera, gridSize, canvas.width, canvas.height);
    }

    // Layer 1: Field Boundary (Green)
    if (field?.geometry) {
      ctx.beginPath();
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = 3 / camera.scale;

      const coords = field.geometry.exterior;
      coords.forEach((p: [number, number], i: number) =>
        i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])
      );
      ctx.closePath();
      ctx.stroke();
    }

    // Layer 2: Maze Walls (Yellow)
    // Carved paths appear as dark gaps (absence of walls)
    if (maze?.walls) {
      ctx.beginPath();
      ctx.strokeStyle = '#FFC107';
      ctx.lineWidth = 2 / camera.scale;

      maze.walls.forEach((line: [number, number][]) => {
        if (line.length >= 2) {
          ctx.moveTo(line[0][0], line[0][1]);
          for (let i = 1; i < line.length; i++) {
            ctx.lineTo(line[i][0], line[i][1]);
          }
        }
      });
      ctx.stroke();
    }

    ctx.restore();

    // Layer 3: Design Elements (pending paths - blue dashed lines)
    const { designElements, violations } = useDesignStore.getState();

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    for (const el of designElements) {
      ctx.strokeStyle = '#3b82f6'; // Blue
      ctx.lineWidth = el.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([8 / camera.scale, 4 / camera.scale]);

      // Apply rotation if specified
      const rotation = el.rotation || 0;
      if (rotation !== 0 && el.points.length > 0) {
        // Calculate centroid for rotation
        let cx = 0, cy = 0;
        for (const pt of el.points) {
          cx += pt[0];
          cy += pt[1];
        }
        cx /= el.points.length;
        cy /= el.points.length;

        // Save context and apply rotation around centroid
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      ctx.beginPath();
      if (el.points.length > 0) {
        ctx.moveTo(el.points[0][0], el.points[0][1]);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i][0], el.points[i][1]);
        }
        if (el.closed) ctx.closePath();
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Restore context if rotation was applied
      if (rotation !== 0 && el.points.length > 0) {
        ctx.restore();
      }
    }

    // Draw violations (red overlays with labels) when enabled
    const { showViolationsOnCanvas } = useDesignStore.getState();
    if (showViolationsOnCanvas && violations.length > 0) {
      for (const v of violations) {
        // Draw highlight area if available
        if (v.highlightArea && v.highlightArea.length > 0) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'; // Semi-transparent red
          ctx.strokeStyle = '#ef4444'; // Solid red
          ctx.lineWidth = 2 / camera.scale;
          ctx.setLineDash([6 / camera.scale, 3 / camera.scale]);

          ctx.beginPath();
          ctx.moveTo(v.highlightArea[0][0], v.highlightArea[0][1]);
          for (let i = 1; i < v.highlightArea.length; i++) {
            ctx.lineTo(v.highlightArea[i][0], v.highlightArea[i][1]);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw violation marker (red circle)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2 / camera.scale;
        ctx.beginPath();
        ctx.arc(v.location[0], v.location[1], 10 / camera.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw label with actual/required values
        const labelText = `${v.actualValue.toFixed(1)}m / ${v.requiredValue.toFixed(1)}m min`;
        const fontSize = Math.max(12, 14 / camera.scale);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Label background
        const textMetrics = ctx.measureText(labelText);
        const padding = 4 / camera.scale;
        const labelX = v.location[0];
        const labelY = v.location[1] - 14 / camera.scale;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(
          labelX - textMetrics.width / 2 - padding,
          labelY - fontSize - padding,
          textMetrics.width + padding * 2,
          fontSize + padding * 2
        );

        // Label text
        ctx.fillStyle = '#ef4444';
        ctx.fillText(labelText, labelX, labelY);
      }
    }

    ctx.restore();

    // Layer 4: Tool Overlay (rendered in screen space)
    if (tool.renderOverlay) {
      tool.renderOverlay(ctx, camera);
    }

    // Layer 5: Snap Guide Lines (rendered in screen space)
    // Read from store directly to avoid triggering re-renders
    const { currentSnap, currentGuides, showSnapIndicators } = useUiStore.getState();
    if (currentGuides.length > 0 && showSnapIndicators) {
      renderGuideLines(ctx, currentGuides, camera);
    }

    // Layer 6: Snap Indicator (rendered in screen space, on top of guide lines)
    if (currentSnap && showSnapIndicators) {
      renderSnapIndicator(ctx, currentSnap, camera);
    }

    // Empty state message
    if (!field) {
      ctx.fillStyle = '#666';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Click "Import Field" or press Ctrl+O to begin',
        canvas.width / 2,
        canvas.height / 2
      );
    }

    // Loading overlay
    if (loading) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
    }

    // Error message
    if (error) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
      ctx.fillRect(20, 20, canvas.width - 40, 60);
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(error, canvas.width / 2, 40);
      ctx.font = '12px sans-serif';
      ctx.fillText('Press Esc to dismiss', canvas.width / 2, 60);
    }
  };

  // Continuous rendering with requestAnimationFrame for smooth 60fps
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      draw();
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [camera, field, maze, tool, showGrid, loading, error]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      draw();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // === THROTTLE UTILITY ===
  const throttle = <T extends (...args: any[]) => void>(
    fn: T,
    ms: number
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= ms) {
        lastCall = now;
        fn(...args);
      }
    };
  };

  // === MOUSE HANDLERS ===
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY);

    if (import.meta.env.DEV) {
      console.log('[App] MouseDown - tool:', tool.name, 'worldPos:', worldPos);
    }

    if (tool.onMouseDown) {
      tool.onMouseDown(e.nativeEvent, worldPos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY);

    // Update mouse world position for status bar
    setMouseWorldPos(worldPos);

    if (tool.onMouseMove) {
      tool.onMouseMove(e.nativeEvent, worldPos);
    }
  };

  // Throttled mouse move handler (16ms = ~60fps)
  const throttledMouseMove = useMemo(
    () => throttle(handleMouseMove, 16),
    [camera, tool]
  );

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY);

    if (tool.onMouseUp) {
      tool.onMouseUp(e.nativeEvent, worldPos);
    }
  };

  const handleMouseLeave = () => {
    setMouseWorldPos(null);

    if (tool.onMouseLeave) {
      tool.onMouseLeave();
    }
  };

  // === WHEEL HANDLER ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom with zoomCamera from uiStore
      const { zoomCamera } = useUiStore.getState();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      zoomCamera(delta, mouseX, mouseY);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // === UI ===
  return (
    <div className="app">
      <Toolbar
        onImportField={handleImportField}
        onGenerateMaze={handleGenerateMaze}
        onExport={handleExport}
      />

      <div className="app-canvas-container">
        <canvas
          ref={canvasRef}
          className="app-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={throttledMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: tool.cursor }}
        />
      </div>

      <StatusBar />

      {/* Keyboard Help Modal */}
      <KeyboardHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default App;
