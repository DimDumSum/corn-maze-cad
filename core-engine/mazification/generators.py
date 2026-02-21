"""
Maze generation algorithms aligned to corn planter rows.

Grid cells are oriented along the planting direction so that
maze walls correspond to standing corn rows and paths correspond
to mowed rows.
"""

import random
import numpy as np
from shapely.geometry import LineString, MultiLineString, Point
from shapely.affinity import rotate as shapely_rotate
from shapely.geometry.base import BaseGeometry
from typing import List, Tuple, Optional


def _build_grid_cells(
    field_boundary: BaseGeometry,
    spacing: float,
    direction_deg: float = 0.0,
    headland_inset: float = 0.0,
) -> Tuple[int, int, np.ndarray, float, float, float, float, Tuple[float, float], BaseGeometry]:
    """
    Build a grid of cells aligned to the planting direction.

    The field is rotated so that the planting direction aligns with the
    Y-axis, cells are built in that rotated space, and the resulting
    inside mask is returned alongside the rotated (axis-aligned) boundary.

    Args:
        field_boundary: Shapely polygon defining the field boundary
        spacing: Distance between grid lines in meters
        direction_deg: Planting direction in degrees (0 = North, 90 = East)
        headland_inset: Distance to inset from field boundary (headland area)

    Returns:
        (cols, rows, inside_mask, minx, miny, maxx, maxy, rotation_center, working_area)
    """
    # Inset the field to exclude headland area
    working_area = field_boundary
    if headland_inset > 0:
        inset = field_boundary.buffer(-headland_inset)
        if not inset.is_empty and inset.area > 0:
            if inset.geom_type == 'MultiPolygon':
                working_area = max(inset.geoms, key=lambda g: g.area)
            else:
                working_area = inset

    # Use working_area centroid as the rotation center (same in both directions)
    rot_cx, rot_cy = working_area.centroid.x, working_area.centroid.y

    # Rotate the boundary so planting direction aligns with the Y-axis.
    # This lets us build an axis-aligned grid in the rotated space.
    rotated = shapely_rotate(working_area, direction_deg, origin=(rot_cx, rot_cy))

    minx, miny, maxx, maxy = rotated.bounds

    cols = max(1, int((maxx - minx) / spacing))
    rows = max(1, int((maxy - miny) / spacing))

    inside = np.zeros((rows, cols), dtype=bool)
    for r in range(rows):
        for c in range(cols):
            cell_cx = minx + (c + 0.5) * spacing
            cell_cy = miny + (r + 0.5) * spacing
            if rotated.contains(Point(cell_cx, cell_cy)):
                inside[r, c] = True

    return cols, rows, inside, minx, miny, maxx, maxy, (rot_cx, rot_cy), working_area


def _grid_to_walls(
    cols: int,
    rows: int,
    inside: np.ndarray,
    h_walls: np.ndarray,
    v_walls: np.ndarray,
    spacing: float,
    minx: float,
    miny: float,
    clip_boundary: BaseGeometry,
    direction_deg: float = 0.0,
    rotation_center: Tuple[float, float] = (0.0, 0.0),
) -> BaseGeometry:
    """
    Convert wall arrays to Shapely geometry, rotated back to world coordinates.

    Walls are built in the rotated (axis-aligned) coordinate system and then
    rotated back by -direction_deg around the same center used in _build_grid_cells.
    """
    lines: List[LineString] = []

    # Horizontal walls (perpendicular to planting direction in rotated space)
    for r in range(rows + 1):
        for c in range(cols):
            top_inside = (r < rows) and inside[r, c]
            bot_inside = (r > 0) and inside[r - 1, c]
            if not (top_inside or bot_inside):
                continue
            if h_walls[r, c]:
                x1 = minx + c * spacing
                x2 = minx + (c + 1) * spacing
                y = miny + r * spacing
                lines.append(LineString([(x1, y), (x2, y)]))

    # Vertical walls (along planting direction in rotated space = corn rows)
    for r in range(rows):
        for c in range(cols + 1):
            left_inside = (c > 0) and inside[r, c - 1]
            right_inside = (c < cols) and inside[r, c]
            if not (left_inside or right_inside):
                continue
            if v_walls[r, c]:
                x = minx + c * spacing
                y1 = miny + r * spacing
                y2 = miny + (r + 1) * spacing
                lines.append(LineString([(x, y1), (x, y2)]))

    if not lines:
        return MultiLineString()

    result = MultiLineString(lines)

    # Rotate walls back to world coordinates using the same center
    if direction_deg != 0:
        result = shapely_rotate(result, -direction_deg, origin=rotation_center)

    clipped = result.intersection(clip_boundary)
    return clipped


def generate_recursive_backtracker(
    field_boundary: BaseGeometry,
    spacing: float = 10.0,
    seed: Optional[int] = None,
    direction_deg: float = 0.0,
    headland_inset: float = 0.0,
) -> BaseGeometry:
    """
    Generate a maze using the recursive backtracker (depth-first search) algorithm.

    Grid cells are aligned to the planting direction defined by direction_deg.

    Args:
        field_boundary: Shapely polygon defining the field boundary
        spacing: Distance between grid lines in meters
        seed: Optional random seed for reproducibility
        direction_deg: Planting direction in degrees (0 = North, 90 = East)
        headland_inset: Distance to inset from field boundary (headland area)

    Returns:
        MultiLineString geometry containing maze walls
    """
    if field_boundary is None or field_boundary.is_empty:
        raise ValueError("Field boundary must be provided")

    if seed is not None:
        random.seed(seed)

    cols, rows, inside, minx, miny, maxx, maxy, rot_center, working_area = _build_grid_cells(
        field_boundary, spacing, direction_deg, headland_inset
    )

    if not inside.any():
        return MultiLineString()

    # Initialize all walls as present
    h_walls = np.ones((rows + 1, cols), dtype=bool)
    v_walls = np.ones((rows, cols + 1), dtype=bool)

    visited = np.zeros((rows, cols), dtype=bool)

    # Find a starting cell that's inside the boundary
    inside_cells = [(r, c) for r in range(rows) for c in range(cols) if inside[r, c]]
    if not inside_cells:
        return MultiLineString()

    start = random.choice(inside_cells)
    stack = [start]
    visited[start[0], start[1]] = True

    directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]

    while stack:
        r, c = stack[-1]

        # Find unvisited neighbors that are inside the boundary
        neighbors = []
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and inside[nr, nc] and not visited[nr, nc]:
                neighbors.append((nr, nc, dr, dc))

        if neighbors:
            nr, nc, dr, dc = random.choice(neighbors)
            visited[nr, nc] = True

            # Remove wall between current cell and neighbor
            if dr == 1:     # Moving up (increasing row)
                h_walls[nr, c] = False
            elif dr == -1:  # Moving down
                h_walls[r, c] = False
            elif dc == 1:   # Moving right
                v_walls[r, nc] = False
            elif dc == -1:  # Moving left
                v_walls[r, c] = False

            stack.append((nr, nc))
        else:
            stack.pop()

    return _grid_to_walls(
        cols, rows, inside, h_walls, v_walls, spacing,
        minx, miny, working_area, direction_deg, rot_center
    )


def generate_prims(
    field_boundary: BaseGeometry,
    spacing: float = 10.0,
    seed: Optional[int] = None,
    direction_deg: float = 0.0,
    headland_inset: float = 0.0,
) -> BaseGeometry:
    """
    Generate a maze using a randomized Prim's algorithm.

    Grid cells are aligned to the planting direction defined by direction_deg.

    Args:
        field_boundary: Shapely polygon defining the field boundary
        spacing: Distance between grid lines in meters
        seed: Optional random seed for reproducibility
        direction_deg: Planting direction in degrees (0 = North, 90 = East)
        headland_inset: Distance to inset from field boundary (headland area)

    Returns:
        MultiLineString geometry containing maze walls
    """
    if field_boundary is None or field_boundary.is_empty:
        raise ValueError("Field boundary must be provided")

    if seed is not None:
        random.seed(seed)

    cols, rows, inside, minx, miny, maxx, maxy, rot_center, working_area = _build_grid_cells(
        field_boundary, spacing, direction_deg, headland_inset
    )

    if not inside.any():
        return MultiLineString()

    h_walls = np.ones((rows + 1, cols), dtype=bool)
    v_walls = np.ones((rows, cols + 1), dtype=bool)

    visited = np.zeros((rows, cols), dtype=bool)

    inside_cells = [(r, c) for r in range(rows) for c in range(cols) if inside[r, c]]
    if not inside_cells:
        return MultiLineString()

    start = random.choice(inside_cells)
    visited[start[0], start[1]] = True

    directions = [(0, 1), (0, -1), (1, 0), (-1, 0)]

    frontier = []  # (from_r, from_c, to_r, to_c)

    def add_frontiers(r: int, c: int):
        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols and inside[nr, nc] and not visited[nr, nc]:
                frontier.append((r, c, nr, nc))

    add_frontiers(start[0], start[1])

    while frontier:
        idx = random.randint(0, len(frontier) - 1)
        r, c, nr, nc = frontier[idx]
        frontier[idx] = frontier[-1]
        frontier.pop()

        if visited[nr, nc]:
            continue

        visited[nr, nc] = True

        dr, dc = nr - r, nc - c
        if dr == 1:
            h_walls[nr, c] = False
        elif dr == -1:
            h_walls[r, c] = False
        elif dc == 1:
            v_walls[r, nc] = False
        elif dc == -1:
            v_walls[r, c] = False

        add_frontiers(nr, nc)

    return _grid_to_walls(
        cols, rows, inside, h_walls, v_walls, spacing,
        minx, miny, working_area, direction_deg, rot_center
    )


# Lookup for algorithm selection
ALGORITHMS = {
    "backtracker": generate_recursive_backtracker,
    "prims": generate_prims,
}
