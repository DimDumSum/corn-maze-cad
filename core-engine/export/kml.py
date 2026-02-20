"""
KML export functionality for MazeGPS compatibility.

Exports maze designs as KML files that MazeGPS can import:
- Outer boundary KML: Field perimeter as a single polygon
- Maze walls KML: Wall geometry as individual polygon Placemarks
"""

from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from xml.sax.saxutils import escape

import pyproj
from shapely.geometry import Polygon, MultiPolygon, MultiLineString, LineString
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform, unary_union

from .shapefile import get_downloads_folder


def _uncenter_geometry(geom: BaseGeometry, centroid_offset: Tuple[float, float]) -> BaseGeometry:
    """Add back the centroid offset to restore projected coordinates."""
    cx, cy = centroid_offset
    return transform(lambda x, y: (x + cx, y + cy), geom)


def _reproject_to_wgs84(geom: BaseGeometry, source_crs: str) -> BaseGeometry:
    """Reproject geometry from source CRS to WGS84 (EPSG:4326)."""
    transformer = pyproj.Transformer.from_crs(
        source_crs, "EPSG:4326", always_xy=True
    )
    return transform(transformer.transform, geom)


def _coords_to_kml_string(coords: List[Tuple[float, float]]) -> str:
    """Convert coordinate list to KML coordinate string (lon,lat,0)."""
    parts = []
    for lon, lat in coords:
        parts.append(f"{lon:.7f},{lat:.7f},0")
    return " ".join(parts)


def _polygon_to_kml_placemark(polygon: Polygon, name: str) -> str:
    """Convert a Shapely Polygon to a KML Placemark XML string."""
    exterior_coords = list(polygon.exterior.coords)
    coord_str = _coords_to_kml_string(exterior_coords)

    xml = f"""    <Placemark>
      <name>{escape(name)}</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              {coord_str}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>"""
    return xml


def _walls_to_polygons(walls: BaseGeometry, buffer_width: float = 1.0) -> List[Polygon]:
    """
    Convert wall line geometry to polygon geometry by buffering.

    Args:
        walls: Wall geometry (LineString, MultiLineString, or GeometryCollection)
        buffer_width: Half-width of wall polygon in meters

    Returns:
        List of Polygon geometries representing wall segments
    """
    polygons = []

    if walls is None or walls.is_empty:
        return polygons

    # Buffer the walls to create polygon strips
    buffered = walls.buffer(buffer_width, cap_style=2, join_style=2)

    if buffered.is_empty:
        return polygons

    if isinstance(buffered, Polygon):
        polygons.append(buffered)
    elif isinstance(buffered, MultiPolygon):
        polygons.extend(list(buffered.geoms))
    else:
        # GeometryCollection - extract polygons
        for geom in getattr(buffered, 'geoms', []):
            if isinstance(geom, Polygon):
                polygons.append(geom)
            elif isinstance(geom, MultiPolygon):
                polygons.extend(list(geom.geoms))

    return polygons


def export_boundary_kml(
    field: BaseGeometry,
    crs: str,
    centroid_offset: Tuple[float, float],
    base_name: str = "maze_outer",
    output_dir: Path = None,
) -> Dict:
    """
    Export the field boundary as a KML file with a single polygon Placemark.

    Args:
        field: Centered field boundary polygon
        crs: Projected CRS (e.g., "EPSG:32615")
        centroid_offset: (cx, cy) to un-center the geometry
        base_name: Output filename stem
        output_dir: Output directory (default: Downloads)

    Returns:
        {"success": True, "path": str}
    """
    if output_dir is None:
        output_dir = get_downloads_folder()

    output_path = output_dir / f"{base_name}.kml"
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"{base_name}_{timestamp}.kml"

    # Un-center and reproject to WGS84
    uncentered = _uncenter_geometry(field, centroid_offset)
    wgs84_field = _reproject_to_wgs84(uncentered, crs)

    # Build KML
    placemark = _polygon_to_kml_placemark(wgs84_field, "Outer Boundary")

    kml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>{escape(base_name)}</name>
{placemark}
  </Document>
</kml>
"""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(kml_content)

    return {"success": True, "path": str(output_path)}


def export_walls_kml(
    walls: BaseGeometry,
    crs: str,
    centroid_offset: Tuple[float, float],
    wall_buffer: float = 1.0,
    base_name: str = "maze_walls",
    output_dir: Path = None,
) -> Dict:
    """
    Export maze walls as a KML file with one Placemark per wall polygon.

    Args:
        walls: Centered wall geometry (lines)
        crs: Projected CRS (e.g., "EPSG:32615")
        centroid_offset: (cx, cy) to un-center the geometry
        wall_buffer: Buffer width (meters) to convert lines to polygons
        base_name: Output filename stem
        output_dir: Output directory (default: Downloads)

    Returns:
        {"success": True, "path": str, "wall_count": int}
    """
    if output_dir is None:
        output_dir = get_downloads_folder()

    output_path = output_dir / f"{base_name}.kml"
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"{base_name}_{timestamp}.kml"

    # Convert wall lines to polygons
    wall_polygons = _walls_to_polygons(walls, buffer_width=wall_buffer)

    # Un-center and reproject each polygon to WGS84
    placemarks = []
    for i, poly in enumerate(wall_polygons):
        uncentered = _uncenter_geometry(poly, centroid_offset)
        wgs84_poly = _reproject_to_wgs84(uncentered, crs)
        placemark = _polygon_to_kml_placemark(wgs84_poly, f"Wall {i + 1}")
        placemarks.append(placemark)

    placemarks_xml = "\n".join(placemarks)

    kml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>{escape(base_name)}</name>
{placemarks_xml}
  </Document>
</kml>
"""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(kml_content)

    return {
        "success": True,
        "path": str(output_path),
        "wall_count": len(wall_polygons),
    }
