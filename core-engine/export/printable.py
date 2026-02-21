"""
Printable map generation for visitor handouts, field crew reference, and marketing.

Generates high-resolution PNG/PDF-ready images with:
- Maze design with clear paths and walls
- Compass rose
- Scale bar
- Title and legend
- Optional solution path overlay
"""

import math
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional

from PIL import Image, ImageDraw, ImageFont
from shapely.geometry import LineString, Point
from shapely.geometry.base import BaseGeometry

from .shapefile import get_downloads_folder


def export_printable_map(
    field: BaseGeometry,
    walls: BaseGeometry = None,
    entrances: List[Tuple[float, float]] = None,
    exits: List[Tuple[float, float]] = None,
    emergency_exits: List[Tuple[float, float]] = None,
    solution_path: List[Tuple[float, float]] = None,
    title: str = "Corn Maze",
    show_solution: bool = False,
    width_px: int = 2400,
    base_name: str = "maze_map",
    output_dir: Path = None,
) -> Dict:
    """
    Generate a printable visitor map with title, legend, scale bar, and compass rose.

    Args:
        field: Field boundary polygon
        walls: Maze wall geometry
        entrances: Entrance coordinates
        exits: Exit coordinates
        emergency_exits: Emergency exit coordinates
        solution_path: Solution path waypoints (only drawn if show_solution=True)
        title: Map title
        show_solution: Whether to draw the solution path
        width_px: Output width in pixels
        base_name: Output filename stem
        output_dir: Output directory

    Returns:
        {"success": True, "path": str, "width_px": int, "height_px": int}
    """
    if output_dir is None:
        output_dir = get_downloads_folder()

    output_path = output_dir / f"{base_name}.png"
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"{base_name}_{timestamp}.png"

    # Calculate layout
    margin = int(width_px * 0.06)
    title_height = int(width_px * 0.06)
    legend_height = int(width_px * 0.04)
    map_width = width_px - 2 * margin

    minx, miny, maxx, maxy = field.bounds
    field_width = maxx - minx
    field_height = maxy - miny

    if field_width <= 0 or field_height <= 0:
        return {"success": False, "error": "Invalid field bounds"}

    aspect = field_height / field_width
    map_height = int(map_width * aspect)

    total_height = title_height + map_height + legend_height + 3 * margin

    px_per_m_x = map_width / field_width
    px_per_m_y = map_height / field_height

    map_origin_x = margin
    map_origin_y = title_height + margin

    def world_to_pixel(x: float, y: float) -> Tuple[int, int]:
        px = int((x - minx) * px_per_m_x) + map_origin_x
        py = int((maxy - y) * px_per_m_y) + map_origin_y
        return (px, py)

    # Create image
    img = Image.new('RGB', (width_px, total_height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Title
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(title_height * 0.6))
    except (OSError, IOError):
        title_font = ImageFont.load_default()

    draw.text((width_px // 2, margin), title, fill=(40, 40, 40), font=title_font, anchor="mt")

    # Map background (field area)
    if field and not field.is_empty:
        field_pixels = [world_to_pixel(x, y) for x, y in field.exterior.coords]
        draw.polygon(field_pixels, fill=(230, 245, 220), outline=(60, 120, 60))

    # Walls
    if walls and not walls.is_empty:
        def draw_wall(line_geom):
            coords = list(line_geom.coords)
            if len(coords) >= 2:
                pixels = [world_to_pixel(x, y) for x, y in coords]
                draw.line(pixels, fill=(60, 100, 30), width=max(2, int(2 * px_per_m_x)))

        if walls.geom_type == 'LineString':
            draw_wall(walls)
        elif walls.geom_type in ('MultiLineString', 'GeometryCollection'):
            for geom in walls.geoms:
                if geom.geom_type == 'LineString':
                    draw_wall(geom)

    # Solution path (red dashed)
    if show_solution and solution_path and len(solution_path) >= 2:
        pixels = [world_to_pixel(x, y) for x, y in solution_path]
        draw.line(pixels, fill=(220, 50, 50), width=max(3, int(3 * px_per_m_x)))

    # Entrance markers (green circles with "IN")
    if entrances:
        r = max(12, int(8 * px_per_m_x))
        for i, (ex, ey) in enumerate(entrances):
            px, py = world_to_pixel(ex, ey)
            draw.ellipse([px - r, py - r, px + r, py + r], fill=(50, 180, 50), outline=(30, 100, 30))
            draw.text((px, py), "IN", fill=(255, 255, 255), anchor="mm")

    # Exit markers (red circles with "OUT")
    if exits:
        r = max(12, int(8 * px_per_m_x))
        for i, (ex, ey) in enumerate(exits):
            px, py = world_to_pixel(ex, ey)
            draw.ellipse([px - r, py - r, px + r, py + r], fill=(220, 50, 50), outline=(150, 30, 30))
            draw.text((px, py), "OUT", fill=(255, 255, 255), anchor="mm")

    # Emergency exit markers (orange triangles)
    if emergency_exits:
        r = max(10, int(6 * px_per_m_x))
        for ex, ey in emergency_exits:
            px, py = world_to_pixel(ex, ey)
            triangle = [(px, py - r), (px - r, py + r), (px + r, py + r)]
            draw.polygon(triangle, fill=(255, 165, 0), outline=(200, 120, 0))

    # Scale bar
    scale_y = map_origin_y + map_height + int(margin * 0.5)
    scale_x = margin
    scale_meters = _nice_scale_length(field_width * 0.3)
    scale_px = int(scale_meters * px_per_m_x)

    draw.line([(scale_x, scale_y), (scale_x + scale_px, scale_y)], fill=(40, 40, 40), width=3)
    draw.line([(scale_x, scale_y - 5), (scale_x, scale_y + 5)], fill=(40, 40, 40), width=2)
    draw.line([(scale_x + scale_px, scale_y - 5), (scale_x + scale_px, scale_y + 5)], fill=(40, 40, 40), width=2)

    try:
        small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", max(14, int(width_px * 0.012)))
    except (OSError, IOError):
        small_font = ImageFont.load_default()

    if scale_meters >= 1000:
        label = f"{scale_meters/1000:.0f} km"
    else:
        label = f"{scale_meters:.0f} m"
    draw.text((scale_x + scale_px // 2, scale_y + 8), label, fill=(40, 40, 40), font=small_font, anchor="mt")

    # Compass rose (simple N arrow)
    compass_x = width_px - margin - 30
    compass_y = map_origin_y + 40
    arrow_len = 25
    draw.line([(compass_x, compass_y + arrow_len), (compass_x, compass_y - arrow_len)], fill=(40, 40, 40), width=2)
    draw.polygon([(compass_x, compass_y - arrow_len), (compass_x - 8, compass_y - arrow_len + 12), (compass_x + 8, compass_y - arrow_len + 12)], fill=(40, 40, 40))
    draw.text((compass_x, compass_y - arrow_len - 8), "N", fill=(40, 40, 40), font=small_font, anchor="mb")

    # Legend
    legend_y = total_height - margin
    legend_items = []
    if entrances:
        legend_items.append(("Entrance", (50, 180, 50)))
    if exits:
        legend_items.append(("Exit", (220, 50, 50)))
    if emergency_exits:
        legend_items.append(("Emergency Exit", (255, 165, 0)))
    if show_solution and solution_path:
        legend_items.append(("Solution", (220, 50, 50)))

    lx = margin
    for label_text, color in legend_items:
        draw.rectangle([lx, legend_y - 10, lx + 14, legend_y + 4], fill=color)
        draw.text((lx + 20, legend_y - 3), label_text, fill=(40, 40, 40), font=small_font, anchor="lm")
        lx += int(width_px * 0.12)

    # Field boundary outline
    if field and not field.is_empty:
        field_pixels = [world_to_pixel(x, y) for x, y in field.exterior.coords]
        draw.line(field_pixels + [field_pixels[0]], fill=(60, 120, 60), width=3)

    img.save(str(output_path), dpi=(300, 300))

    return {
        "success": True,
        "path": str(output_path),
        "width_px": width_px,
        "height_px": total_height,
    }


def _nice_scale_length(approx_meters: float) -> float:
    """Round to a nice number for scale bar (10, 20, 50, 100, 200, 500, etc.)."""
    nice_values = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]
    for v in nice_values:
        if v >= approx_meters * 0.5:
            return float(v)
    return float(nice_values[-1])
