"""
Application state management.

Maintains the current field boundary, maze walls, and coordinate system.
In the future, this will be replaced with a proper database or session storage.
"""

from shapely.geometry.base import BaseGeometry
from typing import Optional


class AppState:
    """
    Singleton application state holder.

    Stores:
    - current_field: Field boundary geometry (centered at origin)
    - current_walls: Maze walls geometry
    - current_crs: Coordinate reference system (e.g., "EPSG:32615")
    - carved_edges: Accumulated boundaries of all carved paths (for validation)
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AppState, cls).__new__(cls)
            cls._instance.current_field: Optional[BaseGeometry] = None
            cls._instance.current_walls: Optional[BaseGeometry] = None
            cls._instance.current_crs: Optional[str] = None
            cls._instance.carved_edges: Optional[BaseGeometry] = None
        return cls._instance

    def set_field(self, field: BaseGeometry, crs: str):
        """Set the current field boundary and CRS."""
        self.current_field = field
        self.current_crs = crs
        # Reset walls and carved edges when field changes
        self.current_walls = None
        self.carved_edges = None

    def set_walls(self, walls: BaseGeometry):
        """Set the current maze walls."""
        self.current_walls = walls

    def get_field(self) -> Optional[BaseGeometry]:
        """Get the current field boundary."""
        return self.current_field

    def get_walls(self) -> Optional[BaseGeometry]:
        """Get the current maze walls."""
        return self.current_walls

    def get_crs(self) -> Optional[str]:
        """Get the current coordinate reference system."""
        return self.current_crs

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

    def clear(self):
        """Clear all state."""
        self.current_field = None
        self.current_walls = None
        self.current_crs = None
        self.carved_edges = None


# Global singleton instance
app_state = AppState()
