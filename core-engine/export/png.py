"""
Georeferenced PNG export for MazeGPS.

Renders the maze design as a PNG image with a companion JSON file
containing geo-registration info. Convention: white = paths (cut),
dark/green = corn (standing).
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Tuple

import pyproj
from PIL import Image, ImageDraw
from shapely.geometry import Polygon, MultiLineString, LineString
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform

from .shapefile import get_downloads_folder


def _uncenter_geometry(geom: BaseGeometry, centroid_offset: Tuple[float, float]) -> BaseGeometry:
    cx, cy = centroid_offset
    return transform(lambda x, y: (x + cx, y + cy), geom)


def _reproject_to_wgs84(geom: BaseGeometry, source_crs: str) -> BaseGeometry:
    transformer = pyproj.Transformer.from_crs(
        source_crs, "EPSG:4326", always_xy=True
    )
    return transform(transformer.transform, geom)


def export_georeferenced_png(
    field: BaseGeometry,
    walls: BaseGeometry,
    crs: str,
    centroid_offset: Tuple[float, float],
    width_px: int = 800,
    base_name: str = "maze_design",
    output_dir: Path = None,
) -> Dict:
    """
    Export maze as a georeferenced PNG + JSON sidecar.

    White pixels = paths to cut. Dark green pixels = corn to leave standing.

    Args:
        field: Centered field boundary polygon
        walls: Centered wall geometry (lines after carving)
        crs: Projected CRS (e.g., "EPSG:32615")
        centroid_offset: (cx, cy) to un-center
        width_px: Output image width in pixels
        base_name: Output filename stem
        output_dir: Output directory (default: Downloads)

    Returns:
        {"success": True, "png_path": str, "json_path": str, "width_px": int, "height_px": int}
    """
    if output_dir is None:
        output_dir = get_downloads_folder()

    png_path = output_dir / f"{base_name}.png"
    json_path = output_dir / f"{base_name}.json"

    if png_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        png_path = output_dir / f"{base_name}_{timestamp}.png"
        json_path = output_dir / f"{base_name}_{timestamp}.json"

    # Get bounds of the centered field in projected coordinates
    minx, miny, maxx, maxy = field.bounds
    field_width = maxx - minx
    field_height = maxy - miny

    if field_width <= 0 or field_height <= 0:
        return {"success": False, "error": "Invalid field bounds"}

    # Calculate image dimensions maintaining aspect ratio
    aspect = field_height / field_width
    height_px = int(width_px * aspect)
    height_px = max(height_px, 1)

    # Pixels per meter
    px_per_m_x = width_px / field_width
    px_per_m_y = height_px / field_height

    def world_to_pixel(x: float, y: float) -> Tuple[int, int]:
        px = int((x - minx) * px_per_m_x)
        # Flip Y axis (image origin is top-left, world origin is bottom-left)
        py = int((maxy - y) * px_per_m_y)
        return (px, py)

    # Create image: dark green background (standing corn)
    img = Image.new('RGB', (width_px, height_px), color=(34, 85, 34))
    draw = ImageDraw.Draw(img)

    # Draw field boundary fill (slightly lighter green for the field area)
    if field is not None:
        field_pixels = [world_to_pixel(x, y) for x, y in field.exterior.coords]
        draw.polygon(field_pixels, fill=(40, 100, 40))

    # Draw maze walls as dark lines on the field
    if walls is not None and not walls.is_empty:
        _draw_geometry_lines(draw, walls, world_to_pixel, fill=(34, 85, 34), width=2)

    # Draw carved paths as WHITE on top of the walls
    # The "paths" are the areas where walls have been removed
    # We approximate by drawing the field area in white then the walls back on top
    # Actually, simpler approach: the carved areas = field minus walls-buffered
    # But walls are lines, not areas. Let's invert: draw field as white, then walls as green.

    # Better approach: white background for field, green for wall lines
    img2 = Image.new('RGB', (width_px, height_px), color=(34, 85, 34))
    draw2 = ImageDraw.Draw(img2)

    # Fill field area with white (paths = cut corn)
    if field is not None:
        field_pixels = [world_to_pixel(x, y) for x, y in field.exterior.coords]
        draw2.polygon(field_pixels, fill=(255, 255, 255))

    # Draw wall lines as green (standing corn) on top
    if walls is not None and not walls.is_empty:
        _draw_geometry_lines(draw2, walls, world_to_pixel, fill=(34, 85, 34), width=3)

    # Draw field outline
    if field is not None:
        field_pixels = [world_to_pixel(x, y) for x, y in field.exterior.coords]
        draw2.polygon(field_pixels, outline=(0, 0, 0), fill=None)

    img2.save(str(png_path))

    # Compute geo-registration in WGS84
    # Un-center the bounding box corners and reproject to lat/lon
    transformer = pyproj.Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
    cx, cy = centroid_offset

    # Top-left in projected coords = (minx + cx, maxy + cy)
    tl_lon, tl_lat = transformer.transform(minx + cx, maxy + cy)
    # Bottom-right in projected coords = (maxx + cx, miny + cy)
    br_lon, br_lat = transformer.transform(maxx + cx, miny + cy)

    geo_info = {
        "top_left": {"lat": round(tl_lat, 7), "lon": round(tl_lon, 7)},
        "bottom_right": {"lat": round(br_lat, 7), "lon": round(br_lon, 7)},
        "width_px": width_px,
        "height_px": height_px,
        "crs": "EPSG:4326",
    }

    with open(json_path, 'w') as f:
        json.dump(geo_info, f, indent=2)

    return {
        "success": True,
        "png_path": str(png_path),
        "json_path": str(json_path),
        "width_px": width_px,
        "height_px": height_px,
    }


def _draw_geometry_lines(
    draw: ImageDraw.Draw,
    geom: BaseGeometry,
    world_to_pixel,
    fill=(34, 85, 34),
    width: int = 2,
):
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
