"""Tests for DXF export."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import tempfile
from pathlib import Path
import pytest
from shapely.geometry import Polygon, MultiLineString
from export.dxf import export_maze_dxf


@pytest.fixture
def field():
    return Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])


@pytest.fixture
def walls():
    return MultiLineString([
        [(10, 10), (90, 10)],
        [(10, 50), (90, 50)],
        [(10, 90), (90, 90)],
    ])


@pytest.fixture
def output_dir():
    with tempfile.TemporaryDirectory() as d:
        yield Path(d)


def test_export_dxf(field, walls, output_dir):
    result = export_maze_dxf(
        field=field,
        walls=walls,
        base_name="test_maze",
        output_dir=output_dir,
    )
    assert result["success"] is True
    assert Path(result["path"]).exists()
    assert result["path"].endswith(".dxf")

    content = Path(result["path"]).read_text()
    # DXF files start with section headers
    assert "SECTION" in content
    assert "ENTITIES" in content
    assert "LWPOLYLINE" in content


def test_export_dxf_with_annotations(field, walls, output_dir):
    result = export_maze_dxf(
        field=field,
        walls=walls,
        entrances=[(0, 50)],
        exits=[(100, 50)],
        emergency_exits=[(50, 0)],
        base_name="test_annotated",
        output_dir=output_dir,
    )
    assert result["success"] is True
    content = Path(result["path"]).read_text()
    assert "ANNOTATIONS" in content
    assert "ENTRANCE 1" in content
    assert "EXIT 1" in content
    assert "EMRG EXIT 1" in content


def test_export_dxf_no_walls(field, output_dir):
    result = export_maze_dxf(
        field=field,
        walls=None,
        base_name="test_no_walls",
        output_dir=output_dir,
    )
    assert result["success"] is True
    content = Path(result["path"]).read_text()
    assert "BOUNDARY" in content


def test_dxf_duplicate_filename(field, walls, output_dir):
    r1 = export_maze_dxf(field, walls, base_name="dup", output_dir=output_dir)
    r2 = export_maze_dxf(field, walls, base_name="dup", output_dir=output_dir)
    assert r1["path"] != r2["path"]
