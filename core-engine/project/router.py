"""
Project save/load API Router.

Handles persistent project storage with full state serialization
including field boundary, maze walls, design elements, layers,
entrances/exits, and constraint settings.
"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from state import app_state
from geometry.operations import flatten_geometry

router = APIRouter()

PROJECTS_DIR = Path.home() / ".corn-maze-cad" / "projects"
AUTOSAVE_DIR = Path.home() / ".corn-maze-cad" / "autosave"


def _ensure_dirs():
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    AUTOSAVE_DIR.mkdir(parents=True, exist_ok=True)


class ProjectData(BaseModel):
    version: int = 2
    name: str = "Untitled"
    field: Optional[dict] = None
    maze: Optional[dict] = None
    designElements: List[dict] = []
    layers: List[dict] = []
    entrances: List[List[float]] = []
    exits: List[List[float]] = []
    emergencyExits: List[List[float]] = []
    constraints: Optional[dict] = None
    camera: Optional[dict] = None
    gridSettings: Optional[dict] = None
    difficultyPhases: List[dict] = []
    metadata: Optional[dict] = None


class SaveRequest(BaseModel):
    projectData: dict
    filename: Optional[str] = None


@router.post("/save")
def save_project(req: SaveRequest):
    """Save project to disk. Returns the file path."""
    _ensure_dirs()

    filename = req.filename or f"project_{datetime.now().strftime('%Y%m%d_%H%M%S')}.cmz"
    if not filename.endswith('.cmz'):
        filename += '.cmz'

    filepath = PROJECTS_DIR / filename

    project = {
        **req.projectData,
        "version": 2,
        "savedAt": datetime.utcnow().isoformat(),
    }

    # Include backend state (walls geometry)
    walls = app_state.get_walls()
    if walls and not walls.is_empty:
        project["_backend_walls"] = flatten_geometry(walls)

    headland_walls = app_state.get_headland_walls()
    if headland_walls and not headland_walls.is_empty:
        project["_backend_headland_walls"] = flatten_geometry(headland_walls)

    crs = app_state.get_crs()
    if crs:
        project["_backend_crs"] = crs

    offset = app_state.get_centroid_offset()
    if offset:
        project["_backend_offset"] = list(offset)

    with open(filepath, 'w') as f:
        json.dump(project, f, indent=2)

    return {"success": True, "path": str(filepath), "filename": filename}


@router.post("/load")
def load_project(filename: str):
    """Load a project from disk by filename."""
    _ensure_dirs()

    filepath = PROJECTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail={"error": f"Project not found: {filename}"})

    with open(filepath, 'r') as f:
        project = json.load(f)

    # Restore backend state
    if "_backend_walls" in project:
        from shapely.geometry import MultiLineString, LineString
        lines = []
        for seg in project["_backend_walls"]:
            if len(seg) >= 2:
                lines.append(LineString([(p[0], p[1]) for p in seg]))
        if lines:
            app_state.set_walls(MultiLineString(lines))

    if "_backend_headland_walls" in project:
        from shapely.geometry import MultiLineString, LineString
        h_lines = []
        for seg in project["_backend_headland_walls"]:
            if len(seg) >= 2:
                h_lines.append(LineString([(p[0], p[1]) for p in seg]))
        if h_lines:
            app_state.set_headland_walls(MultiLineString(h_lines))

    if "_backend_crs" in project:
        app_state.current_crs = project["_backend_crs"]

    if "_backend_offset" in project:
        app_state.centroid_offset = tuple(project["_backend_offset"])

    # Restore field
    if project.get("field") and project["field"].get("geometry"):
        from shapely.geometry import Polygon, shape
        geom_data = project["field"]["geometry"]
        if "exterior" in geom_data:
            field_geom = Polygon(geom_data["exterior"])
            crs = project["field"].get("crs", "EPSG:4326")
            app_state.set_field(field_geom, crs, app_state.centroid_offset)

    return {"success": True, "project": project}


@router.get("/list")
def list_projects():
    """List all saved projects."""
    _ensure_dirs()

    projects = []
    for f in sorted(PROJECTS_DIR.glob("*.cmz"), key=os.path.getmtime, reverse=True):
        try:
            with open(f, 'r') as fh:
                data = json.load(fh)
            projects.append({
                "filename": f.name,
                "name": data.get("name", f.stem),
                "savedAt": data.get("savedAt", ""),
                "version": data.get("version", 1),
                "size": f.stat().st_size,
            })
        except:
            projects.append({
                "filename": f.name,
                "name": f.stem,
                "savedAt": "",
                "version": 0,
                "size": f.stat().st_size,
            })

    return {"projects": projects}


@router.delete("/delete")
def delete_project(filename: str):
    """Delete a saved project."""
    filepath = PROJECTS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail={"error": f"Project not found: {filename}"})

    filepath.unlink()
    return {"success": True}


@router.post("/autosave")
def autosave(req: SaveRequest):
    """Auto-save current project state for crash recovery."""
    _ensure_dirs()

    filepath = AUTOSAVE_DIR / "autosave.cmz"

    project = {
        **req.projectData,
        "version": 2,
        "savedAt": datetime.utcnow().isoformat(),
        "isAutosave": True,
    }

    walls = app_state.get_walls()
    if walls and not walls.is_empty:
        project["_backend_walls"] = flatten_geometry(walls)

    headland_walls = app_state.get_headland_walls()
    if headland_walls and not headland_walls.is_empty:
        project["_backend_headland_walls"] = flatten_geometry(headland_walls)

    crs = app_state.get_crs()
    if crs:
        project["_backend_crs"] = crs

    offset = app_state.get_centroid_offset()
    if offset:
        project["_backend_offset"] = list(offset)

    with open(filepath, 'w') as f:
        json.dump(project, f)

    return {"success": True, "path": str(filepath)}


@router.get("/autosave/check")
def check_autosave():
    """Check if an autosave exists for crash recovery."""
    filepath = AUTOSAVE_DIR / "autosave.cmz"
    if not filepath.exists():
        return {"exists": False}

    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        return {
            "exists": True,
            "savedAt": data.get("savedAt", ""),
            "name": data.get("name", "Autosave"),
        }
    except:
        return {"exists": False}


@router.post("/autosave/recover")
def recover_autosave():
    """Load the autosaved project."""
    filepath = AUTOSAVE_DIR / "autosave.cmz"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail={"error": "No autosave found"})

    with open(filepath, 'r') as f:
        project = json.load(f)

    # Restore backend state same as load
    if "_backend_walls" in project:
        from shapely.geometry import MultiLineString, LineString
        lines = []
        for seg in project["_backend_walls"]:
            if len(seg) >= 2:
                lines.append(LineString([(p[0], p[1]) for p in seg]))
        if lines:
            app_state.set_walls(MultiLineString(lines))

    if "_backend_headland_walls" in project:
        from shapely.geometry import MultiLineString, LineString
        h_lines = []
        for seg in project["_backend_headland_walls"]:
            if len(seg) >= 2:
                h_lines.append(LineString([(p[0], p[1]) for p in seg]))
        if h_lines:
            app_state.set_headland_walls(MultiLineString(h_lines))

    if "_backend_crs" in project:
        app_state.current_crs = project["_backend_crs"]

    if "_backend_offset" in project:
        app_state.centroid_offset = tuple(project["_backend_offset"])

    return {"success": True, "project": project}


@router.delete("/autosave/clear")
def clear_autosave():
    """Clear autosave data."""
    filepath = AUTOSAVE_DIR / "autosave.cmz"
    if filepath.exists():
        filepath.unlink()
    return {"success": True}
