"""
Export API Router: Shapefile and report export endpoints.
"""

from fastapi import APIRouter, HTTPException
from state import app_state
from .shapefile import export_walls_to_shapefile

router = APIRouter()


@router.get("/shapefile")
def export_shapefile_endpoint():
    """
    Export current maze walls to ESRI Shapefile format.

    Creates .shp, .shx, .dbf, and .prj files in the Downloads folder.
    Automatically adds timestamp if file already exists.

    Returns:
        {
            "success": bool,
            "path": str (path to .shp file),
            "files": [str, ...] (all generated file paths)
        }

    Errors:
        - 400: No maze to export (generate maze first)
        - 500: Export failed
    """
    current_walls = app_state.get_walls()

    if not current_walls:
        raise HTTPException(
            status_code=400,
            detail={"error": "No maze to export", "error_code": "NO_MAZE"}
        )

    try:
        result = export_walls_to_shapefile(current_walls)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "error_code": "EXPORT_FAILED"}
        )
