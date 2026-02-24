/**
 * Main App Component - Fully Integrated with Zustand stores, tools, and API
 */

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Toolbar, type ExportFormat } from './components/Toolbar/Toolbar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { KeyboardHelp } from './components/KeyboardHelp/KeyboardHelp';
import { PanelTray } from './components/PanelTray/PanelTray';
import { SatelliteBoundaryPicker } from './components/SatelliteBoundaryPicker';
import { useUiStore } from './stores/uiStore';
import { useConstraintStore } from './stores/constraintStore';
import { useDesignStore } from './stores/designStore';
import { useSettingsStore } from './stores/settingsStore';
import { useTool } from './tools';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { renderSnapIndicator, renderGuideLines } from './snapping/SnapVisuals';
import { parseWKTPolygons } from './utils/wkt';
import { fmtShort } from './utils/fmt';
import * as api from './api/client';
import { calculateBounds, zoomToFit } from './utils/canvas';
import './App.css';

// Cache decoded satellite image to avoid creating a new Image() every frame
let _cachedSatelliteImg: HTMLImageElement | null = null;
let _cachedSatelliteSrc: string | null = null;

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSatellitePicker, setShowSatellitePicker] = useState(false);

  // Zustand stores - Use selectors to avoid unnecessary re-renders
  const camera = useUiStore((state) => state.camera);
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
    // Open a file picker for GIS boundary files
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.kml,.kmz,.shp,.geojson,.json,.csv';

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setLoading(true);
      setError(null);

      try {
        const result = await api.importFieldFromFile(file);

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

    input.click();
  };

  const handleSatelliteBoundaryConfirm = async (coordinates: [number, number][]) => {
    setShowSatellitePicker(false);
    setLoading(true);
    setError(null);

    try {
      const result = await api.importSatelliteBoundary(coordinates);

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
      setError(err instanceof Error ? err.message : 'Failed to import boundary');
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
          const { difficultyPhases } = useDesignStore.getState();
          const hasSolution = difficultyPhases.some(p => p.path.length > 0);
          const result = await api.exportKml('maze', 1.0, hasSolution);
          if (result.error) { setError(result.error); return; }
          alert(`KML exported:\n${result.path}`);
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
        case 'gpx': {
          const result = await api.exportGpx();
          if (result.error) { setError(result.error); return; }
          alert(`GPX exported to:\n${result.path}`);
          break;
        }
        case 'dxf': {
          const result = await api.exportDxf();
          if (result.error) { setError(result.error); return; }
          alert(`DXF exported to:\n${result.path}`);
          break;
        }
        case 'printable': {
          const result = await api.exportPrintableMap();
          if (result.error) { setError(result.error); return; }
          alert(`Printable map exported to:\n${result.path}`);
          break;
        }
        case 'prescription': {
          const result = await api.exportPrescriptionMap();
          if (result.error) { setError(result.error); return; }
          alert(`Prescription map exported:\n${result.geojson_path}\n${result.png_path}`);
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export');
    } finally {
      setLoading(false);
    }
  };

  // === SAVE / LOAD PROJECT ===
  const handleSave = async () => {
    const state = useDesignStore.getState();
    const projectData = {
      version: 2,
      field: state.field,
      maze: state.maze,
      designElements: state.designElements,
      constraintZones: state.constraintZones,
      layers: state.layers,
      entrances: state.entrances,
      exits: state.exits,
      emergencyExits: state.emergencyExits,
      difficultyPhases: state.difficultyPhases,
      camera,
      gridSize: useUiStore.getState().gridSize,
      showGrid: useUiStore.getState().showGrid,
    };

    try {
      const result = await api.saveProject(projectData);
      if (result.success) {
        state.markSaved();
      } else {
        setError(result.error || 'Failed to save project');
      }
    } catch {
      // Fallback to Electron IPC if backend unavailable
      const electronAPI = (window as any).electronAPI;
      if (electronAPI) {
        try {
          const path = await electronAPI.saveFile(JSON.stringify(projectData, null, 2));
          if (path) state.markSaved();
        } catch {
          setError('Failed to save project');
        }
      } else {
        setError('Failed to save project');
      }
    }
  };

  // === AUTO-SAVE ===
  useEffect(() => {
    const interval = setInterval(async () => {
      const state = useDesignStore.getState();
      if (!state.isDirty) return;

      try {
        const projectData = {
          version: 2,
          name: 'Autosave',
          field: state.field,
          maze: state.maze,
          designElements: state.designElements,
          layers: state.layers,
          entrances: state.entrances,
          exits: state.exits,
          emergencyExits: state.emergencyExits,
        };
        await api.autosave(projectData);
      } catch {
        // Silently fail autosave
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // === CHECK FOR CRASH RECOVERY ===
  useEffect(() => {
    (async () => {
      try {
        const check = await api.checkAutosave();
        if (check.exists) {
          if (import.meta.env.DEV) {
            console.log('[App] Autosave found from', check.savedAt);
          }
        }
      } catch {
        // Backend not ready yet
      }
    })();
  }, []);

  // Listen for Electron menu events
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;

    electronAPI.onMenuSave?.(() => handleSave());
    electronAPI.onMenuNew?.(() => {
      useDesignStore.getState().resetProject();
    });
    electronAPI.onMenuUndo?.(() => {
      useDesignStore.getState().undo();
    });
    electronAPI.onMenuRedo?.(() => {
      useDesignStore.getState().redo();
    });
  }, []);

  // === COORDINATE TRANSFORMATION ===
  const screenToWorld = (screenX: number, screenY: number): [number, number] => {
    // Convert from screen coordinates to world coordinates
    // Account for canvas rotation (rotate around canvas center)
    let sx = screenX;
    let sy = screenY;
    if (camera.rotation) {
      const canvas = canvasRef.current;
      if (canvas) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const cos = Math.cos(-camera.rotation);
        const sin = Math.sin(-camera.rotation);
        const dx = sx - cx;
        const dy = sy - cy;
        sx = cx + dx * cos - dy * sin;
        sy = cy + dx * sin + dy * cos;
      }
    }
    // Y is negated because canvas Y-axis is flipped (north = up)
    const worldX = (sx - camera.x) / camera.scale;
    const worldY = -(sy - camera.y) / camera.scale;
    return [worldX, worldY];
  };

  // === RENDERING ===
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with light SketchUp-style background
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply camera transform (Y-axis flipped so north = up)
    ctx.save();
    if (camera.rotation) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(camera.rotation);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, -camera.scale);

    // Layer 1: Field Boundary (Green - darker for light bg)
    const { aerialUnderlay, planterRowGrid, showPlanterRows } = useDesignStore.getState();
    if (field?.geometry) {
      ctx.beginPath();
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 3 / camera.scale;

      const coords = field.geometry.exterior;
      coords.forEach((p: [number, number], i: number) =>
        i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])
      );
      ctx.closePath();

      ctx.stroke();
    }

    // Layer 1.5a: Headland overlay (concentric rings around field perimeter)
    if (showPlanterRows && planterRowGrid) {
      // Draw headland boundary (dashed orange line showing where headlands end)
      if (planterRowGrid.headlandBoundary && planterRowGrid.headlandBoundary.length > 2) {
        ctx.strokeStyle = 'rgba(230, 81, 0, 0.5)';
        ctx.lineWidth = 1.5 / camera.scale;
        ctx.setLineDash([8 / camera.scale, 4 / camera.scale]);

        ctx.beginPath();
        const hb = planterRowGrid.headlandBoundary;
        ctx.moveTo(hb[0][0], hb[0][1]);
        for (let i = 1; i < hb.length; i++) {
          ctx.lineTo(hb[i][0], hb[i][1]);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw headland rows — use carved headland walls from maze if available,
      // otherwise fall back to the uncarved planterRowGrid headland lines
      const headlandSource = maze?.headlandWalls || planterRowGrid.headlandLines;
      ctx.strokeStyle = 'rgba(120, 80, 20, 0.7)';
      ctx.lineWidth = 0.5 / camera.scale;

      for (const ring of headlandSource) {
        if (ring.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(ring[0][0], ring[0][1]);
          for (let i = 1; i < ring.length; i++) {
            ctx.lineTo(ring[i][0], ring[i][1]);
          }
          ctx.stroke();
        }
      }
    }

    // Layer 1.6: Aerial / Satellite Image Underlay
    const { showSatellite } = useUiStore.getState();
    if (showSatellite && aerialUnderlay && aerialUnderlay.imageData) {
      // Cache the decoded image to avoid creating a new Image every frame
      if (_cachedSatelliteSrc !== aerialUnderlay.imageData) {
        _cachedSatelliteImg = new Image();
        _cachedSatelliteImg.src = aerialUnderlay.imageData;
        _cachedSatelliteSrc = aerialUnderlay.imageData;
      }
      if (_cachedSatelliteImg && _cachedSatelliteImg.complete && _cachedSatelliteImg.naturalWidth > 0) {
        const { minx, miny, maxx, maxy } = aerialUnderlay.bounds;

        // Draw satellite in world space so it rotates with the canvas.
        // The current transform already includes canvas rotation, so rendering
        // in world coordinates keeps the image locked to the field boundary.
        // We translate to the NW corner (minx, maxy) then apply scale(1,-1)
        // to un-flip Y for drawImage — image appears right-side-up at any rotation.
        ctx.save();
        ctx.translate(minx, maxy);
        ctx.scale(1, -1);
        ctx.globalAlpha = aerialUnderlay.opacity;
        ctx.drawImage(
          _cachedSatelliteImg,
          0,
          0,
          maxx - minx,
          maxy - miny,
        );
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // Layer 2: Maze Walls (standing corn rows)
    if (maze?.walls) {
      {
        ctx.beginPath();
        ctx.strokeStyle = (showPlanterRows && planterRowGrid)
          ? 'rgba(30, 90, 30, 0.85)'   // Corn-row style — thin green lines
          : '#8B6914';                   // Fallback — thick brown lines
        ctx.lineWidth = (showPlanterRows && planterRowGrid)
          ? 0.5 / camera.scale
          : 2 / camera.scale;

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
    }

    // Layer 2.5: Carved area overlay and border
    const { showCarvedOverlay, showCarvedBorder } = useUiStore.getState();
    if ((showCarvedOverlay || showCarvedBorder) && maze?.carvedAreas) {
      const carvedPolygons = parseWKTPolygons(maze.carvedAreas);
      if (carvedPolygons.length > 0) {
        for (const poly of carvedPolygons) {
          if (poly.exterior.length < 3) continue;

          ctx.beginPath();
          ctx.moveTo(poly.exterior[0][0], poly.exterior[0][1]);
          for (let i = 1; i < poly.exterior.length; i++) {
            ctx.lineTo(poly.exterior[i][0], poly.exterior[i][1]);
          }
          ctx.closePath();

          // Cut out interior rings (holes)
          for (const hole of poly.interiors) {
            if (hole.length < 3) continue;
            ctx.moveTo(hole[0][0], hole[0][1]);
            for (let i = 1; i < hole.length; i++) {
              ctx.lineTo(hole[i][0], hole[i][1]);
            }
            ctx.closePath();
          }

          if (showCarvedOverlay) {
            ctx.fillStyle = 'rgba(139, 69, 19, 0.25)';
            ctx.fill('evenodd');
          }

          if (showCarvedBorder) {
            ctx.strokeStyle = 'rgba(210, 105, 30, 0.7)';
            ctx.lineWidth = 2 / camera.scale;
            ctx.stroke();
          }
        }
      }
    }

    ctx.restore();

    // Layer 3: Design Elements (pending paths - blue dashed lines)
    const { designElements, violations } = useDesignStore.getState();

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, -camera.scale);

    for (const el of designElements) {
      ctx.strokeStyle = '#2563eb'; // Blue (darker for light bg)
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

        // Add interior rings (letter counters for O, D, B, R, etc.)
        if (el.holes && el.holes.length > 0) {
          for (const hole of el.holes) {
            if (hole.length > 0) {
              ctx.moveTo(hole[0][0], hole[0][1]);
              for (let i = 1; i < hole.length; i++) {
                ctx.lineTo(hole[i][0], hole[i][1]);
              }
              ctx.closePath();
            }
          }
        }
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
          ctx.fillStyle = 'rgba(204, 51, 51, 0.2)';
          ctx.strokeStyle = '#cc3333';
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
        ctx.fillStyle = 'rgba(204, 51, 51, 0.5)';
        ctx.strokeStyle = '#cc3333';
        ctx.lineWidth = 2 / camera.scale;
        ctx.beginPath();
        ctx.arc(v.location[0], v.location[1], 10 / camera.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw label with actual/required values (un-flip Y for text)
        const labelText = `${fmtShort(v.actualValue)} / ${fmtShort(v.requiredValue)} min`;
        const fontSize = Math.max(12, 14 / camera.scale);

        ctx.save();
        ctx.translate(v.location[0], v.location[1] + 14 / camera.scale);
        ctx.scale(1, -1);  // Un-flip Y so text reads correctly

        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Label background
        const textMetrics = ctx.measureText(labelText);
        const padding = 4 / camera.scale;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(
          -textMetrics.width / 2 - padding,
          -fontSize - padding,
          textMetrics.width + padding * 2,
          fontSize + padding * 2
        );

        // Label text
        ctx.fillStyle = '#cc3333';
        ctx.fillText(labelText, 0, 0);
        ctx.restore();
      }
    }

    ctx.restore();

    // Layer 4: Tool Overlay (rendered in screen space, with canvas rotation)
    if (tool.renderOverlay) {
      if (camera.rotation) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(camera.rotation);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
      }
      tool.renderOverlay(ctx, camera);
      if (camera.rotation) {
        ctx.restore();
      }
    }

    // Layer 4.5: Persistent Entrance / Exit / Emergency Exit markers
    {
      if (camera.rotation) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(camera.rotation);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
      }
      const { entrances, exits, emergencyExits } = useDesignStore.getState();

      // Entrances (green circles with "IN")
      for (const entrance of entrances) {
        const [wx, wy] = entrance.position;
        const sx = wx * camera.scale + camera.x;
        const sy = -wy * camera.scale + camera.y;
        const r = 10;

        ctx.fillStyle = 'rgba(50, 180, 50, 0.8)';
        ctx.strokeStyle = '#1a7a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('IN', sx, sy);

        if (entrance.label) {
          ctx.fillStyle = '#1a7a1a';
          ctx.font = '11px sans-serif';
          ctx.fillText(entrance.label, sx, sy + r + 12);
        }
      }

      // Exits (red circles with "OUT")
      for (const exit of exits) {
        const [wx, wy] = exit.position;
        const sx = wx * camera.scale + camera.x;
        const sy = -wy * camera.scale + camera.y;
        const r = 10;

        ctx.fillStyle = 'rgba(220, 50, 50, 0.8)';
        ctx.strokeStyle = '#a01010';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('OUT', sx, sy);

        if (exit.label) {
          ctx.fillStyle = '#a01010';
          ctx.font = '11px sans-serif';
          ctx.fillText(exit.label, sx, sy + r + 12);
        }
      }

      // Emergency exits (orange triangles with "!")
      for (const exit of emergencyExits) {
        const [wx, wy] = exit.position;
        const sx = wx * camera.scale + camera.x;
        const sy = -wy * camera.scale + camera.y;
        const r = 10;

        ctx.fillStyle = 'rgba(255, 165, 0, 0.8)';
        ctx.strokeStyle = '#c87000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy - r);
        ctx.lineTo(sx - r, sy + r);
        ctx.lineTo(sx + r, sy + r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', sx, sy + 2);

        if (exit.label) {
          ctx.fillStyle = '#c87000';
          ctx.font = '11px sans-serif';
          ctx.fillText(exit.label, sx, sy + r + 14);
        }
      }
      if (camera.rotation) {
        ctx.restore();
      }
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

    // Layer 7: Progress Indicator
    const { operationProgress } = useDesignStore.getState();
    if (operationProgress.active) {
      const canvas = canvasRef.current!;
      const barWidth = 300;
      const barHeight = 24;
      const barX = (canvas.width - barWidth) / 2;
      const barY = canvas.height - 60;

      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(barX - 10, barY - 8, barWidth + 20, barHeight + 30, 8);
      ctx.fill();

      // Progress bar background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Progress bar fill
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(barX, barY, barWidth * (operationProgress.percent / 100), barHeight);

      // Text
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        `${operationProgress.message} (${Math.round(operationProgress.percent)}%)`,
        canvas.width / 2,
        barY + barHeight + 4,
      );
    }

    // Empty state message
    if (!field) {
      ctx.fillStyle = '#999';
      ctx.font = '15px sans-serif';
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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#333';
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
    }

    // Error message
    if (error) {
      ctx.fillStyle = 'rgba(204, 51, 51, 0.9)';
      ctx.fillRect(20, 20, canvas.width - 40, 50);
      ctx.fillStyle = '#fff';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(error, canvas.width / 2, 38);
      ctx.font = '11px sans-serif';
      ctx.fillText('Press Esc to dismiss', canvas.width / 2, 56);
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
  }, [camera, field, maze, tool, loading, error]);

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

  // === MOUSE BUTTON PAN STATE ===
  // Track panning initiated by custom mouse button mapping
  const mousePanState = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false, lastX: 0, lastY: 0,
  });

  // === MOUSE HANDLERS ===
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check custom mouse button mapping
    const mouseAction = useSettingsStore.getState().getMouseAction(e.button);

    // Block disabled buttons
    if (mouseAction === 'none') return;

    // Handle pan action from any mouse button
    if (mouseAction === 'pan') {
      e.preventDefault();
      mousePanState.current = { active: true, lastX: e.clientX, lastY: e.clientY };
      return;
    }

    // Context menu action - let the browser handle it
    if (mouseAction === 'contextMenu') return;

    // Primary action - pass to the active tool
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

    // Handle mouse-button panning
    if (mousePanState.current.active) {
      const dx = e.clientX - mousePanState.current.lastX;
      const dy = e.clientY - mousePanState.current.lastY;
      mousePanState.current.lastX = e.clientX;
      mousePanState.current.lastY = e.clientY;
      const { panCamera } = useUiStore.getState();
      panCamera(dx, dy);
      return;
    }

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
    // End mouse-button panning
    if (mousePanState.current.active) {
      mousePanState.current.active = false;
      return;
    }

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
    mousePanState.current.active = false;
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

    // Prevent context menu when right-click is remapped away from 'contextMenu'
    const handleContextMenu = (e: Event) => {
      const mouseAction = useSettingsStore.getState().getMouseAction(2);
      if (mouseAction !== 'contextMenu') {
        e.preventDefault();
      }
    };
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // === UI ===
  return (
    <div className="app">
      <Toolbar
        onImportField={handleImportField}
        onImportFromSatellite={() => setShowSatellitePicker(true)}
        onExport={handleExport}
        onSave={handleSave}
      />

      <div className="app-main">
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
        <PanelTray />
      </div>

      <StatusBar />

      {/* Keyboard Help Modal */}
      <KeyboardHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Satellite Boundary Picker */}
      {showSatellitePicker && (
        <SatelliteBoundaryPicker
          onConfirm={handleSatelliteBoundaryConfirm}
          onCancel={() => setShowSatellitePicker(false)}
        />
      )}
    </div>
  );
}

export default App;
