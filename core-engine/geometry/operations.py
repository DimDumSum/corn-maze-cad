"""
Geometric operations for maze manipulation.

Provides buffer, intersection, union, difference operations
for maze path carving and wall modifications.
"""

from shapely.geometry import LineString, MultiLineString, GeometryCollection
from shapely.geometry.base import BaseGeometry
from typing import List, Tuple


def flatten_geometry(geom: BaseGeometry) -> List[List[Tuple[float, float]]]:
    """
    Recursively flatten MultiLineString/GeometryCollection to list of line segments.

    Args:
        geom: Shapely geometry (LineString, MultiLineString, or GeometryCollection)

    Returns:
        List of coordinate lists, where each list represents a line segment

    Example:
        >>> line = LineString([(0, 0), (1, 1), (2, 2)])
        >>> flatten_geometry(line)
        [[(0.0, 0.0), (1.0, 1.0), (2.0, 2.0)]]
    """
    lines = []

    if geom is None or geom.is_empty:
        return lines

    if geom.geom_type == 'LineString':
        lines.append(list(geom.coords))
    elif geom.geom_type in ['MultiLineString', 'GeometryCollection']:
        for part in geom.geoms:
            lines.extend(flatten_geometry(part))

    return lines


def carve_path(
    walls: BaseGeometry,
    points: List[Tuple[float, float]],
    width: float,
    field_boundary: BaseGeometry = None
) -> Tuple[BaseGeometry, str | None]:
    """
    Carve a path through maze walls using boolean difference.

    Creates a buffer around the path line and subtracts it from
    the walls geometry.

    Args:
        walls: Current maze walls geometry
        points: List of (x, y) coordinates defining the path
        width: Width of the path in meters
        field_boundary: Optional field boundary to check if path is inside

    Returns:
        Tuple of (updated walls geometry, warning message or None)

    Raises:
        ValueError: If points list has fewer than 2 points

    Example:
        >>> walls = MultiLineString([...])
        >>> points = [(0, 0), (10, 10)]
        >>> new_walls, warning = carve_path(walls, points, width=4.0)
    """
    if len(points) < 2:
        raise ValueError("Path too short (need at least 2 points)")

    # Create path LineString
    path_line = LineString(points)

    # Buffer to create eraser polygon (round caps)
    eraser = path_line.buffer(width / 2.0, cap_style=1)

    # Check if path intersects field boundary (warning, not error)
    if field_boundary and not eraser.intersects(field_boundary):
        # Path entirely outside - return unchanged
        return walls, "Path outside field boundary"

    # Boolean difference
    updated_walls = walls.difference(eraser)

    return updated_walls, None
