"""
KML export functionality for MazeGPS compatibility.

Exports maze designs as a single, comprehensive KML file containing:
- Outer boundary polygon (styled)
- Maze wall polygons (styled, buffered from line geometry)
- Headland wall polygons (styled, separate folder)
- Carved area polygons (cutting guide for field operators)
- Entrance/exit/emergency-exit point placemarks (styled icons)
- Solution path linestring (styled, optional)

All features are organized in <Folder> elements with KML styles
for visual differentiation in Google Earth, MazeGPS, and other viewers.
"""

from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from xml.sax.saxutils import escape

import pyproj
from shapely.geometry import Polygon, MultiPolygon, MultiLineString, LineString, Point
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform, unary_union

from .shapefile import get_downloads_folder


# ---------------------------------------------------------------------------
# Coordinate helpers
# ---------------------------------------------------------------------------

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


def _reproject_point_to_wgs84(
    x: float, y: float,
    centroid_offset: Tuple[float, float],
    source_crs: str,
) -> Tuple[float, float]:
    """Reproject a single centered point to WGS84 (lon, lat)."""
    cx, cy = centroid_offset
    transformer = pyproj.Transformer.from_crs(
        source_crs, "EPSG:4326", always_xy=True
    )
    lon, lat = transformer.transform(x + cx, y + cy)
    return lon, lat


def _coords_to_kml_string(coords: List[Tuple[float, float]]) -> str:
    """Convert coordinate list to KML coordinate string (lon,lat,0)."""
    parts = []
    for lon, lat in coords:
        parts.append(f"{lon:.7f},{lat:.7f},0")
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Geometry → KML fragment helpers
# ---------------------------------------------------------------------------

def _polygon_to_kml_placemark(
    polygon: Polygon,
    name: str,
    style_url: str = "",
    description: str = "",
) -> str:
    """Convert a Shapely Polygon to a KML Placemark XML string.

    Supports exterior ring and interior rings (holes / donuts).
    """
    exterior_coords = list(polygon.exterior.coords)
    coord_str = _coords_to_kml_string(exterior_coords)

    interior_xml = ""
    for interior in polygon.interiors:
        inner_coords = list(interior.coords)
        inner_coord_str = _coords_to_kml_string(inner_coords)
        interior_xml += f"""
        <innerBoundaryIs>
          <LinearRing>
            <coordinates>{inner_coord_str}</coordinates>
          </LinearRing>
        </innerBoundaryIs>"""

    style_ref = f"\n      <styleUrl>{escape(style_url)}</styleUrl>" if style_url else ""
    desc_xml = f"\n      <description>{escape(description)}</description>" if description else ""

    xml = f"""      <Placemark>
        <name>{escape(name)}</name>{style_ref}{desc_xml}
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>{coord_str}</coordinates>
            </LinearRing>
          </outerBoundaryIs>{interior_xml}
        </Polygon>
      </Placemark>"""
    return xml


def _point_to_kml_placemark(
    lon: float, lat: float,
    name: str,
    style_url: str = "",
    description: str = "",
) -> str:
    """Create a KML Placemark for a point location."""
    style_ref = f"\n      <styleUrl>{escape(style_url)}</styleUrl>" if style_url else ""
    desc_xml = f"\n      <description>{escape(description)}</description>" if description else ""

    return f"""      <Placemark>
        <name>{escape(name)}</name>{style_ref}{desc_xml}
        <Point>
          <coordinates>{lon:.7f},{lat:.7f},0</coordinates>
        </Point>
      </Placemark>"""


def _linestring_to_kml_placemark(
    coords: List[Tuple[float, float]],
    name: str,
    style_url: str = "",
    description: str = "",
) -> str:
    """Create a KML Placemark for a LineString."""
    coord_str = _coords_to_kml_string(coords)
    style_ref = f"\n      <styleUrl>{escape(style_url)}</styleUrl>" if style_url else ""
    desc_xml = f"\n      <description>{escape(description)}</description>" if description else ""

    return f"""      <Placemark>
        <name>{escape(name)}</name>{style_ref}{desc_xml}
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>{coord_str}</coordinates>
        </LineString>
      </Placemark>"""


# ---------------------------------------------------------------------------
# Geometry conversion
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# KML style definitions
# ---------------------------------------------------------------------------

def _build_styles() -> str:
    """Return a block of <Style> elements for the KML document."""
    return """    <Style id="boundary">
      <LineStyle><color>ff3c783c</color><width>3</width></LineStyle>
      <PolyStyle><color>4000ff00</color></PolyStyle>
    </Style>
    <Style id="wall">
      <LineStyle><color>ff1e641e</color><width>1</width></LineStyle>
      <PolyStyle><color>cc1e641e</color></PolyStyle>
    </Style>
    <Style id="headland">
      <LineStyle><color>ff2d7a2d</color><width>1</width></LineStyle>
      <PolyStyle><color>992d7a2d</color></PolyStyle>
    </Style>
    <Style id="entrance">
      <IconStyle>
        <color>ff00b432</color>
        <scale>1.2</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><color>ff00b432</color><scale>1.0</scale></LabelStyle>
    </Style>
    <Style id="exit">
      <IconStyle>
        <color>ff3232dc</color>
        <scale>1.2</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><color>ff3232dc</color><scale>1.0</scale></LabelStyle>
    </Style>
    <Style id="emergency_exit">
      <IconStyle>
        <color>ff00a5ff</color>
        <scale>1.0</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/ylw-diamond.png</href></Icon>
      </IconStyle>
      <LabelStyle><color>ff00a5ff</color><scale>0.9</scale></LabelStyle>
    </Style>
    <Style id="carved">
      <LineStyle><color>ff134a8b</color><width>2</width></LineStyle>
      <PolyStyle><color>88134a8b</color></PolyStyle>
    </Style>
    <Style id="solution">
      <LineStyle><color>ff3232dc</color><width>4</width></LineStyle>
    </Style>"""


# ---------------------------------------------------------------------------
# Folder builders (one per feature category)
# ---------------------------------------------------------------------------

def _build_boundary_folder(
    field: BaseGeometry,
    crs: str,
    offset: Tuple[float, float],
) -> str:
    """Build the Boundary folder containing the outer-field polygon."""
    uncentered = _uncenter_geometry(field, offset)
    wgs84 = _reproject_to_wgs84(uncentered, crs)

    placemark = _polygon_to_kml_placemark(
        wgs84, "Outer Boundary", style_url="#boundary",
    )

    return f"""    <Folder>
      <name>Boundary</name>
      <open>1</open>
{placemark}
    </Folder>"""


def _build_walls_folder(
    walls: BaseGeometry,
    crs: str,
    offset: Tuple[float, float],
    wall_buffer: float,
) -> Tuple[str, int]:
    """Build the Walls folder. Returns (xml, wall_count)."""
    wall_polygons = _walls_to_polygons(walls, buffer_width=wall_buffer)

    placemarks = []
    for i, poly in enumerate(wall_polygons):
        uncentered = _uncenter_geometry(poly, offset)
        wgs84_poly = _reproject_to_wgs84(uncentered, crs)
        placemarks.append(
            _polygon_to_kml_placemark(wgs84_poly, f"Wall {i + 1}", style_url="#wall")
        )

    placemarks_xml = "\n".join(placemarks)

    folder = f"""    <Folder>
      <name>Maze Walls</name>
      <open>0</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(wall_polygons)


def _build_headland_folder(
    headland_walls: BaseGeometry,
    crs: str,
    offset: Tuple[float, float],
    wall_buffer: float,
) -> Tuple[str, int]:
    """Build the Headland Walls folder. Returns (xml, count)."""
    polygons = _walls_to_polygons(headland_walls, buffer_width=wall_buffer)

    placemarks = []
    for i, poly in enumerate(polygons):
        uncentered = _uncenter_geometry(poly, offset)
        wgs84_poly = _reproject_to_wgs84(uncentered, crs)
        placemarks.append(
            _polygon_to_kml_placemark(wgs84_poly, f"Headland {i + 1}", style_url="#headland")
        )

    placemarks_xml = "\n".join(placemarks)

    folder = f"""    <Folder>
      <name>Headland Walls</name>
      <open>0</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(polygons)


def _build_entrances_exits_folder(
    entrances: List[Tuple[float, float]],
    exits: List[Tuple[float, float]],
    emergency_exits: List[Tuple[float, float]],
    crs: str,
    offset: Tuple[float, float],
) -> Tuple[str, int]:
    """Build the Entrances & Exits folder. Returns (xml, point_count)."""
    placemarks = []

    for i, (x, y) in enumerate(entrances or []):
        lon, lat = _reproject_point_to_wgs84(x, y, offset, crs)
        placemarks.append(
            _point_to_kml_placemark(lon, lat, f"Entrance {i + 1}", style_url="#entrance")
        )

    for i, (x, y) in enumerate(exits or []):
        lon, lat = _reproject_point_to_wgs84(x, y, offset, crs)
        placemarks.append(
            _point_to_kml_placemark(lon, lat, f"Exit {i + 1}", style_url="#exit")
        )

    for i, (x, y) in enumerate(emergency_exits or []):
        lon, lat = _reproject_point_to_wgs84(x, y, offset, crs)
        placemarks.append(
            _point_to_kml_placemark(
                lon, lat, f"Emergency Exit {i + 1}", style_url="#emergency_exit",
            )
        )

    if not placemarks:
        return "", 0

    placemarks_xml = "\n".join(placemarks)

    folder = f"""    <Folder>
      <name>Entrances &amp; Exits</name>
      <open>1</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(placemarks)


def _build_carved_areas_folder(
    carved_areas: BaseGeometry,
    crs: str,
    offset: Tuple[float, float],
) -> Tuple[str, int]:
    """Build the Carved Areas folder (cutting guide polygons). Returns (xml, count)."""
    polygons: List[Polygon] = []

    if isinstance(carved_areas, Polygon):
        polygons.append(carved_areas)
    elif isinstance(carved_areas, MultiPolygon):
        polygons.extend(list(carved_areas.geoms))
    else:
        # GeometryCollection — extract polygons
        for geom in getattr(carved_areas, 'geoms', []):
            if isinstance(geom, Polygon):
                polygons.append(geom)
            elif isinstance(geom, MultiPolygon):
                polygons.extend(list(geom.geoms))

    placemarks = []
    for i, poly in enumerate(polygons):
        uncentered = _uncenter_geometry(poly, offset)
        wgs84_poly = _reproject_to_wgs84(uncentered, crs)
        placemarks.append(
            _polygon_to_kml_placemark(
                wgs84_poly, f"Cut Area {i + 1}", style_url="#carved",
            )
        )

    placemarks_xml = "\n".join(placemarks)

    folder = f"""    <Folder>
      <name>Carved Areas (Cutting Guide)</name>
      <open>1</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(polygons)


def _build_solution_folder(
    solution_path: List[Tuple[float, float]],
    crs: str,
    offset: Tuple[float, float],
) -> str:
    """Build the Solution Path folder."""
    # Reproject every waypoint
    wgs84_coords = []
    for x, y in solution_path:
        lon, lat = _reproject_point_to_wgs84(x, y, offset, crs)
        wgs84_coords.append((lon, lat))

    placemark = _linestring_to_kml_placemark(
        wgs84_coords, "Solution Path",
        style_url="#solution",
        description="Shortest path from entrance to exit",
    )

    return f"""    <Folder>
      <name>Solution Path</name>
      <open>0</open>
      <visibility>0</visibility>
{placemark}
    </Folder>"""


# ---------------------------------------------------------------------------
# Public API: unified single-file export
# ---------------------------------------------------------------------------

def export_maze_kml(
    field: BaseGeometry,
    crs: str,
    centroid_offset: Tuple[float, float],
    walls: Optional[BaseGeometry] = None,
    headland_walls: Optional[BaseGeometry] = None,
    entrances: Optional[List[Tuple[float, float]]] = None,
    exits: Optional[List[Tuple[float, float]]] = None,
    emergency_exits: Optional[List[Tuple[float, float]]] = None,
    solution_path: Optional[List[Tuple[float, float]]] = None,
    carved_areas: Optional[BaseGeometry] = None,
    wall_buffer: float = 1.0,
    base_name: str = "maze",
    output_dir: Path = None,
) -> Dict:
    """
    Export the complete maze design as a single KML file.

    All available features are placed in organized <Folder> elements with
    KML <Style> definitions for visual differentiation.

    Args:
        field: Centered field boundary polygon
        crs: Projected CRS (e.g., "EPSG:32615")
        centroid_offset: (cx, cy) to un-center the geometry
        walls: Centered maze wall geometry (lines)
        headland_walls: Centered headland wall geometry
        entrances: Entrance coordinates (centered)
        exits: Exit coordinates (centered)
        emergency_exits: Emergency exit coordinates (centered)
        solution_path: Solution path waypoints (centered)
        carved_areas: Carved area geometry (cutting guide polygons)
        wall_buffer: Buffer width (meters) to convert lines to polygons
        base_name: Output filename stem
        output_dir: Output directory (default: Downloads)

    Returns:
        {
            "success": True,
            "path": str,
            "wall_count": int,
            "headland_count": int,
            "carved_area_count": int,
            "point_count": int,
            "has_solution": bool,
        }
    """
    if output_dir is None:
        output_dir = get_downloads_folder()

    output_path = output_dir / f"{base_name}.kml"
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"{base_name}_{timestamp}.kml"

    # Collect folders
    folders: List[str] = []

    # 1 — Boundary (always present)
    folders.append(_build_boundary_folder(field, crs, centroid_offset))

    # 2 — Maze walls
    wall_count = 0
    if walls and not walls.is_empty:
        walls_xml, wall_count = _build_walls_folder(walls, crs, centroid_offset, wall_buffer)
        folders.append(walls_xml)

    # 3 — Headland walls
    headland_count = 0
    if headland_walls and not headland_walls.is_empty:
        headland_xml, headland_count = _build_headland_folder(
            headland_walls, crs, centroid_offset, wall_buffer,
        )
        folders.append(headland_xml)

    # 4 — Carved areas (cutting guide)
    carved_area_count = 0
    if carved_areas and not carved_areas.is_empty:
        carved_xml, carved_area_count = _build_carved_areas_folder(
            carved_areas, crs, centroid_offset,
        )
        folders.append(carved_xml)

    # 5 — Entrances, exits, emergency exits
    point_count = 0
    any_points = (entrances or exits or emergency_exits)
    if any_points:
        points_xml, point_count = _build_entrances_exits_folder(
            entrances, exits, emergency_exits, crs, centroid_offset,
        )
        if points_xml:
            folders.append(points_xml)

    # 6 — Solution path
    has_solution = False
    if solution_path and len(solution_path) >= 2:
        folders.append(_build_solution_folder(solution_path, crs, centroid_offset))
        has_solution = True

    # Assemble document
    styles = _build_styles()
    folders_xml = "\n".join(folders)

    kml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>{escape(base_name)}</name>
    <description>Corn maze design exported by CornMazeCAD</description>
{styles}
{folders_xml}
  </Document>
</kml>
"""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(kml_content)

    return {
        "success": True,
        "path": str(output_path),
        "wall_count": wall_count,
        "headland_count": headland_count,
        "carved_area_count": carved_area_count,
        "point_count": point_count,
        "has_solution": has_solution,
    }


# ---------------------------------------------------------------------------
# Legacy two-file helpers (kept for backwards compatibility)
# ---------------------------------------------------------------------------

def export_boundary_kml(
    field: BaseGeometry,
    crs: str,
    centroid_offset: Tuple[float, float],
    base_name: str = "maze_outer",
    output_dir: Path = None,
) -> Dict:
    """Export the field boundary as a standalone KML file (legacy)."""
    if output_dir is None:
        output_dir = get_downloads_folder()

    output_path = output_dir / f"{base_name}.kml"
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"{base_name}_{timestamp}.kml"

    uncentered = _uncenter_geometry(field, centroid_offset)
    wgs84_field = _reproject_to_wgs84(uncentered, crs)

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
    """Export maze walls as a standalone KML file (legacy)."""
    if output_dir is None:
        output_dir = get_downloads_folder()

    output_path = output_dir / f"{base_name}.kml"
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"{base_name}_{timestamp}.kml"

    wall_polygons = _walls_to_polygons(walls, buffer_width=wall_buffer)

    placemarks = []
    for i, poly in enumerate(wall_polygons):
        uncentered = _uncenter_geometry(poly, offset=centroid_offset)
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
