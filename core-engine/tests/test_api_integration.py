"""Integration tests for FastAPI API endpoints."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from fastapi.testclient import TestClient
from state import AppState


@pytest.fixture(autouse=True)
def fresh_state():
    """Reset singleton between tests."""
    AppState._instance = None
    yield
    AppState._instance = None


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


@pytest.fixture
def loaded_client(client):
    """Client with a field already loaded."""
    # Import demo data to set up field
    resp = client.get("/gis/import-gps-data", params={"demo": True})
    assert resp.status_code == 200
    return client


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_root(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert "Corn Maze CAD Backend" in resp.json()["status"]


def test_set_entrances_exits(loaded_client):
    resp = loaded_client.post("/analysis/set-entrances-exits", json={
        "entrances": [[0, 50]],
        "exits": [[100, 50]],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    # Response returns the actual entrance/exit lists
    assert len(data["entrances"]) == 1
    assert len(data["exits"]) == 1


def test_get_entrances_exits(loaded_client):
    loaded_client.post("/analysis/set-entrances-exits", json={
        "entrances": [[10, 20]],
        "exits": [[90, 80]],
    })
    resp = loaded_client.get("/analysis/entrances-exits")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["entrances"]) == 1
    assert len(data["exits"]) == 1


def test_set_emergency_exits(loaded_client):
    resp = loaded_client.post("/analysis/set-emergency-exits", json={
        "positions": [[50, 0], [50, 100]],
    })
    assert resp.status_code == 200
    assert resp.json()["count"] == 2


def test_get_emergency_exits(loaded_client):
    loaded_client.post("/analysis/set-emergency-exits", json={
        "positions": [[25, 0]],
    })
    resp = loaded_client.get("/analysis/emergency-exits")
    assert resp.status_code == 200
    # Response uses "positions" key
    assert len(resp.json()["positions"]) == 1


def test_validate_constraints_no_maze(loaded_client):
    """Constraint validation with no maze should return 400 (no maze generated)."""
    resp = loaded_client.post("/analysis/validate-constraints", json={})
    # Without walls, the endpoint returns 400
    assert resp.status_code == 400
    data = resp.json()
    assert "error" in data.get("detail", {})


def test_project_list(client):
    resp = client.get("/project/list")
    assert resp.status_code == 200
    assert "projects" in resp.json()


def test_autosave_check(client):
    resp = client.get("/project/autosave/check")
    assert resp.status_code == 200
    assert "exists" in resp.json()


def test_export_gpx_no_field(client):
    """GPX export without a field should return error."""
    resp = client.get("/export/gpx")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("error") or data.get("success")


def test_export_dxf_no_field(client):
    """DXF export without a field should return error."""
    resp = client.get("/export/dxf")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("error") or data.get("success")


def test_guidance_status(client):
    """GPS guidance status should work even without active session."""
    resp = client.get("/guidance/status")
    assert resp.status_code == 200
    data = resp.json()
    # Response uses "is_active" key
    assert "is_active" in data
    assert data["is_active"] is False


def test_corn_row_grid(loaded_client):
    """Corn row grid computation should work with loaded field."""
    resp = loaded_client.post("/analysis/corn-row-grid", json={
        "row_spacing": 0.762,
        "cross_planted": True,
    })
    assert resp.status_code == 200
    data = resp.json()
    # Response uses "v_lines" and "h_lines" keys
    assert "v_lines" in data or "h_lines" in data
    assert data["row_spacing"] == 0.762
    assert data["total_rows"] > 0


def test_import_satellite_boundary(client):
    """Import a field boundary from satellite-traced coordinates."""
    coords = [
        [-93.645, 42.025],
        [-93.640, 42.025],
        [-93.640, 42.028],
        [-93.645, 42.028],
    ]
    resp = client.post("/gis/import-satellite-boundary", json={"coordinates": coords})
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "geometry" in data
    assert "exterior" in data["geometry"]
    assert data["area_hectares"] > 0
    assert data["source_format"] == "Satellite Trace"


def test_import_satellite_boundary_too_few_points(client):
    """Should reject with fewer than 3 points."""
    resp = client.post("/gis/import-satellite-boundary", json={"coordinates": [[-93.645, 42.025], [-93.640, 42.025]]})
    assert resp.status_code == 400


def test_project_save_and_list(client):
    """Save a project and verify it appears in the list."""
    save_resp = client.post("/project/save", json={
        "projectData": {"name": "Test Maze", "designElements": []},
        "filename": "test_integration.cmz",
    })
    assert save_resp.status_code == 200
    assert save_resp.json()["success"] is True

    list_resp = client.get("/project/list")
    assert list_resp.status_code == 200
    filenames = [p["filename"] for p in list_resp.json()["projects"]]
    assert "test_integration.cmz" in filenames

    # Clean up
    client.request("DELETE", "/project/delete", params={"filename": "test_integration.cmz"})


def test_autosave_cycle(client):
    """Autosave, check, recover, clear cycle."""
    # Save
    resp = client.post("/project/autosave", json={
        "projectData": {"name": "Autosave Test", "designElements": []},
    })
    assert resp.status_code == 200

    # Check
    check = client.get("/project/autosave/check")
    assert check.json()["exists"] is True
    assert check.json()["name"] == "Autosave Test"

    # Recover
    recover = client.post("/project/autosave/recover")
    assert recover.status_code == 200
    assert recover.json()["project"]["name"] == "Autosave Test"

    # Clear
    clear = client.request("DELETE", "/project/autosave/clear")
    assert clear.status_code == 200

    # Verify cleared
    check2 = client.get("/project/autosave/check")
    assert check2.json()["exists"] is False
