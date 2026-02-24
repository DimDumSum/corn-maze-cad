"""
Precision planting prescription map export.

Generates variable-rate seed prescription maps for GPS-controlled planters.
Instead of cutting paths after planting, the planter skips seed where paths go,
effectively "printing" the maze during planting.

Output formats:
- GeoJSON with seed rate per zone
- Shapefile with prescription polygons
- Raster PNG for visualization
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Tuple, Optional

import pyproj
import numpy as np
from PIL import Image, ImageDraw
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform, unary_union

from .shapefile import get_downloads_folder
from geometry.operations import smooth_buffer, densify_curves, extract_path_edge_lines


def _uncenter_geometry(geom: BaseGeometry, centroid_offset: Tuple[float, float]) -> BaseGeometry:
    cx, cy = centroid_offset
    return transform(lambda x, y: (x + cx, y + cy), geom)


def export_prescription_map(
    field: BaseGeometry,
    walls: BaseGeometry,
    crs: str,
    centroid_offset: Tuple[float, float],
    carved_areas: Optional[BaseGeometry] = None,
    path_width: float = 2.5,
    seed_rate_corn: float = 38000,
    seed_rate_path: float = 0,
    base_name: str = "prescription",
    output_dir: Path = None,
) -> Dict:
    """
    Export a precision planting prescription map.

    Creates two zones:
    - Corn zone: Full seed rate (typically 38,000 seeds/acre)
    - Path zone: Zero seed rate (no seed where paths will be)

    Args:
        field: Field boundary polygon (centered)
        walls: Maze wall geometry (centered) - walls = corn, gaps = paths
        crs: Projected CRS
        centroid_offset: Offset for geo-referencing
        path_width: Width of paths in meters
        seed_rate_corn: Seeds per acre for corn zones
        seed_rate_path: Seeds per acre for path zones (usually 0)
        base_name: Output filename stem
        output_dir: Output directory

    Returns:
        {"success": True, "geojson_path": str, "png_path": str, ...}
    """
    if output_dir is None:
        output_dir = get_downloads_folder()

    geojson_path = output_dir / f"{base_name}.geojson"
    png_path = output_dir / f"{base_name}_preview.png"

    if geojson_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        geojson_path = output_dir / f"{base_name}_{timestamp}.geojson"
        png_path = output_dir / f"{base_name}_{timestamp}_preview.png"

    # Build path zones: areas between walls where paths exist
    # Paths = field minus (walls buffered by path_width/2), smooth arc caps
    if walls and not walls.is_empty:
        corn_zone = smooth_buffer(walls, path_width / 2.0, cap_style=2, join_style=2)
        corn_zone = corn_zone.intersection(field)
        path_zone = field.difference(corn_zone)
    else:
        corn_zone = field
        path_zone = Polygon()

    # Un-center for geo export
    corn_geo = _uncenter_geometry(corn_zone, centroid_offset)
    path_geo = _uncenter_geometry(path_zone, centroid_offset) if not path_zone.is_empty else None

    # Reproject to WGS84 for GeoJSON
    transformer = pyproj.Transformer.from_crs(crs, "EPSG:4326", always_xy=True)

    features = []

    if not corn_geo.is_empty:
        corn_wgs84 = transform(transformer.transform, densify_curves(corn_geo))
        features.append({
            "type": "Feature",
            "properties": {
                "zone": "corn",
                "seed_rate": seed_rate_corn,
                "seed_rate_unit": "seeds/acre",
            },
            "geometry": mapping(corn_wgs84),
        })

    if path_geo and not path_geo.is_empty:
        path_wgs84 = transform(transformer.transform, densify_curves(path_geo))
        features.append({
            "type": "Feature",
            "properties": {
                "zone": "path",
                "seed_rate": seed_rate_path,
                "seed_rate_unit": "seeds/acre",
            },
            "geometry": mapping(path_wgs84),
        })

    # Add path edge LineString features (the physical cut/stand boundary lines)
    if carved_areas and not carved_areas.is_empty:
        for edge_line in extract_path_edge_lines(carved_areas):
            edge_geo = _uncenter_geometry(edge_line, centroid_offset)
            edge_wgs84 = transform(transformer.transform, edge_geo)
            features.append({
                "type": "Feature",
                "properties": {
                    "type": "path_edge",
                },
                "geometry": mapping(edge_wgs84),
            })

    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "generator": "CornMazeCAD",
            "type": "prescription_map",
            "crs": "EPSG:4326",
            "seed_rate_corn": seed_rate_corn,
            "seed_rate_path": seed_rate_path,
        }
    }

    with open(geojson_path, 'w') as f:
        json.dump(geojson, f, indent=2)

    # Generate preview PNG
    minx, miny, maxx, maxy = field.bounds
    fw = maxx - minx
    fh = maxy - miny
    px_width = 800
    px_height = int(px_width * (fh / fw)) if fw > 0 else 800
    px_per_m = px_width / fw

    def to_px(x, y):
        return (int((x - minx) * px_per_m), int((maxy - y) * px_per_m))

    img = Image.new('RGB', (px_width, px_height), (200, 200, 200))
    draw = ImageDraw.Draw(img)

    # Draw corn zone (green)
    if not corn_zone.is_empty:
        _draw_polygon(draw, corn_zone, to_px, fill=(50, 130, 50))

    # Draw path zone (brown/bare soil)
    if not path_zone.is_empty:
        _draw_polygon(draw, path_zone, to_px, fill=(180, 150, 100))

    # Draw field outline
    field_px = [to_px(x, y) for x, y in field.exterior.coords]
    draw.line(field_px + [field_px[0]], fill=(0, 0, 0), width=2)

    img.save(str(png_path))

    return {
        "success": True,
        "geojson_path": str(geojson_path),
        "png_path": str(png_path),
        "corn_area_m2": round(corn_zone.area, 1) if not corn_zone.is_empty else 0,
        "path_area_m2": round(path_zone.area, 1) if not path_zone.is_empty else 0,
    }


def _draw_polygon(draw, geom, to_px, fill):
    """Draw a shapely polygon (possibly multi) onto PIL ImageDraw."""
    if geom.geom_type == 'Polygon':
        coords = [to_px(x, y) for x, y in geom.exterior.coords]
        if len(coords) >= 3:
            draw.polygon(coords, fill=fill)
    elif geom.geom_type == 'MultiPolygon':
        for poly in geom.geoms:
            _draw_polygon(draw, poly, to_px, fill=fill)
    elif hasattr(geom, 'geoms'):
        for g in geom.geoms:
            if g.geom_type in ('Polygon', 'MultiPolygon'):
                _draw_polygon(draw, g, to_px, fill=fill)
