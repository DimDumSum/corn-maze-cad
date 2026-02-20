"""
Constraint validation engine.

Validates maze designs against real-world constraints:
- Minimum path width (for visitor passage and equipment access)
- Minimum wall width (to prevent visitors pushing through)
- Inter-path buffer zones (minimum corn rows between parallel paths)
- Edge buffer (distance from field boundary)
- Dead end length limits
- Emergency exit coverage
"""

import math
from typing import List, Dict, Tuple, Optional

import numpy as np
from shapely.geometry import Point, LineString, MultiLineString
from shapely.geometry.base import BaseGeometry
from shapely.ops import nearest_points


class ConstraintEngine:
    """
    Validates maze designs against physical and safety constraints.

    Constraint types:
    - path_width: Minimum navigable path width
    - wall_width: Minimum wall/corn width between paths
    - inter_path_buffer: Minimum corn rows between parallel paths
    - edge_buffer: Minimum distance from field boundary
    - dead_end_length: Maximum dead end corridor length
    """

    def __init__(
        self,
        min_path_width: float = 2.4,      # ~8 feet (standard commercial)
        min_wall_width: float = 2.0,       # ~6.5 feet
        inter_path_buffer: float = 4.6,    # 6 corn rows at 30" spacing
        edge_buffer: float = 3.0,          # 3 meters from field edge
        max_dead_end_length: float = 50.0, # 50 meters
        corn_row_spacing: float = 0.762,   # 30 inches in meters
    ):
        self.min_path_width = min_path_width
        self.min_wall_width = min_wall_width
        self.inter_path_buffer = inter_path_buffer
        self.edge_buffer = edge_buffer
        self.max_dead_end_length = max_dead_end_length
        self.corn_row_spacing = corn_row_spacing

    def validate(
        self,
        walls: BaseGeometry,
        field_boundary: BaseGeometry,
        carved_edges: BaseGeometry = None,
    ) -> List[Dict]:
        """
        Validate maze design against all constraints.

        Returns list of violations with type, message, location, severity.
        """
        violations = []

        if walls is None or walls.is_empty or field_boundary is None:
            return violations

        violations.extend(self.check_path_widths(walls, field_boundary))
        violations.extend(self.check_wall_widths(walls, field_boundary))
        violations.extend(self.check_edge_buffer(walls, field_boundary))
        violations.extend(self.check_inter_path_buffer(walls, field_boundary))
        violations.extend(self.check_dead_end_lengths(walls, field_boundary))

        return violations

    def check_path_widths(
        self,
        walls: BaseGeometry,
        field_boundary: BaseGeometry,
        sample_resolution: float = 3.0,
    ) -> List[Dict]:
        """Check that all paths (gaps between walls) meet minimum width."""
        violations = []
        minx, miny, maxx, maxy = field_boundary.bounds

        if walls is None or walls.is_empty:
            return violations

        wall_buffer = walls.buffer(0.1)

        for x in np.arange(minx + sample_resolution, maxx, sample_resolution):
            for y in np.arange(miny + sample_resolution, maxy, sample_resolution):
                pt = Point(x, y)
                if not field_boundary.contains(pt):
                    continue
                if wall_buffer.contains(pt):
                    continue  # Inside a wall, skip

                # This is a path cell - check distance to nearest wall
                dist = walls.distance(pt)
                if dist < self.min_path_width / 2 and dist > 0.1:
                    violations.append({
                        "type": "path_too_narrow",
                        "severity": "warning",
                        "message": f"Path may be narrow: {dist*2:.1f}m wide (min {self.min_path_width}m)",
                        "location": [round(x, 2), round(y, 2)],
                        "actualValue": round(dist * 2, 2),
                        "requiredValue": self.min_path_width,
                    })

        # Limit violations to avoid overwhelming output
        return violations[:50]

    def check_wall_widths(
        self,
        walls: BaseGeometry,
        field_boundary: BaseGeometry,
    ) -> List[Dict]:
        """Check that wall segments (corn strips) meet minimum width."""
        violations = []

        if walls is None or walls.is_empty:
            return violations

        # Extract individual line segments and check distances between parallel segments
        lines = []
        if walls.geom_type == 'LineString':
            lines = [walls]
        elif walls.geom_type in ('MultiLineString', 'GeometryCollection'):
            for geom in walls.geoms:
                if geom.geom_type == 'LineString':
                    lines.append(geom)

        # Sample-based check: for nearby parallel segments
        for i in range(len(lines)):
            for j in range(i + 1, min(i + 50, len(lines))):
                dist = lines[i].distance(lines[j])
                if 0 < dist < self.min_wall_width:
                    pt1, pt2 = nearest_points(lines[i], lines[j])
                    violations.append({
                        "type": "wall_too_thin",
                        "severity": "error",
                        "message": f"Wall too thin: {dist:.1f}m (min {self.min_wall_width}m)",
                        "location": [round((pt1.x + pt2.x) / 2, 2), round((pt1.y + pt2.y) / 2, 2)],
                        "actualValue": round(dist, 2),
                        "requiredValue": self.min_wall_width,
                    })

        return violations[:50]

    def check_edge_buffer(
        self,
        walls: BaseGeometry,
        field_boundary: BaseGeometry,
    ) -> List[Dict]:
        """Check that maze walls maintain minimum distance from field boundary."""
        violations = []

        if walls is None or walls.is_empty:
            return violations

        inset = field_boundary.buffer(-self.edge_buffer)
        if inset.is_empty:
            return violations

        # Check if any walls extend beyond the inset boundary
        outside = walls.difference(inset)
        if outside.is_empty:
            return violations

        # Get locations of violations
        if outside.geom_type == 'LineString':
            pt = outside.interpolate(0.5, normalized=True)
            violations.append({
                "type": "edge_buffer",
                "severity": "warning",
                "message": f"Maze too close to field edge (min {self.edge_buffer}m buffer)",
                "location": [round(pt.x, 2), round(pt.y, 2)],
                "actualValue": 0,
                "requiredValue": self.edge_buffer,
            })
        elif hasattr(outside, 'geoms'):
            for geom in list(outside.geoms)[:10]:
                if hasattr(geom, 'interpolate'):
                    pt = geom.interpolate(0.5, normalized=True)
                    violations.append({
                        "type": "edge_buffer",
                        "severity": "warning",
                        "message": f"Maze too close to field edge (min {self.edge_buffer}m buffer)",
                        "location": [round(pt.x, 2), round(pt.y, 2)],
                        "actualValue": 0,
                        "requiredValue": self.edge_buffer,
                    })

        return violations[:20]

    def check_inter_path_buffer(
        self,
        walls: BaseGeometry,
        field_boundary: BaseGeometry,
        sample_resolution: float = 5.0,
    ) -> List[Dict]:
        """
        Check inter-path buffer zones.

        Ensures at least 6 corn rows between parallel paths to prevent
        visitors from pushing through thin corn walls.
        """
        violations = []

        if walls is None or walls.is_empty:
            return violations

        # Extract lines
        lines = []
        if walls.geom_type == 'LineString':
            lines = [walls]
        elif walls.geom_type in ('MultiLineString', 'GeometryCollection'):
            for geom in walls.geoms:
                if geom.geom_type == 'LineString':
                    lines.append(geom)

        # Check pairs of nearby wall segments for thin buffer zones
        checked = set()
        for i, line_i in enumerate(lines):
            for j, line_j in enumerate(lines):
                if i >= j:
                    continue
                key = (min(i, j), max(i, j))
                if key in checked:
                    continue
                checked.add(key)

                dist = line_i.distance(line_j)
                if 0 < dist < self.inter_path_buffer and dist > self.min_wall_width:
                    pt1, pt2 = nearest_points(line_i, line_j)
                    corn_rows = int(dist / self.corn_row_spacing)
                    violations.append({
                        "type": "inter_path_buffer",
                        "severity": "warning",
                        "message": f"Only {corn_rows} corn rows between paths ({dist:.1f}m). Need {int(self.inter_path_buffer / self.corn_row_spacing)} rows ({self.inter_path_buffer}m).",
                        "location": [round((pt1.x + pt2.x) / 2, 2), round((pt1.y + pt2.y) / 2, 2)],
                        "actualValue": round(dist, 2),
                        "requiredValue": self.inter_path_buffer,
                    })

                if len(violations) >= 30:
                    return violations

        return violations

    def check_dead_end_lengths(
        self,
        walls: BaseGeometry,
        field_boundary: BaseGeometry,
        tolerance: float = 0.5,
    ) -> List[Dict]:
        """Check for overly long dead ends that frustrate visitors."""
        violations = []

        from collections import defaultdict

        adjacency = defaultdict(set)

        def snap(x, y):
            return (round(x / tolerance) * tolerance, round(y / tolerance) * tolerance)

        def process_line(coords):
            if len(coords) < 2:
                return
            for i in range(len(coords) - 1):
                a = snap(coords[i][0], coords[i][1])
                b = snap(coords[i + 1][0], coords[i + 1][1])
                if a != b:
                    adjacency[a].add(b)
                    adjacency[b].add(a)

        if walls.geom_type == 'LineString':
            process_line(list(walls.coords))
        elif walls.geom_type in ('MultiLineString', 'GeometryCollection'):
            for geom in walls.geoms:
                if geom.geom_type == 'LineString':
                    process_line(list(geom.coords))

        # Find dead ends (degree-1 nodes) and trace their length
        for node, neighbors in adjacency.items():
            if len(neighbors) != 1:
                continue

            # Trace from dead end to first junction
            length = 0
            current = node
            prev = None
            while True:
                nbrs = adjacency.get(current, set())
                next_nodes = [n for n in nbrs if n != prev]
                if not next_nodes or len(nbrs) >= 3:
                    break
                prev = current
                current = next_nodes[0]
                dx = current[0] - prev[0]
                dy = current[1] - prev[1]
                length += math.sqrt(dx * dx + dy * dy)

            if length > self.max_dead_end_length:
                violations.append({
                    "type": "dead_end_too_long",
                    "severity": "warning",
                    "message": f"Dead end too long: {length:.0f}m (max {self.max_dead_end_length}m)",
                    "location": [round(node[0], 2), round(node[1], 2)],
                    "actualValue": round(length, 1),
                    "requiredValue": self.max_dead_end_length,
                })

        return violations[:20]
