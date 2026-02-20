"""
Mazification API Router: Maze generation endpoints.
"""

from fastapi import APIRouter, HTTPException
from state import app_state
from .generators import ALGORITHMS, generate_grid_maze
from geometry.operations import flatten_geometry

router = APIRouter()


@router.get("/generate")
def generate_maze(
    spacing: float = 10.0,
    algorithm: str = "backtracker",
    seed: int = None,
):
    """
    Generate a maze clipped to the field boundary.

    Args:
        spacing: Distance between grid lines in meters (default: 10.0)
        algorithm: Algorithm to use - "grid", "backtracker", or "prims" (default: "backtracker")
        seed: Optional random seed for reproducibility

    Returns:
        { "walls": [[[x, y], ...], ...], "algorithm": str }
    """
    current_field = app_state.get_field()

    if not current_field:
        raise HTTPException(
            status_code=400,
            detail={"error": "Import GPS data first", "error_code": "NO_FIELD"}
        )

    if algorithm not in ALGORITHMS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": f"Unknown algorithm '{algorithm}'. Options: {list(ALGORITHMS.keys())}",
                "error_code": "INVALID_ALGORITHM"
            }
        )

    try:
        gen_func = ALGORITHMS[algorithm]

        # grid generator doesn't accept seed
        if algorithm == "grid":
            walls = gen_func(current_field, spacing=spacing)
        else:
            walls = gen_func(current_field, spacing=spacing, seed=seed)

        app_state.set_walls(walls)

        return {
            "walls": flatten_geometry(walls),
            "algorithm": algorithm,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "error_code": "GENERATION_FAILED"}
        )


@router.get("/algorithms")
def list_algorithms():
    """List available maze generation algorithms."""
    return {
        "algorithms": [
            {
                "id": "grid",
                "name": "Simple Grid",
                "description": "Basic grid pattern - not a true maze, just evenly-spaced lines",
            },
            {
                "id": "backtracker",
                "name": "Recursive Backtracker",
                "description": "Depth-first search maze with long winding corridors. Harder difficulty.",
            },
            {
                "id": "prims",
                "name": "Prim's Algorithm",
                "description": "Random spanning tree maze with many short branches. Easier difficulty.",
            },
        ]
    }
