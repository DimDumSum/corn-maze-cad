"""
Geometry validation utilities for field boundaries.

Validates that imported geometries are suitable for corn maze generation.
"""

from typing import Dict, List
from shapely.geometry.base import BaseGeometry
from shapely.geometry import Polygon, MultiPolygon


def validate_boundary(geometry: BaseGeometry) -> Dict:
    """
    Validate a field boundary geometry for corn maze generation.

    Args:
        geometry: Shapely geometry (should be a Polygon or MultiPolygon)

    Returns:
        Dictionary with validation results:
        {
            "is_valid": bool,           # Overall validity
            "is_closed": bool,          # Is a closed polygon (not LineString)
            "area_m2": float,           # Area in square meters (0 if invalid)
            "errors": list[str],        # List of error messages
            "warnings": list[str]       # List of warning messages
        }

    Example:
        >>> from shapely.geometry import Polygon
        >>> poly = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
        >>> result = validate_boundary(poly)
        >>> result["is_valid"]
        True
        >>> result["area_m2"]
        10000.0
    """
    errors: List[str] = []
    warnings: List[str] = []
    is_closed = False
    area_m2 = 0.0

    # Check if geometry exists
    if geometry is None:
        errors.append("Geometry is None")
        return {
            "is_valid": False,
            "is_closed": False,
            "area_m2": 0.0,
            "errors": errors,
            "warnings": warnings
        }

    # Check geometry type
    if not isinstance(geometry, (Polygon, MultiPolygon)):
        errors.append(
            f"Geometry must be a Polygon or MultiPolygon, got {geometry.geom_type}"
        )
        # If it's a LineString that's closed, it could be converted
        if geometry.geom_type == "LineString" and geometry.is_closed:
            warnings.append("LineString detected - should be converted to Polygon")
        return {
            "is_valid": False,
            "is_closed": False,
            "area_m2": 0.0,
            "errors": errors,
            "warnings": warnings
        }

    is_closed = True

    # Check if geometry is valid (no self-intersections, etc.)
    if not geometry.is_valid:
        errors.append(f"Invalid geometry: {geometry.is_valid_reason}")

        # Try to get more specific error information
        if geometry.geom_type == "Polygon":
            if not geometry.exterior.is_simple:
                errors.append("Polygon exterior has self-intersections")

    # Check for empty geometry
    if geometry.is_empty:
        errors.append("Geometry is empty")
        return {
            "is_valid": False,
            "is_closed": is_closed,
            "area_m2": 0.0,
            "errors": errors,
            "warnings": warnings
        }

    # Calculate area
    try:
        area_m2 = geometry.area
    except Exception as e:
        errors.append(f"Failed to calculate area: {str(e)}")
        area_m2 = 0.0

    # Area validation
    MIN_AREA_M2 = 1000.0  # Minimum 1000 m² (about 0.25 acres)
    MAX_AREA_M2 = 10_000_000.0  # Maximum 10 km² (about 2470 acres)

    if area_m2 < MIN_AREA_M2:
        errors.append(
            f"Area too small: {area_m2:.1f} m² (minimum: {MIN_AREA_M2:.1f} m²)"
        )
    elif area_m2 > MAX_AREA_M2:
        warnings.append(
            f"Very large area: {area_m2:.1f} m² ({area_m2 / 4047:.1f} acres)"
        )

    # Check coordinate order (exterior should be counter-clockwise for valid polygons)
    if isinstance(geometry, Polygon):
        # In Shapely, exterior.is_ccw checks if exterior is counter-clockwise
        if hasattr(geometry.exterior, 'is_ccw'):
            if not geometry.exterior.is_ccw:
                warnings.append("Exterior ring is clockwise (should be counter-clockwise)")

    # Check for holes (interior rings)
    if isinstance(geometry, Polygon) and len(geometry.interiors) > 0:
        warnings.append(
            f"Polygon has {len(geometry.interiors)} interior ring(s) (holes). "
            "These will be treated as obstacles."
        )

    # Check for MultiPolygon
    if isinstance(geometry, MultiPolygon):
        warnings.append(
            f"MultiPolygon with {len(geometry.geoms)} parts detected. "
            "Only the largest polygon will be used."
        )

    # Overall validity
    is_valid = len(errors) == 0 and is_closed and area_m2 >= MIN_AREA_M2

    return {
        "is_valid": is_valid,
        "is_closed": is_closed,
        "area_m2": area_m2,
        "errors": errors,
        "warnings": warnings
    }


def get_largest_polygon(geometry: BaseGeometry) -> Polygon:
    """
    Extract the largest polygon from a geometry (handles MultiPolygon).

    Args:
        geometry: Shapely geometry (Polygon or MultiPolygon)

    Returns:
        Largest Polygon by area

    Raises:
        ValueError: If geometry is not a Polygon or MultiPolygon
    """
    if isinstance(geometry, Polygon):
        return geometry

    if isinstance(geometry, MultiPolygon):
        # Sort by area and return largest
        return max(geometry.geoms, key=lambda p: p.area)

    raise ValueError(f"Expected Polygon or MultiPolygon, got {geometry.geom_type}")


def simplify_boundary(
    geometry: BaseGeometry,
    tolerance: float = 1.0
) -> BaseGeometry:
    """
    Simplify a boundary geometry to reduce point count while preserving shape.

    Args:
        geometry: Input geometry (Polygon or MultiPolygon)
        tolerance: Simplification tolerance in geometry units (default: 1.0 meter for UTM)

    Returns:
        Simplified geometry

    Notes:
        Uses Douglas-Peucker algorithm. Tolerance is in the same units as the geometry
        (meters for UTM, degrees for WGS84).
    """
    # Use preserve_topology=True to prevent self-intersections
    simplified = geometry.simplify(tolerance, preserve_topology=True)

    # Ensure the simplified geometry is still valid
    if not simplified.is_valid:
        # If simplification broke validity, return original
        return geometry

    return simplified
