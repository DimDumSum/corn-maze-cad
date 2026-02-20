"""Tests for AppState singleton."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from shapely.geometry import Polygon
from state import AppState


@pytest.fixture(autouse=True)
def fresh_state():
    """Reset singleton between tests."""
    AppState._instance = None
    yield
    AppState._instance = None


def test_singleton():
    s1 = AppState()
    s2 = AppState()
    assert s1 is s2


def test_set_field():
    state = AppState()
    field = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
    state.set_field(field, "EPSG:32615", (50.0, 50.0))
    assert state.get_field() is not None
    assert state.get_crs() == "EPSG:32615"
    assert state.get_centroid_offset() == (50.0, 50.0)


def test_set_walls():
    state = AppState()
    from shapely.geometry import LineString, MultiLineString
    walls = MultiLineString([
        [(0, 0), (10, 0)],
        [(0, 5), (10, 5)],
    ])
    state.set_walls(walls)
    assert state.get_walls() is not None
    assert state.get_walls().geom_type == 'MultiLineString'


def test_entrances_exits():
    state = AppState()
    state.set_entrances([(0, 50), (0, 25)])
    assert len(state.get_entrances()) == 2
    assert state.get_entrances()[0] == (0, 50)

    state.set_exits([(100, 50)])
    assert len(state.get_exits()) == 1

    state.set_emergency_exits([(50, 0), (50, 100)])
    assert len(state.get_emergency_exits()) == 2


def test_layers():
    state = AppState()
    layers = [{"id": "boundary", "name": "Boundary", "visible": True}]
    state.set_layers(layers)
    assert len(state.get_layers()) == 1
    assert state.get_layers()[0]["id"] == "boundary"


def test_clear():
    state = AppState()
    field = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
    state.set_field(field, "EPSG:32615")
    state.set_entrances([(0, 50)])
    state.set_exits([(100, 50)])
    state.set_emergency_exits([(50, 0)])

    state.clear()
    assert state.get_field() is None
    assert state.get_walls() is None
    assert state.get_crs() is None
    assert len(state.get_entrances()) == 0
    assert len(state.get_exits()) == 0
    assert len(state.get_emergency_exits()) == 0
    assert len(state.get_layers()) == 0
