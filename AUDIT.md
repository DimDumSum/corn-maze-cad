# Corn Maze CAD — Full Codebase Review & Audit

**Date:** 2026-02-20
**Scope:** Complete codebase review covering architecture, code quality, security, bugs, testing, and maintainability.

---

## 1. Project Overview

**Corn Maze CAD** is an Electron + React + Python/FastAPI desktop application for designing corn mazes with GIS integration. The architecture consists of:

- **Frontend:** React 18 + TypeScript + Zustand state management, Canvas2D rendering, Vite bundler
- **Backend:** Python FastAPI server with Shapely/NumPy for geometry, pyproj for CRS, PIL for image export
- **Desktop Shell:** Electron with context-isolated preload bridge
- **Communication:** REST API over localhost:8000

The app supports: field boundary import (KML, KMZ, Shapefile, GeoJSON, CSV, satellite tracing), maze generation (grid, recursive backtracker, Prim's), path carving, constraint validation, A* pathfinding, export (Shapefile, KML, PNG, GPX, DXF, prescription maps), and GPS-guided cutting.

---

## 2. Architecture Assessment

### Strengths
- **Clean modular router structure** — Backend is well-organized into `gis/`, `geometry/`, `mazification/`, `export/`, `analysis/`, `project/`, `gps_guidance/` modules
- **Proper Electron security** — `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, typed preload bridge
- **Zustand store design** — Good separation of concerns between `designStore`, `uiStore`, `constraintStore`, `projectStore`, `historyStore`
- **Snapshot-based undo/redo** — `designStore` captures both design elements and maze state for proper undo of carve operations
- **Content Security Policy** — CSP headers configured in Electron main process

### Concerns

#### 2.1 Duplicate/Competing State Systems
- **`projectStore.ts`** and **`designStore.ts`** both manage `field`, `maze`, `isDirty`, `projectPath`, and `resetProject()`. Only `designStore` appears to be actively used by `App.tsx`. `projectStore` seems to be dead code from an earlier iteration.
- **`historyStore.ts`** implements a Command-pattern undo/redo system, but `designStore.ts` implements its own snapshot-based undo/redo. Both have `MAX_HISTORY_SIZE = 50`. The `historyStore` appears unused in `App.tsx`.
- **Recommendation:** Remove `projectStore.ts` and `historyStore.ts` if they are truly unused, or consolidate into a single system.

#### 2.2 Singleton Global State (Python)
- `state.py` uses a singleton `AppState` class as global mutable state. This makes the backend inherently single-tenant and untestable without resetting global state between tests.
- The singleton `__new__` method initializes attributes with type annotations that only run once, which works but is fragile.

#### 2.3 Frontend ↔ Backend State Synchronization
- The frontend and backend maintain separate copies of maze state. Undo/redo must sync backend walls via `api.setWalls()` after each operation (`designStore.ts:418-426`). If this async call fails, the frontend and backend drift out of sync silently in production (errors only logged in DEV mode).

---

## 3. Security Audit

### 3.1 CRITICAL: Path Traversal in Project Save/Load/Delete

**File:** `core-engine/project/router.py:58-166`

The `save_project`, `load_project`, and `delete_project` endpoints accept a `filename` parameter that is directly joined to `PROJECTS_DIR` using `/` (via `Path`). A malicious filename like `../../etc/important_file` could escape the intended directory.

```python
# router.py:62 — No sanitization of filename
filepath = PROJECTS_DIR / filename  # Path traversal possible

# router.py:94 — Same issue on load
filepath = PROJECTS_DIR / filename

# router.py:161 — Same issue on delete — can delete arbitrary files
filepath = PROJECTS_DIR / filename
filepath.unlink()
```

**Severity:** HIGH (local desktop app reduces risk vs. a web service, but still dangerous if the API is exposed or if a malicious project file triggers loads)

**Fix:** Validate that `filename` contains no path separators and that the resolved path is within `PROJECTS_DIR`:
```python
resolved = (PROJECTS_DIR / filename).resolve()
if not str(resolved).startswith(str(PROJECTS_DIR.resolve())):
    raise HTTPException(status_code=400, detail="Invalid filename")
```

### 3.2 HIGH: Overly Permissive CORS

**File:** `core-engine/main.py:29-35`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # Allows ANY origin
    allow_credentials=True, # With credentials!
    allow_methods=["*"],
    allow_headers=["*"],
)
```

`allow_origins=["*"]` with `allow_credentials=True` is dangerous. Any website could make authenticated cross-origin requests to the localhost API. While this is a local desktop app, if the user has the backend running, any malicious website they visit could interact with the API.

**Fix:** Restrict to `["http://localhost:5173", "http://localhost:*", "http://127.0.0.1:*"]`.

### 3.3 MEDIUM: KMZ Zip Bomb / Zip Slip

**File:** `core-engine/gis/importers.py:165-192`

The KMZ importer extracts a ZIP file to a temp directory without size limits or path validation:

```python
with zipfile.ZipFile(file_path, 'r') as zip_ref:
    zip_ref.extractall(temp_dir)  # No validation of member paths or sizes
```

A crafted KMZ could contain files with `../` in their names (zip slip) or be a zip bomb consuming disk space.

**Fix:** Validate member paths before extraction and limit total extracted size.

### 3.4 MEDIUM: No File Size Limits on Upload

**File:** `core-engine/gis/router.py:57-62`

The `import_boundary_file` endpoint reads entire uploaded files into memory without size limits:

```python
content = await uploaded_file.read()  # No size limit
```

A very large file could exhaust server memory.

**Fix:** Add `max_upload_size` configuration and check `Content-Length` header.

### 3.5 MEDIUM: Unbounded Computation in Pathfinding

**File:** `core-engine/analysis/pathfinding.py:16-55`

The `_rasterize_walls` function has O(rows × cols) nested loops creating Shapely `Point` objects and calling `contains()` for each cell. With a small `resolution` and large field, this creates an enormous grid. For example, a 1km² field with resolution=0.1 creates 100M cells.

```python
for r in range(grid_rows):      # Could be very large
    for c in range(grid_cols):   # Unbounded
        cx = minx + (c + 0.5) * resolution
        cy = miny + (r + 0.5) * resolution
        if field_boundary.contains(Point(cx, cy)):  # Expensive per-cell
```

**Fix:** Add maximum grid size limit (e.g., 10000 cells) and validate `resolution` parameter.

### 3.6 MEDIUM: Image-to-Path Base64 Memory Bomb

**File:** `core-engine/geometry/router.py:304-473`

The `image_to_paths_endpoint` accepts a base64-encoded image string with no size limit in the Pydantic model:

```python
class ImageToPathsRequest(BaseModel):
    imageData: str  # No max_length constraint
```

A very large base64 string could exhaust memory. Same issue with `ImagePreviewRequest` and `alignDronePhoto`.

### 3.7 LOW: Bare `except:` Clauses Swallowing Errors

**File:** `core-engine/project/router.py:146, 217`

```python
except:                    # line 146 — bare except in list_projects
    projects.append({...})

except:                    # line 217 — bare except in check_autosave
    return {"exists": False}
```

These catch all exceptions including `KeyboardInterrupt` and `SystemExit`, and hide the actual error.

**Fix:** Use `except Exception:` at minimum, and log the error.

### 3.8 LOW: Debug Information Leaked in Production

**File:** `core-engine/geometry/router.py:1227-1229`

The `validate_design` endpoint returns `_debug_carved_edges` information in the response body. While this is a desktop app, debug info should be gated behind an environment check.

Multiple endpoints also call `print()` and `traceback.print_exc()` which could leak internal paths in production logs.

### 3.9 LOW: Version Mismatch

**File:** `core-engine/main.py:22-26 vs main.py:42-52`

The FastAPI app declares `version="2.0.0"` but the root endpoint returns `"version": "1.0.0"`. Minor, but indicates stale documentation.

---

## 4. Bugs and Logic Errors

### 4.1 BUG: Undefined Variable `is_text_or_clipart`

**File:** `core-engine/geometry/router.py:1637`

```python
print(f"... is_text_or_clipart={is_text_or_clipart}, ...")
```

The variable `is_text_or_clipart` is never defined in this scope. The code defines `is_text`, `is_closed_flag`, and `points_close_loop` but not `is_text_or_clipart`. This will raise a `NameError` at runtime when the print statement executes during polygon carving.

**Severity:** MEDIUM — Will crash batch carve operations for polygon elements.

### 4.2 BUG: Potential `img_array` UnboundLocalError in Image-to-Paths

**File:** `core-engine/geometry/router.py:401-403`

```python
if has_alpha:
    # ... sets 'binary' but not 'img_array'
else:
    img_array = np.array(image)  # Only set in else branch

# Later...
img_width = img_array.shape[1]   # line 401 — may be undefined if has_alpha=True
```

If the image has an alpha channel (`has_alpha=True`), `img_array` is never assigned, but it's referenced later for computing `img_width` and `img_height`. This will raise a `NameError`.

**Severity:** MEDIUM — Will crash image import for any image with transparency.

### 4.3 BUG: `throttle` Defined Inside Component Render

**File:** `app/renderer/src/App.tsx:705-717`

The `throttle` utility function is defined inside the `App` component body. This means a new throttle function is created on every render, defeating the purpose of throttling. Combined with the `useMemo` on line 756-758 that depends on `[camera, tool]`, the throttle state resets whenever camera or tool changes.

**Severity:** LOW — Mostly a performance concern; throttling won't work correctly during rapid state changes.

### 4.4 BUG: `handleSave` Stale Closure

**File:** `app/renderer/src/App.tsx:309`

```typescript
electronAPI.onMenuSave?.(() => handleSave());
```

This registers the IPC listener once (empty dependency array `[]` on line 319), but `handleSave` captures `camera`, `gridSize`, `showGrid` from the closure at registration time. These values will be stale when save is actually invoked via the menu.

**Fix:** Use `useRef` for `handleSave` or re-register on dependency changes.

### 4.5 BUG: `random.seed()` Global State Pollution

**File:** `core-engine/mazification/generators.py:153-154, 233-234`

```python
if seed is not None:
    random.seed(seed)
```

This sets the global random seed, affecting all subsequent random operations across the entire process. In a server handling concurrent requests, one user's seed could affect another's maze generation.

**Fix:** Use `random.Random(seed)` instance instead of the global `random.seed()`.

### 4.6 ISSUE: Autosave Silent Failure

**File:** `app/renderer/src/App.tsx:282-284`

```typescript
} catch {
    // Silently fail autosave
}
```

Autosave failures are completely silenced. If the backend is down or the disk is full, the user has no idea their work is not being saved.

### 4.7 ISSUE: `before-quit` Infinite Loop Potential

**File:** `app/electron/main.ts:540-546`

```typescript
app.on('before-quit', async (event) => {
    if (pythonProcess) {
        event.preventDefault();
        await stopPythonBackend();
        app.quit();  // Triggers 'before-quit' again
    }
});
```

After stopping the Python backend, `app.quit()` is called which triggers `before-quit` again. Since `pythonProcess` is set to `null` in `stopPythonBackend`'s exit handler, this should be safe — but if `stopPythonBackend` resolves before the exit handler fires (e.g., via the 5-second SIGKILL timeout), `pythonProcess` could still be truthy, causing an infinite loop.

---

## 5. Code Quality Issues

### 5.1 Excessive Debug Logging

Throughout the codebase, there are extensive `print()` and `console.log()` statements guarded by `import.meta.env.DEV` on the frontend but completely unguarded on the backend:

- `geometry/router.py` has ~80 `print()` statements
- `analysis/router.py`, `export/` modules all print extensively

These should use Python's `logging` module with configurable levels.

### 5.2 Duplicated Geometry Helpers

`_uncenter_geometry()` and `_reproject_to_wgs84()` are duplicated across:
- `core-engine/export/kml.py:22-33`
- `core-engine/export/png.py:23-32`
- `core-engine/export/shapefile.py` (referenced)

These should be extracted to a shared utility module.

### 5.3 Large Router File

`core-engine/geometry/router.py` is ~1728 lines containing:
- Path carving endpoints
- Text-to-paths conversion
- Image-to-paths conversion (with OpenCV)
- SVG path parsing
- Validation logic
- Auto-fix logic
- Batch carving

This should be split into separate modules (e.g., `text_import.py`, `image_import.py`, `svg_import.py`, `validation.py`).

### 5.4 Inconsistent Error Response Format

Some endpoints return errors as HTTP exceptions with structured detail:
```python
raise HTTPException(status_code=400, detail={"error": "...", "error_code": "..."})
```

Others return errors in the response body:
```python
return {"error": "...", "maze": None}
```

The frontend API client (`client.ts`) doesn't check HTTP status codes — it always calls `response.json()` regardless of status, which means HTTP errors will throw unhandled exceptions while response-body errors are handled gracefully. This is inconsistent.

### 5.5 Type `any` Usage

Several TypeScript interfaces and API client functions use `any`:
- `designStore.ts:49` — `ConstraintZone.geometry: any`
- `client.ts:400, 449, 460-471, 487` — Multiple `Promise<any>` return types
- `projectStore.ts:22` — `addPath(id: string, geometry: any)`

---

## 6. Testing Coverage

### Current Test Files (7 files, backend only):
1. `tests/test_api_integration.py` — API endpoint integration tests
2. `tests/test_flow_simulation.py` — Flow simulation tests
3. `tests/test_constraints.py` — Constraint engine tests
4. `tests/test_emergency.py` — Emergency exit tests
5. `tests/test_dxf_export.py` — DXF export tests
6. `tests/test_state.py` — AppState tests
7. `tests/test_gpx_export.py` — GPX export tests

### Missing Test Coverage:
- **Frontend:** Zero test files. No unit tests for stores, tools, components, or hooks.
- **Backend critical paths untested:**
  - Maze generation algorithms (`generators.py`)
  - Path carving (`operations.py`)
  - Pathfinding (`pathfinding.py`)
  - KML export (`kml.py`)
  - PNG export (`png.py`)
  - Shapefile export (`shapefile.py`)
  - Project save/load (`project/router.py`)
  - Image-to-paths conversion
  - SVG parsing
  - Text-to-paths conversion
  - GIS importers (KML, KMZ, Shapefile, GeoJSON, CSV)
  - Projection utilities
  - Validation logic in `geometry/router.py`

### Test Infrastructure:
- Uses `pytest` (mentioned in requirements)
- Tests use `sys.path.insert(0, ...)` hacks instead of proper package installation
- No CI/CD configuration found
- No test runner configuration in `package.json` for frontend

---

## 7. Performance Concerns

### 7.1 Continuous Canvas Rendering
**File:** `App.tsx:675-686`

```typescript
const animate = () => {
    draw();
    animationId = requestAnimationFrame(animate);
};
```

The canvas re-renders at 60fps continuously, even when nothing changes. The `draw()` function reads from Zustand stores directly (`useDesignStore.getState()`) on every frame, bypassing React's subscription system. This is intentional for smooth rendering but wastes CPU when idle.

**Fix:** Use a dirty flag to skip rendering when nothing has changed.

### 7.2 Rasterization Performance
The `_rasterize_walls` function in `pathfinding.py` creates individual Shapely `Point` objects for each grid cell and calls `contains()` on each. This is O(n²) and extremely slow for large grids. Vectorized approaches using `shapely.vectorized` or rasterio would be orders of magnitude faster.

### 7.3 Image Reconstruction on Every Frame
**File:** `App.tsx:445-454`

```typescript
if (aerialUnderlay && aerialUnderlay.imageData) {
    const img = new Image();
    img.src = aerialUnderlay.imageData;  // Creates new Image EVERY frame
```

A new `Image` object is created from base64 data on every render frame. This should be cached.

---

## 8. Dependency Assessment

### Python (`requirements.txt`):
Key dependencies: FastAPI, uvicorn, shapely, numpy, pyproj, Pillow, pyshp, fastkml, lxml, opencv-python, ezdxf, matplotlib

- No pinned versions observed in most entries (should pin for reproducibility)
- `opencv-python` is a heavy dependency used only for image contour tracing — could potentially use a lighter alternative

### Node.js:
- React 18, Zustand, Vite, Electron — all well-maintained mainstream choices
- TypeScript — good for type safety

---

## 9. Summary of Findings by Severity

| Severity | Count | Key Issues |
|----------|-------|------------|
| **CRITICAL** | 1 | Path traversal in project save/load/delete |
| **HIGH** | 1 | CORS `allow_origins=["*"]` with credentials |
| **MEDIUM** | 5 | `NameError` bug in batch carve, `UnboundLocalError` in image import, zip slip in KMZ, no file size limits, unbounded pathfinding computation |
| **LOW** | 6 | Bare excepts, debug info leakage, version mismatch, throttle bug, stale closure, seed pollution |
| **Code Quality** | 5 | Dead stores, duplicated code, oversized router, inconsistent errors, `any` types |
| **Testing** | 1 | No frontend tests, many untested backend paths |
| **Performance** | 3 | Continuous rendering, slow rasterization, image recreation per frame |

---

## 10. Recommended Priority Actions

1. **Fix path traversal** in `project/router.py` — sanitize filenames
2. **Fix `NameError`** in `geometry/router.py:1637` — rename to defined variable
3. **Fix `UnboundLocalError`** in `geometry/router.py:401` — ensure `img_array` is always set
4. **Restrict CORS** to localhost origins only
5. **Add zip member validation** in KMZ importer
6. **Add file size limits** to upload endpoints
7. **Add grid size limits** to pathfinding resolution
8. **Remove dead stores** (`projectStore.ts`, `historyStore.ts` if unused)
9. **Add frontend testing** infrastructure (Vitest + React Testing Library)
10. **Set up CI/CD** with automated test runs
