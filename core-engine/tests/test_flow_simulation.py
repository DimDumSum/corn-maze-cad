"""Tests for visitor flow simulation."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from shapely.geometry import Polygon, MultiLineString
from analysis.flow_simulation import simulate_visitor_flow


@pytest.fixture
def field():
    return Polygon([(0, 0), (50, 0), (50, 50), (0, 50)])


def test_no_entrances(field):
    """Should return error when no entrances provided."""
    result = simulate_visitor_flow(
        walls=None,
        field_boundary=field,
        entrances=[],
        exits=[(50, 25)],
        num_visitors=10,
    )
    assert "error" in result


def test_no_exits(field):
    """Should return error when no exits provided."""
    result = simulate_visitor_flow(
        walls=None,
        field_boundary=field,
        entrances=[(0, 25)],
        exits=[],
        num_visitors=10,
    )
    assert "error" in result


def test_basic_flow(field):
    """Basic simulation should produce results."""
    result = simulate_visitor_flow(
        walls=None,
        field_boundary=field,
        entrances=[(0, 25)],
        exits=[(50, 25)],
        num_visitors=20,
        resolution=5.0,
        seed=42,
    )
    assert "heatmap" in result
    assert "bottlenecks" in result
    assert "avg_solve_steps" in result
    assert "completion_rate" in result
    assert result["total_visitors"] == 20
    assert result["completion_rate"] >= 0
    assert result["completion_rate"] <= 1


def test_seeded_reproducibility(field):
    """Same seed should produce same results."""
    kwargs = dict(
        walls=None,
        field_boundary=field,
        entrances=[(0, 25)],
        exits=[(50, 25)],
        num_visitors=20,
        resolution=5.0,
        seed=123,
    )
    r1 = simulate_visitor_flow(**kwargs)
    r2 = simulate_visitor_flow(**kwargs)
    assert r1["completion_rate"] == r2["completion_rate"]
    assert r1["avg_solve_steps"] == r2["avg_solve_steps"]


def test_flow_with_walls(field):
    """Simulation with walls should still produce results."""
    walls = MultiLineString([
        [(25, 0), (25, 40)],
    ])
    result = simulate_visitor_flow(
        walls=walls,
        field_boundary=field,
        entrances=[(0, 25)],
        exits=[(50, 25)],
        num_visitors=15,
        resolution=5.0,
        seed=42,
    )
    assert "heatmap" in result
    assert result["total_visitors"] == 15
