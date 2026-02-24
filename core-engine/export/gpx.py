"""
GPX (GPS eXchange Format) export for handheld GPS devices.

Exports maze designs as GPX files containing routes and waypoints
that can be loaded into GPS receivers for field cutting.
"""

from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Tuple
from xml.sax.saxutils import escape

import pyproj
from shapely.geometry import Polygon, MultiPolygon, LineString, MultiLineString
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform

from .shapefile import get_downloads_folder
from geometry.operations import densify_curves


def _uncenter_geometry(geom: BaseGeometry, centroid_offset: Tuple[float, float]) -> BaseGeometry:
    cx, cy = centroid_offset
    return transform(lambda x, y: (x + cx, y + cy), geom)


def _reproject_to_wgs84(geom: BaseGeometry, source_crs: str) -> BaseGeometry:
    transformer = pyproj.Transformer.from_crs(source_crs, "EPSG:4326", always_xy=True)
    return transform(transformer.transform, geom)


def _coords_to_gpx_routepoints(coords: List[Tuple[float, float]]) -> str:
    parts = []
    for lon, lat in coords:
        parts.append(f'      <rtept lat="{lat:.7f}" lon="{lon:.7f}"></rtept>')
    return "\n".join(parts)


def _coords_to_gpx_trackpoints(coords: List[Tuple[float, float]]) -> str:
    parts = []
    for lon, lat in coords:
        parts.append(f'        <trkpt lat="{lat:.7f}" lon="{lon:.7f}"></trkpt>')
    return "\n".join(parts)


def export_boundary_gpx(
    field: BaseGeometry,
    crs: str,
    centroid_offset: Tuple[float, float],
    base_name: str = "maze_boundary",
    output_dir: Path = None,
) -> Dict:
    """Export the field boundary as a GPX route."""
    if output_dir is None:
        output_dir = get_downloads_folder()

    output_path = output_dir / f"{base_name}.gpx"
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"{base_name}_{timestamp}.gpx"

    uncentered = _uncenter_geometry(densify_curves(field), centroid_offset)
    wgs84_field = _reproject_to_wgs84(uncentered, crs)

    coords = list(wgs84_field.exterior.coords)
    routepoints = _coords_to_gpx_routepoints(coords)

    gpx_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CornMazeCAD"
     xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>{escape(base_name)}</name>
    <time>{datetime.now(timezone.utc).isoformat()}Z</time>
  </metadata>
  <rte>
    <name>Field Boundary</name>
{routepoints}
  </rte>
</gpx>
"""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(gpx_content)

    return {"success": True, "path": str(output_path)}


def export_walls_gpx(
    walls: BaseGeometry,
    crs: str,
    centroid_offset: Tuple[float, float],
    base_name: str = "maze_walls",
    output_dir: Path = None,
) -> Dict:
    """Export maze walls as GPX tracks (one track per wall segment)."""
    if output_dir is None:
        output_dir = get_downloads_folder()

    output_path = output_dir / f"{base_name}.gpx"
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"{base_name}_{timestamp}.gpx"

    uncentered = _uncenter_geometry(walls, centroid_offset)
    wgs84_walls = _reproject_to_wgs84(uncentered, crs)

    tracks = []
    track_count = 0

    def process_line(line_geom, idx):
        coords = list(line_geom.coords)
        trackpoints = _coords_to_gpx_trackpoints(coords)
        return f"""  <trk>
    <name>Wall {idx + 1}</name>
    <trkseg>
{trackpoints}
    </trkseg>
  </trk>"""

    if wgs84_walls.geom_type == 'LineString':
        tracks.append(process_line(wgs84_walls, 0))
        track_count = 1
    elif wgs84_walls.geom_type in ('MultiLineString', 'GeometryCollection'):
        for i, geom in enumerate(wgs84_walls.geoms):
            if geom.geom_type == 'LineString':
                tracks.append(process_line(geom, i))
                track_count += 1

    tracks_xml = "\n".join(tracks)

    gpx_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CornMazeCAD"
     xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>{escape(base_name)}</name>
    <time>{datetime.now(timezone.utc).isoformat()}Z</time>
  </metadata>
{tracks_xml}
</gpx>
"""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(gpx_content)

    return {"success": True, "path": str(output_path), "track_count": track_count}


def export_cutting_guide_gpx(
    field: BaseGeometry,
    crs: str,
    centroid_offset: Tuple[float, float],
    carved_paths: List[Dict] = None,
    entrances: List[Tuple[float, float]] = None,
    exits: List[Tuple[float, float]] = None,
    base_name: str = "maze_cutting_guide",
    output_dir: Path = None,
) -> Dict:
    """
    Export a complete cutting guide GPX with boundary route,
    cut-path tracks, and entrance/exit waypoints.

    Each carved tractor pass becomes one <trk> element named
    "Cut Path N" with a <cmt> carrying the cutting width in metres.
    Corn-row wall centerlines are NOT included — they are a visual
    design aid with no value to the GPS operator.
    """
    if output_dir is None:
        output_dir = get_downloads_folder()

    output_path = output_dir / f"{base_name}.gpx"
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"{base_name}_{timestamp}.gpx"

    transformer = pyproj.Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
    cx, cy = centroid_offset

    # Waypoints for entrances and exits
    waypoints = []
    if entrances:
        for i, (ex, ey) in enumerate(entrances):
            lon, lat = transformer.transform(ex + cx, ey + cy)
            waypoints.append(f'  <wpt lat="{lat:.7f}" lon="{lon:.7f}"><name>Entrance {i+1}</name><sym>Flag, Green</sym></wpt>')
    if exits:
        for i, (ex, ey) in enumerate(exits):
            lon, lat = transformer.transform(ex + cx, ey + cy)
            waypoints.append(f'  <wpt lat="{lat:.7f}" lon="{lon:.7f}"><name>Exit {i+1}</name><sym>Flag, Red</sym></wpt>')

    waypoints_xml = "\n".join(waypoints) if waypoints else ""

    # Boundary route
    uncentered_field = _uncenter_geometry(densify_curves(field), centroid_offset)
    wgs84_field = _reproject_to_wgs84(uncentered_field, crs)
    boundary_pts = _coords_to_gpx_routepoints(list(wgs84_field.exterior.coords))

    # Cut-path tracks — one per carved tractor pass
    tracks = []
    for i, cp in enumerate(carved_paths or []):
        pts = cp.get("points", [])
        width = cp.get("width")
        if len(pts) < 2:
            continue
        path_line = LineString([(p[0], p[1]) for p in pts])
        path_line = densify_curves(path_line)
        uncentered = _uncenter_geometry(path_line, centroid_offset)
        wgs84_line = _reproject_to_wgs84(uncentered, crs)
        tpts = _coords_to_gpx_trackpoints(list(wgs84_line.coords))
        cmt = f"width: {float(width):.2f} m" if width is not None else ""
        cmt_xml = f"\n    <cmt>{escape(cmt)}</cmt>" if cmt else ""
        tracks.append(
            f"  <trk>\n    <name>Cut Path {i + 1}</name>{cmt_xml}\n    <trkseg>\n{tpts}\n    </trkseg>\n  </trk>"
        )

    tracks_xml = "\n".join(tracks) if tracks else ""

    gpx_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CornMazeCAD"
     xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>{escape(base_name)}</name>
    <desc>Complete cutting guide for GPS-guided mowing</desc>
    <time>{datetime.now(timezone.utc).isoformat()}Z</time>
  </metadata>
{waypoints_xml}
  <rte>
    <name>Field Boundary</name>
{boundary_pts}
  </rte>
{tracks_xml}
</gpx>
"""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(gpx_content)

    return {
        "success": True,
        "path": str(output_path),
        "waypoint_count": len(waypoints),
        "cut_path_count": len(tracks),
    }
