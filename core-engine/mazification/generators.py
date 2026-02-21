"""
Maze generation algorithms.

Provides grid-based maze generation clipped to field boundaries.
"""

import numpy as np
from shapely.geometry import LineString, MultiLineString
from shapely.geometry.base import BaseGeometry
from typing import List


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


# Lookup for algorithm selection
ALGORITHMS = {
    "grid": generate_grid_maze,
}
