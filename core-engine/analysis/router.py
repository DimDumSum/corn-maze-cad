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


# === CORN ROW GRID COMPUTATION ===

class CornRowGridRequest(BaseModel):
    row_spacing: float = 0.762  # 30 inches in meters (default)
    cross_planted: bool = True


@router.post("/corn-row-grid")
def compute_corn_row_grid(req: CornRowGridRequest):
    """
    Compute corn row grid lines for the current field.

    Returns grid lines snapped to corn row spacing for overlay display.
    """
    field = app_state.get_field()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})

    try:
        minx, miny, maxx, maxy = field.bounds
        import numpy as np

        h_lines = []
        v_lines = []

        # Vertical lines (N-S planting rows)
        for x in np.arange(minx, maxx, req.row_spacing):
            v_lines.append([[round(x, 4), round(miny, 4)], [round(x, 4), round(maxy, 4)]])

        if req.cross_planted:
            # Horizontal lines (E-W cross-planting rows)
            for y in np.arange(miny, maxy, req.row_spacing):
                h_lines.append([[round(minx, 4), round(y, 4)], [round(maxx, 4), round(y, 4)]])

        return {
            "row_spacing": req.row_spacing,
            "cross_planted": req.cross_planted,
            "v_lines": v_lines,
            "h_lines": h_lines,
            "total_rows": len(v_lines) + len(h_lines),
            "bounds": {"minx": minx, "miny": miny, "maxx": maxx, "maxy": maxy},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
