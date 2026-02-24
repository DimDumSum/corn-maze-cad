"""
Geometric operations for maze manipulation.

Provides buffer, intersection, union, difference operations
for maze path carving and wall modifications.
"""

import math
from shapely.geometry import LineString, MultiLineString, GeometryCollection
from shapely.geometry.base import BaseGeometry
from typing import List, Tuple, Optional

# ---------------------------------------------------------------------------
# Curve-smoothing constants
# ---------------------------------------------------------------------------

# Maximum chord deviation from the true arc (metres / same units as geometry).
# At 90 quad_segs and 2 m radius the actual deviation is ~0.5 mm, well under 15 cm.
MAX_CHORD_DEV: float = 0.15  # 15 cm = 6 inches

# Segments per quadrant for smooth_buffer().  90 → 1 vertex per degree of arc.
SMOOTH_QUAD_SEGS: int = 90


def smooth_buffer(geom: BaseGeometry, dist: float, **kwargs) -> BaseGeometry:
    """
    Buffer *geom* by *dist* with high vertex density on curved sections.

    Uses SMOOTH_QUAD_SEGS (90 segments/quadrant = 1 vertex/degree) so that
    every buffered arc has a chord deviation of at most ~MAX_CHORD_DEV (15 cm)
    for all practical path radii.

    Pass-through kwargs are forwarded to Shapely's buffer() unchanged
    (e.g. cap_style, join_style, single_sided).

    Returns the buffered geometry.
    """
    return geom.buffer(dist, quad_segs=SMOOTH_QUAD_SEGS, **kwargs)


# ---------------------------------------------------------------------------
# Curve densification helpers
# ---------------------------------------------------------------------------

def _circumscribed_circle(
    p0: Tuple[float, float],
    p1: Tuple[float, float],
    p2: Tuple[float, float],
) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    """Return (cx, cy, R) of the circumscribed circle of three points.

    Returns (None, None, None) if the points are collinear.
    """
    ax, ay = p0
    bx, by = p1
    cx, cy = p2
    d = 2.0 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if abs(d) < 1e-9:
        return None, None, None
    ux = ((ax*ax+ay*ay)*(by-cy) + (bx*bx+by*by)*(cy-ay) + (cx*cx+cy*cy)*(ay-by)) / d
    uy = ((ax*ax+ay*ay)*(cx-bx) + (bx*bx+by*by)*(ax-cx) + (cx*cx+cy*cy)*(bx-ax)) / d
    R = math.sqrt((ax - ux)**2 + (ay - uy)**2)
    return ux, uy, R


def _arc_midpoint(
    p0: Tuple[float, float],
    p1: Tuple[float, float],
    center: Tuple[float, float],
    R: float,
) -> Tuple[float, float]:
    """Return the midpoint on the shorter arc from *p0* to *p1*."""
    mx = (p0[0] + p1[0]) / 2.0 - center[0]
    my = (p0[1] + p1[1]) / 2.0 - center[1]
    mag = math.sqrt(mx * mx + my * my)
    if mag < 1e-12:
        return ((p0[0] + p1[0]) / 2.0, (p0[1] + p1[1]) / 2.0)
    return (center[0] + R * mx / mag, center[1] + R * my / mag)


def _subdivide_arc(
    p0: Tuple[float, float],
    p1: Tuple[float, float],
    cx: float,
    cy: float,
    R: float,
    max_dev: float,
) -> List[Tuple[float, float]]:
    """Recursively subdivide the arc segment p0→p1 on circle (cx, cy, R).

    Returns a list of points *after* p0 (inclusive of p1).
    Recurses until chord deviation ≤ max_dev.
    """
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    chord = math.sqrt(dx * dx + dy * dy)
    half = chord / 2.0
    if half >= R or R > 1e9:
        return [p1]
    sagitta = R - math.sqrt(max(0.0, R * R - half * half))
    if sagitta <= max_dev:
        return [p1]
    mid = _arc_midpoint(p0, p1, (cx, cy), R)
    return (
        _subdivide_arc(p0, mid, cx, cy, R, max_dev)
        + _subdivide_arc(mid, p1, cx, cy, R, max_dev)
    )


def _densify_coords(
    coords: List[Tuple[float, float]],
    max_dev: float,
    closed: bool,
) -> List[Tuple[float, float]]:
    """Densify a coordinate sequence by arc-subdividing curved sections.

    Uses a forward-looking circumscribed-circle fit on each consecutive triple
    to detect locally circular sections and inserts arc-interpolated midpoints
    until chord deviation ≤ max_dev.  Straight sections (collinear triples or
    very large radius) are left unchanged.

    Args:
        coords: Input coordinate sequence.
        max_dev: Maximum allowed chord deviation.
        closed: If True, the last vertex connects back to the first (ring).

    Returns:
        Densified coordinate list.
    """
    n = len(coords)
    if n < 3:
        return list(coords)

    out = [coords[0]]
    segs = n if closed else n - 1

    for i in range(segs):
        p0 = coords[i]
        p1 = coords[(i + 1) % n]
        # Forward triple when available; for the last open-line segment fall
        # back to the backward triple so we still have three distinct points.
        if not closed and i == n - 2:
            triple = (coords[n - 3], coords[n - 2], coords[n - 1])
        else:
            triple = (p0, p1, coords[(i + 2) % n])

        ocx, ocy, oR = _circumscribed_circle(*triple)
        if ocx is None or oR > 1e8:
            # Collinear or effectively straight — no densification needed.
            out.append(p1)
        else:
            out.extend(_subdivide_arc(p0, p1, ocx, ocy, oR, max_dev))

    return out


def densify_curves(
    geom: BaseGeometry,
    max_chord_dev: float = MAX_CHORD_DEV,
) -> BaseGeometry:
    """
    Densify curved sections of any Shapely geometry.

    Detects locally circular sections using a circumscribed-circle fit on
    consecutive vertex triples and inserts arc-interpolated midpoints by
    recursive subdivision until chord deviation ≤ *max_chord_dev*
    (default: 0.15 m = 6 inches).

    Straight sections are left unchanged.  The function is safe to call on
    any Shapely geometry type and handles nested types (MultiPolygon,
    GeometryCollection, etc.) recursively.

    Intended as a final pass **before coordinate extraction for export** so
    that buffered circles, arc end-caps, and rounded corners appear smooth at
    sub-metre zoom levels without any post-processing by the receiving
    application.

    Args:
        geom: Any Shapely geometry (projected coordinates in metres).
        max_chord_dev: Maximum chord deviation in the same units as the
                       geometry (default: 0.15 m).

    Returns:
        A new Shapely geometry of the same type with curved sections
        densified to meet the chord-deviation requirement.
    """
    from shapely.geometry import (
        LinearRing, Polygon, MultiPolygon,
    )

    if geom is None or geom.is_empty:
        return geom

    t = geom.geom_type

    if t in ('Point', 'MultiPoint'):
        return geom

    if t == 'LineString':
        return LineString(_densify_coords(list(geom.coords), max_chord_dev, closed=False))

    if t == 'LinearRing':
        # Drop the repeated closing vertex before densifying.
        return LinearRing(_densify_coords(list(geom.coords)[:-1], max_chord_dev, closed=True))

    if t == 'Polygon':
        ext = _densify_coords(list(geom.exterior.coords)[:-1], max_chord_dev, closed=True)
        holes = [
            _densify_coords(list(h.coords)[:-1], max_chord_dev, closed=True)
            for h in geom.interiors
        ]
        return Polygon(ext, holes)

    if t == 'MultiLineString':
        return MultiLineString([densify_curves(ls, max_chord_dev) for ls in geom.geoms])

    if t == 'MultiPolygon':
        return MultiPolygon([densify_curves(p, max_chord_dev) for p in geom.geoms])

    if t == 'GeometryCollection':
        return GeometryCollection([densify_curves(g, max_chord_dev) for g in geom.geoms])

    return geom  # Unknown type — pass through unchanged.


def flatten_geometry(geom: BaseGeometry) -> List[List[Tuple[float, float]]]:
    """
    Recursively flatten MultiLineString/GeometryCollection to list of line segments.

    Args:
        geom: Shapely geometry (LineString, MultiLineString, or GeometryCollection)

    Returns:
        List of coordinate lists, where each list represents a line segment

    Example:
        >>> line = LineString([(0, 0), (1, 1), (2, 2)])
        >>> flatten_geometry(line)
        [[(0.0, 0.0), (1.0, 1.0), (2.0, 2.0)]]
    """
    lines = []

    if geom is None or geom.is_empty:
        return lines

    if geom.geom_type == 'LineString':
        lines.append(list(geom.coords))
    elif geom.geom_type in ['MultiLineString', 'GeometryCollection']:
        for part in geom.geoms:
            lines.extend(flatten_geometry(part))

    return lines


def carve_path(
    walls: BaseGeometry,
    points: List[Tuple[float, float]],
    width: float,
    field_boundary: BaseGeometry = None
) -> Tuple[BaseGeometry, str | None]:
    """
    Carve a path through maze walls using boolean difference.

    Creates a buffer around the path line and subtracts it from
    the walls geometry.

    Args:
        walls: Current maze walls geometry
        points: List of (x, y) coordinates defining the path
        width: Width of the path in meters
        field_boundary: Optional field boundary to check if path is inside

    Returns:
        Tuple of (updated walls geometry, warning message or None)

    Raises:
        ValueError: If points list has fewer than 2 points

    Example:
        >>> walls = MultiLineString([...])
        >>> points = [(0, 0), (10, 10)]
        >>> new_walls, warning = carve_path(walls, points, width=4.0)
    """
    if len(points) < 2:
        raise ValueError("Path too short (need at least 2 points)")

    # Create path LineString
    path_line = LineString(points)

    # Buffer to create eraser polygon (round caps, high vertex density)
    eraser = smooth_buffer(path_line, width / 2.0, cap_style=1)

    # Check if path intersects field boundary (warning, not error)
    if field_boundary and not eraser.intersects(field_boundary):
        # Path entirely outside - return unchanged
        return walls, "Path outside field boundary"

    # Boolean difference
    updated_walls = walls.difference(eraser)

    return updated_walls, None
