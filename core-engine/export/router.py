"""
Export API Router: Shapefile, KML, and georeferenced PNG export endpoints.
"""

from fastapi import APIRouter, HTTPException, Query
from state import app_state
from .shapefile import export_walls_to_shapefile
from .kml import export_boundary_kml, export_walls_kml
from .png import export_georeferenced_png

router = APIRouter()


@router.get("/shapefile")
def export_shapefile_endpoint():
    """
    Export current maze walls to ESRI Shapefile format.

    Creates .shp, .shx, .dbf, and .prj files in the Downloads folder.
    """
    current_walls = app_state.get_walls()

    if not current_walls:
        raise HTTPException(
            status_code=400,
            detail={"error": "No maze to export", "error_code": "NO_MAZE"}
        )

    try:
        crs = app_state.get_crs() or "EPSG:3857"
        result = export_walls_to_shapefile(current_walls, crs=crs)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "error_code": "EXPORT_FAILED"}
        )


@router.get("/kml")
def export_kml_endpoint(
    name: str = Query("maze", description="Base name for output files"),
    wall_buffer: float = Query(1.0, description="Buffer width (meters) to convert wall lines to polygons"),
):
    """
    Export maze as two KML files for MazeGPS:
    - {name}_outer.kml — field boundary polygon
    - {name}_walls.kml — maze wall polygons

    Returns:
        {
            "success": bool,
            "boundary_path": str,
            "walls_path": str,
            "wall_count": int
        }
    """
    field = app_state.get_field()
    walls = app_state.get_walls()
    crs = app_state.get_crs()
    offset = app_state.get_centroid_offset()

    if not field:
        raise HTTPException(
            status_code=400,
            detail={"error": "No field boundary to export", "error_code": "NO_FIELD"}
        )

    if not crs:
        raise HTTPException(
            status_code=400,
            detail={"error": "No CRS set — import a field first", "error_code": "NO_CRS"}
        )

    try:
        # Export boundary KML
        boundary_result = export_boundary_kml(
            field, crs, offset, base_name=f"{name}_outer"
        )

        walls_result = {"path": None, "wall_count": 0}

        # Export walls KML (only if maze exists)
        if walls and not walls.is_empty:
            walls_result = export_walls_kml(
                walls, crs, offset,
                wall_buffer=wall_buffer,
                base_name=f"{name}_walls",
            )

        return {
            "success": True,
            "boundary_path": boundary_result["path"],
            "walls_path": walls_result.get("path"),
            "wall_count": walls_result.get("wall_count", 0),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "error_code": "EXPORT_FAILED"}
        )


@router.get("/png")
def export_png_endpoint(
    name: str = Query("maze_design", description="Base name for output files"),
    width: int = Query(800, description="Image width in pixels"),
):
    """
    Export maze as a georeferenced PNG + JSON sidecar.

    White pixels = paths to cut. Green pixels = corn to leave standing.

    Returns:
        {
            "success": bool,
            "png_path": str,
            "json_path": str,
            "width_px": int,
            "height_px": int
        }
    """
    field = app_state.get_field()
    walls = app_state.get_walls()
    crs = app_state.get_crs()
    offset = app_state.get_centroid_offset()

    if not field:
        raise HTTPException(
            status_code=400,
            detail={"error": "No field boundary to export", "error_code": "NO_FIELD"}
        )

    if not crs:
        raise HTTPException(
            status_code=400,
            detail={"error": "No CRS set — import a field first", "error_code": "NO_CRS"}
        )

    try:
        result = export_georeferenced_png(
            field, walls, crs, offset,
            width_px=width,
            base_name=name,
        )
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "error_code": "EXPORT_FAILED"}
        )
