"""
Analysis API Router: Maze metrics and pathfinding endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Tuple
from state import app_state
from .metrics import analyze_maze
from .pathfinding import find_path, calculate_path_length

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
