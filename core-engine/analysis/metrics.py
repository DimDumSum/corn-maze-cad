"""
Maze complexity and difficulty metrics.

Calculates various metrics for analyzing maze quality
including dead ends, path tortuosity, and difficulty scores.
"""

import math
import numpy as np
from collections import defaultdict
from shapely.geometry import Point, MultiPoint
from shapely.geometry.base import BaseGeometry
from typing import Dict, Tuple, List

from .pathfinding import find_path, calculate_path_length


def _extract_nodes_and_edges(
    walls: BaseGeometry,
    tolerance: float = 0.5,
) -> Tuple[Dict[Tuple[float, float], List[Tuple[float, float]]], int]:
    """
    Extract a graph (adjacency list) from wall geometry.

    Snaps endpoints to a grid defined by tolerance to merge nearby nodes.

    Returns:
        (adjacency_dict, total_segments)
    """
    adjacency = defaultdict(set)
    total_segments = 0

    def snap(x: float, y: float) -> Tuple[float, float]:
        return (round(x / tolerance) * tolerance, round(y / tolerance) * tolerance)

    def process_line(coords):
        nonlocal total_segments
        if len(coords) < 2:
            return
        for i in range(len(coords) - 1):
            a = snap(coords[i][0], coords[i][1])
            b = snap(coords[i + 1][0], coords[i + 1][1])
            if a != b:
                adjacency[a].add(b)
                adjacency[b].add(a)
                total_segments += 1

    if walls is None or walls.is_empty:
        return dict(adjacency), 0

    if walls.geom_type == 'LineString':
        process_line(list(walls.coords))
    elif walls.geom_type in ('MultiLineString', 'GeometryCollection'):
        for geom in walls.geoms:
            if geom.geom_type == 'LineString':
                process_line(list(geom.coords))
            elif geom.geom_type == 'MultiLineString':
                for line in geom.geoms:
                    process_line(list(line.coords))

    return dict(adjacency), total_segments


def count_dead_ends(walls: BaseGeometry, tolerance: float = 0.5) -> int:
    """
    Count dead end segments in the maze.

    A dead end is a node with exactly one connection (degree 1).
    """
    adjacency, _ = _extract_nodes_and_edges(walls, tolerance)
    return sum(1 for neighbors in adjacency.values() if len(neighbors) == 1)


def count_junctions(walls: BaseGeometry, tolerance: float = 0.5) -> int:
    """
    Count decision points (junctions) in the maze.

    A junction is a node with 3 or more connections.
    """
    adjacency, _ = _extract_nodes_and_edges(walls, tolerance)
    return sum(1 for neighbors in adjacency.values() if len(neighbors) >= 3)


def calculate_total_wall_length(walls: BaseGeometry) -> float:
    """Calculate the total length of all wall segments in meters."""
    if walls is None or walls.is_empty:
        return 0.0
    return walls.length


def calculate_difficulty_score(
    walls: BaseGeometry,
    field_boundary: BaseGeometry,
) -> float:
    """
    Calculate overall maze difficulty score (0.0 to 1.0).

    Considers:
    - Dead end density (more dead ends = harder)
    - Junction density (more junctions = more choices = harder)
    - Wall density (more walls = more constrained = harder)
    """
    if walls is None or walls.is_empty or field_boundary is None:
        return 0.0

    area = field_boundary.area
    if area <= 0:
        return 0.0

    dead_ends = count_dead_ends(walls)
    junctions = count_junctions(walls)
    wall_length = calculate_total_wall_length(walls)

    # Normalize metrics relative to field area
    sqrt_area = math.sqrt(area)

    # Dead end density: more dead ends per unit area = harder
    dead_end_score = min(1.0, (dead_ends / sqrt_area) * 5.0)

    # Junction density: more junctions = more decision points = harder
    junction_score = min(1.0, (junctions / sqrt_area) * 3.0)

    # Wall density: ratio of wall length to boundary perimeter
    perimeter = field_boundary.length
    wall_density = min(1.0, wall_length / (perimeter * 5.0)) if perimeter > 0 else 0.0

    # Weighted combination
    score = (
        dead_end_score * 0.35 +
        junction_score * 0.35 +
        wall_density * 0.30
    )

    return round(min(1.0, max(0.0, score)), 3)


def analyze_maze(
    walls: BaseGeometry,
    field_boundary: BaseGeometry,
) -> Dict[str, any]:
    """
    Comprehensive maze analysis with multiple metrics.

    Returns:
        Dictionary with metrics:
        {
            "total_wall_length": float (meters),
            "dead_end_count": int,
            "junction_count": int,
            "difficulty_score": float (0.0 to 1.0),
            "path_count": int,
            "field_area_m2": float,
            "wall_density": float (wall length / sqrt area),
        }
    """
    wall_length = calculate_total_wall_length(walls)
    dead_ends = count_dead_ends(walls)
    junctions = count_junctions(walls)
    difficulty = calculate_difficulty_score(walls, field_boundary)

    adjacency, segment_count = _extract_nodes_and_edges(walls)
    field_area = field_boundary.area if field_boundary else 0.0
    sqrt_area = math.sqrt(field_area) if field_area > 0 else 1.0

    return {
        "total_wall_length": round(wall_length, 1),
        "dead_end_count": dead_ends,
        "junction_count": junctions,
        "difficulty_score": difficulty,
        "path_count": segment_count,
        "field_area_m2": round(field_area, 1),
        "wall_density": round(wall_length / sqrt_area, 2) if sqrt_area > 0 else 0.0,
    }
