"""
Drone photo alignment for post-cut verification.

Processes drone aerial imagery and aligns it with the maze design
for visual comparison. Uses control points from the field boundary
to georegister the photo.
"""

import io
import base64
from typing import Dict, List, Tuple, Optional

import numpy as np
from PIL import Image
from shapely.geometry import Point, Polygon
from shapely.geometry.base import BaseGeometry


def align_drone_photo(
    image_data: str,
    field_boundary: BaseGeometry,
    control_points: List[Dict] = None,
) -> Dict:
    """
    Align a drone photo to the maze design coordinate system.

    Uses the field boundary corners as control points for simple
    affine transformation alignment.

    Args:
        image_data: Base64 encoded drone photo
        field_boundary: Field boundary polygon (centered coordinates)
        control_points: Optional manual control points
            [{"image_x": px, "image_y": px, "world_x": m, "world_y": m}, ...]

    Returns:
        {
            "aligned_image": str (base64 PNG),
            "transform": {"scale_x": float, "scale_y": float, "offset_x": float, "offset_y": float},
            "bounds": {"minx": float, "miny": float, "maxx": float, "maxy": float},
            "width": int, "height": int,
        }
    """
    # Decode image
    if ',' in image_data:
        image_data = image_data.split(',')[1]

    image_bytes = base64.b64decode(image_data)
    image = Image.open(io.BytesIO(image_bytes))
    img_width, img_height = image.size

    # Get field bounds for alignment
    minx, miny, maxx, maxy = field_boundary.bounds
    field_width = maxx - minx
    field_height = maxy - miny

    if control_points and len(control_points) >= 2:
        # Use control points for alignment
        # Simple scaling based on control point pairs
        img_pts = [(cp["image_x"], cp["image_y"]) for cp in control_points]
        world_pts = [(cp["world_x"], cp["world_y"]) for cp in control_points]

        # Calculate scale from first two control points
        img_dx = img_pts[1][0] - img_pts[0][0]
        img_dy = img_pts[1][1] - img_pts[0][1]
        world_dx = world_pts[1][0] - world_pts[0][0]
        world_dy = world_pts[1][1] - world_pts[0][1]

        img_dist = (img_dx**2 + img_dy**2)**0.5
        world_dist = (world_dx**2 + world_dy**2)**0.5

        if img_dist > 0:
            scale = world_dist / img_dist
        else:
            scale = field_width / img_width

        scale_x = scale
        scale_y = -scale  # Flip Y
        offset_x = world_pts[0][0] - img_pts[0][0] * scale_x
        offset_y = world_pts[0][1] - img_pts[0][1] * scale_y
    else:
        # Auto-align: assume photo covers the field boundary area
        scale_x = field_width / img_width
        scale_y = field_height / img_height
        offset_x = minx
        offset_y = maxy  # Top of image = max Y

    # Resize image to match field proportions
    target_width = 800
    target_height = int(target_width * (field_height / field_width)) if field_width > 0 else 600
    resized = image.resize((target_width, target_height), Image.LANCZOS)

    # Encode result
    buffer = io.BytesIO()
    resized.save(buffer, format='PNG')
    aligned_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

    return {
        "aligned_image": f"data:image/png;base64,{aligned_b64}",
        "transform": {
            "scale_x": round(scale_x, 6),
            "scale_y": round(-scale_y, 6),
            "offset_x": round(offset_x, 2),
            "offset_y": round(offset_y, 2),
        },
        "bounds": {
            "minx": round(minx, 2),
            "miny": round(miny, 2),
            "maxx": round(maxx, 2),
            "maxy": round(maxy, 2),
        },
        "width": target_width,
        "height": target_height,
    }
