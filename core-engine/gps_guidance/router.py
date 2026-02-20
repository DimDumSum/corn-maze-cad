"""
Real-time GPS cutting guidance mode.

Provides endpoints for guiding a mower operator during maze cutting:
- Tracks current GPS position and maps to design coordinates
- Shows which paths have been cut (blue) vs remaining (red)
- Provides next-path routing suggestions
"""

from typing import List, Tuple, Optional, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import pyproj
from shapely.geometry import Point, LineString
from shapely.geometry.base import BaseGeometry

from state import app_state

router = APIRouter()


class GuidanceState:
    """Tracks cutting progress during GPS guidance mode."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.is_active = False
            cls._instance.cut_segments = []  # [(x1,y1,x2,y2), ...]
            cls._instance.current_position = None
            cls._instance.total_path_length = 0
            cls._instance.cut_path_length = 0
        return cls._instance

    def reset(self):
        self.is_active = False
        self.cut_segments = []
        self.current_position = None
        self.total_path_length = 0
        self.cut_path_length = 0


guidance_state = GuidanceState()


class StartGuidanceRequest(BaseModel):
    pathWidth: float = 2.4  # meters


class PositionUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: float = 5.0  # meters
    heading: float = 0  # degrees from north


class MarkCutRequest(BaseModel):
    startX: float
    startY: float
    endX: float
    endY: float


@router.post("/start")
def start_guidance(req: StartGuidanceRequest):
    """Start GPS cutting guidance mode."""
    field = app_state.get_field()
    walls = app_state.get_walls()

    if not field:
        raise HTTPException(status_code=400, detail={"error": "No field boundary"})
    if not walls:
        raise HTTPException(status_code=400, detail={"error": "No maze generated"})

    guidance_state.reset()
    guidance_state.is_active = True
    guidance_state.total_path_length = walls.length if walls else 0

    return {
        "success": True,
        "total_path_length": round(guidance_state.total_path_length, 1),
        "field_bounds": list(field.bounds),
    }


@router.post("/stop")
def stop_guidance():
    """Stop GPS cutting guidance mode."""
    stats = {
        "total_path_length": round(guidance_state.total_path_length, 1),
        "cut_path_length": round(guidance_state.cut_path_length, 1),
        "completion_pct": round(
            guidance_state.cut_path_length / guidance_state.total_path_length * 100, 1
        ) if guidance_state.total_path_length > 0 else 0,
        "segments_cut": len(guidance_state.cut_segments),
    }
    guidance_state.reset()
    return {"success": True, "stats": stats}


@router.get("/status")
def get_guidance_status():
    """Get current guidance status."""
    return {
        "is_active": guidance_state.is_active,
        "current_position": guidance_state.current_position,
        "cut_path_length": round(guidance_state.cut_path_length, 1),
        "total_path_length": round(guidance_state.total_path_length, 1),
        "completion_pct": round(
            guidance_state.cut_path_length / guidance_state.total_path_length * 100, 1
        ) if guidance_state.total_path_length > 0 else 0,
        "segments_cut": len(guidance_state.cut_segments),
    }


@router.post("/update-position")
def update_position(req: PositionUpdate):
    """
    Update current GPS position and return guidance info.

    Converts GPS coordinates to maze design coordinates and
    determines which paths are nearby.
    """
    if not guidance_state.is_active:
        raise HTTPException(status_code=400, detail={"error": "Guidance not active"})

    crs = app_state.get_crs()
    offset = app_state.get_centroid_offset()
    walls = app_state.get_walls()

    if not crs:
        raise HTTPException(status_code=400, detail={"error": "No CRS set"})

    # Transform GPS to design coordinates
    transformer = pyproj.Transformer.from_crs("EPSG:4326", crs, always_xy=True)
    proj_x, proj_y = transformer.transform(req.longitude, req.latitude)
    cx, cy = offset or (0, 0)
    design_x = proj_x - cx
    design_y = proj_y - cy

    guidance_state.current_position = [round(design_x, 2), round(design_y, 2)]

    # Find nearest wall/path
    current_point = Point(design_x, design_y)
    nearest_distance = walls.distance(current_point) if walls else 999

    # Determine if operator is on a path to cut
    on_path = nearest_distance < 3.0  # Within 3 meters of a wall line

    return {
        "design_position": guidance_state.current_position,
        "nearest_wall_distance": round(nearest_distance, 2),
        "on_path": on_path,
        "gps_accuracy": req.accuracy,
        "heading": req.heading,
    }


@router.post("/mark-cut")
def mark_cut(req: MarkCutRequest):
    """Mark a path segment as cut."""
    if not guidance_state.is_active:
        raise HTTPException(status_code=400, detail={"error": "Guidance not active"})

    segment_length = ((req.endX - req.startX)**2 + (req.endY - req.startY)**2)**0.5
    guidance_state.cut_segments.append((req.startX, req.startY, req.endX, req.endY))
    guidance_state.cut_path_length += segment_length

    return {
        "success": True,
        "segment_length": round(segment_length, 2),
        "total_cut": round(guidance_state.cut_path_length, 1),
        "completion_pct": round(
            guidance_state.cut_path_length / guidance_state.total_path_length * 100, 1
        ) if guidance_state.total_path_length > 0 else 0,
    }


@router.get("/next-path")
def suggest_next_path():
    """Suggest the nearest uncut path segment for efficient cutting."""
    if not guidance_state.is_active:
        raise HTTPException(status_code=400, detail={"error": "Guidance not active"})

    walls = app_state.get_walls()
    if not walls or walls.is_empty:
        return {"suggestion": None}

    if not guidance_state.current_position:
        return {"suggestion": None, "message": "No current position"}

    current = Point(guidance_state.current_position)

    # Find nearest wall segment
    lines = []
    if walls.geom_type == 'LineString':
        lines = [walls]
    elif walls.geom_type in ('MultiLineString', 'GeometryCollection'):
        for geom in walls.geoms:
            if geom.geom_type == 'LineString':
                lines.append(geom)

    best_line = None
    best_dist = float('inf')

    for line in lines:
        dist = line.distance(current)
        if dist < best_dist:
            best_dist = dist
            best_line = line

    if best_line:
        coords = list(best_line.coords)
        return {
            "suggestion": {
                "start": [round(coords[0][0], 2), round(coords[0][1], 2)],
                "end": [round(coords[-1][0], 2), round(coords[-1][1], 2)],
                "distance": round(best_dist, 2),
                "length": round(best_line.length, 2),
            }
        }

    return {"suggestion": None}
