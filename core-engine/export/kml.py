"""
KML/KMZ export functionality for MazeGPS compatibility.

Exports maze designs as a single KMZ file (ZIP containing doc.kml +
files/template.png) with the following layers:
- Outer boundary polygon (styled)
- Maze wall polygons (styled, buffered from line geometry)
- Cutting path centerlines (unbuffered LineStrings for GPS guidance)
- Headland wall polygons (styled, separate folder)
- Carved area polygons (cutting guide for field operators)
- Entrance/exit/emergency-exit point placemarks (styled icons)
- Solution path linestring (styled, optional)
- Design overlay image (GroundOverlay with georeferenced PNG)

All features are organized in <Folder> elements with KML styles
for visual differentiation in Google Earth, MazeGPS, and other viewers.
"""

import io
import zipfile
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from xml.sax.saxutils import escape

import pyproj
from PIL import Image, ImageDraw
from shapely.geometry import Polygon, MultiPolygon, MultiLineString, LineString, Point
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform, unary_union

from .shapefile import get_downloads_folder
from geometry.operations import smooth_buffer, densify_curves, extract_path_edge_lines


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
    extended_data: Optional[Dict] = None,
) -> str:
    """Convert a Shapely Polygon to a KML Placemark XML string.

    Supports exterior ring, interior rings (holes / donuts), and optional
    <ExtendedData> key/value pairs.
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

    ext_xml = ""
    if extended_data:
        data_items = "\n".join(
            f'        <Data name="{escape(k)}"><value>{escape(str(v))}</value></Data>'
            for k, v in extended_data.items()
        )
        ext_xml = f"\n      <ExtendedData>\n{data_items}\n      </ExtendedData>"

    xml = f"""      <Placemark>
        <name>{escape(name)}</name>{style_ref}{desc_xml}{ext_xml}
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
    point_type: str = "",
) -> str:
    """Create a KML Placemark for a point location."""
    style_ref = f"\n      <styleUrl>{escape(style_url)}</styleUrl>" if style_url else ""
    desc_xml = f"\n      <description>{escape(description)}</description>" if description else ""
    ext_data = ""
    if point_type:
        ext_data = (
            f"\n      <ExtendedData>"
            f'<Data name="type"><value>{escape(point_type)}</value></Data>'
            f"</ExtendedData>"
        )

    return f"""      <Placemark>
        <name>{escape(name)}</name>{style_ref}{desc_xml}{ext_data}
        <Point>
          <coordinates>{lon:.7f},{lat:.7f},0</coordinates>
        </Point>
      </Placemark>"""


def _linestring_to_kml_placemark(
    coords: List[Tuple[float, float]],
    name: str,
    style_url: str = "",
    description: str = "",
    extended_data: Optional[Dict] = None,
) -> str:
    """Create a KML Placemark for a LineString.

    Args:
        extended_data: Optional dict of {name: value} pairs written as
                       KML <ExtendedData><Data> elements (values coerced to str).
    """
    coord_str = _coords_to_kml_string(coords)
    style_ref = f"\n      <styleUrl>{escape(style_url)}</styleUrl>" if style_url else ""
    desc_xml = f"\n      <description>{escape(description)}</description>" if description else ""

    ext_xml = ""
    if extended_data:
        data_items = "\n".join(
            f'        <Data name="{escape(k)}"><value>{escape(str(v))}</value></Data>'
            for k, v in extended_data.items()
        )
        ext_xml = f"\n      <ExtendedData>\n{data_items}\n      </ExtendedData>"

    return f"""      <Placemark>
        <name>{escape(name)}</name>{style_ref}{desc_xml}{ext_xml}
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

    # Buffer the walls to create polygon strips (high vertex density on arc sections)
    buffered = smooth_buffer(walls, buffer_width, cap_style="flat", join_style="mitre")

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


def _walls_to_linestrings(walls: BaseGeometry) -> List[LineString]:
    """
    Extract individual LineString geometries from wall geometry.

    Args:
        walls: Wall geometry (LineString, MultiLineString, or GeometryCollection)

    Returns:
        List of LineString geometries representing wall centerlines
    """
    lines: List[LineString] = []

    if walls is None or walls.is_empty:
        return lines

    if isinstance(walls, LineString):
        lines.append(walls)
    elif isinstance(walls, MultiLineString):
        lines.extend(list(walls.geoms))
    else:
        # GeometryCollection - extract linestrings
        for geom in getattr(walls, 'geoms', []):
            if isinstance(geom, LineString):
                lines.append(geom)
            elif isinstance(geom, MultiLineString):
                lines.extend(list(geom.geoms))

    return lines


# ---------------------------------------------------------------------------
# Design image rendering (for GroundOverlay / KMZ)
# ---------------------------------------------------------------------------

def _draw_geometry_lines(
    draw: ImageDraw.Draw,
    geom: BaseGeometry,
    world_to_pixel,
    fill=(34, 85, 34),
    width: int = 2,
) -> None:
    """Recursively draw line geometry onto a PIL ImageDraw."""
    if geom is None or geom.is_empty:
        return
    if geom.geom_type == 'LineString':
        pixels = [world_to_pixel(x, y) for x, y in geom.coords]
        if len(pixels) >= 2:
            draw.line(pixels, fill=fill, width=width)
    elif geom.geom_type in ('MultiLineString', 'GeometryCollection'):
        for part in geom.geoms:
            _draw_geometry_lines(draw, part, world_to_pixel, fill=fill, width=width)


def _render_design_png(
    field: BaseGeometry,
    walls: Optional[BaseGeometry],
    resolution_m_per_px: float = 0.10,
) -> bytes:
    """Render the maze design as a PNG image (in centered coordinates).

    White = paths to cut, dark green = standing corn.

    The image is sized at *resolution_m_per_px* (default 10 cm/px) and never
    coarser than 15 cm/px so the KMZ GroundOverlay stays crisp when operators
    zoom in during cutting.  Wall line thickness scales with resolution to
    maintain consistent visual corn-row width.

    Returns:
        Raw PNG bytes, or ``b""`` on invalid geometry.
    """
    from export.png import compute_png_dimensions

    minx, miny, maxx, maxy = field.bounds
    field_w = maxx - minx
    field_h = maxy - miny

    if field_w <= 0 or field_h <= 0:
        return b""

    width_px, height_px, _ = compute_png_dimensions(field_w, field_h, resolution_m_per_px)

    px_per_m_x = width_px / field_w
    px_per_m_y = height_px / field_h

    def world_to_pixel(x: float, y: float) -> Tuple[int, int]:
        px = int((x - minx) * px_per_m_x)
        py = int((maxy - y) * px_per_m_y)
        return (px, py)

    # Wall line width: ~0.75 m ground width converted to pixels
    wall_line_px = max(2, int(round(px_per_m_x * 0.75)))

    img = Image.new('RGBA', (width_px, height_px), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Fill field area with white (paths = cut corn)
    field_pixels = [world_to_pixel(x, y) for x, y in field.exterior.coords]
    draw.polygon(field_pixels, fill=(255, 255, 255, 255))

    # Draw wall lines as green (standing corn) on top
    if walls is not None and not walls.is_empty:
        _draw_geometry_lines(draw, walls, world_to_pixel, fill=(34, 85, 34, 255), width=wall_line_px)

    # Draw field outline
    draw.polygon(field_pixels, outline=(0, 0, 0, 255), fill=None)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _build_ground_overlay(
    north: float, south: float, east: float, west: float,
) -> str:
    """Build a GroundOverlay element referencing files/template.png."""
    return f"""    <Folder>
      <name>DesignOverlay</name>
      <open>0</open>
      <GroundOverlay>
        <name>Maze Template</name>
        <Icon><href>files/template.png</href></Icon>
        <LatLonBox>
          <north>{north:.7f}</north>
          <south>{south:.7f}</south>
          <east>{east:.7f}</east>
          <west>{west:.7f}</west>
        </LatLonBox>
      </GroundOverlay>
    </Folder>"""


# ---------------------------------------------------------------------------
# KML style definitions
# ---------------------------------------------------------------------------

def _build_styles() -> str:
    """Return a block of <Style> elements for the KML document."""
    return """    <Style id="boundary">
      <LineStyle><color>ff3c783c</color><width>3</width></LineStyle>
      <PolyStyle><color>1a00ff00</color></PolyStyle>
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
    <Style id="centerline">
      <LineStyle><color>ff00bfff</color><width>2</width></LineStyle>
    </Style>
    <Style id="solution">
      <LineStyle><color>ff3232dc</color><width>4</width></LineStyle>
    </Style>
    <Style id="path_edge">
      <LineStyle><color>ff00ffff</color><width>2</width></LineStyle>
    </Style>
    <Style id="design_area">
      <LineStyle><color>ff0066ff</color><width>2</width></LineStyle>
      <PolyStyle><color>6600aaff</color></PolyStyle>
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
    uncentered = _uncenter_geometry(densify_curves(field), offset)
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
        uncentered = _uncenter_geometry(densify_curves(poly), offset)
        wgs84_poly = _reproject_to_wgs84(uncentered, crs)
        placemarks.append(
            _polygon_to_kml_placemark(wgs84_poly, f"Wall {i + 1}", style_url="#wall")
        )

    placemarks_xml = "\n".join(placemarks)

    folder = f"""    <Folder>
      <name>Walls</name>
      <open>0</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(wall_polygons)


def _build_centerlines_folder(
    crs: str,
    offset: Tuple[float, float],
    carved_paths: Optional[List[Dict]] = None,
    default_path_width: Optional[float] = None,
) -> Tuple[str, int]:
    """Build the Centerlines folder.

    Contains only the carved-path GPS guidance lines.  Corn-row wall
    centerlines are deliberately excluded — they are a visual design aid
    and have no meaning to the GPS operator.

    Each entry carries its individual ``path_width`` in <ExtendedData>.

    Returns (xml, count).
    """
    from shapely.geometry import LineString as _LS

    placemarks = []

    for j, cp in enumerate(carved_paths or []):
        pts = cp.get("points", [])
        width = cp.get("width")
        if len(pts) < 2:
            continue
        line = _LS([(p[0], p[1]) for p in pts])
        line = densify_curves(line)
        uncentered = _uncenter_geometry(line, offset)
        wgs84_line = _reproject_to_wgs84(uncentered, crs)
        pw = width if width is not None else default_path_width
        ext = {"path_width": round(float(pw), 4)} if pw is not None else None
        placemarks.append(
            _linestring_to_kml_placemark(
                list(wgs84_line.coords),
                f"Cut Path {j + 1}",
                style_url="#centerline",
                extended_data=ext,
            )
        )

    placemarks_xml = "\n".join(placemarks)

    folder = f"""    <Folder>
      <name>Centerlines</name>
      <open>0</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(placemarks)


def _build_cut_path_polygons_folder(
    carved_paths: List[Dict],
    crs: str,
    offset: Tuple[float, float],
) -> Tuple[str, int]:
    """Build the CutPathPolygons folder.

    Each carved path centerline is re-buffered at its recorded width to
    produce the exact closed polygon that was cut through the corn.  This
    gives GPS rendering apps smooth vector-filled shapes without depending
    on a raster template.

    Returns (xml, polygon_count).
    """
    from shapely.geometry import MultiPolygon as _MP

    placemarks = []
    polygon_index = 1

    for cp in carved_paths:
        pts = cp.get("points", [])
        width = cp.get("width")
        if len(pts) < 2 or not width:
            continue

        line = LineString([(p[0], p[1]) for p in pts])
        poly = smooth_buffer(line, float(width) / 2.0, cap_style=1)
        if poly is None or poly.is_empty:
            continue

        ext = {"path_width": round(float(width), 4), "type": "cut_path_polygon"}

        # Handle MultiPolygon (rare but possible for very curved/self-crossing paths)
        sub_polys = list(poly.geoms) if isinstance(poly, _MP) else [poly]

        for sub in sub_polys:
            if sub.is_empty:
                continue
            dense = densify_curves(sub)
            uncentered = _uncenter_geometry(dense, offset)
            wgs84_poly = _reproject_to_wgs84(uncentered, crs)
            placemarks.append(
                _polygon_to_kml_placemark(
                    wgs84_poly,
                    f"Cut Path Polygon {polygon_index}",
                    style_url="#carved",
                    extended_data=ext,
                )
            )
            polygon_index += 1

    placemarks_xml = "\n".join(placemarks)

    folder = f"""    <Folder>
      <name>CutPathPolygons</name>
      <open>0</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(placemarks)


def _build_headland_folder(
    headland_walls: BaseGeometry,
    crs: str,
    offset: Tuple[float, float],
    wall_buffer: float,
) -> Tuple[str, int]:
    """Build the Headland folder. Returns (xml, count)."""
    polygons = _walls_to_polygons(headland_walls, buffer_width=wall_buffer)

    placemarks = []
    for i, poly in enumerate(polygons):
        uncentered = _uncenter_geometry(densify_curves(poly), offset)
        wgs84_poly = _reproject_to_wgs84(uncentered, crs)
        placemarks.append(
            _polygon_to_kml_placemark(wgs84_poly, f"Headland {i + 1}", style_url="#headland")
        )

    placemarks_xml = "\n".join(placemarks)

    folder = f"""    <Folder>
      <name>Headland</name>
      <open>0</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(polygons)


def _build_entrances_folder(
    entrances: List[Tuple[float, float]],
    crs: str,
    offset: Tuple[float, float],
) -> Tuple[str, int]:
    """Build the Entrances folder. Returns (xml, count)."""
    placemarks = []
    for i, (x, y) in enumerate(entrances or []):
        lon, lat = _reproject_point_to_wgs84(x, y, offset, crs)
        placemarks.append(
            _point_to_kml_placemark(
                lon, lat, f"Entrance {i + 1}",
                style_url="#entrance", point_type="entrance",
            )
        )

    if not placemarks:
        return "", 0

    placemarks_xml = "\n".join(placemarks)
    folder = f"""    <Folder>
      <name>Entrances</name>
      <open>1</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(placemarks)


def _build_exits_folder(
    exits: List[Tuple[float, float]],
    crs: str,
    offset: Tuple[float, float],
) -> Tuple[str, int]:
    """Build the Exits folder. Returns (xml, count)."""
    placemarks = []
    for i, (x, y) in enumerate(exits or []):
        lon, lat = _reproject_point_to_wgs84(x, y, offset, crs)
        placemarks.append(
            _point_to_kml_placemark(
                lon, lat, f"Exit {i + 1}",
                style_url="#exit", point_type="exit",
            )
        )

    if not placemarks:
        return "", 0

    placemarks_xml = "\n".join(placemarks)
    folder = f"""    <Folder>
      <name>Exits</name>
      <open>1</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(placemarks)


def _build_emergency_exits_folder(
    emergency_exits: List[Tuple[float, float]],
    crs: str,
    offset: Tuple[float, float],
) -> Tuple[str, int]:
    """Build the EmergencyExits folder. Returns (xml, count)."""
    placemarks = []
    for i, (x, y) in enumerate(emergency_exits or []):
        lon, lat = _reproject_point_to_wgs84(x, y, offset, crs)
        placemarks.append(
            _point_to_kml_placemark(
                lon, lat, f"Emergency Exit {i + 1}",
                style_url="#emergency_exit", point_type="emergency_exit",
            )
        )

    if not placemarks:
        return "", 0

    placemarks_xml = "\n".join(placemarks)
    folder = f"""    <Folder>
      <name>EmergencyExits</name>
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
        uncentered = _uncenter_geometry(densify_curves(poly), offset)
        wgs84_poly = _reproject_to_wgs84(uncentered, crs)
        placemarks.append(
            _polygon_to_kml_placemark(
                wgs84_poly, f"Cut Area {i + 1}", style_url="#carved",
            )
        )

    placemarks_xml = "\n".join(placemarks)

    folder = f"""    <Folder>
      <name>CarvedAreas</name>
      <open>1</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(polygons)


def _build_design_areas_folder(
    carved_polygons: List[Dict],
    crs: str,
    offset: Tuple[float, float],
) -> Tuple[str, int]:
    """Build the DesignCutAreas folder.

    Emits one KML Polygon placemark per individual carved design element
    (text letter, clipart shape, etc.).  Unlike CarvedAreas (which merges
    everything into one blob), each entry here is a separate polygon so
    MazeGPS and other viewers can display individual letter shapes as
    distinct GPS guidance areas — complete with interior rings for letters
    like O, D, B, P, Q, and R that have enclosed counters.

    Returns (xml, polygon_count).
    """
    import shapely.wkt as _wkt

    placemarks = []

    for i, cp in enumerate(carved_polygons):
        wkt_str = cp.get('wkt', '')
        elem_type = cp.get('type', 'design')
        if not wkt_str:
            continue
        try:
            geom = _wkt.loads(wkt_str)
        except Exception:
            continue
        if geom is None or geom.is_empty:
            continue

        sub_polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
        for sub in sub_polys:
            if sub.is_empty or not isinstance(sub, Polygon):
                continue
            dense = densify_curves(sub)
            uncentered = _uncenter_geometry(dense, offset)
            wgs84_poly = _reproject_to_wgs84(uncentered, crs)
            placemarks.append(
                _polygon_to_kml_placemark(
                    wgs84_poly,
                    f"Design Cut Area {i + 1}",
                    style_url="#design_area",
                    extended_data={"element_type": elem_type},
                )
            )

    placemarks_xml = "\n".join(placemarks)
    folder = f"""    <Folder>
      <name>DesignCutAreas</name>
      <open>1</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(placemarks)


def _build_path_edges_folder(
    carved_areas: BaseGeometry,
    crs: str,
    offset: Tuple[float, float],
    carved_polygons: Optional[List[Dict]] = None,
) -> Tuple[str, int]:
    """Build the PathEdges folder (perimeter edges of carved paths). Returns (xml, count).

    When individual carved_polygons are available (from text / clipart carving)
    each polygon's exterior ring AND its interior rings (letter counters like the
    hole in O, D, B, etc.) are exported as separate LineString placemarks.  This
    gives MazeGPS a clean edge line on BOTH sides of every letter stroke.

    Falls back to the exterior ring of the merged carved_areas when no individual
    polygon data is present (e.g. projects saved before this feature was added).
    Styled bright yellow-cyan for GPS visibility.
    """
    import shapely.wkt as _wkt

    edge_lines: List[LineString] = []

    if carved_polygons:
        # Per-element rings give clean, per-letter edges on both sides.
        for cp in carved_polygons:
            wkt_str = cp.get('wkt', '')
            if not wkt_str:
                continue
            try:
                geom = _wkt.loads(wkt_str)
            except Exception:
                continue
            if geom is None or geom.is_empty:
                continue
            sub_polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
            for sub in sub_polys:
                if sub.is_empty or not isinstance(sub, Polygon):
                    continue
                # Outer edge of the letter stroke
                edge_lines.append(densify_curves(LineString(list(sub.exterior.coords))))
                # Inner edge(s) — the counter inside letters like O, D, B, P, Q, R
                for interior in sub.interiors:
                    edge_lines.append(densify_curves(LineString(list(interior.coords))))
    else:
        edge_lines = extract_path_edge_lines(carved_areas)

    placemarks = []
    for i, line in enumerate(edge_lines):
        uncentered = _uncenter_geometry(line, offset)
        wgs84_line = _reproject_to_wgs84(uncentered, crs)
        coords = list(wgs84_line.coords)
        placemarks.append(
            _linestring_to_kml_placemark(
                coords, f"Path Edge {i + 1}", style_url="#path_edge",
            )
        )

    placemarks_xml = "\n".join(placemarks)
    folder = f"""    <Folder>
      <name>PathEdges</name>
      <open>1</open>
{placemarks_xml}
    </Folder>"""

    return folder, len(edge_lines)


def _build_solution_folder(
    solution_path: List[Tuple[float, float]],
    crs: str,
    offset: Tuple[float, float],
) -> str:
    """Build the SolutionPath folder."""
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
      <name>SolutionPath</name>
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
    carved_paths: Optional[List[Dict]] = None,
    carved_polygons: Optional[List[Dict]] = None,
    wall_buffer: float = 1.0,
    path_width: Optional[float] = None,
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
        carved_paths: List of {'points': [...], 'width': float} from carve operations
        wall_buffer: Buffer width (meters) to convert lines to polygons
        path_width: Default path width (meters); per-path widths in carved_paths override
        base_name: Output filename stem
        output_dir: Output directory (default: Downloads)

    Returns:
        {
            "success": True,
            "path": str,
            "wall_count": int,
            "centerline_count": int,
            "headland_count": int,
            "carved_area_count": int,
            "point_count": int,
            "has_solution": bool,
            "has_overlay": bool,
        }
    """
    if output_dir is None:
        output_dir = get_downloads_folder()

    output_path = output_dir / f"{base_name}.kmz"
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"{base_name}_{timestamp}.kmz"

    # Collect folders
    folders: List[str] = []

    # 1 — Boundary (always present)
    folders.append(_build_boundary_folder(field, crs, centroid_offset))

    # 2 — Cut-path centerlines (GPS guidance lines — one per tractor pass)
    # Corn-row walls are intentionally excluded: they are a visual design aid
    # with no meaning to the GPS operator.
    centerline_count = 0
    if carved_paths:
        cl_xml, centerline_count = _build_centerlines_folder(
            crs, centroid_offset,
            carved_paths=carved_paths,
            default_path_width=path_width,
        )
        folders.append(cl_xml)

    # 5b — Individual design element areas (text letters, clipart shapes).
    # Each polygon is emitted separately so GPS viewers show clean per-letter
    # shapes instead of one merged blob, and so interior rings (letter counters
    # like the hole in O, D, B) are preserved.
    design_area_count = 0
    if carved_polygons:
        da_xml, design_area_count = _build_design_areas_folder(
            carved_polygons, crs, centroid_offset,
        )
        folders.append(da_xml)

    # 5 — Carved areas (cutting guide — merged union, reference layer).
    # When individual DesignCutAreas are available they provide better
    # per-letter shapes with interior rings intact, so the merged blob
    # is kept as a hidden reference layer to avoid double-rendering that
    # fills in letter holes.
    carved_area_count = 0
    if carved_areas and not carved_areas.is_empty:
        carved_xml, carved_area_count = _build_carved_areas_folder(
            carved_areas, crs, centroid_offset,
        )
        if design_area_count > 0:
            # Hide the merged layer — DesignCutAreas already shows the shapes
            carved_xml = carved_xml.replace(
                '<open>1</open>',
                '<open>0</open>\n      <visibility>0</visibility>',
            )
        folders.append(carved_xml)

    # 6 — Path edges (perimeter of each carved path — the cut/stand boundary).
    # Uses individual polygon rings when available for clean per-letter edges.
    path_edge_count = 0
    if carved_areas and not carved_areas.is_empty:
        pe_xml, path_edge_count = _build_path_edges_folder(
            carved_areas, crs, centroid_offset,
            carved_polygons=carved_polygons or [],
        )
        folders.append(pe_xml)

    # 7 — Individual cut path polygons (one closed polygon per carving pass)
    cut_path_polygon_count = 0
    if carved_paths:
        cpp_xml, cut_path_polygon_count = _build_cut_path_polygons_folder(
            carved_paths, crs, centroid_offset,
        )
        folders.append(cpp_xml)

    # 9 — Entrances
    point_count = 0
    if entrances:
        ent_xml, ent_count = _build_entrances_folder(entrances, crs, centroid_offset)
        if ent_xml:
            folders.append(ent_xml)
            point_count += ent_count

    # 10 — Exits
    if exits:
        exit_xml, exit_count = _build_exits_folder(exits, crs, centroid_offset)
        if exit_xml:
            folders.append(exit_xml)
            point_count += exit_count

    # 11 — Emergency exits
    if emergency_exits:
        emex_xml, emex_count = _build_emergency_exits_folder(
            emergency_exits, crs, centroid_offset,
        )
        if emex_xml:
            folders.append(emex_xml)
            point_count += emex_count

    # 12 — Solution path
    has_solution = False
    if solution_path and len(solution_path) >= 2:
        folders.append(_build_solution_folder(solution_path, crs, centroid_offset))
        has_solution = True

    # 13 — Design overlay image (GroundOverlay for KMZ)
    template_png_bytes = _render_design_png(field, walls)
    has_overlay = bool(template_png_bytes)
    if has_overlay:
        # Compute WGS84 bounding box for the GroundOverlay
        minx, miny, maxx, maxy = field.bounds
        cx, cy = centroid_offset
        proj = pyproj.Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
        west, south = proj.transform(minx + cx, miny + cy)
        east, north = proj.transform(maxx + cx, maxy + cy)
        folders.append(_build_ground_overlay(north, south, east, west))

    # Assemble document
    styles = _build_styles()
    folders_xml = "\n".join(folders)

    # Build ExtendedData metadata block
    ext_data_items = [
        ("wall_buffer", str(wall_buffer)),
        ("design_crs", crs),
        ("software", "CornMazeCAD 2.0"),
    ]
    if path_width is not None:
        ext_data_items.insert(1, ("path_width", str(path_width)))
    ext_data_xml = "\n".join(
        f'      <Data name="{k}"><value>{escape(v)}</value></Data>'
        for k, v in ext_data_items
    )

    kml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>{escape(base_name)}</name>
    <description>Corn maze design exported by CornMazeCAD</description>
    <ExtendedData>
{ext_data_xml}
    </ExtendedData>
{styles}
{folders_xml}
  </Document>
</kml>
"""

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("doc.kml", kml_content)
        if has_overlay:
            zf.writestr("files/template.png", template_png_bytes)

    return {
        "success": True,
        "path": str(output_path),
        "centerline_count": centerline_count,
        "carved_area_count": carved_area_count,
        "design_area_count": design_area_count,
        "path_edge_count": path_edge_count,
        "cut_path_polygon_count": cut_path_polygon_count,
        "point_count": point_count,
        "has_solution": has_solution,
        "has_overlay": has_overlay,
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
