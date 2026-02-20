"""
Maze generation algorithms.

Provides various maze generation strategies including
grid-based patterns, recursive backtracker, and Prim's algorithm.
"""

import random
import numpy as np
from shapely.geometry import LineString, MultiLineString, Point
from shapely.geometry.base import BaseGeometry
from typing import List, Tuple, Optional


def generate_grid_maze(
    field_boundary: BaseGeometry,
    spacing: float = 10.0
) -> BaseGeometry:
    """
    Generate a simple grid maze clipped to field boundary.

    Creates evenly-spaced horizontal and vertical lines
    that are clipped to the field boundary polygon.

    Args:
        field_boundary: Shapely polygon defining the field boundary
        spacing: Distance between grid lines in meters (default: 10.0)

    Returns:
        MultiLineString geometry containing maze walls
    """
    if field_boundary is None or field_boundary.is_empty:
        raise ValueError("Field boundary must be provided")

    minx, miny, maxx, maxy = field_boundary.bounds
    lines: List[LineString] = []

    for x in np.arange(minx, maxx, spacing):
        lines.append(LineString([(x, miny), (x, maxy)]))

    for y in np.arange(miny, maxy, spacing):
        lines.append(LineString([(minx, y), (maxx, y)]))

    grid = MultiLineString(lines)
    clipped_walls = grid.intersection(field_boundary)

    return clipped_walls


def _build_grid_cells(
    field_boundary: BaseGeometry,
    spacing: float,
) -> Tuple[int, int, np.ndarray, float, float, float, float]:
    """
    Build a grid of cells over the field boundary.

    Returns:
        (cols, rows, inside_mask, minx, miny, maxx, maxy)
        inside_mask[row][col] is True if that cell's center is inside the field.
    """
    minx, miny, maxx, maxy = field_boundary.bounds

    cols = max(1, int((maxx - minx) / spacing))
    rows = max(1, int((maxy - miny) / spacing))

    inside = np.zeros((rows, cols), dtype=bool)
    for r in range(rows):
        for c in range(cols):
            cx = minx + (c + 0.5) * spacing
            cy = miny + (r + 0.5) * spacing
            if field_boundary.contains(Point(cx, cy)):
                inside[r, c] = True

    return cols, rows, inside, minx, miny, maxx, maxy


def _grid_to_walls(
    cols: int,
    rows: int,
    inside: np.ndarray,
    h_walls: np.ndarray,
    v_walls: np.ndarray,
    spacing: float,
    minx: float,
    miny: float,
    field_boundary: BaseGeometry,
) -> BaseGeometry:
    """
    Convert wall arrays to Shapely geometry clipped to the field boundary.

    h_walls[r][c]: horizontal wall on the south side of row r at column c.
    v_walls[r][c]: vertical wall on the west side of row r at column c.
    """
    lines: List[LineString] = []

    # Horizontal walls
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

    # Vertical walls
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
    clipped = result.intersection(field_boundary)
    return clipped


def generate_recursive_backtracker(
    field_boundary: BaseGeometry,
    spacing: float = 10.0,
    seed: Optional[int] = None,
) -> BaseGeometry:
    """
    Generate a maze using the recursive backtracker (depth-first search) algorithm.

    Creates a perfect maze (exactly one path between any two cells) with long,
    winding corridors. This produces harder mazes with fewer dead ends compared
    to Prim's algorithm.

    Args:
        field_boundary: Shapely polygon defining the field boundary
        spacing: Distance between grid lines in meters (default: 10.0)
        seed: Optional random seed for reproducibility

    Returns:
        MultiLineString geometry containing maze walls
    """
    if field_boundary is None or field_boundary.is_empty:
        raise ValueError("Field boundary must be provided")

    if seed is not None:
        random.seed(seed)

    cols, rows, inside, minx, miny, maxx, maxy = _build_grid_cells(field_boundary, spacing)

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

    return _grid_to_walls(cols, rows, inside, h_walls, v_walls, spacing, minx, miny, field_boundary)


def generate_prims(
    field_boundary: BaseGeometry,
    spacing: float = 10.0,
    seed: Optional[int] = None,
) -> BaseGeometry:
    """
    Generate a maze using a randomized Prim's algorithm.

    Creates a perfect maze with many short dead ends, producing an
    easier maze with more branching paths. Good for younger audiences.

    Args:
        field_boundary: Shapely polygon defining the field boundary
        spacing: Distance between grid lines in meters (default: 10.0)
        seed: Optional random seed for reproducibility

    Returns:
        MultiLineString geometry containing maze walls
    """
    if field_boundary is None or field_boundary.is_empty:
        raise ValueError("Field boundary must be provided")

    if seed is not None:
        random.seed(seed)

    cols, rows, inside, minx, miny, maxx, maxy = _build_grid_cells(field_boundary, spacing)

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

    return _grid_to_walls(cols, rows, inside, h_walls, v_walls, spacing, minx, miny, field_boundary)


# Lookup for algorithm selection
ALGORITHMS = {
    "grid": generate_grid_maze,
    "backtracker": generate_recursive_backtracker,
    "prims": generate_prims,
}
