"""
Mazification module: Maze generation algorithms.

Contains maze generation strategies aligned to corn planter rows,
including recursive backtracker and Prim's algorithm.
"""

from .generators import (
    generate_recursive_backtracker,
    generate_prims,
)

__all__ = [
    "generate_recursive_backtracker",
    "generate_prims",
]
