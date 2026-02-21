"""
Geometry API Router: Path carving and geometric operations.
Updated: Image import endpoints added.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from state import app_state
from .operations import carve_path, flatten_geometry

router = APIRouter()


class PathRequest(BaseModel):
    """Request model for carving a path through maze walls."""
    points: List[List[float]]  # [[x, y], [x, y], ...]
    width: float = 4.0  # meters


class TextToPathsRequest(BaseModel):
    """Request model for converting text to vector paths."""
    text: str
    font: str = "Arial"
    weight: str = "normal"  # "normal" or "bold"
    fontSize: float = 1.0  # meters (height)
    fillMode: str = "stroke"  # "stroke" or "fill"
    strokeWidth: Optional[float] = 0.2  # meters
    position: List[float]  # [x, y]


@router.post("/carve")
def carve_path_endpoint(req: PathRequest):
    """
    Carve a path through maze walls using boolean difference.

    Creates a buffer around the path line and subtracts it from
    the current maze walls.

    Args:
        req: PathRequest with points and width

    Returns:
        {
            "walls": [[[x, y], ...], ...],  # Flattened line segments
            "warning": Optional str
        }

    Errors:
        - 400: No maze exists (generate maze first)
        - 400: Path too short (need at least 2 points)
        - 500: Invalid geometry operation
    """
    current_walls = app_state.get_walls()
    current_field = app_state.get_field()

    if not current_walls:
        raise HTTPException(
            status_code=400,
            detail={"error": "Generate maze first", "error_code": "NO_MAZE"}
        )

    if len(req.points) < 2:
        raise HTTPException(
            status_code=400,
            detail={"error": "Path too short (need at least 2 points)", "error_code": "PATH_TOO_SHORT"}
        )

    try:
        from shapely.geometry import LineString

        # Convert points to list of tuples
        points = [(p[0], p[1]) for p in req.points]

        # Create the carve polygon for edge tracking
        path_line = LineString(points)
        carve_polygon = path_line.buffer(req.width / 2.0, cap_style=1)

        # Carve the path
        updated_walls, warning = carve_path(
            walls=current_walls,
            points=points,
            width=req.width,
            field_boundary=current_field
        )

        # Update state
        app_state.set_walls(updated_walls)

        # Carve headland walls with the same eraser
        headland_walls = app_state.get_headland_walls()
        if headland_walls:
            updated_headland = headland_walls.difference(carve_polygon)
            app_state.set_headland_walls(updated_headland)

        # Track carved edges for validation and carve areas for retention
        app_state.add_carved_edges(carve_polygon.boundary)
        app_state.add_carved_area(carve_polygon)

        # Serialize carved areas as WKT for frontend snapshot
        carved_areas = app_state.get_carved_areas()
        carved_areas_wkt = carved_areas.wkt if carved_areas and not carved_areas.is_empty else ""

        # Return updated walls (including headland walls)
        result = {
            "walls": flatten_geometry(updated_walls),
            "headlandWalls": flatten_geometry(app_state.get_headland_walls()) if app_state.get_headland_walls() else [],
            "carvedAreas": carved_areas_wkt,
        }

        if warning:
            result["warning"] = warning

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "error_code": "INVALID_GEOMETRY"}
        )


@router.post("/uncarve")
def uncarve_path_endpoint(req: PathRequest):
    """
    Restore corn rows in an area by reversing a previous carve.

    Creates a buffer around the path line and restores original walls
    within that region.
    """
    from shapely.geometry import LineString, Polygon
    from shapely.ops import unary_union

    original_walls = app_state.original_walls
    if not original_walls:
        raise HTTPException(
            status_code=400,
            detail={"error": "No original walls available. Generate maze first.", "error_code": "NO_ORIGINAL_WALLS"}
        )

    current_walls = app_state.get_walls()
    if not current_walls:
        raise HTTPException(
            status_code=400,
            detail={"error": "No maze walls to restore. Generate maze first.", "error_code": "NO_WALLS"}
        )

    try:
        points = [(p[0], p[1]) for p in req.points]

        if len(points) < 2:
            raise ValueError("Path too short (need at least 2 points)")

        path_line = LineString(points)
        restore_region = path_line.buffer(req.width / 2.0, cap_style=1)

        # Get original walls clipped to the restore region
        restored_segments = original_walls.intersection(restore_region)

        # Union restored segments with current walls
        if not restored_segments.is_empty:
            updated_walls = unary_union([current_walls, restored_segments])
        else:
            updated_walls = current_walls

        app_state.set_walls(updated_walls)

        # Also restore headland walls
        original_headland = app_state.original_headland_walls
        headland_walls = app_state.get_headland_walls()
        if original_headland and headland_walls:
            restored_headland = original_headland.intersection(restore_region)
            if not restored_headland.is_empty:
                headland_walls = unary_union([headland_walls, restored_headland])
                app_state.set_headland_walls(headland_walls)

        # Subtract restore region from carved_areas so regeneration stays consistent
        carved_areas = app_state.get_carved_areas()
        if carved_areas and not carved_areas.is_empty:
            carved_areas = carved_areas.difference(restore_region)
            if carved_areas.is_empty:
                carved_areas = None
            app_state.set_carved_areas(carved_areas)

        # Serialize carved areas as WKT for frontend snapshot
        carved_areas_wkt = carved_areas.wkt if carved_areas and not carved_areas.is_empty else ""

        return {
            "walls": flatten_geometry(updated_walls),
            "headlandWalls": flatten_geometry(app_state.get_headland_walls()) if app_state.get_headland_walls() else [],
            "carvedAreas": carved_areas_wkt,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": str(e), "error_code": "INVALID_PATH"})
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "error_code": "UNCARVE_FAILED"}
        )


class SetWallsRequest(BaseModel):
    """Request model for setting maze walls state."""
    walls: List[List[List[float]]]  # [[[x, y], ...], ...]
    headlandWalls: Optional[List[List[List[float]]]] = None  # [[[x, y], ...], ...]
    carvedAreas: Optional[str] = None  # WKT string of carved area polygons (for undo/redo sync)
    clearCarvedEdges: bool = True  # Clear carved edges tracking when setting walls


@router.post("/set-walls")
def set_walls_endpoint(req: SetWallsRequest):
    """
    Set the maze walls state directly (used for undo/redo sync).

    This endpoint allows the frontend to sync the backend state
    when performing undo/redo operations.

    Args:
        req: SetWallsRequest with walls geometry

    Returns:
        {"success": true}
    """
    try:
        from shapely.geometry import MultiLineString, LineString

        # Convert walls to Shapely geometry
        if not req.walls:
            # Empty walls - clear state
            app_state.set_walls(None)
            if req.clearCarvedEdges:
                app_state.carved_edges = None
            return {"success": True}

        # Convert list of line segments to MultiLineString
        lines = []
        for segment in req.walls:
            if len(segment) >= 2:
                lines.append(LineString([(p[0], p[1]) for p in segment]))

        if lines:
            walls_geom = MultiLineString(lines)
            app_state.set_walls(walls_geom)
        else:
            app_state.set_walls(None)

        # Restore headland walls if provided
        if req.headlandWalls is not None:
            if not req.headlandWalls:
                app_state.set_headland_walls(None)
            else:
                h_lines = []
                for segment in req.headlandWalls:
                    if len(segment) >= 2:
                        h_lines.append(LineString([(p[0], p[1]) for p in segment]))
                if h_lines:
                    from shapely.geometry import MultiLineString as MLS
                    app_state.set_headland_walls(MLS(h_lines))
                else:
                    app_state.set_headland_walls(None)

        # Clear carved edges tracking since we're resetting to a different state
        if req.clearCarvedEdges:
            app_state.carved_edges = None

        # Restore carved areas from WKT (syncs undo/redo state)
        if req.carvedAreas is not None:
            if req.carvedAreas:
                from shapely import wkt
                app_state.set_carved_areas(wkt.loads(req.carvedAreas))
            else:
                app_state.set_carved_areas(None)

        return {"success": True}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "error_code": "INVALID_GEOMETRY"}
        )


@router.get("/available-fonts")
def get_available_fonts():
    """
    Return list of font families available on this system for text rendering.
    """
    import matplotlib.font_manager as fm

    available = {}
    for f in fm.fontManager.ttflist:
        if f.name not in available:
            available[f.name] = {
                "name": f.name,
                "styles": set(),
            }
        weight = "bold" if f.weight in (700, "bold") else "normal"
        available[f.name]["styles"].add(weight)

    fonts = []
    for name, info in sorted(available.items()):
        fonts.append({
            "name": info["name"],
            "styles": sorted(info["styles"]),
        })
    return {"fonts": fonts}


@router.post("/text-to-paths")
def text_to_paths_endpoint(req: TextToPathsRequest):
    """
    Convert text to vector paths using matplotlib.

    Takes text, font, size, and style parameters and returns a list of
    GeoJSON polygon paths that can be carved into the maze.

    Args:
        req: TextToPathsRequest with text, font, size, and style options

    Returns:
        {
            "paths": [GeoJSON Polygon, ...],  # List of GeoJSON polygons
        }

    Errors:
        - 400: Invalid parameters
        - 500: Text rendering error
    """
    try:
        import matplotlib.pyplot as plt
        import matplotlib.font_manager as fm
        from matplotlib.textpath import TextPath
        from matplotlib.patches import PathPatch
        import numpy as np

        # Validate input
        if not req.text or not req.text.strip():
            raise HTTPException(
                status_code=400,
                detail={"error": "Text cannot be empty", "error_code": "EMPTY_TEXT"}
            )

        # Find font file
        font_name = req.font
        font_weight = req.weight if req.weight in ['normal', 'bold'] else 'normal'
        try:
            font_prop = fm.FontProperties(family=font_name, weight=font_weight)
            font_file = fm.findfont(font_prop)
            print(f"[Text] Using font: {font_name}, weight: {font_weight}")
        except Exception:
            # Fallback to default font
            font_prop = fm.FontProperties(weight=font_weight)
            font_file = fm.findfont(font_prop)
            print(f"[Text] Fallback font with weight: {font_weight}")

        # Create text path
        # matplotlib uses arbitrary units, we'll scale to fontSize
        text_path = TextPath((0, 0), req.text, size=1, prop=font_prop)

        # Convert path vertices to Shapely polygons first
        from shapely.geometry import Polygon, mapping, MultiPolygon
        from shapely.ops import unary_union
        from shapely.affinity import scale as shapely_scale

        raw_polygons = []
        for path in text_path.to_polygons():
            if len(path) < 3:  # Need at least 3 points for a polygon
                continue
            polygon = Polygon(path)
            if not polygon.is_valid:
                polygon = polygon.buffer(0)
            if polygon.is_valid and not polygon.is_empty:
                raw_polygons.append(polygon)

        if not raw_polygons:
            raise HTTPException(
                status_code=500,
                detail={"error": "Failed to generate text paths", "error_code": "NO_PATHS"}
            )

        # Properly handle letter holes (e.g. center of O, D, R, A, B, P, Q, etc.)
        # matplotlib's to_polygons() returns both outer contours and inner holes as
        # separate polygons. We identify holes by checking containment: if a smaller
        # polygon is entirely inside a larger one, it's a hole and must be subtracted.
        # Sort by area descending so outer contours come first.
        raw_polygons.sort(key=lambda p: p.area, reverse=True)

        outers = []
        holes = []
        for poly in raw_polygons:
            is_hole = False
            for outer in outers:
                if outer.contains(poly):
                    is_hole = True
                    break
            if is_hole:
                holes.append(poly)
            else:
                outers.append(poly)

        # Subtract holes from the outer contours
        if holes:
            hole_union = unary_union(holes)
            combined = unary_union(outers).difference(hole_union)
            print(f"[Text] Processed {len(outers)} outer contours, subtracted {len(holes)} holes")
        else:
            combined = unary_union(outers)

        # Get actual height of the combined text geometry
        minx, miny, maxx, maxy = combined.bounds
        current_height = maxy - miny

        # fontSize should be the HEIGHT in meters
        # If user says fontSize=50, text should be 50 meters tall
        scale_factor = req.fontSize / current_height if current_height > 0 else 1.0

        print(f"[Text] Input fontSize: {req.fontSize}")
        print(f"[Text] Raw text height: {current_height}")
        print(f"[Text] Scale factor: {scale_factor}")
        print(f"[Text] Final height will be: {req.fontSize} meters")

        # Scale from origin (bottom-left)
        combined = shapely_scale(combined, xfact=scale_factor, yfact=scale_factor, origin=(minx, miny))

        # Verify after scaling
        new_minx, new_miny, new_maxx, new_maxy = combined.bounds
        actual_height = new_maxy - new_miny
        print(f"[Text] After scaling - height: {actual_height:.2f} meters")

        # If stroke mode, convert filled polygons to outlined strokes
        if req.fillMode == 'stroke' and req.strokeWidth and req.strokeWidth > 0:
            stroke_w = req.strokeWidth * scale_factor  # scale stroke width to match
            # Buffer outward and inward, then subtract to get the outline ring
            outer = combined.buffer(stroke_w / 2)
            inner = combined.buffer(-stroke_w / 2)
            combined = outer.difference(inner)
            print(f"[Text] Stroke mode: strokeWidth={req.strokeWidth}m (scaled={stroke_w:.4f}), created outline")

        # Translate to position
        from shapely.affinity import translate
        combined = translate(combined, xoff=req.position[0] - new_minx, yoff=req.position[1] - new_miny)

        # Extract individual polygons and convert to GeoJSON
        paths = []
        if isinstance(combined, Polygon):
            paths.append(mapping(combined))
        elif isinstance(combined, MultiPolygon):
            for poly in combined.geoms:
                paths.append(mapping(poly))
        else:
            # Handle GeometryCollection or other types
            for geom in combined.geoms:
                if isinstance(geom, Polygon):
                    paths.append(mapping(geom))

        if not paths:
            raise HTTPException(
                status_code=500,
                detail={"error": "Failed to generate text paths", "error_code": "NO_PATHS"}
            )

        return {"paths": paths}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"error": f"Text rendering error: {str(e)}", "error_code": "RENDER_ERROR"}
        )


class ImageToPathsRequest(BaseModel):
    """Request model for converting raster images to vector paths."""
    imageData: str  # base64 encoded image data
    threshold: int = 128  # 0-255, pixels darker than this become carveable
    invert: bool = False  # if True, light areas become carveable instead of dark
    simplify: float = 2.0  # polygon simplification tolerance in pixels
    targetWidth: float = 50.0  # target width in meters
    position: List[float]  # [x, y] center position for placement


@router.post("/image-to-paths")
def image_to_paths_endpoint(req: ImageToPathsRequest):
    """
    Convert a raster image to vector polygons for carving.

    Takes a base64 encoded image, converts to black/white based on threshold,
    traces contours to polygons, simplifies, and scales to meters.

    Args:
        req: ImageToPathsRequest with image data and processing parameters

    Returns:
        {
            "polygons": [{ "points": [[x, y], ...], "isHole": bool }, ...],
            "bounds": { "width": float, "height": float }
        }

    Errors:
        - 400: Invalid image data
        - 500: Image processing error
    """
    try:
        from PIL import Image
        import cv2
        import numpy as np
        from shapely.geometry import Polygon
        import io
        import base64

        print(f"[ImageToPath] Processing image: threshold={req.threshold}, invert={req.invert}, simplify={req.simplify}")
        print(f"[ImageToPath] Target width: {req.targetWidth}m, position: {req.position}")

        # Decode base64 image
        image_data = req.imageData
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        try:
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            print(f"[ImageToPath] Image loaded: {image.width}x{image.height}, mode={image.mode}")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail={"error": f"Invalid image data: {str(e)}", "error_code": "INVALID_IMAGE"}
            )

        # Handle transparency - if image has alpha channel, use it
        has_alpha = image.mode in ('RGBA', 'LA')

        if has_alpha:
            # Use alpha channel to determine foreground
            print(f"[ImageToPath] Image has alpha channel - using transparency")
            if image.mode == 'RGBA':
                alpha = np.array(image)[:, :, 3]
            else:  # LA mode
                alpha = np.array(image)[:, :, 1]

            # Non-transparent pixels become the shape
            if req.invert:
                binary = (alpha < req.threshold).astype(np.uint8) * 255  # Transparent = shape
            else:
                binary = (alpha > req.threshold).astype(np.uint8) * 255  # Opaque = shape
        else:
            # No alpha - use grayscale threshold
            print(f"[ImageToPath] No alpha channel - using grayscale threshold")
            if image.mode != 'L':
                image = image.convert('L')
            img_array = np.array(image)

            if req.invert:
                binary = (img_array > req.threshold).astype(np.uint8) * 255
            else:
                binary = (img_array < req.threshold).astype(np.uint8) * 255

        img_height, img_width = binary.shape[:2]
        print(f"[ImageToPath] Binary image created, non-zero pixels: {np.count_nonzero(binary)}")

        # Apply morphological operations to clean up the binary image
        kernel = np.ones((3, 3), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)  # Fill small holes
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)   # Remove small noise

        # Find contours using RETR_CCOMP for two-level hierarchy (outer + holes)
        contours, hierarchy = cv2.findContours(
            binary,
            cv2.RETR_CCOMP,  # Two-level hierarchy: outers and their holes
            cv2.CHAIN_APPROX_TC89_L1  # Better approximation than SIMPLE
        )

        print(f"[ImageToPath] Found {len(contours)} contours")

        if not contours or hierarchy is None:
            return {'polygons': [], 'bounds': {'width': 0, 'height': 0}}

        # Calculate scale factor (pixels to meters)
        scale = req.targetWidth / img_width
        target_height = img_height * scale

        print(f"[ImageToPath] Scale: {scale:.4f} (1px = {scale:.4f}m)")

        min_area_px = 50  # Minimum contour area in pixels

        def contour_to_points(contour):
            """Convert a contour to world-space points."""
            epsilon = req.simplify
            approx = cv2.approxPolyDP(contour, epsilon, True)
            if len(approx) < 3:
                return None
            points = []
            for pt in approx:
                x = pt[0][0] * scale + req.position[0] - req.targetWidth / 2
                y = -(pt[0][1] * scale) + req.position[1] + target_height / 2
                points.append([round(x, 3), round(y, 3)])
            return points

        # Process contours with hierarchy to properly handle holes
        # RETR_CCOMP hierarchy: [next, prev, first_child, parent]
        # Top-level contours have parent == -1, holes have parent >= 0
        polygons = []
        h = hierarchy[0]  # hierarchy shape is (1, N, 4)

        for i in range(len(contours)):
            # Only process top-level contours (parent == -1)
            if h[i][3] != -1:
                continue

            area = cv2.contourArea(contours[i])
            if area < min_area_px:
                continue

            outer_points = contour_to_points(contours[i])
            if outer_points is None:
                continue

            try:
                outer_poly = Polygon(outer_points)
                if not outer_poly.is_valid:
                    outer_poly = outer_poly.buffer(0)
                if not outer_poly.is_valid or outer_poly.is_empty:
                    continue

                # Collect holes (child contours of this outer contour)
                hole_polys = []
                child_idx = h[i][2]  # First child
                while child_idx != -1:
                    child_area = cv2.contourArea(contours[child_idx])
                    if child_area >= min_area_px:
                        hole_points = contour_to_points(contours[child_idx])
                        if hole_points and len(hole_points) >= 3:
                            hole_poly = Polygon(hole_points)
                            if not hole_poly.is_valid:
                                hole_poly = hole_poly.buffer(0)
                            if hole_poly.is_valid and not hole_poly.is_empty:
                                hole_polys.append(hole_poly)
                    child_idx = h[child_idx][0]  # Next sibling

                # Subtract holes from the outer polygon
                result_poly = outer_poly
                for hole in hole_polys:
                    result_poly = result_poly.difference(hole)

                if result_poly.is_empty:
                    continue

                # Extract all resulting polygons (difference can create MultiPolygon)
                from shapely.geometry import MultiPolygon as ShapelyMultiPolygon
                result_geoms = []
                if result_poly.geom_type == 'Polygon':
                    result_geoms = [result_poly]
                elif result_poly.geom_type == 'MultiPolygon':
                    result_geoms = list(result_poly.geoms)

                for geom in result_geoms:
                    if geom.area > 0.5:  # At least 0.5 sq meter
                        # Add exterior
                        ext_coords = list(geom.exterior.coords)[:-1]
                        polygons.append({
                            'points': ext_coords,
                            'isHole': False
                        })
                        # Add interior rings (holes within this polygon)
                        for interior in geom.interiors:
                            int_coords = list(interior.coords)[:-1]
                            if len(int_coords) >= 3:
                                polygons.append({
                                    'points': int_coords,
                                    'isHole': True
                                })

            except Exception as e:
                print(f"[ImageToPath] Skipping contour {i}: {e}")
                continue

        print(f"[ImageToPath] Extracted {len(polygons)} valid polygons")
        total_area = 0
        for i, p in enumerate(polygons):
            if not p['isHole']:
                poly_area = Polygon(p['points']).area
                total_area += poly_area
                if i < 5:
                    print(f"  Polygon {i}: {len(p['points'])} points, area={poly_area:.2f}m²")
        print(f"[ImageToPath] Total polygon area: {total_area:.2f}m²")

        return {
            'polygons': polygons,
            'bounds': {
                'width': round(req.targetWidth, 2),
                'height': round(target_height, 2)
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"error": f"Image processing error: {str(e)}", "error_code": "PROCESS_ERROR"}
        )


class ImagePreviewRequest(BaseModel):
    """Request model for generating image vectorization preview."""
    imageData: str  # base64 encoded image
    threshold: int = 128
    invert: bool = False


@router.post("/image-preview")
def image_preview_endpoint(req: ImagePreviewRequest):
    """
    Generate a preview of the vectorization without full processing.
    Returns a binary image showing what will be carved.
    """
    try:
        from PIL import Image
        import cv2
        import numpy as np
        import io
        import base64

        # Decode base64 image
        image_data = req.imageData
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))

        # Resize for faster preview (max 300px)
        max_size = 300
        ratio = min(max_size / image.width, max_size / image.height)
        if ratio < 1:
            new_size = (int(image.width * ratio), int(image.height * ratio))
            image = image.resize(new_size, Image.LANCZOS)

        # Handle transparency - same logic as main import
        has_alpha = image.mode in ('RGBA', 'LA')

        if has_alpha:
            if image.mode == 'RGBA':
                alpha = np.array(image)[:, :, 3]
            else:
                alpha = np.array(image)[:, :, 1]
            if req.invert:
                binary = (alpha < req.threshold).astype(np.uint8) * 255
            else:
                binary = (alpha > req.threshold).astype(np.uint8) * 255
        else:
            if image.mode != 'L':
                image = image.convert('L')
            img_array = np.array(image)
            if req.invert:
                binary = (img_array > req.threshold).astype(np.uint8) * 255
            else:
                binary = (img_array < req.threshold).astype(np.uint8) * 255

        # Apply morphological cleanup (same as main import)
        kernel = np.ones((3, 3), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

        # Find and draw contours for preview (RETR_CCOMP for proper hole handling)
        contours, hierarchy = cv2.findContours(binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_L1)

        # Create preview with filled contours showing holes properly
        preview = np.zeros((binary.shape[0], binary.shape[1], 3), dtype=np.uint8)
        preview[:] = (40, 40, 40)  # Dark background

        if hierarchy is not None:
            h = hierarchy[0]
            # Draw outer contours filled green, then draw holes filled dark
            for i in range(len(contours)):
                if h[i][3] == -1:  # Top-level contour
                    cv2.drawContours(preview, contours, i, (0, 220, 0), -1)
            for i in range(len(contours)):
                if h[i][3] != -1:  # Hole contour
                    cv2.drawContours(preview, contours, i, (40, 40, 40), -1)
            # Draw outlines
            cv2.drawContours(preview, contours, -1, (0, 180, 0), 1)
        else:
            cv2.drawContours(preview, contours, -1, (0, 220, 0), -1)
            cv2.drawContours(preview, contours, -1, (0, 180, 0), 1)

        # Encode as base64 PNG
        _, buffer = cv2.imencode('.png', preview)
        preview_b64 = base64.b64encode(buffer).decode('utf-8')

        return {
            'preview': f'data:image/png;base64,{preview_b64}',
            'width': image.width,
            'height': image.height,
            'contourCount': len(contours)
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"error": f"Preview error: {str(e)}", "error_code": "PREVIEW_ERROR"}
        )


class SvgToPathsRequest(BaseModel):
    """Request model for converting SVG path data to polygons."""
    pathData: str  # SVG path data (d attribute)
    scale: float = 20.0  # Size in meters (applies to longest dimension)
    position: List[float]  # [x, y] - center position


def parse_svg_path_simple(path_data: str) -> list:
    """
    Simple SVG path parser that handles M, L, C, Q, A, Z commands.
    Returns a list of subpaths, each subpath is a list of (x, y) points.
    """
    import re
    import math

    # Tokenize the path data
    # Match commands (letters) and numbers (including negative and decimals)
    tokens = re.findall(r'([MLHVCSQTAZmlhvcsqtaz])|(-?\d*\.?\d+)', path_data)

    commands = []
    current_cmd = None
    current_args = []

    for token in tokens:
        if token[0]:  # Command letter
            if current_cmd:
                commands.append((current_cmd, current_args))
            current_cmd = token[0]
            current_args = []
        elif token[1]:  # Number
            current_args.append(float(token[1]))

    if current_cmd:
        commands.append((current_cmd, current_args))

    # Process commands into points
    all_subpaths = []
    current_subpath = []
    current_x, current_y = 0.0, 0.0
    start_x, start_y = 0.0, 0.0

    def cubic_bezier(p0, p1, p2, p3, num_points=10):
        """Sample points along a cubic bezier curve."""
        points = []
        for i in range(1, num_points + 1):
            t = i / num_points
            x = (1-t)**3 * p0[0] + 3*(1-t)**2*t * p1[0] + 3*(1-t)*t**2 * p2[0] + t**3 * p3[0]
            y = (1-t)**3 * p0[1] + 3*(1-t)**2*t * p1[1] + 3*(1-t)*t**2 * p2[1] + t**3 * p3[1]
            points.append((x, y))
        return points

    def quadratic_bezier(p0, p1, p2, num_points=10):
        """Sample points along a quadratic bezier curve."""
        points = []
        for i in range(1, num_points + 1):
            t = i / num_points
            x = (1-t)**2 * p0[0] + 2*(1-t)*t * p1[0] + t**2 * p2[0]
            y = (1-t)**2 * p0[1] + 2*(1-t)*t * p1[1] + t**2 * p2[1]
            points.append((x, y))
        return points

    def arc_to_points(x1, y1, rx, ry, angle, large_arc, sweep, x2, y2, num_points=20):
        """Approximate an arc with line segments."""
        # Simplified arc - just use line segments for now
        points = []
        for i in range(1, num_points + 1):
            t = i / num_points
            x = x1 + t * (x2 - x1)
            y = y1 + t * (y2 - y1)
            # Add some curve approximation
            mid_t = abs(t - 0.5) * 2
            curve_factor = (1 - mid_t) * min(rx, ry) * 0.5
            if sweep:
                points.append((x + curve_factor * math.sin(t * math.pi), y - curve_factor * math.cos(t * math.pi)))
            else:
                points.append((x - curve_factor * math.sin(t * math.pi), y + curve_factor * math.cos(t * math.pi)))
        return points

    for cmd, args in commands:
        is_relative = cmd.islower()
        cmd_upper = cmd.upper()

        if cmd_upper == 'M':  # MoveTo
            if current_subpath and len(current_subpath) >= 3:
                all_subpaths.append(current_subpath)
            current_subpath = []

            i = 0
            while i < len(args) - 1:
                x, y = args[i], args[i + 1]
                if is_relative:
                    x += current_x
                    y += current_y
                current_x, current_y = x, y
                if i == 0:
                    start_x, start_y = x, y
                current_subpath.append((x, y))
                i += 2

        elif cmd_upper == 'L':  # LineTo
            i = 0
            while i < len(args) - 1:
                x, y = args[i], args[i + 1]
                if is_relative:
                    x += current_x
                    y += current_y
                current_x, current_y = x, y
                current_subpath.append((x, y))
                i += 2

        elif cmd_upper == 'H':  # Horizontal LineTo
            for x in args:
                if is_relative:
                    x += current_x
                current_x = x
                current_subpath.append((current_x, current_y))

        elif cmd_upper == 'V':  # Vertical LineTo
            for y in args:
                if is_relative:
                    y += current_y
                current_y = y
                current_subpath.append((current_x, current_y))

        elif cmd_upper == 'C':  # Cubic Bezier
            i = 0
            while i < len(args) - 5:
                x1, y1, x2, y2, x, y = args[i:i+6]
                if is_relative:
                    x1 += current_x; y1 += current_y
                    x2 += current_x; y2 += current_y
                    x += current_x; y += current_y
                pts = cubic_bezier((current_x, current_y), (x1, y1), (x2, y2), (x, y))
                current_subpath.extend(pts)
                current_x, current_y = x, y
                i += 6

        elif cmd_upper == 'Q':  # Quadratic Bezier
            i = 0
            while i < len(args) - 3:
                x1, y1, x, y = args[i:i+4]
                if is_relative:
                    x1 += current_x; y1 += current_y
                    x += current_x; y += current_y
                pts = quadratic_bezier((current_x, current_y), (x1, y1), (x, y))
                current_subpath.extend(pts)
                current_x, current_y = x, y
                i += 4

        elif cmd_upper == 'A':  # Arc
            i = 0
            while i < len(args) - 6:
                rx, ry, angle, large_arc, sweep, x, y = args[i:i+7]
                if is_relative:
                    x += current_x
                    y += current_y
                pts = arc_to_points(current_x, current_y, rx, ry, angle, large_arc, sweep, x, y)
                current_subpath.extend(pts)
                current_x, current_y = x, y
                i += 7

        elif cmd_upper == 'Z':  # ClosePath
            if current_subpath:
                current_subpath.append((start_x, start_y))
                current_x, current_y = start_x, start_y

    # Add final subpath
    if current_subpath and len(current_subpath) >= 3:
        all_subpaths.append(current_subpath)

    return all_subpaths


@router.post("/svg-to-paths")
def svg_to_paths_endpoint(req: SvgToPathsRequest):
    """
    Convert SVG path data to polygon paths for carving.

    Takes SVG path data (from clipart library), scales to requested size,
    and positions at the specified location.

    Args:
        req: SvgToPathsRequest with pathData, scale, and position

    Returns:
        {
            "paths": [GeoJSON Polygon, ...],  # List of GeoJSON polygons
        }

    Errors:
        - 400: Invalid parameters
        - 500: SVG parsing error
    """
    try:
        from shapely.geometry import Polygon, MultiPolygon, mapping
        from shapely.ops import unary_union
        from shapely.affinity import scale as shapely_scale, translate

        if not req.pathData or not req.pathData.strip():
            raise HTTPException(
                status_code=400,
                detail={"error": "Path data cannot be empty", "error_code": "EMPTY_PATH"}
            )

        print(f"[SVG] Parsing path data: {req.pathData[:80]}...")

        # Parse SVG path using our simple parser
        all_subpaths = parse_svg_path_simple(req.pathData)

        print(f"[SVG] Extracted {len(all_subpaths)} subpath(s)")

        if not all_subpaths:
            raise HTTPException(
                status_code=400,
                detail={"error": "Failed to extract path points", "error_code": "NO_POINTS"}
            )

        # Convert each subpath to a polygon (flip Y for SVG coordinate system)
        polygons = []
        for subpath_points in all_subpaths:
            # Flip Y (SVG has Y pointing down, we want Y pointing up)
            flipped = [(x, 100 - y) for x, y in subpath_points]

            # Close the path if needed
            if len(flipped) >= 3:
                first_pt, last_pt = flipped[0], flipped[-1]
                dist = ((first_pt[0] - last_pt[0])**2 + (first_pt[1] - last_pt[1])**2)**0.5
                if dist > 0.5:
                    flipped.append(flipped[0])

            if len(flipped) >= 4:  # Need at least 4 points for a valid polygon
                try:
                    poly = Polygon(flipped)
                    if not poly.is_valid:
                        poly = poly.buffer(0)
                    if poly.is_valid and not poly.is_empty and poly.area > 0.5:
                        polygons.append(poly)
                except Exception as e:
                    print(f"[SVG] Failed to create polygon: {e}")
                    continue

        print(f"[SVG] Created {len(polygons)} valid polygon(s)")

        # If no valid polygons from subpaths, try combining all points
        if not polygons:
            all_pts = []
            for subpath in all_subpaths:
                all_pts.extend(subpath)
            if len(all_pts) >= 3:
                flipped = [(x, 100 - y) for x, y in all_pts]
                flipped.append(flipped[0])
                try:
                    poly = Polygon(flipped)
                    if not poly.is_valid:
                        poly = poly.buffer(0)
                    if poly.is_valid and not poly.is_empty:
                        polygons.append(poly)
                except (ValueError, TypeError):
                    pass

        if not polygons:
            raise HTTPException(
                status_code=400,
                detail={"error": "Could not create valid polygons from path", "error_code": "INVALID_POLYGON"}
            )

        # Union all polygons
        combined = unary_union(polygons)

        # Get bounds and calculate scale factor
        minx, miny, maxx, maxy = combined.bounds
        current_width = maxx - minx
        current_height = maxy - miny

        # Scale so the largest dimension equals req.scale meters
        max_dim = max(current_width, current_height)
        scale_factor = req.scale / max_dim if max_dim > 0 else 1.0

        print(f"[SVG] Bounds: {minx:.1f},{miny:.1f} to {maxx:.1f},{maxy:.1f}, scale: {scale_factor:.4f}")

        # Scale from centroid
        centroid = combined.centroid
        combined = shapely_scale(combined, xfact=scale_factor, yfact=scale_factor, origin=centroid)

        # Translate centroid to position
        combined = translate(
            combined,
            xoff=req.position[0] - combined.centroid.x,
            yoff=req.position[1] - combined.centroid.y
        )

        # Convert to GeoJSON
        paths = []
        if isinstance(combined, Polygon):
            paths.append(mapping(combined))
        elif isinstance(combined, MultiPolygon):
            for poly in combined.geoms:
                paths.append(mapping(poly))
        else:
            # Handle GeometryCollection
            for geom in getattr(combined, 'geoms', [combined]):
                if isinstance(geom, Polygon):
                    paths.append(mapping(geom))

        if not paths:
            raise HTTPException(
                status_code=500,
                detail={"error": "Failed to generate clipart paths", "error_code": "NO_PATHS"}
            )

        print(f"[SVG] SUCCESS: {len(paths)} polygon(s) at {req.position}, scale {req.scale}m")
        return {"paths": paths}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"error": f"SVG parsing error: {str(e)}", "error_code": "PARSE_ERROR"}
        )


class DesignElement(BaseModel):
    """Design element model matching frontend designStore."""
    id: str
    type: str  # 'path' | 'circle' | 'rectangle' | 'line' | 'arc' | 'text' | 'clipart'
    points: List[List[float]]  # [[x, y], ...]
    width: float
    closed: bool
    rotation: Optional[float] = 0  # Rotation in degrees (0-360)


class Constraints(BaseModel):
    """Constraint values for validation."""
    wallWidthMin: float = 2.0  # meters
    edgeBuffer: float = 3.0  # meters
    pathWidthMin: float = 4.0  # meters


class ValidateRequest(BaseModel):
    """Request model for validating design elements."""
    elements: List[DesignElement]
    maze: Optional[dict] = None  # Maze geometry (not used for validation yet)
    field: Optional[dict] = None  # Field geometry for edge buffer check
    constraints: Constraints


class Violation(BaseModel):
    """Validation violation with detailed information."""
    id: str  # Unique violation ID
    type: str  # 'wall_width' | 'edge_buffer' | 'corner_radius'
    severity: str  # 'error' | 'warning'
    message: str
    location: List[float]  # [x, y] center of violation
    elementIds: List[str]  # IDs of elements involved (1 or 2)
    actualValue: float  # Actual measured value (e.g., 1.3m)
    requiredValue: float  # Required minimum value (e.g., 2.0m)
    # Visualization geometry (polygon vertices for highlighting)
    highlightArea: Optional[List[List[float]]] = None  # [[x,y], ...]


@router.post("/validate")
def validate_design(req: ValidateRequest):
    """
    Validate design elements against constraints.

    Checks:
    - Wall width minimum (distance between pending elements)
    - Wall width minimum (distance between pending elements and already carved paths)
    - Edge buffer (distance from field boundary)

    Args:
        req: ValidateRequest with elements, maze, field, constraints

    Returns:
        {
            "valid": bool,
            "violations": [Violation, ...],
            "summary": { "wallWidth": int, "edgeBuffer": int, "total": int }
        }
    """
    from shapely.geometry import LineString, Polygon, Point, mapping, MultiLineString, MultiPolygon
    from shapely.ops import nearest_points
    import uuid

    violations = []
    violation_counts = {"wallWidth": 0, "edgeBuffer": 0}

    try:
        # Get carved edges from state - these are the boundaries of all previously carved paths
        carved_edges = app_state.get_carved_edges()
        if carved_edges is not None:
            print(f"[Validation] Found carved edges for checking (type: {type(carved_edges).__name__})")
        else:
            print(f"[Validation] No carved edges yet (no paths have been carved)")

        # Convert elements to Shapely geometries
        element_geometries = []
        print(f"[Validation] Received {len(req.elements)} elements to validate")
        print(f"[Validation] Constraints: wallWidthMin={req.constraints.wallWidthMin}m, edgeBuffer={req.constraints.edgeBuffer}m")

        for el in req.elements:
            print(f"[Validation] Processing element: id={el.id[:8]}, type={el.type}, points={len(el.points)}, closed={el.closed}")

            if len(el.points) < 2:
                print(f"[Validation]   -> Skipping: too few points")
                continue

            points = [(p[0], p[1]) for p in el.points]

            # Handle text/clipart as polygons, others as lines
            if el.type.lower() in ['text', 'clipart'] or el.closed:
                if len(points) >= 3:
                    geom = Polygon(points)
                    if not geom.is_valid:
                        geom = geom.buffer(0)
                    print(f"[Validation]   -> Created polygon, area={geom.area:.2f}m², bounds={geom.bounds}")
                    element_geometries.append((el.id, el.type, geom, points, el.width))
                else:
                    print(f"[Validation]   -> Skipping: polygon needs >= 3 points")
                continue

            line = LineString(points)
            buffered = line.buffer(el.width / 2.0, cap_style=1)
            print(f"[Validation]   -> Created buffered line, length={line.length:.2f}m, width={el.width}m")
            element_geometries.append((el.id, el.type, buffered, points, el.width))

        # Check 1: Wall width between paths
        print(f"[Validation] Checking {len(element_geometries)} elements against each other")

        for i, (id1, type1, geom1, points1, width1) in enumerate(element_geometries):
            for j, (id2, type2, geom2, points2, width2) in enumerate(element_geometries):
                if i >= j:
                    continue

                # For line elements, check centerline intersection
                is_line1 = type1.lower() not in ['text', 'clipart']
                is_line2 = type2.lower() not in ['text', 'clipart']

                if is_line1 and is_line2:
                    line1 = LineString(points1)
                    line2 = LineString(points2)
                    centerline_intersects = line1.intersects(line2)
                    centerline_distance = line1.distance(line2)

                    if centerline_intersects:
                        # Junction - valid crossing
                        continue

                    buffered_intersects = geom1.intersects(geom2)

                    if buffered_intersects and centerline_distance < req.constraints.wallWidthMin:
                        # Thin wall violation
                        intersection = geom1.intersection(geom2)
                        loc = [float(intersection.centroid.x), float(intersection.centroid.y)]

                        # Get highlight area from intersection
                        highlight = None
                        if hasattr(intersection, 'exterior'):
                            highlight = [[float(x), float(y)] for x, y in intersection.exterior.coords]

                        violations.append({
                            "id": str(uuid.uuid4())[:8],
                            "type": "wall_width",
                            "severity": "error",
                            "message": f"Wall too thin: {centerline_distance:.1f}m (min {req.constraints.wallWidthMin}m)",
                            "location": loc,
                            "elementIds": [id1, id2],
                            "actualValue": round(centerline_distance, 2),
                            "requiredValue": req.constraints.wallWidthMin,
                            "highlightArea": highlight
                        })
                        violation_counts["wallWidth"] += 1
                        continue

                    if centerline_distance < req.constraints.wallWidthMin:
                        pt1, pt2 = nearest_points(line1, line2)
                        loc = [float((pt1.x + pt2.x) / 2), float((pt1.y + pt2.y) / 2)]

                        violations.append({
                            "id": str(uuid.uuid4())[:8],
                            "type": "wall_width",
                            "severity": "error",
                            "message": f"Wall too thin: {centerline_distance:.1f}m (min {req.constraints.wallWidthMin}m)",
                            "location": loc,
                            "elementIds": [id1, id2],
                            "actualValue": round(centerline_distance, 2),
                            "requiredValue": req.constraints.wallWidthMin,
                            "highlightArea": None
                        })
                        violation_counts["wallWidth"] += 1

                else:
                    # Check distance and intersection between any geometries (text, clipart, closed shapes)
                    distance = geom1.distance(geom2)
                    intersects = geom1.intersects(geom2)

                    print(f"[Validation] Pair {id1[:8]} vs {id2[:8]}: distance={distance:.2f}m, intersects={intersects}")

                    # Flag violation if:
                    # 1. Elements overlap/intersect (distance == 0, intersects == True)
                    # 2. Elements are too close (0 < distance < wallWidthMin)
                    if intersects or distance < req.constraints.wallWidthMin:
                        print(f"[Validation]   -> VIOLATION DETECTED!")
                        # Get location for the violation
                        if intersects:
                            # For overlapping elements, use intersection centroid
                            try:
                                intersection = geom1.intersection(geom2)
                                loc = [float(intersection.centroid.x), float(intersection.centroid.y)]
                                # Get highlight area from intersection
                                highlight = None
                                if hasattr(intersection, 'exterior'):
                                    highlight = [[float(x), float(y)] for x, y in intersection.exterior.coords]
                                elif hasattr(intersection, 'geoms'):
                                    # MultiPolygon - use first polygon
                                    for g in intersection.geoms:
                                        if hasattr(g, 'exterior'):
                                            highlight = [[float(x), float(y)] for x, y in g.exterior.coords]
                                            break
                            except Exception:
                                loc = [float((geom1.centroid.x + geom2.centroid.x) / 2),
                                       float((geom1.centroid.y + geom2.centroid.y) / 2)]
                                highlight = None

                            message = f"Elements overlap - will create invalid geometry (min wall {req.constraints.wallWidthMin}m)"
                            actual_value = 0
                        else:
                            # Elements are close but not touching
                            pt1, pt2 = nearest_points(geom1, geom2)
                            loc = [float((pt1.x + pt2.x) / 2), float((pt1.y + pt2.y) / 2)]
                            highlight = None
                            message = f"Elements too close: {distance:.1f}m (min {req.constraints.wallWidthMin}m)"
                            actual_value = round(distance, 2)

                        violations.append({
                            "id": str(uuid.uuid4())[:8],
                            "type": "wall_width",
                            "severity": "error",
                            "message": message,
                            "location": loc,
                            "elementIds": [id1, id2],
                            "actualValue": actual_value,
                            "requiredValue": req.constraints.wallWidthMin,
                            "highlightArea": highlight
                        })
                        violation_counts["wallWidth"] += 1
                        print(f"[Validation] VIOLATION: {id1[:8]} vs {id2[:8]} - {message}")

        # Check 1.5: Wall width between pending elements and already carved paths
        if carved_edges is not None:
            print(f"[Validation] Checking {len(element_geometries)} elements against existing carved paths")
            print(f"[Validation] Carved edges type: {type(carved_edges).__name__}, is_empty: {carved_edges.is_empty}")

            for el_id, el_type, geom, points, width in element_geometries:
                try:
                    # Check distance from the element geometry directly to carved edges
                    # This measures the closest distance between the new carved area and existing carved areas
                    distance = geom.distance(carved_edges)
                    print(f"[Validation] Element {el_id[:8]} (type={el_type}) distance to carved edges: {distance:.2f}m")

                    # Also check if geometries intersect (overlap = 0 distance)
                    intersects = geom.intersects(carved_edges)
                    if intersects:
                        print(f"[Validation] Element {el_id[:8]} INTERSECTS carved edges!")

                    # A thin wall violation occurs when:
                    # 1. The new element overlaps with existing carved area (distance=0, intersects=True)
                    # 2. The new element is too close to existing carved area (distance < wallWidthMin)
                    if distance < req.constraints.wallWidthMin:
                        # Find the closest points for violation location
                        try:
                            pt1, pt2 = nearest_points(geom, carved_edges)
                            loc = [float((pt1.x + pt2.x) / 2), float((pt1.y + pt2.y) / 2)]
                        except Exception:
                            # Fallback to element centroid
                            loc = [float(geom.centroid.x), float(geom.centroid.y)]

                        if intersects or distance < 0.01:
                            message = f"Overlaps with existing carved path (min wall {req.constraints.wallWidthMin}m)"
                            actual_value = 0
                        else:
                            message = f"Too close to existing path: {distance:.1f}m (min {req.constraints.wallWidthMin}m)"
                            actual_value = round(distance, 2)

                        violations.append({
                            "id": str(uuid.uuid4())[:8],
                            "type": "wall_width",
                            "severity": "error",
                            "message": message,
                            "location": loc,
                            "elementIds": [el_id],
                            "actualValue": actual_value,
                            "requiredValue": req.constraints.wallWidthMin,
                            "highlightArea": None
                        })
                        violation_counts["wallWidth"] += 1
                        print(f"[Validation] VIOLATION: element {el_id[:8]} - {message}")

                except Exception as e:
                    print(f"[Validation] Error checking element {el_id[:8]} against carved paths: {e}")
                    continue

        # Check 2: Edge buffer from field boundary
        if req.field and 'exterior' in req.field:
            field_coords = [(p[0], p[1]) for p in req.field['exterior']]
            field_polygon = Polygon(field_coords)
            # Create inset boundary for edge buffer
            inset_boundary = field_polygon.buffer(-req.constraints.edgeBuffer)

            for el_id, el_type, geom, points, width in element_geometries:
                if inset_boundary.is_empty:
                    continue

                # Check if element extends beyond inset boundary
                if not inset_boundary.contains(geom):
                    outside = geom.difference(inset_boundary)
                    if not outside.is_empty:
                        loc = [float(outside.centroid.x), float(outside.centroid.y)]

                        # Calculate actual distance to edge
                        distance_to_edge = field_polygon.exterior.distance(geom)

                        highlight = None
                        if hasattr(outside, 'exterior'):
                            highlight = [[float(x), float(y)] for x, y in outside.exterior.coords]

                        violations.append({
                            "id": str(uuid.uuid4())[:8],
                            "type": "edge_buffer",
                            "severity": "error",
                            "message": f"Too close to edge: {distance_to_edge:.1f}m (min {req.constraints.edgeBuffer}m)",
                            "location": loc,
                            "elementIds": [el_id],
                            "actualValue": round(distance_to_edge, 2),
                            "requiredValue": req.constraints.edgeBuffer,
                            "highlightArea": highlight
                        })
                        violation_counts["edgeBuffer"] += 1

        # Debug info about carved edges
        carved_edges_info = None
        if carved_edges is not None:
            carved_edges_info = {
                "type": type(carved_edges).__name__,
                "is_empty": carved_edges.is_empty,
                "bounds": list(carved_edges.bounds) if not carved_edges.is_empty else None
            }

        result = {
            "valid": len(violations) == 0,
            "violations": violations,
            "summary": {
                "wallWidth": violation_counts["wallWidth"],
                "edgeBuffer": violation_counts["edgeBuffer"],
                "total": len(violations)
            }
        }

        # Add debug info in development
        if carved_edges_info:
            result["_debug_carved_edges"] = carved_edges_info
            print(f"[Validation] Result: valid={result['valid']}, violations={len(violations)}, carved_edges={carved_edges_info}")
        else:
            print(f"[Validation] Result: valid={result['valid']}, violations={len(violations)}, NO carved_edges in state")

        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"error": f"Validation error: {str(e)}", "error_code": "VALIDATION_ERROR"}
        )


class AutoFixRequest(BaseModel):
    """Request model for auto-fixing constraint violations."""
    elements: List[DesignElement]
    field: Optional[dict] = None
    constraints: Constraints


@router.post("/auto-fix")
def auto_fix_violations(req: AutoFixRequest):
    """
    Automatically fix constraint violations using morphological operations.

    Fixes applied:
    - Wall width: Moves paths apart or adjusts widths
    - Edge buffer: Moves elements away from edges

    Args:
        req: AutoFixRequest with elements, field, and constraints

    Returns:
        {
            "elements": [DesignElement, ...],  # Fixed elements
            "fixedCount": int,
            "changes": [{ "elementId": str, "change": str }, ...]
        }
    """
    from shapely.geometry import LineString, Polygon, Point
    from shapely.ops import nearest_points
    from shapely.affinity import translate

    print(f"[AutoFix] ========== AUTO-FIX REQUEST ==========")
    print(f"[AutoFix] Received {len(req.elements)} elements")
    print(f"[AutoFix] Constraints: wallWidthMin={req.constraints.wallWidthMin}m, edgeBuffer={req.constraints.edgeBuffer}m")
    print(f"[AutoFix] Field provided: {req.field is not None}")

    changes = []
    fixed_elements = []

    try:
        # Convert to mutable list of dicts for modification
        elements_data = [
            {
                "id": el.id,
                "type": el.type,
                "points": [list(p) for p in el.points],
                "width": el.width,
                "closed": el.closed
            }
            for el in req.elements
        ]

        for el in elements_data:
            print(f"[AutoFix] Input element: id={el['id'][:8]}, type={el['type']}, points={len(el['points'])}")

        # Build geometries - MUST match validation geometry exactly
        def build_geom(el_data):
            points = [(p[0], p[1]) for p in el_data["points"]]
            if len(points) < 2:
                return None
            if el_data["type"].lower() in ['text', 'clipart'] or el_data["closed"]:
                if len(points) >= 3:
                    geom = Polygon(points)
                    if not geom.is_valid:
                        geom = geom.buffer(0)
                    return geom
                return None
            # For paths, buffer by width/2 to match validation geometry
            line = LineString(points)
            width = el_data.get("width", 3.0)
            if width > 0:
                return line.buffer(width / 2.0, cap_style=1)
            return line

        # Fix 1: Edge buffer violations - move elements inward
        if req.field and 'exterior' in req.field:
            field_coords = [(p[0], p[1]) for p in req.field['exterior']]
            field_polygon = Polygon(field_coords)
            inset_boundary = field_polygon.buffer(-req.constraints.edgeBuffer)

            for el_data in elements_data:
                geom = build_geom(el_data)
                if geom is None:
                    continue

                # Check if too close to edge
                if not inset_boundary.is_empty and not inset_boundary.contains(geom):
                    # Calculate how much to move inward
                    centroid = geom.centroid
                    field_center = field_polygon.centroid

                    # Direction from element to field center
                    dx = field_center.x - centroid.x
                    dy = field_center.y - centroid.y
                    dist = (dx**2 + dy**2)**0.5

                    if dist > 0:
                        # Normalize and scale by needed movement
                        distance_to_edge = field_polygon.exterior.distance(geom)
                        move_dist = req.constraints.edgeBuffer - distance_to_edge + 0.5  # Extra 0.5m margin

                        if move_dist > 0:
                            move_x = (dx / dist) * move_dist
                            move_y = (dy / dist) * move_dist

                            # Apply translation to points
                            el_data["points"] = [
                                [p[0] + move_x, p[1] + move_y]
                                for p in el_data["points"]
                            ]
                            changes.append({
                                "elementId": el_data["id"],
                                "change": f"Moved {move_dist:.1f}m away from edge"
                            })

        # Fix 2: Wall width violations - move paths apart (including overlapping elements)
        print(f"[AutoFix] Checking {len(elements_data)} elements against each other for wall width violations")
        for i, el1 in enumerate(elements_data):
            geom1 = build_geom(el1)
            if geom1 is None:
                print(f"[AutoFix]   Element {el1['id'][:8]} has no valid geometry")
                continue

            for j, el2 in enumerate(elements_data):
                if i >= j:
                    continue

                geom2 = build_geom(el2)
                if geom2 is None:
                    print(f"[AutoFix]   Element {el2['id'][:8]} has no valid geometry")
                    continue

                # Check distance and intersection
                distance = geom1.distance(geom2)
                intersects = geom1.intersects(geom2)
                print(f"[AutoFix] Pair {el1['id'][:8]} vs {el2['id'][:8]}: distance={distance:.2f}m, intersects={intersects}")

                # Fix if overlapping OR too close
                if intersects or distance < req.constraints.wallWidthMin:
                    print(f"[AutoFix]   -> NEEDS FIX! (minWall={req.constraints.wallWidthMin}m)")
                    # For overlapping elements, use centroid direction
                    if intersects or distance < 0.01:
                        # Elements overlap - use centroid-to-centroid direction
                        c1 = geom1.centroid
                        c2 = geom2.centroid
                        dx = c2.x - c1.x
                        dy = c2.y - c1.y
                        dist = (dx**2 + dy**2)**0.5

                        if dist < 0.01:
                            # Centroids are same - pick arbitrary direction
                            dx, dy, dist = 1.0, 0.0, 1.0

                        # Move by full wallWidthMin + margin since they overlap
                        move_dist = req.constraints.wallWidthMin / 2 + 0.5
                    else:
                        # Elements are close but not touching - use nearest points
                        pt1, pt2 = nearest_points(geom1, geom2)
                        dx = pt2.x - pt1.x
                        dy = pt2.y - pt1.y
                        dist = (dx**2 + dy**2)**0.5

                        if dist < 0.01:
                            dx, dy, dist = 1.0, 0.0, 1.0

                        move_dist = (req.constraints.wallWidthMin - distance) / 2 + 0.25

                    move_x = (dx / dist) * move_dist
                    move_y = (dy / dist) * move_dist

                    # Move el2 away
                    el2["points"] = [
                        [p[0] + move_x, p[1] + move_y]
                        for p in el2["points"]
                    ]

                    # Move el1 in opposite direction
                    el1["points"] = [
                        [p[0] - move_x, p[1] - move_y]
                        for p in el1["points"]
                    ]

                    change_type = "overlap" if intersects else "spacing"
                    changes.append({
                        "elementId": el1["id"],
                        "change": f"Fixed {change_type}: moved {move_dist:.1f}m apart from {el2['id'][:8]}"
                    })
                    changes.append({
                        "elementId": el2["id"],
                        "change": f"Fixed {change_type}: moved {move_dist:.1f}m apart from {el1['id'][:8]}"
                    })

                    # Rebuild geometries for next iteration
                    geom1 = build_geom(el1)
                    geom2 = build_geom(el2)

        # Fix 3: Violations against already carved paths - move elements away
        carved_edges = app_state.get_carved_edges()
        if carved_edges is not None:
            print(f"[AutoFix] Checking {len(elements_data)} elements against carved edges")
            for el_data in elements_data:
                geom = build_geom(el_data)
                if geom is None:
                    continue

                # Check distance from geometry to carved edges
                distance = geom.distance(carved_edges)
                intersects = geom.intersects(carved_edges)
                print(f"[AutoFix] Element {el_data['id'][:8]} vs carved: distance={distance:.2f}m, intersects={intersects}")

                if intersects or distance < req.constraints.wallWidthMin:
                    print(f"[AutoFix]   -> NEEDS FIX vs carved edges!")

                    # For overlapping/intersecting elements, use centroid direction
                    if intersects or distance < 0.01:
                        # Element overlaps carved edges - use centroid to carved centroid direction
                        el_centroid = geom.centroid
                        carved_centroid = carved_edges.centroid
                        dx = el_centroid.x - carved_centroid.x  # Direction away from carved
                        dy = el_centroid.y - carved_centroid.y
                        dist = (dx**2 + dy**2)**0.5

                        print(f"[AutoFix]   Overlap case: el_centroid=({el_centroid.x:.1f},{el_centroid.y:.1f}), carved_centroid=({carved_centroid.x:.1f},{carved_centroid.y:.1f})")

                        if dist < 0.01:
                            # Centroids same, use a default direction (right/up)
                            dx, dy, dist = 1.0, 1.0, 1.414
                            print(f"[AutoFix]   Using default direction (1,1)")

                        move_dist = req.constraints.wallWidthMin + 0.5
                    else:
                        # Close but not touching - use nearest points
                        try:
                            pt1, pt2 = nearest_points(geom, carved_edges)
                            dx = pt1.x - pt2.x  # Direction away from carved edge
                            dy = pt1.y - pt2.y
                            dist = (dx**2 + dy**2)**0.5
                            print(f"[AutoFix]   Close case: nearest_pts direction=({dx:.2f},{dy:.2f}), dist={dist:.2f}")

                            if dist < 0.01:
                                # Fallback if nearest points are same
                                dx, dy, dist = 1.0, 1.0, 1.414
                                print(f"[AutoFix]   Using default direction (1,1)")
                        except Exception as e:
                            print(f"[AutoFix]   nearest_points failed: {e}")
                            continue

                        move_dist = req.constraints.wallWidthMin - distance + 0.25

                    move_x = (dx / dist) * move_dist
                    move_y = (dy / dist) * move_dist
                    print(f"[AutoFix]   Moving element by ({move_x:.2f},{move_y:.2f}) = {move_dist:.1f}m")

                    el_data["points"] = [
                        [p[0] + move_x, p[1] + move_y]
                        for p in el_data["points"]
                    ]
                    changes.append({
                        "elementId": el_data["id"],
                        "change": f"Moved {move_dist:.1f}m away from existing carved path"
                    })

        # Convert back to response format
        fixed_elements = [
            {
                "id": el["id"],
                "type": el["type"],
                "points": el["points"],
                "width": el["width"],
                "closed": el["closed"]
            }
            for el in elements_data
        ]

        print(f"[AutoFix] ========== AUTO-FIX RESULT ==========")
        print(f"[AutoFix] Total changes made: {len(changes)}")
        for change in changes:
            print(f"[AutoFix]   - {change['elementId'][:8]}: {change['change']}")
        print(f"[AutoFix] Returning {len(fixed_elements)} elements")

        return {
            "elements": fixed_elements,
            "fixedCount": len(changes),
            "changes": changes
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"error": f"Auto-fix error: {str(e)}", "error_code": "AUTOFIX_ERROR"}
        )


class CarveBatchRequest(BaseModel):
    """Request model for batch carving."""
    elements: List[DesignElement]
    maze: Optional[dict] = None  # Current maze geometry with walls


@router.post("/carve-batch")
def carve_batch(req: CarveBatchRequest):
    """
    Carve all design elements through maze walls in batch.

    Handles two types of carving:
    - Text/closed polygons: Carved as filled areas (subtract polygon directly)
    - Paths/lines: Carved as buffered lines (stroke)

    Args:
        req: CarveBatchRequest with elements and current maze

    Returns:
        {
            "maze": {
                "walls": [[[x, y], ...], ...],
                "geometry": {...}
            },
            "error": Optional str
        }
    """
    from shapely.geometry import LineString, MultiLineString, Polygon
    from shapely.geometry.base import BaseGeometry
    from shapely.ops import unary_union

    try:
        print("[Carve-batch] ========== START ==========")
        print(f"[Carve-batch] Received {len(req.elements)} elements")

        for i, el in enumerate(req.elements):
            print(f"[Carve-batch] Element {i}:")
            print(f"  - type: {el.type}")
            print(f"  - closed: {el.closed}")
            print(f"  - width: {el.width}")
            print(f"  - points count: {len(el.points)}")
            if el.points:
                print(f"  - first point: {el.points[0]}")
                print(f"  - last point: {el.points[-1]}")

        # Get current maze walls from state or request
        current_walls = app_state.get_walls()

        if not current_walls:
            return {
                "error": "No maze exists. Generate a maze first.",
                "maze": None
            }

        # Collect all carve geometries
        carve_geoms = []

        for el in req.elements:
            if len(el.points) < 2:
                continue

            points = [(p[0], p[1]) for p in el.points]

            # Apply rotation if specified
            rotation = el.rotation or 0
            if rotation != 0 and len(points) > 0:
                import math
                # Calculate centroid
                cx = sum(p[0] for p in points) / len(points)
                cy = sum(p[1] for p in points) / len(points)
                # Rotate each point around centroid
                rad = math.radians(rotation)
                cos_r, sin_r = math.cos(rad), math.sin(rad)
                rotated_points = []
                for px, py in points:
                    # Translate to origin, rotate, translate back
                    dx, dy = px - cx, py - cy
                    rx = dx * cos_r - dy * sin_r + cx
                    ry = dx * sin_r + dy * cos_r + cy
                    rotated_points.append((rx, ry))
                points = rotated_points
                print(f"[Batch Carve] Applied {rotation}° rotation to element {el.id[:8]}")

            try:
                # Determine if this should be treated as a filled polygon
                # All element types (text, clipart, etc.) respect the closed flag:
                #   closed=true → filled polygon carve
                #   closed=false with width → outline carve (buffered line)
                is_closed_flag = el.closed and len(points) >= 3
                # Check if points form a closed loop (first ≈ last point) as a fallback,
                # but NOT if the element explicitly has closed=false with a width (outline mode)
                explicitly_outline = (not el.closed and el.width > 0)
                points_close_loop = (not explicitly_outline and len(points) >= 4 and
                                     abs(points[0][0] - points[-1][0]) < 0.01 and
                                     abs(points[0][1] - points[-1][1]) < 0.01)

                # CLOSED SHAPES: Use polygon directly (filled area)
                if is_closed_flag or points_close_loop:
                    print(f"[Batch Carve] Processing as POLYGON: {el.id[:8]} (type={el.type}, closed={el.closed}, points_close_loop={points_close_loop})")
                    poly = Polygon(points)
                    print(f"[Batch Carve]   -> Polygon valid: {poly.is_valid}, area: {poly.area:.2f}m²")
                    if poly.is_valid and poly.area > 0.1:  # Minimum 0.1 m² to filter degenerate polygons
                        carve_geoms.append(poly)
                        print(f"[Batch Carve]   -> ADDED polygon to carve_geoms")
                    elif not poly.is_valid:
                        # Try to fix invalid polygon
                        print(f"[Batch Carve]   -> Polygon invalid, trying buffer(0) fix")
                        poly = poly.buffer(0)
                        if poly.is_valid and not poly.is_empty:
                            carve_geoms.append(poly)
                            print(f"[Batch Carve]   -> FIXED and ADDED polygon")
                        else:
                            print(f"[Batch Carve]   -> SKIPPING invalid polygon (cannot fix)")
                    else:
                        print(f"[Batch Carve]   -> SKIPPING degenerate polygon (area too small: {poly.area:.4f}m²)")
                else:
                    # PATHS/LINES: Buffer the line to create width (stroke)
                    print(f"[Batch Carve] Processing as BUFFERED LINE: {el.id[:8]} (type={el.type}, width={el.width}m)")
                    line = LineString(points)
                    buffered = line.buffer(el.width / 2.0, cap_style=1, join_style=1)
                    carve_geoms.append(buffered)
                    print(f"[Batch Carve]   -> ADDED buffered line to carve_geoms")

            except Exception as e:
                print(f"[Batch Carve] ERROR processing element {el.id[:8]}: {e}")
                import traceback
                traceback.print_exc()
                continue

        # Union all carve areas and subtract from walls
        print(f"[Batch Carve] Total carve_geoms collected: {len(carve_geoms)}")
        if carve_geoms:
            try:
                print(f"[Batch Carve] Creating union of {len(carve_geoms)} geometries...")
                all_carves = unary_union(carve_geoms)
                print(f"[Batch Carve] Union created, performing difference on walls...")
                updated_walls = current_walls.difference(all_carves)
                print(f"[Batch Carve] SUCCESS - Carved {len(carve_geoms)} elements from maze")

                # Carve headland walls with the same eraser
                headland_walls = app_state.get_headland_walls()
                if headland_walls:
                    updated_headland = headland_walls.difference(all_carves)
                    app_state.set_headland_walls(updated_headland)
                    print(f"[Batch Carve] Also carved headland walls")

                # Track carved edges for validation and carve areas for retention
                boundary = all_carves.boundary
                print(f"[Batch Carve] all_carves type: {type(all_carves).__name__}, boundary type: {type(boundary).__name__}")
                print(f"[Batch Carve] boundary is_empty: {boundary.is_empty}, bounds: {boundary.bounds}")
                app_state.add_carved_edges(boundary)
                app_state.add_carved_area(all_carves)
                carved_state = app_state.get_carved_edges()
                print(f"[Batch Carve] After add - carved_edges type: {type(carved_state).__name__ if carved_state else 'None'}")
                print(f"[Batch Carve] carved_edges is_empty: {carved_state.is_empty if carved_state else 'N/A'}")

            except Exception as e:
                print(f"[Batch Carve] ERROR - Union/difference failed: {e}")
                import traceback
                traceback.print_exc()
                return {
                    "error": f"Failed to carve geometries: {str(e)}",
                    "maze": None
                }
        else:
            print(f"[Batch Carve] No carve_geoms to process, returning original walls")
            updated_walls = current_walls

        # Update state
        app_state.set_walls(updated_walls)

        # Return flattened walls (including headland walls)
        flattened = flatten_geometry(updated_walls)
        headland_walls_flat = flatten_geometry(app_state.get_headland_walls()) if app_state.get_headland_walls() else []
        print(f"[Carve-batch] Returning {len(flattened)} wall segments, {len(headland_walls_flat)} headland segments")
        print("[Carve-batch] ========== END ==========")

        # Serialize carved areas as WKT for frontend snapshot
        carved_areas = app_state.get_carved_areas()
        carved_areas_wkt = carved_areas.wkt if carved_areas and not carved_areas.is_empty else ""

        return {
            "maze": {
                "walls": flattened,
                "headlandWalls": headland_walls_flat,
                "carvedAreas": carved_areas_wkt,
                "geometry": None  # Frontend doesn't use this
            },
            "error": None
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "error": f"Batch carve failed: {str(e)}",
            "maze": None
        }


def import_meta_env_dev():
    """Helper to check if in development mode."""
    import os
    return os.getenv('DEBUG', 'false').lower() == 'true'
