"""Tests for the constraint validation engine."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from shapely.geometry import Polygon, LineString, MultiLineString
from constraints.engine import ConstraintEngine


@pytest.fixture
def engine():
    return ConstraintEngine(
        min_path_width=2.4,
        min_wall_width=2.0,
        inter_path_buffer=4.6,
        edge_buffer=3.0,
        max_dead_end_length=50.0,
    )


@pytest.fixture
def large_field():
    return Polygon([(0, 0), (200, 0), (200, 200), (0, 200)])


@pytest.fixture
def small_field():
    return Polygon([(0, 0), (50, 0), (50, 50), (0, 50)])


def test_validate_empty_walls(engine, large_field):
    """No violations when there are no walls."""
    from shapely.geometry import MultiLineString
    violations = engine.validate(MultiLineString(), large_field)
    assert len(violations) == 0


def test_validate_none_walls(engine, large_field):
    violations = engine.validate(None, large_field)
    assert len(violations) == 0


def test_validate_none_field(engine):
    walls = MultiLineString([[(10, 10), (50, 10)]])
    violations = engine.validate(walls, None)
    assert len(violations) == 0


def test_edge_buffer_violation(engine, small_field):
    """Walls too close to the field boundary should trigger violation."""
    # Wall right at the edge, within 3m buffer
    walls = MultiLineString([[(1, 25), (49, 25)]])
    violations = engine.check_edge_buffer(walls, small_field)
    assert len(violations) > 0
    assert violations[0]["type"] == "edge_buffer"


def test_edge_buffer_ok(engine, large_field):
    """Walls well within the field should not trigger edge buffer violations."""
    walls = MultiLineString([[(50, 50), (150, 50)]])
    violations = engine.check_edge_buffer(walls, large_field)
    assert len(violations) == 0


def test_wall_too_thin(engine, large_field):
    """Two parallel wall segments closer than min_wall_width should violate."""
    walls = MultiLineString([
        [(50, 50), (150, 50)],
        [(50, 51), (150, 51)],  # Only 1m apart, min is 2m
    ])
    violations = engine.check_wall_widths(walls, large_field)
    assert len(violations) > 0
    assert violations[0]["type"] == "wall_too_thin"


def test_wall_width_ok(engine, large_field):
    """Walls with enough spacing should not violate."""
    walls = MultiLineString([
        [(50, 50), (150, 50)],
        [(50, 55), (150, 55)],  # 5m apart, min is 2m
    ])
    violations = engine.check_wall_widths(walls, large_field)
    assert len(violations) == 0


def test_inter_path_buffer_violation(engine, large_field):
    """Parallel paths too close should trigger inter-path buffer violation."""
    walls = MultiLineString([
        [(50, 50), (150, 50)],
        [(50, 53), (150, 53)],  # 3m apart, min inter-path is 4.6m
    ])
    violations = engine.check_inter_path_buffer(walls, large_field)
    assert len(violations) > 0
    assert violations[0]["type"] == "inter_path_buffer"


def test_dead_end_length_violation(engine, large_field):
    """Very long dead end corridor should be flagged."""
    # Create a dead end that's 80m long (max is 50m)
    walls = MultiLineString([
        [(50, 50), (50, 130)],  # 80m vertical wall
    ])
    violations = engine.check_dead_end_lengths(walls, large_field)
    assert len(violations) > 0
    assert violations[0]["type"] == "dead_end_too_long"


def test_full_validate(engine, large_field):
    """Full validation should run all checks."""
    walls = MultiLineString([
        [(5, 100), (195, 100)],  # Near edge
        [(5, 101), (195, 101)],  # Too thin
    ])
    violations = engine.validate(walls, large_field)
    # Should find multiple types of violations
    types = set(v["type"] for v in violations)
    assert len(violations) > 0
    # At least edge buffer or wall thickness should be flagged
    assert len(types) >= 1
