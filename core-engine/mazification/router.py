"""
Mazification API Router: Maze generation endpoints.
"""

from fastapi import APIRouter, HTTPException
from state import app_state
from .generators import generate_grid_maze
from geometry.operations import flatten_geometry

router = APIRouter()


@router.get("/generate")
def generate_maze(spacing: float = 10.0):
    """
    Generate a grid maze clipped to field boundary.

    Creates evenly-spaced horizontal and vertical lines
    at the specified spacing, clipped to the field boundary.

    Args:
        spacing: Distance between grid lines in meters (default: 10.0)

    Returns:
        {
            "walls": [[[x, y], ...], ...]  # Flattened line segments
        }

    Errors:
        - 400: No field boundary (import GPS data first)
    """
    current_field = app_state.get_field()

    if not current_field:
        raise HTTPException(
            status_code=400,
            detail={"error": "Import GPS data first", "error_code": "NO_FIELD"}
        )

    try:
        # Generate grid maze
        walls = generate_grid_maze(current_field, spacing=spacing)

        # Update state
        app_state.set_walls(walls)

        # Return flattened walls
        return {"walls": flatten_geometry(walls)}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "error_code": "GENERATION_FAILED"}
        )
