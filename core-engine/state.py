"""
Application state management.

Maintains the current field boundary, maze walls, coordinate system,
layers, entrances/exits, and emergency exits.
"""

from shapely.geometry.base import BaseGeometry
from typing import Optional, List, Tuple, Dict


class AppState:
    """
    Singleton application state holder.

    Stores:
    - current_field: Field boundary geometry (centered at origin)
    - current_walls: Maze walls geometry
    - current_crs: Coordinate reference system (e.g., "EPSG:32615")
    - centroid_offset: (cx, cy) offset subtracted during centering, needed for geo export
    - carved_edges: Accumulated boundaries of all carved paths (for validation)
    - layers: Design layer definitions
    - entrances/exits/emergency_exits: Maze entrance, exit, and emergency exit positions
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AppState, cls).__new__(cls)
            cls._instance.current_field: Optional[BaseGeometry] = None
            cls._instance.current_walls: Optional[BaseGeometry] = None
            cls._instance.headland_walls: Optional[BaseGeometry] = None
            cls._instance.current_crs: Optional[str] = None
            cls._instance.centroid_offset: Optional[tuple] = None
            cls._instance.carved_edges: Optional[BaseGeometry] = None
            cls._instance.carved_areas: Optional[BaseGeometry] = None  # Union of carve eraser polygons
            cls._instance.layers: List[Dict] = []
            cls._instance.entrances: List[Tuple[float, float]] = []
            cls._instance.exits: List[Tuple[float, float]] = []
            cls._instance.emergency_exits: List[Tuple[float, float]] = []
        return cls._instance

    def set_field(self, field: BaseGeometry, crs: str, centroid_offset: tuple = None):
        """Set the current field boundary, CRS, and centroid offset."""
        self.current_field = field
        self.current_crs = crs
        self.centroid_offset = centroid_offset or (0.0, 0.0)
        # Reset walls and carved edges when field changes
        self.current_walls = None
        self.headland_walls = None
        self.carved_edges = None
        self.carved_areas = None

    def set_walls(self, walls: BaseGeometry):
        """Set the current maze walls."""
        self.current_walls = walls

    def get_field(self) -> Optional[BaseGeometry]:
        """Get the current field boundary."""
        return self.current_field

    def get_walls(self) -> Optional[BaseGeometry]:
        """Get the current maze walls."""
        return self.current_walls

    def set_headland_walls(self, walls: BaseGeometry):
        """Set the current headland walls (concentric ring rows)."""
        self.headland_walls = walls

    def get_headland_walls(self) -> Optional[BaseGeometry]:
        """Get the current headland walls."""
        return self.headland_walls

    def get_crs(self) -> Optional[str]:
        """Get the current coordinate reference system."""
        return self.current_crs

    def get_centroid_offset(self) -> tuple:
        """Get the centroid offset used for centering."""
        return self.centroid_offset or (0.0, 0.0)

    def get_carved_edges(self) -> Optional[BaseGeometry]:
        """Get the accumulated carved path boundaries."""
        return self.carved_edges

    def add_carved_edges(self, new_edges: BaseGeometry):
        """Add new carved path boundaries to the accumulated edges."""
        from shapely.ops import unary_union
        if self.carved_edges is None:
            self.carved_edges = new_edges
        else:
            self.carved_edges = unary_union([self.carved_edges, new_edges])

    def add_carved_area(self, eraser: BaseGeometry):
        """Accumulate a carve eraser polygon so carvings persist across regeneration."""
        from shapely.ops import unary_union
        if self.carved_areas is None:
            self.carved_areas = eraser
        else:
            self.carved_areas = unary_union([self.carved_areas, eraser])

    def set_carved_areas(self, areas: Optional[BaseGeometry]):
        """Set the carved areas directly (used for undo/redo restore)."""
        self.carved_areas = areas

    def get_carved_areas(self) -> Optional[BaseGeometry]:
        """Get the accumulated carve eraser polygons."""
        return self.carved_areas

    # --- Layer management ---

    def set_layers(self, layers: List[Dict]):
        self.layers = layers

    def get_layers(self) -> List[Dict]:
        return self.layers

    # --- Entrance / Exit management ---

    def set_entrances(self, entrances: List[Tuple[float, float]]):
        self.entrances = [tuple(e) for e in entrances]

    def get_entrances(self) -> List[Tuple[float, float]]:
        return self.entrances

    def set_exits(self, exits: List[Tuple[float, float]]):
        self.exits = [tuple(e) for e in exits]

    def get_exits(self) -> List[Tuple[float, float]]:
        return self.exits

    def set_emergency_exits(self, emergency_exits: List[Tuple[float, float]]):
        self.emergency_exits = [tuple(e) for e in emergency_exits]

    def get_emergency_exits(self) -> List[Tuple[float, float]]:
        return self.emergency_exits

    def clear(self):
        """Clear all state."""
        self.current_field = None
        self.current_walls = None
        self.headland_walls = None
        self.current_crs = None
        self.centroid_offset = None
        self.carved_edges = None
        self.carved_areas = None
        self.layers = []
        self.entrances = []
        self.exits = []
        self.emergency_exits = []


# Global singleton instance
app_state = AppState()
