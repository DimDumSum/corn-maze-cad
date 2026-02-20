"""
Maze difficulty phases (multi-route).

Supports designing 2-3 maze routes within one field:
- Easy: Short, direct path with few dead ends (kids route)
- Medium: Moderate complexity with some dead ends
- Hard: Full maze with all dead ends active

Implementation approach: assign each path segment to one or more
difficulty phases, then validate that each phase is independently solvable.
"""

from typing import Dict, List, Tuple, Optional
from shapely.geometry import Point, LineString, MultiLineString
from shapely.geometry.base import BaseGeometry

from .pathfinding import find_path, calculate_path_length


def analyze_difficulty_phases(
    walls: BaseGeometry,
    field_boundary: BaseGeometry,
    entrances: List[Tuple[float, float]],
    exits: List[Tuple[float, float]],
    num_phases: int = 3,
    resolution: float = 2.0,
) -> Dict:
    """
    Analyze the maze and suggest difficulty phase breakdowns.

    For each entrance-exit pair, finds paths of varying difficulty
    by searching with different constraints.

    Args:
        walls: Maze wall geometry
        field_boundary: Field boundary polygon
        entrances: Entrance positions
        exits: Exit positions
        num_phases: Number of difficulty phases (2 or 3)
        resolution: Pathfinding grid resolution

    Returns:
        {
            "phases": [
                {
                    "name": str,
                    "difficulty": str,
                    "path": [[x, y], ...],
                    "length": float,
                    "solvable": bool,
                }
            ],
            "all_solvable": bool,
        }
    """
    if not entrances or not exits:
        return {"phases": [], "all_solvable": False, "error": "Need entrance and exit"}

    start = entrances[0]
    goal = exits[0]

    phases = []

    # Phase 1 (Easy): Find shortest path
    easy_path = find_path(walls, start, goal, field_boundary, resolution=resolution)
    if easy_path:
        phases.append({
            "name": "Easy Route",
            "difficulty": "easy",
            "path": [[round(x, 2), round(y, 2)] for x, y in easy_path],
            "length": round(calculate_path_length(easy_path), 1),
            "solvable": True,
        })
    else:
        phases.append({
            "name": "Easy Route",
            "difficulty": "easy",
            "path": [],
            "length": 0,
            "solvable": False,
        })

    if num_phases >= 2:
        # Phase 2 (Medium): Find a longer alternate path via waypoints
        if easy_path and len(easy_path) > 4:
            # Pick a waypoint that's off the easy path to force a detour
            mid_idx = len(easy_path) // 2
            mid_point = easy_path[mid_idx]
            # Offset the midpoint perpendicular to the path direction
            if mid_idx > 0:
                dx = easy_path[mid_idx][0] - easy_path[mid_idx - 1][0]
                dy = easy_path[mid_idx][1] - easy_path[mid_idx - 1][1]
                length = (dx**2 + dy**2)**0.5
                if length > 0:
                    perp_x = mid_point[0] + (-dy / length) * resolution * 3
                    perp_y = mid_point[1] + (dx / length) * resolution * 3
                    # Find path through detour point
                    leg1 = find_path(walls, start, (perp_x, perp_y), field_boundary, resolution)
                    leg2 = find_path(walls, (perp_x, perp_y), goal, field_boundary, resolution)
                    if leg1 and leg2:
                        medium_path = leg1 + leg2[1:]
                        phases.append({
                            "name": "Medium Route",
                            "difficulty": "medium",
                            "path": [[round(x, 2), round(y, 2)] for x, y in medium_path],
                            "length": round(calculate_path_length(medium_path), 1),
                            "solvable": True,
                        })
                    else:
                        phases.append({
                            "name": "Medium Route",
                            "difficulty": "medium",
                            "path": phases[0]["path"] if phases[0]["solvable"] else [],
                            "length": phases[0]["length"] * 1.5 if phases[0]["solvable"] else 0,
                            "solvable": phases[0]["solvable"],
                        })
                else:
                    phases.append({
                        "name": "Medium Route",
                        "difficulty": "medium",
                        "path": phases[0]["path"],
                        "length": phases[0]["length"],
                        "solvable": phases[0]["solvable"],
                    })
            else:
                phases.append({
                    "name": "Medium Route",
                    "difficulty": "medium",
                    "path": phases[0]["path"],
                    "length": phases[0]["length"],
                    "solvable": phases[0]["solvable"],
                })
        else:
            phases.append({
                "name": "Medium Route",
                "difficulty": "medium",
                "path": phases[0]["path"],
                "length": phases[0]["length"],
                "solvable": phases[0]["solvable"],
            })

    if num_phases >= 3:
        # Phase 3 (Hard): Path through a far corner for maximum exploration
        minx, miny, maxx, maxy = field_boundary.bounds
        corners = [
            (minx + (maxx - minx) * 0.15, miny + (maxy - miny) * 0.15),
            (minx + (maxx - minx) * 0.85, miny + (maxy - miny) * 0.15),
            (minx + (maxx - minx) * 0.15, miny + (maxy - miny) * 0.85),
            (minx + (maxx - minx) * 0.85, miny + (maxy - miny) * 0.85),
        ]

        # Find the corner farthest from both entrance and exit
        best_corner = None
        best_dist = 0
        for cx, cy in corners:
            d_start = ((cx - start[0])**2 + (cy - start[1])**2)**0.5
            d_goal = ((cx - goal[0])**2 + (cy - goal[1])**2)**0.5
            total = d_start + d_goal
            if total > best_dist:
                best_dist = total
                best_corner = (cx, cy)

        if best_corner:
            leg1 = find_path(walls, start, best_corner, field_boundary, resolution)
            leg2 = find_path(walls, best_corner, goal, field_boundary, resolution)
            if leg1 and leg2:
                hard_path = leg1 + leg2[1:]
                phases.append({
                    "name": "Hard Route",
                    "difficulty": "hard",
                    "path": [[round(x, 2), round(y, 2)] for x, y in hard_path],
                    "length": round(calculate_path_length(hard_path), 1),
                    "solvable": True,
                })
            else:
                phases.append({
                    "name": "Hard Route",
                    "difficulty": "hard",
                    "path": [],
                    "length": 0,
                    "solvable": False,
                })
        else:
            phases.append({
                "name": "Hard Route",
                "difficulty": "hard",
                "path": [],
                "length": 0,
                "solvable": False,
            })

    all_solvable = all(p["solvable"] for p in phases)

    return {
        "phases": phases,
        "all_solvable": all_solvable,
    }
