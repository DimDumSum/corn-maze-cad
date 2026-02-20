"""Tests for GPX export."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import tempfile
from pathlib import Path
import pytest
from shapely.geometry import Polygon, MultiLineString
from export.gpx import export_boundary_gpx, export_walls_gpx, export_cutting_guide_gpx


@pytest.fixture
def field():
    """A simple field in UTM Zone 15N coordinates."""
    return Polygon([
        (0, 0), (100, 0), (100, 100), (0, 100)
    ])


@pytest.fixture
def walls():
    return MultiLineString([
        [(10, 10), (90, 10)],
        [(10, 50), (90, 50)],
    ])


@pytest.fixture
def output_dir():
    with tempfile.TemporaryDirectory() as d:
        yield Path(d)


def test_export_boundary_gpx(field, output_dir):
    result = export_boundary_gpx(
        field=field,
        crs="EPSG:32615",
        centroid_offset=(500000, 4500000),
        base_name="test_boundary",
        output_dir=output_dir,
    )
    assert result["success"] is True
    assert Path(result["path"]).exists()

    content = Path(result["path"]).read_text()
    assert '<?xml version="1.0"' in content
    assert '<gpx' in content
    assert '<rte>' in content
    assert '<rtept' in content
    assert 'Field Boundary' in content


def test_export_walls_gpx(walls, output_dir):
    result = export_walls_gpx(
        walls=walls,
        crs="EPSG:32615",
        centroid_offset=(500000, 4500000),
        base_name="test_walls",
        output_dir=output_dir,
    )
    assert result["success"] is True
    assert result["track_count"] == 2
    assert Path(result["path"]).exists()

    content = Path(result["path"]).read_text()
    assert '<trk>' in content
    assert '<trkpt' in content


def test_export_cutting_guide_gpx(field, walls, output_dir):
    result = export_cutting_guide_gpx(
        field=field,
        walls=walls,
        crs="EPSG:32615",
        centroid_offset=(500000, 4500000),
        entrances=[(0, 50)],
        exits=[(100, 50)],
        base_name="test_guide",
        output_dir=output_dir,
    )
    assert result["success"] is True
    assert result["waypoint_count"] == 2  # 1 entrance + 1 exit
    assert result["track_count"] == 2     # 2 wall segments

    content = Path(result["path"]).read_text()
    assert '<wpt' in content
    assert 'Entrance 1' in content
    assert 'Exit 1' in content


def test_export_cutting_guide_no_walls(field, output_dir):
    result = export_cutting_guide_gpx(
        field=field,
        walls=None,
        crs="EPSG:32615",
        centroid_offset=(500000, 4500000),
        base_name="test_no_walls",
        output_dir=output_dir,
    )
    assert result["success"] is True
    assert result["track_count"] == 0


def test_duplicate_filename_handling(field, output_dir):
    """Second export should get a timestamped filename."""
    r1 = export_boundary_gpx(field, "EPSG:32615", (500000, 4500000), "dup_test", output_dir)
    r2 = export_boundary_gpx(field, "EPSG:32615", (500000, 4500000), "dup_test", output_dir)
    assert r1["path"] != r2["path"]
    assert Path(r1["path"]).exists()
    assert Path(r2["path"]).exists()
