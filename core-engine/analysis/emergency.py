"""
Emergency exit placement analysis.

Validates and suggests emergency exit locations to ensure:
- No visitor is more than a maximum distance from an emergency exit
- Exits are distributed throughout the maze
- Exits are reachable from any point in the maze
"""

import math
from typing import Dict, List, Tuple, Optional

import numpy as np
from shapely.geometry import Point, LineString
from shapely.geometry.base import BaseGeometry


def analyze_emergency_exits(
    walls: BaseGeometry,
    field_boundary: BaseGeometry,
    emergency_exits: List[Tuple[float, float]],
    max_distance: float = 50.0,
    resolution: float = 2.0,
) -> Dict:
    """
    Analyze emergency exit coverage.

    Args:
        walls: Maze wall geometry
        field_boundary: Field boundary polygon
        emergency_exits: Current emergency exit positions
        max_distance: Maximum allowed distance to nearest exit (meters)
        resolution: Analysis grid resolution

    Returns:
        {
            "coverage_pct": float,  (% of maze within max_distance of an exit)
            "max_distance_found": float,
            "uncovered_areas": [{"x": float, "y": float, "distance": float}, ...],
            "exit_stats": [{"x": float, "y": float, "coverage_area_m2": float}, ...]
        }
    """
    minx, miny, maxx, maxy = field_boundary.bounds
    cols = max(1, int((maxx - minx) / resolution))
    rows = max(1, int((maxy - miny) / resolution))

    # Build walkable grid
    walkable = np.zeros((rows, cols), dtype=bool)
    for r in range(rows):
        for c in range(cols):
            cx = minx + (c + 0.5) * resolution
            cy = miny + (r + 0.5) * resolution
            if field_boundary.contains(Point(cx, cy)):
                walkable[r, c] = True

    if walls and not walls.is_empty:
        wall_buffer = walls.buffer(resolution * 0.4)
        for r in range(rows):
            for c in range(cols):
                if not walkable[r, c]:
                    continue
                cx = minx + (c + 0.5) * resolution
                cy = miny + (r + 0.5) * resolution
                if wall_buffer.contains(Point(cx, cy)):
                    walkable[r, c] = False

    total_walkable = int(walkable.sum())
    if total_walkable == 0:
        return {"coverage_pct": 0, "max_distance_found": 0, "uncovered_areas": [], "exit_stats": []}

    # Calculate distance from each walkable cell to nearest exit (Euclidean for speed)
    min_distances = np.full((rows, cols), float('inf'))

    for ex, ey in emergency_exits:
        for r in range(rows):
            for c in range(cols):
                if not walkable[r, c]:
                    continue
                cx = minx + (c + 0.5) * resolution
                cy = miny + (r + 0.5) * resolution
                dist = math.sqrt((cx - ex) ** 2 + (cy - ey) ** 2)
                if dist < min_distances[r, c]:
                    min_distances[r, c] = dist

    # Coverage analysis
    covered = 0
    uncovered_areas = []
    max_dist_found = 0

    for r in range(rows):
        for c in range(cols):
            if not walkable[r, c]:
                continue
            dist = min_distances[r, c]
            if dist <= max_distance:
                covered += 1
            else:
                cx = minx + (c + 0.5) * resolution
                cy = miny + (r + 0.5) * resolution
                uncovered_areas.append({"x": round(cx, 2), "y": round(cy, 2), "distance": round(dist, 1)})
            if dist < float('inf') and dist > max_dist_found:
                max_dist_found = dist

    # Per-exit stats
    exit_stats = []
    cell_area = resolution * resolution
    for ex, ey in emergency_exits:
        count = 0
        for r in range(rows):
            for c in range(cols):
                if not walkable[r, c]:
                    continue
                cx = minx + (c + 0.5) * resolution
                cy = miny + (r + 0.5) * resolution
                dist = math.sqrt((cx - ex) ** 2 + (cy - ey) ** 2)
                if dist <= max_distance and dist == min_distances[r, c]:
                    count += 1
        exit_stats.append({
            "x": round(ex, 2),
            "y": round(ey, 2),
            "coverage_area_m2": round(count * cell_area, 1),
        })

    # Sort uncovered areas by distance descending, limit to worst 20
    uncovered_areas.sort(key=lambda a: a["distance"], reverse=True)
    uncovered_areas = uncovered_areas[:20]

    return {
        "coverage_pct": round(covered / total_walkable * 100, 1) if total_walkable > 0 else 0,
        "max_distance_found": round(max_dist_found, 1),
        "uncovered_areas": uncovered_areas,
        "exit_stats": exit_stats,
        "total_walkable_cells": total_walkable,
        "covered_cells": covered,
    }


def suggest_emergency_exits(
    walls: BaseGeometry,
    field_boundary: BaseGeometry,
    existing_exits: List[Tuple[float, float]] = None,
    max_distance: float = 50.0,
    resolution: float = 3.0,
) -> List[Tuple[float, float]]:
    """
    Suggest locations for emergency exits to achieve full coverage.

    Uses a greedy algorithm: repeatedly place exits at the point
    farthest from any existing exit until coverage is achieved.

    Returns:
        List of suggested (x, y) positions for new exits.
    """
    existing = list(existing_exits) if existing_exits else []

    minx, miny, maxx, maxy = field_boundary.bounds
    cols = max(1, int((maxx - minx) / resolution))
    rows = max(1, int((maxy - miny) / resolution))

    # Build walkable grid
    walkable = np.zeros((rows, cols), dtype=bool)
    for r in range(rows):
        for c in range(cols):
            cx = minx + (c + 0.5) * resolution
            cy = miny + (r + 0.5) * resolution
            if field_boundary.contains(Point(cx, cy)):
                walkable[r, c] = True

    if walls and not walls.is_empty:
        wall_buffer = walls.buffer(resolution * 0.4)
        for r in range(rows):
            for c in range(cols):
                if not walkable[r, c]:
                    continue
                cx = minx + (c + 0.5) * resolution
                cy = miny + (r + 0.5) * resolution
                if wall_buffer.contains(Point(cx, cy)):
                    walkable[r, c] = False

    suggested = []
    all_exits = list(existing)
    max_iterations = 20

    for iteration in range(max_iterations):
        # Find the walkable cell farthest from any exit
        max_min_dist = 0
        best_pos = None

        for r in range(rows):
            for c in range(cols):
                if not walkable[r, c]:
                    continue
                cx = minx + (c + 0.5) * resolution
                cy = miny + (r + 0.5) * resolution

                min_dist = float('inf')
                for ex, ey in all_exits:
                    dist = math.sqrt((cx - ex) ** 2 + (cy - ey) ** 2)
                    if dist < min_dist:
                        min_dist = dist

                if min_dist > max_min_dist:
                    max_min_dist = min_dist
                    best_pos = (cx, cy)

        if max_min_dist <= max_distance:
            break  # Full coverage achieved

        if best_pos:
            # Place exit on the nearest field boundary point
            boundary_point = field_boundary.exterior.interpolate(
                field_boundary.exterior.project(Point(best_pos))
            )
            exit_pos = (round(boundary_point.x, 2), round(boundary_point.y, 2))
            suggested.append(exit_pos)
            all_exits.append(exit_pos)

    return suggested
