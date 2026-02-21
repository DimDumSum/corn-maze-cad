"""
Export API Router: Shapefile, KML, GPX, DXF, printable map, and prescription map export endpoints.
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from state import app_state
from .shapefile import export_walls_to_shapefile
from .kml import export_boundary_kml, export_walls_kml
from .png import export_georeferenced_png
from .gpx import export_boundary_gpx, export_walls_gpx, export_cutting_guide_gpx
from .dxf import export_maze_dxf
from .printable import export_printable_map
from .prescription import export_prescription_map

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


@router.get("/gpx")
def export_gpx_endpoint(
    name: str = Query("maze_cutting_guide", description="Base name for output file"),
    include_walls: bool = Query(True, description="Include wall tracks"),
):
    """
    Export maze as GPX file for handheld GPS devices.

    Includes field boundary as a route, maze walls as tracks,
    and entrance/exit positions as waypoints.
    """
    field = app_state.get_field()
    walls = app_state.get_walls()
    crs = app_state.get_crs()
    offset = app_state.get_centroid_offset()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})
    if not crs:
        raise HTTPException(status_code=400, detail={"error": "No CRS set"})

    try:
        result = export_cutting_guide_gpx(
            field, walls if include_walls else None,
            crs, offset,
            entrances=app_state.get_entrances(),
            exits=app_state.get_exits(),
            base_name=name,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


@router.get("/dxf")
def export_dxf_endpoint(
    name: str = Query("maze_design", description="Base name for output file"),
):
    """
    Export maze as DXF file for CAD interoperability.

    Layers: BOUNDARY, WALLS, ANNOTATIONS (entrances/exits).
    """
    field = app_state.get_field()
    walls = app_state.get_walls()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})

    try:
        result = export_maze_dxf(
            field, walls,
            entrances=app_state.get_entrances(),
            exits=app_state.get_exits(),
            emergency_exits=app_state.get_emergency_exits(),
            base_name=name,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


class PrintableMapRequest(BaseModel):
    title: str = "Corn Maze"
    showSolution: bool = False
    widthPx: int = 2400


@router.post("/printable")
def export_printable_endpoint(req: PrintableMapRequest):
    """
    Generate a printable visitor map with title, legend, scale bar, and compass rose.
    """
    field = app_state.get_field()
    walls = app_state.get_walls()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})

    try:
        # Get solution path if requested
        solution_path = None
        if req.showSolution:
            entrances = app_state.get_entrances()
            exits = app_state.get_exits()
            if entrances and exits and walls:
                from analysis.pathfinding import find_path
                solution_path = find_path(walls, entrances[0], exits[0], field)

        result = export_printable_map(
            field, walls,
            entrances=app_state.get_entrances(),
            exits=app_state.get_exits(),
            emergency_exits=app_state.get_emergency_exits(),
            solution_path=solution_path,
            title=req.title,
            show_solution=req.showSolution,
            width_px=req.widthPx,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})


class PrescriptionRequest(BaseModel):
    pathWidth: float = 2.5
    seedRateCorn: float = 38000
    seedRatePath: float = 0


@router.post("/prescription")
def export_prescription_endpoint(req: PrescriptionRequest):
    """
    Export precision planting prescription map.

    Generates a variable-rate seed map (GeoJSON + preview PNG) for
    GPS-controlled planters that skip seed where paths will be.
    """
    field = app_state.get_field()
    walls = app_state.get_walls()
    crs = app_state.get_crs()
    offset = app_state.get_centroid_offset()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})
    if not walls:
        raise HTTPException(status_code=400, detail={"error": "No maze generated"})
    if not crs:
        raise HTTPException(status_code=400, detail={"error": "No CRS set"})

    try:
        result = export_prescription_map(
            field, walls, crs, offset,
            path_width=req.pathWidth,
            seed_rate_corn=req.seedRateCorn,
            seed_rate_path=req.seedRatePath,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
