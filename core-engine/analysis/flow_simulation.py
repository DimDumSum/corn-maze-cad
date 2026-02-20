"""
Visitor flow simulation.

Models crowd movement through the maze to identify bottleneck paths,
estimate solve times, and optimize maze layout for visitor throughput.

Uses a simplified agent-based approach: multiple agents navigate from
entrance to exit using randomized A*-biased decisions at junctions.
"""

import random
import math
from collections import defaultdict
from typing import Dict, List, Tuple, Optional

import numpy as np
from shapely.geometry import Point
from shapely.geometry.base import BaseGeometry


def simulate_visitor_flow(
    walls: BaseGeometry,
    field_boundary: BaseGeometry,
    entrances: List[Tuple[float, float]],
    exits: List[Tuple[float, float]],
    num_visitors: int = 100,
    resolution: float = 2.0,
    seed: Optional[int] = None,
) -> Dict:
    """
    Simulate visitor flow through the maze.

    Args:
        walls: Maze wall geometry
        field_boundary: Field boundary polygon
        entrances: List of entrance (x,y) coordinates
        exits: List of exit (x,y) coordinates
        num_visitors: Number of visitors to simulate
        resolution: Grid resolution for pathfinding
        seed: Random seed for reproducibility

    Returns:
        {
            "heatmap": [[count, ...], ...],  (grid of visit counts)
            "bottlenecks": [{"x": float, "y": float, "visits": int}, ...],
            "avg_solve_steps": float,
            "completion_rate": float,
            "bounds": {"minx": float, "miny": float, "maxx": float, "maxy": float},
            "resolution": float,
        }
    """
    if seed is not None:
        random.seed(seed)

    if not entrances or not exits:
        return {"error": "Need at least one entrance and one exit"}

    minx, miny, maxx, maxy = field_boundary.bounds
    cols = max(1, int((maxx - minx) / resolution))
    rows = max(1, int((maxy - miny) / resolution))

    # Build occupancy grid
    grid = np.ones((rows, cols), dtype=bool)  # True = blocked

    for r in range(rows):
        for c in range(cols):
            cx = minx + (c + 0.5) * resolution
            cy = miny + (r + 0.5) * resolution
            if field_boundary.contains(Point(cx, cy)):
                grid[r, c] = False

    if walls and not walls.is_empty:
        wall_buffer = walls.buffer(resolution * 0.4)
        for r in range(rows):
            for c in range(cols):
                if grid[r, c]:
                    continue
                cx = minx + (c + 0.5) * resolution
                cy = miny + (r + 0.5) * resolution
                if wall_buffer.contains(Point(cx, cy)):
                    grid[r, c] = True

    def world_to_grid(x, y):
        c = max(0, min(int((x - minx) / resolution), cols - 1))
        r = max(0, min(int((y - miny) / resolution), rows - 1))
        return r, c

    def grid_to_world(r, c):
        return minx + (c + 0.5) * resolution, miny + (r + 0.5) * resolution

    # Convert entrance/exit to grid coords
    entrance_cells = [world_to_grid(x, y) for x, y in entrances]
    exit_cells = [world_to_grid(x, y) for x, y in exits]

    # Heatmap: count visits per cell
    heatmap = np.zeros((rows, cols), dtype=int)
    solve_steps = []
    completions = 0
    max_steps = rows * cols * 2

    neighbors = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    for v in range(num_visitors):
        # Pick random entrance
        start = random.choice(entrance_cells)
        target_exit = random.choice(exit_cells)

        # Random walk with exit-biased heuristic
        r, c = start
        visited = set()
        steps = 0

        while steps < max_steps:
            heatmap[r, c] += 1
            visited.add((r, c))
            steps += 1

            if (r, c) == target_exit or (r, c) in exit_cells:
                completions += 1
                solve_steps.append(steps)
                break

            # Get valid neighbors
            valid = []
            for dr, dc in neighbors:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and not grid[nr, nc]:
                    valid.append((nr, nc))

            if not valid:
                break

            # Bias toward exit (70% chance to pick best direction)
            if random.random() < 0.7 and len(valid) > 1:
                valid.sort(key=lambda p: abs(p[0] - target_exit[0]) + abs(p[1] - target_exit[1]))

            # Prefer unvisited cells
            unvisited = [p for p in valid if p not in visited]
            if unvisited:
                if random.random() < 0.8:
                    r, c = unvisited[0]
                else:
                    r, c = random.choice(unvisited)
            else:
                r, c = random.choice(valid)

    # Find bottlenecks (top N cells by visit count)
    threshold = np.percentile(heatmap[heatmap > 0], 90) if heatmap.any() else 0
    bottlenecks = []
    for r in range(rows):
        for c in range(cols):
            if heatmap[r, c] >= threshold and heatmap[r, c] > 0:
                wx, wy = grid_to_world(r, c)
                bottlenecks.append({
                    "x": round(wx, 2),
                    "y": round(wy, 2),
                    "visits": int(heatmap[r, c]),
                })

    # Sort by visits descending, limit to top 20
    bottlenecks.sort(key=lambda b: b["visits"], reverse=True)
    bottlenecks = bottlenecks[:20]

    return {
        "heatmap": heatmap.tolist(),
        "bottlenecks": bottlenecks,
        "avg_solve_steps": round(sum(solve_steps) / len(solve_steps), 1) if solve_steps else 0,
        "completion_rate": round(completions / num_visitors, 3) if num_visitors > 0 else 0,
        "bounds": {"minx": minx, "miny": miny, "maxx": maxx, "maxy": maxy},
        "resolution": resolution,
        "total_visitors": num_visitors,
        "completed": completions,
    }
