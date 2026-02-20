"""
Maze generation algorithms.

Provides various maze generation strategies including
grid-based patterns, recursive backtracker, and other algorithms.
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

    Example:
        >>> from shapely.geometry import Polygon
        >>> field = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        >>> walls = generate_grid_maze(field, spacing=10.0)
        >>> walls.geom_type
        'MultiLineString'

    Notes:
        - This is a simple grid pattern, not a true maze
        - Future: Add recursive backtracker, Prim's algorithm, etc.
        - Grid lines may be disconnected after clipping to boundary
    """
    if field_boundary is None or field_boundary.is_empty:
        raise ValueError("Field boundary must be provided")

    # Get bounding box
    minx, miny, maxx, maxy = field_boundary.bounds

    # Create grid lines
    lines: List[LineString] = []

    # Vertical lines
    for x in np.arange(minx, maxx, spacing):
        lines.append(LineString([(x, miny), (x, maxy)]))

    # Horizontal lines
    for y in np.arange(miny, maxy, spacing):
        lines.append(LineString([(minx, y), (maxx, y)]))

    # Clip to field boundary
    grid = MultiLineString(lines)
    clipped_walls = grid.intersection(field_boundary)

    return clipped_walls


# TODO: Implement additional maze generation algorithms
# - recursive_backtracker(): Classic maze with guaranteed single solution
# - prims_algorithm(): Randomized minimum spanning tree maze
# - maze_with_entrance_exit(): Maze with specific entry/exit points
# - difficulty_tuned_maze(difficulty): Adjust dead ends, path complexity
