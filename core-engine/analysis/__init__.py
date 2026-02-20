"""
Analysis module: Pathfinding and maze metrics.

Provides pathfinding algorithms (A*), solvability checks,
and difficulty metrics (dead ends, path complexity, etc.).
"""

from .pathfinding import (
    find_path,
    is_solvable,
)

from .metrics import (
    calculate_difficulty_score,
    analyze_maze,
)

__all__ = [
    "find_path",
    "is_solvable",
    "calculate_difficulty_score",
    "analyze_maze",
]
