"""
Analysis API Router: Maze metrics, pathfinding, entrance/exit management,
emergency exits, flow simulation, difficulty phases, drone alignment,
constraint validation, and MazeGPS import.
"""

import json
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List, Tuple
from state import app_state
from .metrics import analyze_maze
from .pathfinding import find_path, calculate_path_length, is_solvable
from .emergency import analyze_emergency_exits, suggest_emergency_exits
from .flow_simulation import simulate_visitor_flow
from .difficulty_phases import analyze_difficulty_phases
from .drone_alignment import align_drone_photo
from constraints.engine import ConstraintEngine

router = APIRouter()


class PathfindRequest(BaseModel):
    start: Tuple[float, float]
    goal: Tuple[float, float]
    resolution: float = 2.0


@router.get("/metrics")
def get_maze_metrics():
    """
    Get comprehensive metrics for the current maze.

    Returns difficulty score, dead end count, junction count, etc.
    """
    field = app_state.get_field()
    walls = app_state.get_walls()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})
    if not walls:
        raise HTTPException(status_code=400, detail={"error": "No maze generated"})

    try:
        metrics = analyze_maze(walls, field)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


@router.post("/find-path")
def find_path_endpoint(req: PathfindRequest):
    """
    Find a path through the maze from start to goal using A*.

    Returns the path as a list of waypoints, or null if unsolvable.
    """
    field = app_state.get_field()
    walls = app_state.get_walls()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})
    if not walls:
        raise HTTPException(status_code=400, detail={"error": "No maze generated"})

    try:
        path = find_path(walls, req.start, req.goal, field, resolution=req.resolution)

        if path is None:
            return {
                "solvable": False,
                "path": None,
                "length": 0,
            }

        return {
            "solvable": True,
            "path": path,
            "length": round(calculate_path_length(path), 1),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


# === ENTRANCE / EXIT MANAGEMENT ===

class EntranceExitRequest(BaseModel):
    entrances: List[Tuple[float, float]] = []
    exits: List[Tuple[float, float]] = []


@router.post("/set-entrances-exits")
def set_entrances_exits(req: EntranceExitRequest):
    """Set maze entrance and exit positions."""
    app_state.set_entrances(req.entrances)
    app_state.set_exits(req.exits)
    return {
        "success": True,
        "entrances": req.entrances,
        "exits": req.exits,
    }


@router.get("/entrances-exits")
def get_entrances_exits():
    """Get current entrance and exit positions."""
    return {
        "entrances": app_state.get_entrances(),
        "exits": app_state.get_exits(),
    }


# === SOLVABILITY CHECK ===

@router.post("/verify-solvable")
def verify_solvable(resolution: float = 2.0):
    """
    Verify that the maze is solvable from all entrances to all exits.

    Returns per-pair solvability and overall result.
    """
    field = app_state.get_field()
    walls = app_state.get_walls()
    entrances = app_state.get_entrances()
    exits = app_state.get_exits()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})
    if not walls:
        raise HTTPException(status_code=400, detail={"error": "No maze generated"})
    if not entrances:
        raise HTTPException(status_code=400, detail={"error": "No entrances set"})
    if not exits:
        raise HTTPException(status_code=400, detail={"error": "No exits set"})

    results = []
    all_solvable = True

    for i, entrance in enumerate(entrances):
        for j, exit_pt in enumerate(exits):
            path = find_path(walls, entrance, exit_pt, field, resolution=resolution)
            solvable = path is not None
            length = round(calculate_path_length(path), 1) if path else 0

            results.append({
                "entrance_idx": i,
                "exit_idx": j,
                "entrance": list(entrance),
                "exit": list(exit_pt),
                "solvable": solvable,
                "path_length": length,
                "path": [[round(x, 2), round(y, 2)] for x, y in path] if path else None,
            })

            if not solvable:
                all_solvable = False

    return {
        "all_solvable": all_solvable,
        "results": results,
    }


# === EMERGENCY EXIT MANAGEMENT ===

class EmergencyExitRequest(BaseModel):
    positions: List[Tuple[float, float]]


@router.post("/set-emergency-exits")
def set_emergency_exits(req: EmergencyExitRequest):
    """Set emergency exit positions."""
    app_state.set_emergency_exits(req.positions)
    return {"success": True, "count": len(req.positions)}


@router.get("/emergency-exits")
def get_emergency_exits():
    """Get current emergency exit positions."""
    return {"positions": app_state.get_emergency_exits()}


class EmergencyAnalysisRequest(BaseModel):
    max_distance: float = 50.0
    resolution: float = 3.0


@router.post("/analyze-emergency-coverage")
def analyze_emergency_coverage(req: EmergencyAnalysisRequest):
    """Analyze emergency exit coverage and identify uncovered areas."""
    field = app_state.get_field()
    walls = app_state.get_walls()
    exits = app_state.get_emergency_exits()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})

    try:
        result = analyze_emergency_exits(
            walls, field, exits,
            max_distance=req.max_distance,
            resolution=req.resolution,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


@router.post("/suggest-emergency-exits")
def suggest_emergency_exits_endpoint(req: EmergencyAnalysisRequest):
    """Suggest optimal emergency exit positions for full coverage."""
    field = app_state.get_field()
    walls = app_state.get_walls()
    existing = app_state.get_emergency_exits()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})

    try:
        suggestions = suggest_emergency_exits(
            walls, field, existing,
            max_distance=req.max_distance,
            resolution=req.resolution,
        )
        return {"suggestions": [list(s) for s in suggestions]}
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


# === CONSTRAINT VALIDATION ===

class ConstraintValidationRequest(BaseModel):
    min_path_width: float = 2.4
    min_wall_width: float = 2.0
    inter_path_buffer: float = 4.6
    edge_buffer: float = 3.0
    max_dead_end_length: float = 50.0
    corn_row_spacing: float = 0.762


@router.post("/validate-constraints")
def validate_constraints(req: ConstraintValidationRequest):
    """Run the full constraint engine against the current maze."""
    field = app_state.get_field()
    walls = app_state.get_walls()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})
    if not walls:
        raise HTTPException(status_code=400, detail={"error": "No maze generated"})

    try:
        engine = ConstraintEngine(
            min_path_width=req.min_path_width,
            min_wall_width=req.min_wall_width,
            inter_path_buffer=req.inter_path_buffer,
            edge_buffer=req.edge_buffer,
            max_dead_end_length=req.max_dead_end_length,
            corn_row_spacing=req.corn_row_spacing,
        )
        violations = engine.validate(walls, field)

        return {
            "valid": len(violations) == 0,
            "violation_count": len(violations),
            "violations": violations,
            "summary": {
                "path_width": sum(1 for v in violations if v["type"] == "path_too_narrow"),
                "wall_width": sum(1 for v in violations if v["type"] == "wall_too_thin"),
                "edge_buffer": sum(1 for v in violations if v["type"] == "edge_buffer"),
                "inter_path_buffer": sum(1 for v in violations if v["type"] == "inter_path_buffer"),
                "dead_end_length": sum(1 for v in violations if v["type"] == "dead_end_too_long"),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


# === VISITOR FLOW SIMULATION ===

class FlowSimulationRequest(BaseModel):
    num_visitors: int = 100
    resolution: float = 2.0
    seed: Optional[int] = None


@router.post("/simulate-flow")
def simulate_flow(req: FlowSimulationRequest):
    """
    Simulate visitor flow through the maze.

    Identifies bottleneck paths and estimates solve rate.
    """
    field = app_state.get_field()
    walls = app_state.get_walls()
    entrances = app_state.get_entrances()
    exits = app_state.get_exits()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})
    if not entrances or not exits:
        raise HTTPException(status_code=400, detail={"error": "Set entrances and exits first"})

    try:
        result = simulate_visitor_flow(
            walls, field, entrances, exits,
            num_visitors=req.num_visitors,
            resolution=req.resolution,
            seed=req.seed,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


# === DIFFICULTY PHASES ===

class DifficultyPhasesRequest(BaseModel):
    num_phases: int = 3
    resolution: float = 2.0


@router.post("/difficulty-phases")
def get_difficulty_phases(req: DifficultyPhasesRequest):
    """Analyze and suggest difficulty phase routes (easy/medium/hard)."""
    field = app_state.get_field()
    walls = app_state.get_walls()
    entrances = app_state.get_entrances()
    exits = app_state.get_exits()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})
    if not walls:
        raise HTTPException(status_code=400, detail={"error": "No maze generated"})
    if not entrances or not exits:
        raise HTTPException(status_code=400, detail={"error": "Set entrances and exits first"})

    try:
        result = analyze_difficulty_phases(
            walls, field, entrances, exits,
            num_phases=req.num_phases,
            resolution=req.resolution,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


# === DRONE PHOTO ALIGNMENT ===

class DroneAlignmentRequest(BaseModel):
    image_data: str  # Base64 encoded image
    control_points: Optional[List[dict]] = None


@router.post("/align-drone-photo")
def align_drone_photo_endpoint(req: DroneAlignmentRequest):
    """
    Align a drone photo to the maze design coordinate system.
    """
    field = app_state.get_field()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})

    try:
        result = align_drone_photo(
            req.image_data, field,
            control_points=req.control_points,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


# === MAZEGPS IMPORT ===

class MazeGPSImportRequest(BaseModel):
    tracking_data: List[dict]  # [{"lat": float, "lon": float, "timestamp": str, "visitor_id": str}]


@router.post("/import-mazegps")
def import_mazegps_data(req: MazeGPSImportRequest):
    """
    Import visitor tracking data from MazeGPS for analysis.

    Converts GPS tracks to design coordinates and generates
    a visit frequency heatmap.
    """
    field = app_state.get_field()
    crs = app_state.get_crs()
    offset = app_state.get_centroid_offset()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})
    if not crs:
        raise HTTPException(status_code=400, detail={"error": "No CRS set"})

    try:
        import pyproj
        transformer = pyproj.Transformer.from_crs("EPSG:4326", crs, always_xy=True)
        cx, cy = offset

        # Convert GPS positions to design coordinates
        design_points = []
        for point in req.tracking_data:
            px, py = transformer.transform(point["lon"], point["lat"])
            design_points.append({
                "x": round(px - cx, 2),
                "y": round(py - cy, 2),
                "visitor_id": point.get("visitor_id", "unknown"),
                "timestamp": point.get("timestamp", ""),
            })

        # Group by visitor
        visitors = {}
        for pt in design_points:
            vid = pt["visitor_id"]
            if vid not in visitors:
                visitors[vid] = []
            visitors[vid].append(pt)

        return {
            "success": True,
            "total_points": len(design_points),
            "visitor_count": len(visitors),
            "design_points": design_points[:1000],  # Limit response size
            "visitors": {k: len(v) for k, v in visitors.items()},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


# === PLANTER-BASED ROW GRID ===

class PlanterGridRequest(BaseModel):
    planter_rows: int = 16          # Number of rows on the planter
    spacing_inches: float = 30.0    # Row spacing in inches
    direction_deg: float = 0.0      # Planting direction: 0=North, 90=East
    headlands: int = 2              # Number of headland passes around perimeter


@router.post("/planter-grid")
def compute_planter_grid(req: PlanterGridRequest):
    """
    Compute planted row grid based on real planter specs.

    Generates parallel row lines at the given spacing and direction,
    with headland passes inset from the field boundary.
    """
    from shapely.geometry import LineString, Polygon
    from shapely import affinity
    import numpy as np
    import math

    field = app_state.get_field()
    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})

    try:
        row_spacing_m = req.spacing_inches * 0.0254  # inches to meters
        planter_width = req.planter_rows * row_spacing_m
        headland_inset = req.headlands * planter_width

        # Inset field boundary for headlands
        headland_poly = None
        planting_area = field
        if headland_inset > 0:
            inset = field.buffer(-headland_inset)
            if not inset.is_empty and inset.area > 0:
                # Handle MultiPolygon from buffer
                if inset.geom_type == 'MultiPolygon':
                    planting_area = max(inset.geoms, key=lambda g: g.area)
                else:
                    planting_area = inset
                headland_poly = planting_area

        # Generate parallel lines covering the entire field at the planting direction
        # Use the full field bounds to ensure complete coverage
        minx, miny, maxx, maxy = field.bounds
        cx = (minx + maxx) / 2
        cy = (miny + maxy) / 2

        # The field diagonal gives the max distance we need to cover
        diagonal = math.sqrt((maxx - minx) ** 2 + (maxy - miny) ** 2)
        half_diag = diagonal / 2 + row_spacing_m  # Add buffer

        # Direction angle: 0 = North (vertical rows), 90 = East (horizontal rows)
        # Convert to math angle: planting direction is the direction rows run,
        # so rows are parallel to the direction vector
        angle_rad = math.radians(req.direction_deg)

        # Unit vector perpendicular to planting direction (for stepping across rows)
        perp_x = math.cos(angle_rad)   # For 0° (North): perp is East (1,0)
        perp_y = math.sin(angle_rad)

        # Unit vector along planting direction (for the row lines)
        dir_x = -math.sin(angle_rad)   # For 0° (North): direction is North (0,1) → (-sin0, cos0) = (0,1)
        dir_y = math.cos(angle_rad)

        # Generate lines perpendicular to the stepping direction
        num_steps = int(2 * half_diag / row_spacing_m) + 1
        start_offset = -half_diag

        row_lines = []
        for i in range(num_steps):
            offset = start_offset + i * row_spacing_m
            # Center point of this row
            px = cx + offset * perp_x
            py = cy + offset * perp_y
            # Line endpoints extending in the planting direction
            x1 = px - half_diag * dir_x
            y1 = py - half_diag * dir_y
            x2 = px + half_diag * dir_x
            y2 = py + half_diag * dir_y

            line = LineString([(x1, y1), (x2, y2)])
            # Clip to field boundary
            clipped = line.intersection(field)

            if clipped.is_empty:
                continue

            # Handle multi-line results from clipping
            if clipped.geom_type == 'LineString' and len(clipped.coords) >= 2:
                coords = [[round(c[0], 4), round(c[1], 4)] for c in clipped.coords]
                row_lines.append(coords)
            elif clipped.geom_type == 'MultiLineString':
                for segment in clipped.geoms:
                    if len(segment.coords) >= 2:
                        coords = [[round(c[0], 4), round(c[1], 4)] for c in segment.coords]
                        row_lines.append(coords)

        # Headland boundary polygon coordinates
        headland_boundary_coords = None
        if headland_poly is not None:
            ext = headland_poly.exterior.coords
            headland_boundary_coords = [[round(c[0], 4), round(c[1], 4)] for c in ext]

        return {
            "planter_config": {
                "rows": req.planter_rows,
                "spacing_inches": req.spacing_inches,
                "direction_deg": req.direction_deg,
                "headlands": req.headlands,
            },
            "row_lines": row_lines,
            "headland_boundary": headland_boundary_coords,
            "planter_width": round(planter_width, 4),
            "headland_inset": round(headland_inset, 4),
            "total_rows": len(row_lines),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
