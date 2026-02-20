"""
Geometry module: Shapely operations for spatial analysis.

Contains operations like buffer, intersection, union, difference,
and validation of geometric shapes.
"""

from .validation import (
    validate_boundary,
    get_largest_polygon,
    simplify_boundary,
)

from .operations import (
    flatten_geometry,
    carve_path,
)

__all__ = [
    "validate_boundary",
    "get_largest_polygon",
    "simplify_boundary",
    "flatten_geometry",
    "carve_path",
]
