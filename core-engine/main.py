"""
Corn Maze CAD Backend - Main Application

FastAPI backend for corn maze design with GIS integration.
Routes are organized into modular routers for different functionality areas.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import routers
from gis.router import router as gis_router
from geometry.router import router as geometry_router
from mazification.router import router as mazification_router
from export.router import router as export_router
from analysis.router import router as analysis_router
from project.router import router as project_router
from gps_guidance.router import router as gps_guidance_router

# Create FastAPI app
app = FastAPI(
    title="Corn Maze CAD API",
    description="Backend API for designing corn mazes with GIS integration",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROOT ENDPOINTS ---

@app.get("/")
def read_root():
    """API root endpoint with service information."""
    return {
        "status": "Corn Maze CAD Backend Running",
        "version": "1.0.0",
        "endpoints": {
            "/health": "Health check",
            "/gis/*": "GIS file import and format support",
            "/geometry/*": "Geometric operations (path carving)",
            "/maze/*": "Maze generation",
            "/export/*": "Export to shapefile"
        }
    }


@app.get("/health")
def health_check():
    """Health check endpoint for Electron to verify backend is running."""
    return {"status": "ok"}


# --- MOUNT ROUTERS ---

# GIS module: File import and format support
app.include_router(
    gis_router,
    prefix="/gis",
    tags=["GIS"]
)

# Geometry module: Path carving and geometric operations
app.include_router(
    geometry_router,
    prefix="/geometry",
    tags=["Geometry"]
)

# Mazification module: Maze generation
app.include_router(
    mazification_router,
    prefix="/maze",
    tags=["Maze Generation"]
)

# Export module: Shapefile export
app.include_router(
    export_router,
    prefix="/export",
    tags=["Export"]
)

# Analysis module: Maze metrics and pathfinding
app.include_router(
    analysis_router,
    prefix="/analysis",
    tags=["Analysis"]
)

# Project module: Save/load/autosave
app.include_router(
    project_router,
    prefix="/project",
    tags=["Project"]
)

# GPS Guidance module: Real-time cutting guidance
app.include_router(
    gps_guidance_router,
    prefix="/guidance",
    tags=["GPS Guidance"]
)


# Backwards compatibility endpoints (redirect to new paths)
# TODO: Remove these after frontend is updated to use new paths

from gis.router import get_formats, import_gps_data
from geometry.router import carve_path_endpoint, PathRequest
from mazification.router import generate_maze
from export.router import export_shapefile_endpoint

# Old: /supported-formats -> New: /gis/supported-formats
@app.get("/supported-formats")
def supported_formats_compat():
    """Backwards compatibility: Use /gis/supported-formats instead."""
    return get_formats()

# Old: /import-gps-data -> New: /gis/import-gps-data
@app.get("/import-gps-data")
def import_gps_data_compat(demo: bool = False):
    """Backwards compatibility: Use /gis/import-gps-data instead."""
    return import_gps_data(demo=demo)

# Old: /carve-path -> New: /geometry/carve
@app.post("/carve-path")
def carve_path_compat(req: PathRequest):
    """Backwards compatibility: Use /geometry/carve instead."""
    return carve_path_endpoint(req)

# Old: /generate-maze -> New: /maze/generate
@app.get("/generate-maze")
def generate_maze_compat(spacing: float = 10.0, algorithm: str = "backtracker", seed: int = None, direction_deg: float = 0.0, headland_inset: float = 0.0):
    """Backwards compatibility: Use /maze/generate instead."""
    return generate_maze(spacing=spacing, algorithm=algorithm, seed=seed, direction_deg=direction_deg, headland_inset=headland_inset)

# Old: /export-shapefile -> New: /export/shapefile
@app.get("/export-shapefile")
def export_shapefile_compat():
    """Backwards compatibility: Use /export/shapefile instead."""
    return export_shapefile_endpoint()


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
