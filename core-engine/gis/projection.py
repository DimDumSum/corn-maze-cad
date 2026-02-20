"""
Coordinate system and projection utilities for GIS operations.

Handles UTM zone detection, CRS transformations, and coordinate projections.
"""

import math
from typing import Tuple
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform
import pyproj


def detect_utm_zone(lon: float) -> int:
    """
    Detect the UTM zone number from a longitude coordinate.

    Args:
        lon: Longitude in decimal degrees (-180 to 180)

    Returns:
        UTM zone number (1-60)

    Example:
        >>> detect_utm_zone(-93.5)  # Minnesota, USA
        15
        >>> detect_utm_zone(0.0)    # Prime meridian
        31
    """
    # UTM zones are 6 degrees wide, starting at -180°
    # Zone 1 is centered at -177° (covers -180° to -174°)
    # Formula: zone = floor((lon + 180) / 6) + 1
    zone = math.floor((lon + 180) / 6) + 1

    # Ensure zone is in valid range (1-60)
    return max(1, min(60, zone))


def get_utm_crs(zone: int, northern: bool = True) -> str:
    """
    Get the EPSG code for a UTM zone.

    Args:
        zone: UTM zone number (1-60)
        northern: True for northern hemisphere, False for southern

    Returns:
        EPSG code as string (e.g., "EPSG:32615" for UTM Zone 15N)

    Notes:
        - Northern hemisphere: EPSG:326XX (e.g., 32615 for Zone 15N)
        - Southern hemisphere: EPSG:327XX (e.g., 32715 for Zone 15S)
    """
    if not 1 <= zone <= 60:
        raise ValueError(f"Invalid UTM zone: {zone}. Must be between 1 and 60.")

    # EPSG codes for UTM zones:
    # Northern: 32601-32660 (zones 1-60)
    # Southern: 32701-32760 (zones 1-60)
    base = 32600 if northern else 32700
    epsg_code = base + zone

    return f"EPSG:{epsg_code}"


def get_centroid_coords(geometry: BaseGeometry) -> Tuple[float, float]:
    """
    Get the centroid coordinates of a geometry.

    Args:
        geometry: Shapely geometry object

    Returns:
        Tuple of (longitude, latitude) in decimal degrees

    Example:
        >>> from shapely.geometry import Polygon
        >>> poly = Polygon([(-93, 45), (-93, 46), (-92, 46), (-92, 45)])
        >>> get_centroid_coords(poly)
        (-92.5, 45.5)
    """
    centroid = geometry.centroid
    return (centroid.x, centroid.y)


def project_to_utm(
    geometry: BaseGeometry,
    source_crs: str = "EPSG:4326"
) -> Tuple[BaseGeometry, str]:
    """
    Project a geometry to the appropriate UTM zone based on its centroid.

    Args:
        geometry: Shapely geometry in source CRS (default: WGS84)
        source_crs: Source coordinate reference system (default: "EPSG:4326" for WGS84)

    Returns:
        Tuple of (projected_geometry, target_crs)

    Example:
        >>> from shapely.geometry import Point
        >>> point = Point(-93.5, 45.0)  # Minneapolis, Minnesota
        >>> projected, crs = project_to_utm(point)
        >>> crs
        'EPSG:32615'
    """
    # Get centroid in source CRS
    lon, lat = get_centroid_coords(geometry)

    # Detect appropriate UTM zone
    zone = detect_utm_zone(lon)
    northern = lat >= 0
    target_crs = get_utm_crs(zone, northern)

    # Create transformer
    transformer = pyproj.Transformer.from_crs(
        source_crs,
        target_crs,
        always_xy=True  # Ensure (lon, lat) order, not (lat, lon)
    )

    # Transform geometry
    projected_geom = transform(transformer.transform, geometry)

    return projected_geom, target_crs


def reproject_geometry(
    geometry: BaseGeometry,
    source_crs: str,
    target_crs: str
) -> BaseGeometry:
    """
    Reproject a geometry from one CRS to another.

    Args:
        geometry: Shapely geometry in source CRS
        source_crs: Source coordinate reference system (e.g., "EPSG:4326")
        target_crs: Target coordinate reference system (e.g., "EPSG:32615")

    Returns:
        Reprojected geometry

    Example:
        >>> from shapely.geometry import Point
        >>> point_wgs84 = Point(-93.5, 45.0)
        >>> point_utm = reproject_geometry(point_wgs84, "EPSG:4326", "EPSG:32615")
    """
    transformer = pyproj.Transformer.from_crs(
        source_crs,
        target_crs,
        always_xy=True
    )

    return transform(transformer.transform, geometry)
