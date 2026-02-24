"""
DXF (AutoCAD Drawing Exchange Format) export for CAD interoperability.

Exports maze designs as DXF files that can be opened in AutoCAD,
QGIS, and other CAD/GIS applications.
"""

from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

from shapely.geometry import Polygon, LineString, MultiLineString
from shapely.geometry.base import BaseGeometry

from .shapefile import get_downloads_folder
from geometry.operations import densify_curves


def _write_dxf_header() -> str:
    return """  0
SECTION
  2
HEADER
  9
$ACADVER
  1
AC1014
  9
$INSUNITS
 70
6
  0
ENDSEC
  0
SECTION
  2
TABLES
  0
TABLE
  2
LAYER
 70
3
  0
LAYER
  2
BOUNDARY
 70
0
 62
3
  6
CONTINUOUS
  0
LAYER
  2
WALLS
 70
0
 62
5
  6
CONTINUOUS
  0
LAYER
  2
ANNOTATIONS
 70
0
 62
7
  6
CONTINUOUS
  0
ENDTAB
  0
ENDSEC
  0
SECTION
  2
ENTITIES
"""


def _write_dxf_footer() -> str:
    return """  0
ENDSEC
  0
EOF
"""


def _polyline_to_dxf(coords: List[Tuple[float, float]], layer: str, closed: bool = False) -> str:
    lines = []
    lines.append("  0")
    lines.append("LWPOLYLINE")
    lines.append("  8")
    lines.append(layer)
    lines.append(" 90")
    lines.append(str(len(coords)))
    lines.append(" 70")
    lines.append("1" if closed else "0")

    for x, y in coords:
        lines.append(" 10")
        lines.append(f"{x:.6f}")
        lines.append(" 20")
        lines.append(f"{y:.6f}")

    return "\n".join(lines) + "\n"


def _line_to_dxf(coords: List[Tuple[float, float]], layer: str) -> str:
    if len(coords) < 2:
        return ""

    lines = []
    lines.append("  0")
    lines.append("LWPOLYLINE")
    lines.append("  8")
    lines.append(layer)
    lines.append(" 90")
    lines.append(str(len(coords)))
    lines.append(" 70")
    lines.append("0")

    for x, y in coords:
        lines.append(" 10")
        lines.append(f"{x:.6f}")
        lines.append(" 20")
        lines.append(f"{y:.6f}")

    return "\n".join(lines) + "\n"


def _point_to_dxf(x: float, y: float, layer: str, label: str = "") -> str:
    lines = []
    lines.append("  0")
    lines.append("POINT")
    lines.append("  8")
    lines.append(layer)
    lines.append(" 10")
    lines.append(f"{x:.6f}")
    lines.append(" 20")
    lines.append(f"{y:.6f}")

    result = "\n".join(lines) + "\n"

    if label:
        result += "  0\n"
        result += "TEXT\n"
        result += f"  8\n{layer}\n"
        result += f" 10\n{x + 1:.6f}\n"
        result += f" 20\n{y + 1:.6f}\n"
        result += " 40\n2.0\n"
        result += f"  1\n{label}\n"

    return result


def export_maze_dxf(
    field: BaseGeometry,
    walls: BaseGeometry = None,
    entrances: List[Tuple[float, float]] = None,
    exits: List[Tuple[float, float]] = None,
    emergency_exits: List[Tuple[float, float]] = None,
    base_name: str = "maze_design",
    output_dir: Path = None,
) -> Dict:
    """
    Export maze design as a DXF file with separate layers.

    Layers:
    - BOUNDARY: Field boundary polygon
    - WALLS: Maze wall line segments
    - ANNOTATIONS: Entrance/exit/emergency exit points

    Args:
        field: Field boundary polygon (centered coordinates)
        walls: Maze wall geometry (centered coordinates)
        entrances: List of entrance (x,y) points
        exits: List of exit (x,y) points
        emergency_exits: List of emergency exit (x,y) points
        base_name: Output filename stem
        output_dir: Output directory

    Returns:
        {"success": True, "path": str}
    """
    if output_dir is None:
        output_dir = get_downloads_folder()

    output_path = output_dir / f"{base_name}.dxf"
    if output_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = output_dir / f"{base_name}_{timestamp}.dxf"

    content = _write_dxf_header()

    # Write field boundary (densify curves for smooth polylines at sub-metre zoom)
    if field and not field.is_empty:
        coords = list(densify_curves(field).exterior.coords)
        content += _polyline_to_dxf(coords, "BOUNDARY", closed=True)

    # Write maze walls
    wall_count = 0
    if walls and not walls.is_empty:
        def write_line(line_geom):
            nonlocal content, wall_count
            coords = list(line_geom.coords)
            content += _line_to_dxf(coords, "WALLS")
            wall_count += 1

        if walls.geom_type == 'LineString':
            write_line(walls)
        elif walls.geom_type in ('MultiLineString', 'GeometryCollection'):
            for geom in walls.geoms:
                if geom.geom_type == 'LineString':
                    write_line(geom)

    # Write annotations
    if entrances:
        for i, (x, y) in enumerate(entrances):
            content += _point_to_dxf(x, y, "ANNOTATIONS", f"ENTRANCE {i+1}")
    if exits:
        for i, (x, y) in enumerate(exits):
            content += _point_to_dxf(x, y, "ANNOTATIONS", f"EXIT {i+1}")
    if emergency_exits:
        for i, (x, y) in enumerate(emergency_exits):
            content += _point_to_dxf(x, y, "ANNOTATIONS", f"EMRG EXIT {i+1}")

    content += _write_dxf_footer()

    with open(output_path, 'w') as f:
        f.write(content)

    return {
        "success": True,
        "path": str(output_path),
        "wall_count": wall_count,
    }
