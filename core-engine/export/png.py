"""
Georeferenced PNG export for MazeGPS.

Renders the maze design as a PNG image with a companion JSON file
containing geo-registration info. Convention: white = paths (cut),
dark/green = corn (standing).
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, Tuple

# ---------------------------------------------------------------------------
# Ground-resolution constants
# ---------------------------------------------------------------------------
#: Default ground resolution: 10 cm per pixel (4 in/px).
#: Produces ~2000 × 1000 px for a typical 200 m × 100 m field.
DEFAULT_RESOLUTION_M_PER_PX: float = 0.10

#: Coarsest allowed resolution: 15 cm per pixel (6 in/px).
#: Below this threshold, pixel staircases become visible at field zoom.
MIN_RESOLUTION_M_PER_PX: float = 0.15

#: Hard cap on the longest image dimension to keep memory use bounded.
#: At 10 cm/px a 800 m field would produce 8 000 px — the practical limit.
MAX_PIXELS_PER_AXIS: int = 8_000


def compute_png_dimensions(
    field_width_m: float,
    field_height_m: float,
    resolution_m_per_px: float = DEFAULT_RESOLUTION_M_PER_PX,
) -> Tuple[int, int, float]:
    """Return *(width_px, height_px, actual_m_per_px)* for a raster covering *field*.

    Resolution is clamped so the image is never coarser than
    ``MIN_RESOLUTION_M_PER_PX`` (15 cm/px).  The longer axis is also capped at
    ``MAX_PIXELS_PER_AXIS`` to keep memory use bounded; if the cap is hit the
    effective resolution is coarser than requested but still reported.

    Args:
        field_width_m:  Field extent in the x direction (metres).
        field_height_m: Field extent in the y direction (metres).
        resolution_m_per_px: Desired metres per pixel (default 0.10 = 10 cm).

    Returns:
        Tuple of (width_px, height_px, actual_m_per_px).
    """
    # Never coarser than 15 cm/px regardless of caller argument
    m_per_px = min(abs(resolution_m_per_px), MIN_RESOLUTION_M_PER_PX)

    width_px = max(1, int(round(field_width_m / m_per_px)))
    height_px = max(1, int(round(field_height_m / m_per_px)))

    # Apply hard cap: scale both axes down proportionally if either exceeds limit
    if width_px > MAX_PIXELS_PER_AXIS or height_px > MAX_PIXELS_PER_AXIS:
        scale = MAX_PIXELS_PER_AXIS / max(width_px, height_px)
        width_px = max(1, int(width_px * scale))
        height_px = max(1, int(height_px * scale))
        m_per_px = field_width_m / width_px  # effective (coarser)

    return width_px, height_px, m_per_px

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
    width_px: Optional[int] = None,
    resolution_m_per_px: float = DEFAULT_RESOLUTION_M_PER_PX,
    base_name: str = "maze_design",
    output_dir: Path = None,
) -> Dict:
    """
    Export maze as a georeferenced PNG + JSON sidecar.

    White pixels = paths to cut. Dark green pixels = corn to leave standing.

    Resolution is auto-computed from ``resolution_m_per_px`` (default 10 cm/px)
    unless ``width_px`` is supplied explicitly.  Either way the image is never
    coarser than ``MIN_RESOLUTION_M_PER_PX`` (15 cm/px = 6 in/px) to prevent
    visible pixel staircases when the operator zooms in during cutting.

    Args:
        field: Centered field boundary polygon
        walls: Centered wall geometry (lines after carving)
        crs: Projected CRS (e.g., "EPSG:32615")
        centroid_offset: (cx, cy) to un-center
        width_px: Explicit output width in pixels; ``None`` (default) or ``0``
                  means auto-compute from *resolution_m_per_px*.
        resolution_m_per_px: Ground resolution in metres per pixel (default
                              0.10 = 10 cm/px).  Ignored when *width_px* is set.
        base_name: Output filename stem
        output_dir: Output directory (default: Downloads)

    Returns:
        {"success": True, "png_path": str, "json_path": str,
         "width_px": int, "height_px": int, "resolution_m_per_px": float}
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

    # Determine final pixel dimensions
    if width_px and width_px > 0:
        # Explicit width: enforce the minimum-quality floor (≤ 15 cm/px)
        min_width = int(round(field_width / MIN_RESOLUTION_M_PER_PX))
        width_px = max(width_px, min_width)
        # Derive height preserving aspect ratio, then clamp both axes
        aspect = field_height / field_width
        height_px = max(1, int(round(width_px * aspect)))
        if width_px > MAX_PIXELS_PER_AXIS or height_px > MAX_PIXELS_PER_AXIS:
            scale = MAX_PIXELS_PER_AXIS / max(width_px, height_px)
            width_px = max(1, int(width_px * scale))
            height_px = max(1, int(height_px * scale))
        actual_m_per_px = field_width / width_px
    else:
        # Auto-compute from requested resolution (clamped to 15 cm/px minimum)
        width_px, height_px, actual_m_per_px = compute_png_dimensions(
            field_width, field_height, resolution_m_per_px,
        )

    # Pixels per metre (may differ slightly between axes due to integer rounding)
    px_per_m_x = width_px / field_width
    px_per_m_y = height_px / field_height

    def world_to_pixel(x: float, y: float) -> Tuple[int, int]:
        px = int((x - minx) * px_per_m_x)
        # Flip Y axis (image origin is top-left, world origin is bottom-left)
        py = int((maxy - y) * px_per_m_y)
        return (px, py)

    # Wall line width scales with resolution so corn rows stay a consistent
    # visual thickness: ~0.75 m on the ground ≈ 7–8 px at 10 cm/px.
    wall_line_px = max(2, int(round(px_per_m_x * 0.75)))

    # Render: white field, green wall lines on top
    img = Image.new('RGB', (width_px, height_px), color=(34, 85, 34))
    draw = ImageDraw.Draw(img)

    # Fill field area with white (paths = cut corn)
    if field is not None:
        field_pixels = [world_to_pixel(x, y) for x, y in field.exterior.coords]
        draw.polygon(field_pixels, fill=(255, 255, 255))

    # Draw wall lines as green (standing corn) on top
    if walls is not None and not walls.is_empty:
        _draw_geometry_lines(draw, walls, world_to_pixel, fill=(34, 85, 34), width=wall_line_px)

    # Draw field outline
    if field is not None:
        field_pixels = [world_to_pixel(x, y) for x, y in field.exterior.coords]
        draw.polygon(field_pixels, outline=(0, 0, 0), fill=None)

    img.save(str(png_path))

    # Compute geo-registration in WGS84
    transformer = pyproj.Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
    cx, cy = centroid_offset

    # Top-left = (minx + cx, maxy + cy); bottom-right = (maxx + cx, miny + cy)
    tl_lon, tl_lat = transformer.transform(minx + cx, maxy + cy)
    br_lon, br_lat = transformer.transform(maxx + cx, miny + cy)

    geo_info = {
        "top_left": {"lat": round(tl_lat, 7), "lon": round(tl_lon, 7)},
        "bottom_right": {"lat": round(br_lat, 7), "lon": round(br_lon, 7)},
        "width_px": width_px,
        "height_px": height_px,
        "resolution_m_per_px": round(actual_m_per_px, 4),
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
        "resolution_m_per_px": round(actual_m_per_px, 4),
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
