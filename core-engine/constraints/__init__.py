"""
Constraints module: Path and wall width enforcement.

Validates that maze designs meet minimum width requirements
for paths (W_path) and walls (W_wall).
"""

from .engine import ConstraintEngine

__all__ = [
    "ConstraintEngine",
]
