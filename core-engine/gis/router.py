"""
GIS API Router: File import and format support endpoints.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from typing import Optional, List
import os
import tempfile
import shutil
from pathlib import Path
from shapely.geometry import shape, Polygon
from shapely.ops import transform

from .importers import import_boundary, import_csv, get_supported_formats, get_format_info
from .projection import project_to_utm
from geometry.validation import validate_boundary, get_largest_polygon
from state import app_state

router = APIRouter()


@router.get("/supported-formats")
def get_formats():
    """
    Get list of supported GIS file formats.

    Returns:
        {
            "formats": [
                {
                    "format": "KML",
                    "name": "Keyhole Markup Language",
                    "extensions": [".kml"],
                    "description": "Google Earth format"
                },
                ...
            ]
        }
    """
    format_info = get_format_info()

    return {
        "formats": [
            {
                "format": fmt,
                "name": info["name"],
                "extensions": info["extensions"],
                "description": info["description"]
            }
            for fmt, info in format_info.items()
        ]
    }


@router.post("/import-boundary")
async def import_boundary_file(
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    lat_col: Optional[str] = Query("lat", description="CSV latitude column name"),
    lon_col: Optional[str] = Query("lon", description="CSV longitude column name")
):
    """
    Import a field boundary from uploaded GIS file.

    Supports: KML, KMZ, Shapefile (.shp + .shx + .dbf + .prj), GeoJSON, CSV

    For CSV: Expects columns with lat/lon coordinates.
    For Shapefile: Upload all required files (.shp, .shx, .dbf) together.

    Returns:
        {
            "success": bool,
            "geometry": {"exterior": [[x,y], ...], "interiors": [...]},
            "crs": "EPSG:XXXXX",
            "source_crs": "EPSG:XXXX",
            "source_format": "KML" | "Shapefile" | ...,
            "validation": {
                "is_valid": bool,
                "is_closed": bool,
                "area_m2": float,
                "errors": [...],
                "warnings": [...]
            },
            "bounds": [minx, miny, maxx, maxy],
            "area_hectares": float,
            "warnings": [...]
        }
    """
    # Determine which files were uploaded
    uploaded_files = []

    if file:
        uploaded_files = [file]
    elif files:
        uploaded_files = files
    else:
        raise HTTPException(
            status_code=400,
            detail={"error": "No files uploaded", "error_code": "NO_FILES"}
        )

    # Create temp directory for file processing
    temp_dir = tempfile.mkdtemp()

    try:
        # Save uploaded files
        saved_files = []
        for uploaded_file in uploaded_files:
            filename = uploaded_file.filename
            temp_path = os.path.join(temp_dir, filename)
            content = await uploaded_file.read()

            with open(temp_path, 'wb') as f:
                f.write(content)

            ext = Path(filename).suffix.lower().lstrip('.')
            saved_files.append((temp_path, ext))

        # Determine primary file
        primary_file = None
        file_ext = None

        if len(saved_files) == 1:
            # Single file
            primary_file, file_ext = saved_files[0]
        else:
            # Multiple files - look for .shp (shapefile)
            shp_files = [(path, ext) for path, ext in saved_files if ext == 'shp']

            if not shp_files:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "Multiple files uploaded but no .shp file found",
                        "error_code": "NO_SHP_IN_BUNDLE"
                    }
                )

            # Validate shapefile bundle
            exts = {ext for _, ext in saved_files}
            required_exts = {'shp', 'shx', 'dbf'}
            missing = required_exts - exts

            if missing:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": f"Incomplete shapefile: missing {', '.join('.' + e for e in missing)}",
                        "error_code": "INCOMPLETE_SHAPEFILE"
                    }
                )

            primary_file, file_ext = shp_files[0]

        # Check if format is supported
        supported = get_supported_formats()
        if file_ext not in supported:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": f"Unsupported file format: .{file_ext}",
                    "supported_formats": supported,
                    "error_code": "UNSUPPORTED_FORMAT"
                }
            )

        # Import the boundary
        try:
            if file_ext == 'csv':
                result = import_csv(primary_file, lat_col=lat_col, lon_col=lon_col)
            else:
                result = import_boundary(primary_file)

        except Exception as import_error:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": str(import_error),
                    "error_code": "IMPORT_FAILED"
                }
            )

        # Convert GeoJSON geometry to Shapely
        geometry = shape(result['geometry'])
        source_crs = result['crs']

        # If MultiPolygon, get largest
        if geometry.geom_type == 'MultiPolygon':
            geometry = get_largest_polygon(geometry)

        # Validate boundary
        validation = validate_boundary(geometry)

        if not validation['is_valid']:
            return {
                "success": False,
                "validation": validation,
                "error": "Boundary validation failed"
            }

        # Project to UTM (auto-detect zone)
        projected_geom, target_crs = project_to_utm(geometry, source_crs)

        # Center at origin
        minx, miny, maxx, maxy = projected_geom.bounds
        cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
        centered_geom = transform(lambda x, y: (x - cx, y - cy), projected_geom)

        # Store in backend state for maze generation and export
        app_state.set_field(centered_geom, target_crs, centroid_offset=(cx, cy))

        # Calculate area in hectares
        area_m2 = centered_geom.area
        area_hectares = area_m2 / 10000.0

        # Return success
        return {
            "success": True,
            "geometry": {
                "exterior": list(centered_geom.exterior.coords),
                "interiors": [list(interior.coords) for interior in centered_geom.interiors]
            },
            "crs": target_crs,
            "source_crs": source_crs,
            "source_format": result['source_format'],
            "validation": validation,
            "bounds": list(centered_geom.bounds),
            "area_hectares": area_hectares,
            "warnings": result.get('warnings', [])
        }

    finally:
        # Cleanup temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)



@router.get("/import-gps-data")
def import_gps_data(demo: bool = Query(False, description="Load demo Iowa field")):
    """
    Import GPS data (demo mode only).

    For real file imports, use POST /import-boundary instead.
    """
    if not demo:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Use POST /import-boundary to import files",
                "error_code": "USE_IMPORT_BOUNDARY"
            }
        )

    # Mock GPS coordinates (Iowa cornfield - WGS84)
    gps_coords = [
        (-93.645, 42.025),
        (-93.640, 42.025),
        (-93.640, 42.028),
        (-93.645, 42.028),
        (-93.645, 42.025)
    ]

    # Create polygon and project to UTM (auto-detect zone)
    gps_polygon = Polygon(gps_coords)
    projected, target_crs = project_to_utm(gps_polygon, "EPSG:4326")

    # Center at origin (subtract centroid)
    minx, miny, maxx, maxy = projected.bounds
    cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
    centered_field = transform(lambda x, y: (x - cx, y - cy), projected)

    # Update global state with centroid offset for geo export
    app_state.set_field(centered_field, target_crs, centroid_offset=(cx, cy))

    # Return in standard FieldBoundary format (matching import-boundary response)
    area_m2 = centered_field.area
    return {
        "geometry": {
            "exterior": list(centered_field.exterior.coords),
            "interiors": []
        },
        "crs": target_crs,
        "area_hectares": area_m2 / 10000.0,
        "bounds": list(centered_field.bounds),
    }

