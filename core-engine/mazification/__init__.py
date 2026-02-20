"""
Mazification module: Maze generation algorithms.

Contains various maze generation strategies including
grid-based, recursive backtracker, and corner filleting.
"""

from .generators import (
    generate_grid_maze,
)

__all__ = [
    "generate_grid_maze",
]
