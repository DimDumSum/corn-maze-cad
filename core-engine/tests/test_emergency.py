"""Tests for emergency exit analysis."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from shapely.geometry import Polygon, MultiLineString
from analysis.emergency import analyze_emergency_exits, suggest_emergency_exits


@pytest.fixture
def field():
    return Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])


@pytest.fixture
def simple_walls():
    return MultiLineString([
        [(20, 0), (20, 80)],
        [(40, 20), (40, 100)],
        [(60, 0), (60, 80)],
        [(80, 20), (80, 100)],
    ])


def test_analyze_full_coverage(field):
    """With exits everywhere, coverage should be high."""
    exits = [(0, 0), (100, 0), (0, 100), (100, 100), (50, 50)]
    result = analyze_emergency_exits(
        walls=None,
        field_boundary=field,
        emergency_exits=exits,
        max_distance=80.0,
        resolution=5.0,
    )
    assert result["coverage_pct"] > 90


def test_analyze_no_exits(field):
    """No exits should result in 0% coverage."""
    result = analyze_emergency_exits(
        walls=None,
        field_boundary=field,
        emergency_exits=[],
        max_distance=50.0,
        resolution=5.0,
    )
    # With no exits, min_distances stay at inf, so coverage is 0
    assert result["coverage_pct"] == 0


def test_analyze_single_exit(field):
    """Single center exit should cover immediate area."""
    result = analyze_emergency_exits(
        walls=None,
        field_boundary=field,
        emergency_exits=[(50, 50)],
        max_distance=60.0,
        resolution=5.0,
    )
    assert result["coverage_pct"] > 0
    assert result["max_distance_found"] > 0


def test_suggest_exits(field, simple_walls):
    """Suggestion algorithm should return new exit positions."""
    suggestions = suggest_emergency_exits(
        walls=simple_walls,
        field_boundary=field,
        existing_exits=[(0, 50)],
        max_distance=30.0,
        resolution=5.0,
    )
    assert isinstance(suggestions, list)
    # Should suggest at least one more exit
    assert len(suggestions) >= 1
    # Suggestions should be on or near the boundary
    for sx, sy in suggestions:
        assert 0 <= sx <= 100
        assert 0 <= sy <= 100


def test_suggest_exits_already_covered(field):
    """If already covered, no suggestions needed."""
    exits = [(0, 0), (100, 0), (0, 100), (100, 100), (50, 50)]
    suggestions = suggest_emergency_exits(
        walls=None,
        field_boundary=field,
        existing_exits=exits,
        max_distance=80.0,
        resolution=5.0,
    )
    assert len(suggestions) == 0
