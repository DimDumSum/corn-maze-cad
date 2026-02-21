"""
Maze generation algorithms aligned to corn planter rows.

Rows are oriented along the planting direction so that
maze walls correspond to standing corn rows and paths correspond
to mowed rows.
"""

from shapely.geometry import LineString, MultiLineString
from shapely.affinity import rotate as shapely_rotate
from shapely.geometry.base import BaseGeometry
from shapely.ops import unary_union
from typing import List, Optional


def generate_standing_rows(
    field_boundary: BaseGeometry,
    spacing: float = 10.0,
    seed: Optional[int] = None,
    direction_deg: float = 0.0,
    headland_inset: float = 0.0,
    row_spacing: Optional[float] = None,
) -> BaseGeometry:
    """
    Generate all corn rows as standing corn — no maze passages carved.

    This produces a solid field of corn rows that the user can then
    manually carve paths through.  Unlike the maze algorithms, no walls
    are removed; every row is left standing.

    Args:
        field_boundary: Shapely polygon defining the field boundary
        spacing: Ignored (kept for API compatibility)
        seed: Ignored
        direction_deg: Planting direction in degrees (0 = North, 90 = East)
        headland_inset: Distance to inset from field boundary (meters).
            Set to 0 to include headlands.
        row_spacing: Corn-row spacing in meters.  Required.

    Returns:
        MultiLineString geometry containing all standing corn-row segments
    """
    if field_boundary is None or field_boundary.is_empty:
        raise ValueError("Field boundary must be provided")

    if row_spacing is None:
        raise ValueError("row_spacing is required for standing rows")

    # Determine the working area (optionally inset for headlands)
    working_area = field_boundary
    if headland_inset > 0:
        inset = field_boundary.buffer(-headland_inset)
        if not inset.is_empty and inset.area > 0:
            if inset.geom_type == 'MultiPolygon':
                working_area = max(inset.geoms, key=lambda g: g.area)
            else:
                working_area = inset

    rot_cx, rot_cy = working_area.centroid.x, working_area.centroid.y

    # Rotate the boundary so planting direction aligns with the Y-axis
    rotated = shapely_rotate(working_area, direction_deg, origin=(rot_cx, rot_cy))
    minx, miny, maxx, maxy = rotated.bounds

    # Generate parallel corn-row lines in rotated space
    corn_lines: List[BaseGeometry] = []
    num_rows = int((maxx - minx) / row_spacing) + 2
    for i in range(num_rows):
        x = minx + i * row_spacing
        line = LineString([(x, miny - row_spacing), (x, maxy + row_spacing)])
        clipped = line.intersection(rotated)
        if not clipped.is_empty:
            corn_lines.append(clipped)

    if not corn_lines:
        return MultiLineString()

    standing = unary_union(corn_lines)

    # Rotate back to world coordinates
    if direction_deg != 0:
        standing = shapely_rotate(standing, -direction_deg, origin=(rot_cx, rot_cy))

    result = standing.intersection(working_area)
    return result


# Lookup for algorithm selection
ALGORITHMS = {
    "standing": generate_standing_rows,
}
