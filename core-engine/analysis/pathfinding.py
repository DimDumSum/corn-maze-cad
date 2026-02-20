"""
Pathfinding and solvability analysis.

Provides A* pathfinding, maze solvability checks,
and path complexity metrics.
"""

import heapq
import math
import numpy as np
from shapely.geometry import Point
from shapely.geometry.base import BaseGeometry
from typing import List, Tuple, Optional


def _rasterize_walls(
    walls: BaseGeometry,
    field_boundary: BaseGeometry,
    resolution: float,
) -> Tuple[np.ndarray, float, float, int, int]:
    """
    Rasterize maze walls into a 2D boolean grid for pathfinding.

    Returns:
        (grid, minx, miny, grid_cols, grid_rows)
        grid[row][col] is True if that cell is blocked by a wall.
    """
    minx, miny, maxx, maxy = field_boundary.bounds
    grid_cols = max(1, int((maxx - minx) / resolution))
    grid_rows = max(1, int((maxy - miny) / resolution))

    # Start with everything blocked (outside boundary)
    grid = np.ones((grid_rows, grid_cols), dtype=bool)

    # Mark cells inside the boundary as open
    for r in range(grid_rows):
        for c in range(grid_cols):
            cx = minx + (c + 0.5) * resolution
            cy = miny + (r + 0.5) * resolution
            if field_boundary.contains(Point(cx, cy)):
                grid[r, c] = False

    # Buffer walls slightly and mark overlapping cells as blocked
    if walls is not None and not walls.is_empty:
        wall_buffer = walls.buffer(resolution * 0.4)
        for r in range(grid_rows):
            for c in range(grid_cols):
                if grid[r, c]:
                    continue
                cx = minx + (c + 0.5) * resolution
                cy = miny + (r + 0.5) * resolution
                if wall_buffer.contains(Point(cx, cy)):
                    grid[r, c] = True

    return grid, minx, miny, grid_cols, grid_rows


def find_path(
    walls: BaseGeometry,
    start: Tuple[float, float],
    goal: Tuple[float, float],
    field_boundary: BaseGeometry,
    resolution: float = 1.0,
) -> Optional[List[Tuple[float, float]]]:
    """
    Find shortest path through maze using A* algorithm.

    Args:
        walls: Maze walls geometry (obstacles)
        start: Start point (x, y) coordinates
        goal: Goal point (x, y) coordinates
        field_boundary: Field boundary polygon
        resolution: Grid resolution for pathfinding (smaller = more precise but slower)

    Returns:
        List of (x, y) waypoints forming the path, or None if no path exists
    """
    grid, minx, miny, grid_cols, grid_rows = _rasterize_walls(
        walls, field_boundary, resolution
    )

    def world_to_grid(x: float, y: float) -> Tuple[int, int]:
        c = max(0, min(int((x - minx) / resolution), grid_cols - 1))
        r = max(0, min(int((y - miny) / resolution), grid_rows - 1))
        return r, c

    def grid_to_world(r: int, c: int) -> Tuple[float, float]:
        return minx + (c + 0.5) * resolution, miny + (r + 0.5) * resolution

    start_rc = world_to_grid(start[0], start[1])
    goal_rc = world_to_grid(goal[0], goal[1])

    # If start or goal is in a wall, find nearest open cell
    for target_name, target_rc in [("start", start_rc), ("goal", goal_rc)]:
        r, c = target_rc
        if grid[r, c]:
            found = False
            for radius in range(1, max(grid_rows, grid_cols)):
                for dr in range(-radius, radius + 1):
                    for dc in range(-radius, radius + 1):
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < grid_rows and 0 <= nc < grid_cols and not grid[nr, nc]:
                            if target_name == "start":
                                start_rc = (nr, nc)
                            else:
                                goal_rc = (nr, nc)
                            found = True
                            break
                    if found:
                        break
                if found:
                    break
            if not found:
                return None

    # A* with 8-directional movement
    def heuristic(rc: Tuple[int, int]) -> float:
        return math.sqrt((rc[0] - goal_rc[0]) ** 2 + (rc[1] - goal_rc[1]) ** 2)

    open_set = []
    heapq.heappush(open_set, (heuristic(start_rc), 0.0, start_rc))
    came_from = {}
    g_score = {start_rc: 0.0}

    neighbors_offsets = [
        (-1, -1), (-1, 0), (-1, 1),
        (0, -1),           (0, 1),
        (1, -1),  (1, 0),  (1, 1),
    ]
    diag_cost = math.sqrt(2)

    while open_set:
        _, current_g, current = heapq.heappop(open_set)

        if current == goal_rc:
            path = []
            node = current
            while node in came_from:
                path.append(grid_to_world(node[0], node[1]))
                node = came_from[node]
            path.append(grid_to_world(node[0], node[1]))
            path.reverse()
            return path

        if current_g > g_score.get(current, float('inf')):
            continue

        for dr, dc in neighbors_offsets:
            nr, nc = current[0] + dr, current[1] + dc
            if not (0 <= nr < grid_rows and 0 <= nc < grid_cols):
                continue
            if grid[nr, nc]:
                continue

            move_cost = diag_cost if (dr != 0 and dc != 0) else 1.0
            tentative_g = current_g + move_cost
            neighbor = (nr, nc)

            if tentative_g < g_score.get(neighbor, float('inf')):
                g_score[neighbor] = tentative_g
                came_from[neighbor] = current
                heapq.heappush(open_set, (tentative_g + heuristic(neighbor), tentative_g, neighbor))

    return None


def is_solvable(
    walls: BaseGeometry,
    entrance: Tuple[float, float],
    exit_point: Tuple[float, float],
    field_boundary: BaseGeometry,
    resolution: float = 1.0,
) -> bool:
    """
    Check if maze has a solution path from entrance to exit.
    """
    path = find_path(walls, entrance, exit_point, field_boundary, resolution)
    return path is not None


def calculate_path_length(path: List[Tuple[float, float]]) -> float:
    """Calculate total length of a path in meters."""
    if not path or len(path) < 2:
        return 0.0
    total = 0.0
    for i in range(1, len(path)):
        dx = path[i][0] - path[i - 1][0]
        dy = path[i][1] - path[i - 1][1]
        total += math.sqrt(dx * dx + dy * dy)
    return total
