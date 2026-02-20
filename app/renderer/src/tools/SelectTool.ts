/**
 * Select Tool - SketchUp-style selection with transform handles
 *
 * Features:
 * - Click to select designElements
 * - Shift+click to add/remove from selection
 * - Drag marquee to select multiple
 * - Transform handles on selected elements:
 *   - Corner squares: scale both axes (drag to resize)
 *   - Edge rectangles: scale single axis
 *   - Rotation handle: circular handle above center (drag to rotate)
 *   - Center: move/drag to reposition
 * - Shift+drag corner: maintain aspect ratio
 * - Shift+drag move: constrain to X or Y axis
 * - Ctrl+drag move: copy elements instead of moving
 * - Ctrl+D: duplicate selected elements in place
 * - Snaps to grid when snap is enabled
 * - Shows rotation angle, dimensions, and move distance while transforming
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useUiStore } from '../stores/uiStore';
import { useDesignStore, type DesignElement, type TransformHandle } from '../stores/designStore';

// Track if we've pushed a snapshot for the current transform
let transformSnapshotPushed = false;
// Store original element data for rotation (need original points to rotate from)
let originalElementsData: Map<string, { points: [number, number][]; center: [number, number] }> = new Map();
// Track current rotation angle for display
let currentRotationAngle = 0;
// Track current move distance for display
let currentMoveDistance = 0;
// Track if copy mode is active (Ctrl held)
let copyMode = false;
// Track if we've already created copies for this transform
let copiesCreated = false;
// Track if we're dragging a vertex
let isDraggingVertex = false;
// Track last double-click time for double-click detection
let lastClickTime = 0;
let lastClickPos: [number, number] | null = null;

// Debounced revalidation after transform
let revalidationTimeout: ReturnType<typeof setTimeout> | null = null;

async function triggerRevalidation() {
  // Debounce - wait a short moment before validating
  if (revalidationTimeout) {
    clearTimeout(revalidationTimeout);
  }

  revalidationTimeout = setTimeout(async () => {
    const { designElements, field, maze, setViolations } = useDesignStore.getState();

    if (designElements.length === 0) {
      setViolations([]);
      return;
    }

    try {
      // Get constraint values (use defaults if not available)
      const res = await fetch('http://localhost:8000/geometry/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elements: designElements,
          maze: maze?.geometry,
          field: field?.geometry,
          constraints: {
            wallWidthMin: 2,
            edgeBuffer: 3,
            pathWidthMin: 4.0,
          },
        }),
      });

      const result = await res.json();
      setViolations(result.violations || []);

      if (import.meta.env.DEV) {
        console.log('[SelectTool] Revalidation complete:', result.violations?.length || 0, 'violations');
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[SelectTool] Revalidation failed:', err);
      }
    }
  }, 150); // 150ms debounce
}

// Marquee selection state (local to tool)
let marqueeState = {
  isActive: false,
  start: null as [number, number] | null,
  end: null as [number, number] | null,
};

// Get bounding box of a design element
function getElementBounds(element: DesignElement): { minX: number; minY: number; maxX: number; maxY: number } {
  if (element.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = element.points[0][0];
  let maxX = element.points[0][0];
  let minY = element.points[0][1];
  let maxY = element.points[0][1];

  for (const [x, y] of element.points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return { minX, minY, maxX, maxY };
}

// Get combined bounds of multiple elements
function getCombinedBounds(elements: DesignElement[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (elements.length === 0) return null;

  const firstBounds = getElementBounds(elements[0]);
  let { minX, minY, maxX, maxY } = firstBounds;

  for (let i = 1; i < elements.length; i++) {
    const bounds = getElementBounds(elements[i]);
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }

  return { minX, minY, maxX, maxY };
}

// Hit test for a single element
function hitTestElement(pos: [number, number], element: DesignElement, tolerance: number): boolean {
  const bounds = getElementBounds(element);

  // Expand bounds by tolerance
  const expandedBounds = {
    minX: bounds.minX - tolerance,
    minY: bounds.minY - tolerance,
    maxX: bounds.maxX + tolerance,
    maxY: bounds.maxY + tolerance,
  };

  // Quick bounds check
  if (pos[0] < expandedBounds.minX || pos[0] > expandedBounds.maxX ||
      pos[1] < expandedBounds.minY || pos[1] > expandedBounds.maxY) {
    return false;
  }

  // For closed shapes, check if point is inside polygon
  if (element.closed && element.points.length >= 3) {
    return pointInPolygon(pos, element.points);
  }

  // For lines/paths, check distance to line segments
  for (let i = 0; i < element.points.length - 1; i++) {
    const dist = distanceToLineSegment(pos, element.points[i], element.points[i + 1]);
    if (dist < tolerance) return true;
  }

  return false;
}

// Point in polygon test (ray casting algorithm)
function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  let inside = false;
  const [x, y] = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

// Distance from point to line segment
function distanceToLineSegment(point: [number, number], a: [number, number], b: [number, number]): number {
  const [px, py] = point;
  const [ax, ay] = a;
  const [bx, by] = b;

  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  }

  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = ax + t * dx;
  const closestY = ay + t * dy;

  return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
}

// Check if point is inside a rectangle
function pointInRect(pos: [number, number], minX: number, minY: number, maxX: number, maxY: number): boolean {
  return pos[0] >= minX && pos[0] <= maxX && pos[1] >= minY && pos[1] <= maxY;
}

// Snap point to grid
function snapToGrid(point: [number, number], gridSize: number): [number, number] {
  return [
    Math.round(point[0] / gridSize) * gridSize,
    Math.round(point[1] / gridSize) * gridSize,
  ];
}

// Find which vertex is at a given position (returns index or -1)
function findVertexAtPosition(
  pos: [number, number],
  element: DesignElement,
  tolerance: number
): number {
  for (let i = 0; i < element.points.length; i++) {
    const pt = element.points[i];
    const dist = Math.sqrt((pos[0] - pt[0]) ** 2 + (pos[1] - pt[1]) ** 2);
    if (dist <= tolerance) {
      return i;
    }
  }
  return -1;
}

// Constrain point to nearest axis (horizontal or vertical)
function constrainToAxis(
  origin: [number, number],
  point: [number, number]
): [number, number] {
  const dx = point[0] - origin[0];
  const dy = point[1] - origin[1];
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Determine dominant axis - constrain to X or Y
  if (absDx > absDy) {
    // Horizontal movement dominant
    return [point[0], origin[1]];
  } else {
    // Vertical movement dominant
    return [origin[0], point[1]];
  }
}

// Hit test transform handles - returns which handle was hit or null
function hitTestHandles(
  pos: [number, number],
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  handleSize: number
): TransformHandle | null {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const halfHandle = handleSize / 2;

  // Rotation handle (circle above center)
  const rotateY = bounds.maxY + handleSize * 2.5;
  const distToRotate = Math.sqrt((pos[0] - centerX) ** 2 + (pos[1] - rotateY) ** 2);
  if (distToRotate < handleSize) {
    return 'rotate';
  }

  // Corner handles (squares)
  const corners: { handle: TransformHandle; x: number; y: number }[] = [
    { handle: 'nw', x: bounds.minX, y: bounds.maxY },
    { handle: 'ne', x: bounds.maxX, y: bounds.maxY },
    { handle: 'se', x: bounds.maxX, y: bounds.minY },
    { handle: 'sw', x: bounds.minX, y: bounds.minY },
  ];

  for (const { handle, x, y } of corners) {
    if (pos[0] >= x - halfHandle && pos[0] <= x + halfHandle &&
        pos[1] >= y - halfHandle && pos[1] <= y + halfHandle) {
      return handle;
    }
  }

  // Edge handles (rectangles on edges)
  const edges: { handle: TransformHandle; x: number; y: number }[] = [
    { handle: 'n', x: centerX, y: bounds.maxY },  // Top edge
    { handle: 's', x: centerX, y: bounds.minY },  // Bottom edge
    { handle: 'e', x: bounds.maxX, y: centerY },  // Right edge
    { handle: 'w', x: bounds.minX, y: centerY },  // Left edge
  ];

  for (const { handle, x, y } of edges) {
    if (pos[0] >= x - halfHandle && pos[0] <= x + halfHandle &&
        pos[1] >= y - halfHandle && pos[1] <= y + halfHandle) {
      return handle;
    }
  }

  // Move handle (center circle)
  const distToCenter = Math.sqrt((pos[0] - centerX) ** 2 + (pos[1] - centerY) ** 2);
  if (distToCenter < handleSize) {
    return 'move';
  }

  return null;
}

export const SelectTool: Tool = {
  name: 'select',
  cursor: 'default',
  hint: 'Click to select, drag to move. Ctrl+drag: copy. Shift+drag: constrain axis. Handles: scale/rotate.',

  onMouseDown: (e: MouseEvent, worldPos: [number, number]) => {
    const { camera } = useUiStore.getState();
    const {
      designElements,
      selectedElementIds,
      selectElement,
      clearSelection,
      startTransform,
      pushSnapshot,
      vertexEditingElementId,
      selectedVertexIndices,
      selectVertex,
      setVertexEditing,
      clearVertexSelection,
    } = useDesignStore.getState();

    const handleSize = 12 / camera.scale;
    const tolerance = 10 / camera.scale;
    const vertexTolerance = 8 / camera.scale;

    // Double-click detection for entering vertex edit mode
    const now = Date.now();
    const isDoubleClick = lastClickPos &&
      now - lastClickTime < 300 &&
      Math.abs(worldPos[0] - lastClickPos[0]) < tolerance &&
      Math.abs(worldPos[1] - lastClickPos[1]) < tolerance;

    lastClickTime = now;
    lastClickPos = worldPos;

    // === VERTEX EDITING MODE ===
    if (vertexEditingElementId) {
      const element = designElements.find(e => e.id === vertexEditingElementId);
      if (element) {
        // Check if clicked on a vertex
        const vertexIndex = findVertexAtPosition(worldPos, element, vertexTolerance);

        if (vertexIndex !== -1) {
          // Clicked on a vertex - select it and prepare to drag
          if (e.shiftKey) {
            selectVertex(vertexIndex, true); // Toggle vertex in selection
          } else if (!selectedVertexIndices.includes(vertexIndex)) {
            selectVertex(vertexIndex, false); // Select only this vertex
          }
          isDraggingVertex = true;
          pushSnapshot(); // Save state before moving vertices
          transformSnapshotPushed = true;
          // Set startPos for vertex drag delta calculation
          startTransform('move', worldPos, null, 0, null);
          if (import.meta.env.DEV) {
            console.log('[SelectTool] Started vertex drag at', worldPos);
          }
          return;
        }

        // Clicked outside vertices - exit vertex editing mode
        setVertexEditing(null);
        // Fall through to normal selection behavior
      }
    }

    // === ENTER VERTEX EDIT MODE ON DOUBLE-CLICK ===
    if (isDoubleClick && selectedElementIds.size === 1) {
      const selectedId = [...selectedElementIds][0];
      const element = designElements.find(e => e.id === selectedId);
      if (element && hitTestElement(worldPos, element, tolerance)) {
        setVertexEditing(selectedId);
        // Find and select the closest vertex
        const vertexIndex = findVertexAtPosition(worldPos, element, vertexTolerance * 2);
        if (vertexIndex !== -1) {
          selectVertex(vertexIndex, false);
        }
        if (import.meta.env.DEV) {
          console.log('[SelectTool] Entered vertex editing mode for', selectedId.slice(0, 8));
        }
        return;
      }
    }

    // Get selected elements
    const selectedElements = designElements.filter(el => selectedElementIds.has(el.id));
    const selectionBounds = getCombinedBounds(selectedElements);

    // Check if clicked on a transform handle first (if we have a selection)
    if (selectionBounds && selectedElements.length > 0) {
      const hitHandle = hitTestHandles(worldPos, selectionBounds, handleSize);

      if (hitHandle) {
        // Push snapshot for undo BEFORE starting transform
        pushSnapshot();
        transformSnapshotPushed = true;

        // Store original element data for rotation
        originalElementsData.clear();
        const centerX = (selectionBounds.minX + selectionBounds.maxX) / 2;
        const centerY = (selectionBounds.minY + selectionBounds.maxY) / 2;
        for (const el of selectedElements) {
          originalElementsData.set(el.id, {
            points: el.points.map(p => [...p] as [number, number]),
            center: [centerX, centerY],
          });
        }

        const width = selectionBounds.maxX - selectionBounds.minX;
        const height = selectionBounds.maxY - selectionBounds.minY;
        const aspectRatio = e.shiftKey && height > 0 ? width / height : null;

        // Get current rotation (use first selected element's rotation)
        const currentRotation = selectedElements[0]?.rotation || 0;

        startTransform(hitHandle, worldPos, selectionBounds, currentRotation, aspectRatio);
        return;
      }
    }

    // Hit test elements
    let hitElement: DesignElement | null = null;
    // Test from top to bottom (later elements are on top)
    if (import.meta.env.DEV) {
      console.log(`[SelectTool] Hit testing ${designElements.length} elements at`, worldPos);
    }
    for (let i = designElements.length - 1; i >= 0; i--) {
      if (hitTestElement(worldPos, designElements[i], tolerance)) {
        hitElement = designElements[i];
        if (import.meta.env.DEV) {
          console.log(`[SelectTool] Hit element: ${hitElement.id.slice(0, 8)} (type=${hitElement.type})`);
        }
        break;
      }
    }

    if (hitElement) {
      // Clicked on an element
      if (e.shiftKey) {
        // Toggle selection
        selectElement(hitElement.id, true);
      } else if (selectedElementIds.has(hitElement.id)) {
        // Already selected - start move transform
        if (selectionBounds) {
          pushSnapshot();
          transformSnapshotPushed = true;
          // Store original points for move
          originalElementsData.clear();
          for (const el of selectedElements) {
            originalElementsData.set(el.id, {
              points: el.points.map(p => [...p] as [number, number]),
              center: [(selectionBounds.minX + selectionBounds.maxX) / 2, (selectionBounds.minY + selectionBounds.maxY) / 2],
            });
          }
          startTransform('move', worldPos, selectionBounds);
        }
      } else {
        // Select this element and start move
        selectElement(hitElement.id);
        pushSnapshot();
        transformSnapshotPushed = true;
        const newBounds = getElementBounds(hitElement);
        originalElementsData.clear();
        originalElementsData.set(hitElement.id, {
          points: hitElement.points.map(p => [...p] as [number, number]),
          center: [(newBounds.minX + newBounds.maxX) / 2, (newBounds.minY + newBounds.maxY) / 2],
        });
        startTransform('move', worldPos, newBounds);
      }
    } else {
      // Clicked on empty space
      if (!e.shiftKey) {
        clearSelection();
      }
      // Start marquee selection
      marqueeState = {
        isActive: true,
        start: worldPos,
        end: worldPos,
      };
    }
  },

  onMouseMove: (e: MouseEvent, worldPos: [number, number]) => {
    const { camera, snapToGrid: snapEnabled, gridSize } = useUiStore.getState();
    const {
      designElements,
      selectedElementIds,
      transformState,
      setHoveredElement,
      updateElementNoHistory,
      addDesignElement,
      selectElements,
      vertexEditingElementId,
      selectedVertexIndices,
      moveSelectedVertices,
      setHoveredVertex,
    } = useDesignStore.getState();

    const tolerance = 10 / camera.scale;
    const vertexTolerance = 8 / camera.scale;

    // === VERTEX EDITING MODE ===
    if (vertexEditingElementId) {
      const element = designElements.find(e => e.id === vertexEditingElementId);
      if (element) {
        // Update hovered vertex
        const hoveredIdx = findVertexAtPosition(worldPos, element, vertexTolerance);
        setHoveredVertex(hoveredIdx !== -1 ? hoveredIdx : null);

        // Handle vertex dragging
        if (isDraggingVertex && selectedVertexIndices.length > 0) {
          // Calculate delta from last position (use startPos from transformState if available)
          const { transformState: ts } = useDesignStore.getState();
          const lastPos = ts.startPos || worldPos;

          let targetPos = worldPos;
          if (snapEnabled) {
            targetPos = snapToGrid(targetPos, gridSize);
          }

          const dx = targetPos[0] - lastPos[0];
          const dy = targetPos[1] - lastPos[1];

          if (dx !== 0 || dy !== 0) {
            moveSelectedVertices([dx, dy]);
            // Update startPos for next move delta calculation
            useDesignStore.setState({
              transformState: { ...ts, startPos: targetPos },
            });
          }
          return;
        }
      }
    }

    // Update marquee
    if (marqueeState.isActive) {
      marqueeState.end = worldPos;
      return;
    }

    // Handle transform
    if (transformState.activeHandle && transformState.startPos && transformState.startBounds) {
      let targetPos = worldPos;

      // Grid snapping for transforms
      if (snapEnabled) {
        targetPos = snapToGrid(targetPos, gridSize);
      }

      // Axis constraint for move (Shift key)
      if (e.shiftKey && transformState.activeHandle === 'move') {
        targetPos = constrainToAxis(transformState.startPos, targetPos);
      }

      const dx = targetPos[0] - transformState.startPos[0];
      const dy = targetPos[1] - transformState.startPos[1];
      const bounds = transformState.startBounds;
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      const selectedElements = designElements.filter(el => selectedElementIds.has(el.id));

      // Ctrl+drag to copy (only for move)
      if (e.ctrlKey && transformState.activeHandle === 'move' && !copiesCreated) {
        // Create copies of selected elements
        const newIds: string[] = [];
        for (const el of selectedElements) {
          const originalData = originalElementsData.get(el.id);
          if (originalData) {
            const newId = addDesignElement({
              type: el.type,
              points: originalData.points.map(p => [...p] as [number, number]),
              width: el.width,
              closed: el.closed,
              rotation: el.rotation,
            });
            newIds.push(newId);
            // Add the new element to originalElementsData so it moves with the drag
            originalElementsData.set(newId, {
              points: originalData.points.map(p => [...p] as [number, number]),
              center: originalData.center,
            });
          }
        }
        // Select the new copies and deselect originals
        if (newIds.length > 0) {
          selectElements(newIds);
          copiesCreated = true;
          copyMode = true;
          if (import.meta.env.DEV) {
            console.log('[SelectTool] Created', newIds.length, 'copies');
          }
        }
      }

      if (transformState.activeHandle === 'move') {
        // Update move distance for display
        currentMoveDistance = Math.sqrt(dx * dx + dy * dy);

        // Move all selected elements using original points + offset
        const elementsToMove = designElements.filter(el => selectedElementIds.has(el.id));
        for (const el of elementsToMove) {
          const originalData = originalElementsData.get(el.id);
          if (originalData) {
            const movedPoints: [number, number][] = originalData.points.map(([px, py]) => [px + dx, py + dy]);
            updateElementNoHistory(el.id, { points: movedPoints });
          }
        }
      } else if (transformState.activeHandle === 'rotate') {
        // Calculate rotation angle from start position
        const startAngle = Math.atan2(
          transformState.startPos[1] - centerY,
          transformState.startPos[0] - centerX
        );
        const currentAngle = Math.atan2(
          worldPos[1] - centerY,
          worldPos[0] - centerX
        );
        let deltaAngleRad = currentAngle - startAngle;

        // Snap to 15 degree increments if shift is held
        if (e.shiftKey) {
          const deltaAngleDeg = deltaAngleRad * (180 / Math.PI);
          const snappedDeg = Math.round(deltaAngleDeg / 15) * 15;
          deltaAngleRad = snappedDeg * (Math.PI / 180);
        }

        // Actually rotate the points around the center
        const cos = Math.cos(deltaAngleRad);
        const sin = Math.sin(deltaAngleRad);

        // Update display angle
        currentRotationAngle = deltaAngleRad * (180 / Math.PI);

        for (const el of selectedElements) {
          const originalData = originalElementsData.get(el.id);
          if (originalData) {
            const [cx, cy] = originalData.center;
            const rotatedPoints: [number, number][] = originalData.points.map(([px, py]) => {
              const relX = px - cx;
              const relY = py - cy;
              return [
                cx + relX * cos - relY * sin,
                cy + relX * sin + relY * cos,
              ];
            });
            // Update points and reset rotation property (since points are now rotated)
            updateElementNoHistory(el.id, { points: rotatedPoints, rotation: 0 });
          }
        }
      } else {
        // Scale handles
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;

        if (width === 0 || height === 0) return;

        let scaleX = 1;
        let scaleY = 1;
        let anchorX = centerX;
        let anchorY = centerY;

        switch (transformState.activeHandle) {
          // Corner handles - scale both X and Y
          case 'ne':
            scaleX = (width + dx) / width;
            scaleY = (height + dy) / height;
            anchorX = bounds.minX;
            anchorY = bounds.minY;
            break;
          case 'nw':
            scaleX = (width - dx) / width;
            scaleY = (height + dy) / height;
            anchorX = bounds.maxX;
            anchorY = bounds.minY;
            break;
          case 'se':
            scaleX = (width + dx) / width;
            scaleY = (height - dy) / height;
            anchorX = bounds.minX;
            anchorY = bounds.maxY;
            break;
          case 'sw':
            scaleX = (width - dx) / width;
            scaleY = (height - dy) / height;
            anchorX = bounds.maxX;
            anchorY = bounds.maxY;
            break;
          // Edge handles - scale only one axis
          case 'n':
            scaleY = (height + dy) / height;
            anchorY = bounds.minY;
            break;
          case 's':
            scaleY = (height - dy) / height;
            anchorY = bounds.maxY;
            break;
          case 'e':
            scaleX = (width + dx) / width;
            anchorX = bounds.minX;
            break;
          case 'w':
            scaleX = (width - dx) / width;
            anchorX = bounds.maxX;
            break;
        }

        // Maintain aspect ratio if shift is held
        if (e.shiftKey || transformState.aspectRatio) {
          const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
          scaleX = scaleX >= 0 ? avgScale : -avgScale;
          scaleY = scaleY >= 0 ? avgScale : -avgScale;
        }

        // Prevent negative/zero scaling
        if (Math.abs(scaleX) < 0.1) scaleX = scaleX >= 0 ? 0.1 : -0.1;
        if (Math.abs(scaleY) < 0.1) scaleY = scaleY >= 0 ? 0.1 : -0.1;

        // Scale all selected elements using original points
        for (const el of selectedElements) {
          const originalData = originalElementsData.get(el.id);
          if (originalData) {
            const scaledPoints: [number, number][] = originalData.points.map(([px, py]) => [
              anchorX + (px - anchorX) * scaleX,
              anchorY + (py - anchorY) * scaleY,
            ]);
            updateElementNoHistory(el.id, { points: scaledPoints });
          }
        }
      }
      return;
    }

    // Update hover state
    let hoveredId: string | null = null;
    for (let i = designElements.length - 1; i >= 0; i--) {
      if (hitTestElement(worldPos, designElements[i], tolerance)) {
        hoveredId = designElements[i].id;
        break;
      }
    }
    setHoveredElement(hoveredId);
  },

  onMouseUp: (e: MouseEvent, worldPos: [number, number]) => {
    const { camera } = useUiStore.getState();
    const {
      designElements,
      selectedElementIds,
      transformState,
      selectElements,
      endTransform,
    } = useDesignStore.getState();

    // Finish vertex dragging
    if (isDraggingVertex) {
      isDraggingVertex = false;
      transformSnapshotPushed = false;
      // Clear transform state
      endTransform();
      // Trigger revalidation after vertex move
      triggerRevalidation();
      if (import.meta.env.DEV) {
        console.log('[SelectTool] Finished vertex drag');
      }
      return; // Don't fall through to normal transform handling
    }

    // Finish marquee selection
    if (marqueeState.isActive && marqueeState.start && marqueeState.end) {
      const minX = Math.min(marqueeState.start[0], marqueeState.end[0]);
      const maxX = Math.max(marqueeState.start[0], marqueeState.end[0]);
      const minY = Math.min(marqueeState.start[1], marqueeState.end[1]);
      const maxY = Math.max(marqueeState.start[1], marqueeState.end[1]);

      const width = maxX - minX;
      const height = maxY - minY;

      // Only select if marquee is big enough
      if (width > 5 / camera.scale && height > 5 / camera.scale) {
        const toSelect: string[] = [];

        for (const el of designElements) {
          const bounds = getElementBounds(el);
          // Check if element bounds intersect marquee
          if (bounds.maxX >= minX && bounds.minX <= maxX &&
              bounds.maxY >= minY && bounds.minY <= maxY) {
            toSelect.push(el.id);
          }
        }

        if (e.shiftKey) {
          // Add to existing selection
          const newIds = [...selectedElementIds, ...toSelect];
          selectElements([...new Set(newIds)]);
        } else {
          selectElements(toSelect);
        }
      }

      marqueeState = { isActive: false, start: null, end: null };
    }

    // Finish transform
    if (transformState.activeHandle) {
      endTransform();
      // Clean up transform tracking
      transformSnapshotPushed = false;
      originalElementsData.clear();
      currentRotationAngle = 0;
      currentMoveDistance = 0;
      copyMode = false;
      copiesCreated = false;

      // Trigger revalidation if violations are being shown
      const { showViolationsOnCanvas } = useDesignStore.getState();
      if (showViolationsOnCanvas) {
        triggerRevalidation();
      }
    }
  },

  onMouseLeave: () => {
    const { endTransform, setHoveredElement } = useDesignStore.getState();
    marqueeState = { isActive: false, start: null, end: null };
    endTransform();
    setHoveredElement(null);
    // Clean up transform tracking
    transformSnapshotPushed = false;
    originalElementsData.clear();
    currentRotationAngle = 0;
    currentMoveDistance = 0;
    copyMode = false;
    copiesCreated = false;
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const {
      designElements,
      selectedElementIds,
      hoveredElementId,
      transformState,
      vertexEditingElementId,
      selectedVertexIndices,
      hoveredVertexIndex,
    } = useDesignStore.getState();

    ctx.save();

    // Transform to world coordinates
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    const handleSize = 10 / camera.scale;
    const vertexHandleSize = 8 / camera.scale;

    // Draw hover highlight (for non-selected elements)
    if (hoveredElementId && !selectedElementIds.has(hoveredElementId)) {
      const element = designElements.find(el => el.id === hoveredElementId);
      if (element) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 4 / camera.scale;
        drawElementOutline(ctx, element);
      }
    }

    // === VERTEX EDITING MODE ===
    if (vertexEditingElementId) {
      const element = designElements.find(e => e.id === vertexEditingElementId);
      if (element) {
        // Draw element outline with vertex editing color
        ctx.strokeStyle = '#f59e0b'; // Orange for vertex edit mode
        ctx.lineWidth = 2 / camera.scale;
        drawElementOutline(ctx, element);

        // Draw all vertices
        for (let i = 0; i < element.points.length; i++) {
          const [x, y] = element.points[i];
          const isSelected = selectedVertexIndices.includes(i);
          const isHovered = hoveredVertexIndex === i;

          // Vertex handle background
          ctx.fillStyle = isSelected ? '#3b82f6' : isHovered ? '#fbbf24' : '#ffffff';
          ctx.strokeStyle = isSelected ? '#1d4ed8' : '#000000';
          ctx.lineWidth = 1.5 / camera.scale;

          // Draw vertex as a square
          ctx.fillRect(
            x - vertexHandleSize / 2,
            y - vertexHandleSize / 2,
            vertexHandleSize,
            vertexHandleSize
          );
          ctx.strokeRect(
            x - vertexHandleSize / 2,
            y - vertexHandleSize / 2,
            vertexHandleSize,
            vertexHandleSize
          );

          // Show vertex index when hovered
          if (isHovered) {
            ctx.fillStyle = '#000';
            ctx.font = `${10 / camera.scale}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`V${i}`, x + vertexHandleSize, y - vertexHandleSize / 2);
          }
        }

        // Show hint text
        ctx.fillStyle = '#f59e0b';
        ctx.font = `${12 / camera.scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const bounds = getElementBounds(element);
        ctx.fillText(
          'Vertex Edit • Drag to move • Delete to remove • Esc to exit',
          (bounds.minX + bounds.maxX) / 2,
          bounds.minY - 20 / camera.scale
        );
      }

      ctx.restore();
      return; // Don't draw normal selection handles in vertex edit mode
    }

    // Draw selection and handles
    const selectedElements = designElements.filter(el => selectedElementIds.has(el.id));
    if (selectedElements.length > 0) {
      // Draw selection outline for each element
      for (const el of selectedElements) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / camera.scale;
        ctx.setLineDash([6 / camera.scale, 3 / camera.scale]);
        drawElementOutline(ctx, el);
        ctx.setLineDash([]);
      }

      // Get combined bounds for handles
      const bounds = getCombinedBounds(selectedElements);
      if (bounds) {
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;

        // Bounding box
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1 / camera.scale;
        ctx.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);

        // Corner handles (squares)
        const corners = [
          [bounds.minX, bounds.maxY], // nw
          [bounds.maxX, bounds.maxY], // ne
          [bounds.maxX, bounds.minY], // se
          [bounds.minX, bounds.minY], // sw
        ];

        for (const [hx, hy] of corners) {
          ctx.fillStyle = '#fff';
          ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5 / camera.scale;
          ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        }

        // Edge handles (smaller rectangles on edges)
        const edgeHandleWidth = handleSize * 0.8;
        const edgeHandleHeight = handleSize * 0.5;
        const edges = [
          { x: centerX, y: bounds.maxY, horizontal: true },  // n
          { x: centerX, y: bounds.minY, horizontal: true },  // s
          { x: bounds.maxX, y: centerY, horizontal: false }, // e
          { x: bounds.minX, y: centerY, horizontal: false }, // w
        ];

        for (const { x, y, horizontal } of edges) {
          const w = horizontal ? edgeHandleWidth : edgeHandleHeight;
          const h = horizontal ? edgeHandleHeight : edgeHandleWidth;
          ctx.fillStyle = '#fff';
          ctx.fillRect(x - w / 2, y - h / 2, w, h);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1 / camera.scale;
          ctx.strokeRect(x - w / 2, y - h / 2, w, h);
        }

        // Rotation handle (circle above center)
        const rotateY = bounds.maxY + handleSize * 2.5;

        // Line from center to rotation handle
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1 / camera.scale;
        ctx.beginPath();
        ctx.moveTo(centerX, bounds.maxY);
        ctx.lineTo(centerX, rotateY);
        ctx.stroke();

        // Rotation circle
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(centerX, rotateY, handleSize / 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#10b981'; // Green for rotation
        ctx.lineWidth = 2 / camera.scale;
        ctx.stroke();

        // Rotation arrow icon inside circle
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5 / camera.scale;
        ctx.beginPath();
        const arrowR = handleSize / 3;
        ctx.arc(centerX, rotateY, arrowR, -Math.PI * 0.7, Math.PI * 0.3);
        ctx.stroke();

        // Center move handle
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(centerX, centerY, handleSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // Show rotation angle while rotating
        if (transformState.activeHandle === 'rotate') {
          ctx.fillStyle = '#10b981';
          ctx.font = `bold ${14 / camera.scale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(`${Math.round(currentRotationAngle)}°`, centerX, rotateY - handleSize);
        }

        // Show dimensions while scaling
        if (transformState.activeHandle && ['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'].includes(transformState.activeHandle)) {
          const width = bounds.maxX - bounds.minX;
          const height = bounds.maxY - bounds.minY;
          ctx.fillStyle = '#3b82f6';
          ctx.font = `${12 / camera.scale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(`${width.toFixed(1)}m × ${height.toFixed(1)}m`, centerX, bounds.minY - handleSize * 2);
        }

        // Show distance while moving
        if (transformState.activeHandle === 'move' && currentMoveDistance > 0.01) {
          const label = copyMode ? `Copy: ${currentMoveDistance.toFixed(2)}m` : `${currentMoveDistance.toFixed(2)}m`;
          const labelColor = copyMode ? '#22c55e' : '#3b82f6';
          ctx.fillStyle = labelColor;
          ctx.font = `bold ${14 / camera.scale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(label, centerX, bounds.minY - handleSize * 2);
        }
      }
    }

    // Draw marquee selection rectangle
    if (marqueeState.isActive && marqueeState.start && marqueeState.end) {
      const minX = Math.min(marqueeState.start[0], marqueeState.end[0]);
      const maxX = Math.max(marqueeState.start[0], marqueeState.end[0]);
      const minY = Math.min(marqueeState.start[1], marqueeState.end[1]);
      const maxY = Math.max(marqueeState.start[1], marqueeState.end[1]);

      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1 / camera.scale;
      ctx.setLineDash([4 / camera.scale, 2 / camera.scale]);
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.setLineDash([]);
    }

    ctx.restore();
  },
};

// Draw element outline
function drawElementOutline(ctx: CanvasRenderingContext2D, element: DesignElement) {
  if (element.points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(element.points[0][0], element.points[0][1]);
  for (let i = 1; i < element.points.length; i++) {
    ctx.lineTo(element.points[i][0], element.points[i][1]);
  }
  if (element.closed) {
    ctx.closePath();
  }
  ctx.stroke();
}

// Helper functions for keyboard shortcuts
export function selectToolSelectAll() {
  const { designElements, selectElements } = useDesignStore.getState();
  selectElements(designElements.map(el => el.id));
}

export function selectToolClearSelection() {
  useDesignStore.getState().clearSelection();
}

export function selectToolDeleteSelected() {
  const { selectedElementIds, removeDesignElement, clearSelection } = useDesignStore.getState();

  if (selectedElementIds.size === 0) return;

  for (const id of selectedElementIds) {
    removeDesignElement(id);
  }

  clearSelection();
}

// Set copy mode (Ctrl key held)
export function selectToolSetCopyMode(enabled: boolean) {
  copyMode = enabled;
}

// Duplicate selected elements in place (Ctrl+D)
export function selectToolDuplicate() {
  const { designElements, selectedElementIds, addDesignElement, selectElements, pushSnapshot } =
    useDesignStore.getState();

  if (selectedElementIds.size === 0) return;

  // Push snapshot for undo
  pushSnapshot();

  const selectedElements = designElements.filter((el) => selectedElementIds.has(el.id));
  const newIds: string[] = [];

  // Duplicate with a small offset
  const offset = 1; // 1 meter offset

  for (const el of selectedElements) {
    const newId = addDesignElement({
      type: el.type,
      points: el.points.map(([x, y]) => [x + offset, y + offset] as [number, number]),
      width: el.width,
      closed: el.closed,
      rotation: el.rotation,
    });
    newIds.push(newId);
  }

  // Select the new duplicates
  if (newIds.length > 0) {
    selectElements(newIds);
    if (import.meta.env.DEV) {
      console.log('[SelectTool] Duplicated', newIds.length, 'elements');
    }
  }
}

// === VERTEX EDITING EXPORTS ===

// Check if currently in vertex editing mode
export function selectToolIsVertexEditing(): boolean {
  return useDesignStore.getState().vertexEditingElementId !== null;
}

// Exit vertex editing mode
export function selectToolExitVertexEditing() {
  useDesignStore.getState().setVertexEditing(null);
}

// Delete selected vertices
export function selectToolDeleteSelectedVertices() {
  useDesignStore.getState().deleteSelectedVertices();
  // Trigger revalidation after delete
  triggerRevalidation();
}

// Nudge selected vertices by delta
export function selectToolNudgeVertices(dx: number, dy: number) {
  const { vertexEditingElementId, selectedVertexIndices, pushSnapshot, moveSelectedVertices } =
    useDesignStore.getState();

  if (!vertexEditingElementId || selectedVertexIndices.length === 0) return;

  pushSnapshot();
  moveSelectedVertices([dx, dy]);
  triggerRevalidation();
}
