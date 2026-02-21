"""
GIS API Router: File import and format support endpoints.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import os
import math
import tempfile
import shutil
import base64
import io
from pathlib import Path
from shapely.geometry import shape, Polygon
from shapely.ops import transform

from .importers import import_boundary, import_csv, get_supported_formats, get_format_info
from .projection import project_to_utm, reproject_geometry
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


class SatelliteBoundaryRequest(BaseModel):
    """Boundary coordinates traced on a satellite map."""
    coordinates: List[List[float]]  # [[lon, lat], [lon, lat], ...]


@router.post("/import-satellite-boundary")
def import_satellite_boundary(req: SatelliteBoundaryRequest):
    """
    Import a field boundary from coordinates traced on a satellite image.

    Accepts WGS84 (lon, lat) coordinate pairs forming a polygon boundary.
    Projects to UTM and centers at origin, same as file-based import.

    Returns the same format as /import-boundary and /import-gps-data.
    """
    if len(req.coordinates) < 3:
        raise HTTPException(
            status_code=400,
            detail={"error": "Need at least 3 points to form a boundary", "error_code": "TOO_FEW_POINTS"}
        )

    # Ensure polygon is closed
    coords = [(c[0], c[1]) for c in req.coordinates]
    if coords[0] != coords[-1]:
        coords.append(coords[0])

    try:
        gps_polygon = Polygon(coords)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"error": f"Invalid polygon: {str(e)}", "error_code": "INVALID_POLYGON"}
        )

    if not gps_polygon.is_valid:
        gps_polygon = gps_polygon.buffer(0)
        if not gps_polygon.is_valid or gps_polygon.is_empty:
            raise HTTPException(
                status_code=400,
                detail={"error": "Polygon is self-intersecting or degenerate", "error_code": "INVALID_POLYGON"}
            )

    # Project to UTM (auto-detect zone)
    projected, target_crs = project_to_utm(gps_polygon, "EPSG:4326")

    # Center at origin
    minx, miny, maxx, maxy = projected.bounds
    cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
    centered_field = transform(lambda x, y: (x - cx, y - cy), projected)

    # Store in backend state
    app_state.set_field(centered_field, target_crs, centroid_offset=(cx, cy))

    area_m2 = centered_field.area
    area_hectares = area_m2 / 10000.0

    return {
        "success": True,
        "geometry": {
            "exterior": list(centered_field.exterior.coords),
            "interiors": [list(interior.coords) for interior in centered_field.interiors]
        },
        "crs": target_crs,
        "source_crs": "EPSG:4326",
        "source_format": "Satellite Trace",
        "bounds": list(centered_field.bounds),
        "area_hectares": area_hectares,
    }


# === Satellite Imagery ===


def _latlon_to_tile(lat: float, lon: float, zoom: int):
    """Convert WGS84 lat/lon to tile x, y indices."""
    n = 2 ** zoom
    x = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return x, y


def _tile_to_latlon(x: int, y: int, zoom: int):
    """Convert tile x, y indices to the NW corner lat/lon."""
    n = 2 ** zoom
    lon = x / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / n)))
    lat = math.degrees(lat_rad)
    return lat, lon


@router.get("/fetch-satellite-image")
def fetch_satellite_image(zoom: int = Query(default=18, ge=10, le=20)):
    """
    Fetch satellite imagery tiles for the current field bounds,
    composite them, and return as base64 PNG with bounds in the
    app's centered coordinate system.
    """
    import urllib.request
    from PIL import Image

    field = app_state.get_field()
    crs = app_state.get_crs()
    offset = app_state.get_centroid_offset()

    if field is None or crs is None:
        return {"error": "No field loaded"}

    # Convert centered field bounds back to absolute UTM
    minx, miny, maxx, maxy = field.bounds
    cx, cy = offset
    abs_minx, abs_miny = minx + cx, miny + cy
    abs_maxx, abs_maxy = maxx + cx, maxy + cy

    # Add 10% padding around the field
    pad_x = (abs_maxx - abs_minx) * 0.10
    pad_y = (abs_maxy - abs_miny) * 0.10
    abs_minx -= pad_x
    abs_miny -= pad_y
    abs_maxx += pad_x
    abs_maxy += pad_y

    # Build absolute UTM bounding box as polygon and reproject to WGS84
    from shapely.geometry import box
    abs_box = box(abs_minx, abs_miny, abs_maxx, abs_maxy)
    wgs_box = reproject_geometry(abs_box, crs, "EPSG:4326")
    wlon1, wlat1, wlon2, wlat2 = wgs_box.bounds  # (min_lon, min_lat, max_lon, max_lat)

    # Find tiles covering the WGS84 bounding box
    tx_min, ty_max = _latlon_to_tile(wlat1, wlon1, zoom)  # SW corner
    tx_max, ty_min = _latlon_to_tile(wlat2, wlon2, zoom)  # NE corner
    # Clamp
    tx_min = max(0, tx_min)
    ty_min = max(0, ty_min)

    num_tiles_x = tx_max - tx_min + 1
    num_tiles_y = ty_max - ty_min + 1

    # Safety limit (avoid fetching hundreds of tiles)
    if num_tiles_x * num_tiles_y > 64:
        return {"error": f"Too many tiles ({num_tiles_x * num_tiles_y}). Lower zoom or use smaller field."}

    TILE_SIZE = 256
    composite = Image.new("RGB", (num_tiles_x * TILE_SIZE, num_tiles_y * TILE_SIZE))

    esri_url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"

    for ty in range(ty_min, ty_max + 1):
        for tx in range(tx_min, tx_max + 1):
            url = esri_url.format(z=zoom, y=ty, x=tx)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "CornMazeCAD/1.0"})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    tile_data = resp.read()
                tile_img = Image.open(io.BytesIO(tile_data))
                px = (tx - tx_min) * TILE_SIZE
                py = (ty - ty_min) * TILE_SIZE
                composite.paste(tile_img, (px, py))
            except Exception:
                # If a tile fails, leave it black
                pass

    # Compute the geo bounds of the composited image
    # NW corner of top-left tile → SE corner of bottom-right tile
    nw_lat, nw_lon = _tile_to_latlon(tx_min, ty_min, zoom)
    se_lat, se_lon = _tile_to_latlon(tx_max + 1, ty_max + 1, zoom)

    # Reproject image corners from WGS84 back to centered UTM
    from shapely.geometry import Point
    nw_utm = reproject_geometry(Point(nw_lon, nw_lat), "EPSG:4326", crs)
    se_utm = reproject_geometry(Point(se_lon, se_lat), "EPSG:4326", crs)

    # Convert to centered coordinates
    img_minx = min(nw_utm.x, se_utm.x) - cx
    img_maxx = max(nw_utm.x, se_utm.x) - cx
    img_miny = min(nw_utm.y, se_utm.y) - cy
    img_maxy = max(nw_utm.y, se_utm.y) - cy

    # Encode as base64 PNG
    buf = io.BytesIO()
    composite.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")

    return {
        "imageData": f"data:image/png;base64,{b64}",
        "bounds": {
            "minx": img_minx,
            "miny": img_miny,
            "maxx": img_maxx,
            "maxy": img_maxy,
        },
        "tiles": num_tiles_x * num_tiles_y,
        "zoom": zoom,
    }

