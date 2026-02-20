# Corn Maze CAD

A desktop application for designing corn mazes with GPS integration and GIS export capabilities.

## Architecture

This project uses a hybrid architecture:

- **Electron** - Desktop application shell
- **React + TypeScript + Vite** - Frontend UI with HTML5 Canvas for rendering
- **Python FastAPI** - Backend for GIS operations (Shapely, PyProj)

```
┌─────────────────────────────────────────────┐
│            Electron (Desktop Shell)          │
│  ┌─────────────────┐  ┌──────────────────┐ │
│  │  React UI       │  │  Python FastAPI  │ │
│  │  (Port 5173)    │  │  (Port 8000)     │ │
│  │  - Canvas       │  │  - Shapely       │ │
│  │  - Pan/Zoom     │  │  - PyProj        │ │
│  │  - Drawing      │  │  - Pyshp         │ │
│  └─────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Python** >= 3.10 (with `pip`)

## First-Time Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd corn-maze-cad
```

### 2. Install All Dependencies

Run this command from the project root to install all dependencies in one go:

```bash
npm run install:all
```

This will:
1. Install root dependencies (Electron, concurrently, cross-env, wait-on)
2. Install Electron main process dependencies (TypeScript, electron-builder)
3. Install React renderer dependencies (Vite, React, etc.)
4. Install Python dependencies (FastAPI, Shapely, PyProj, pyshp)

**Or install manually:**

```bash
# Root dependencies
npm install

# Electron dependencies
cd app/electron
npm install

# React dependencies
cd ../renderer
npm install

# Python dependencies
cd ../../core-engine
pip install -r requirements.txt
```

## Development Workflow

### Start Everything (Recommended)

From the project root, run:

```bash
npm start
```

Or:

```bash
npm run dev
```

This starts all three processes concurrently:
- **Python Backend** (port 8000) - Auto-reloads on code changes
- **React Dev Server** (port 5173) - Hot module replacement
- **Electron App** - Waits for React, then opens the desktop window

**Console Output:**
```
[Python] INFO:     Uvicorn running on http://127.0.0.1:8000
[React] VITE v5.x.x ready in XXX ms
[Electron] [Python] Backend ready in XXXms
```

### Start Processes Individually

If you need finer control:

```bash
# Terminal 1: Python backend
npm run dev:python

# Terminal 2: React dev server
npm run dev:renderer

# Terminal 3: Electron (waits for React automatically)
npm run dev:electron
```

### Development Features

- **Python Auto-reload** - FastAPI with `--reload` flag
- **React HMR** - Vite hot module replacement
- **TypeScript Watch** - Electron main process recompiles on changes
- **DevTools** - Opens automatically in development mode
- **Dual Mode Support** - Can run in browser or Electron

## Browser Dev Mode (Optional)

You can develop the React UI in the browser without Electron:

```bash
# Terminal 1: Python backend
npm run dev:python

# Terminal 2: React only
npm run dev:renderer
```

Then open `http://localhost:5173` in your browser.

## Project Structure

```
corn-maze-cad/
├── app/
│   ├── electron/              # Electron main process
│   │   ├── main.ts            # Main process (TypeScript)
│   │   ├── preload.ts         # IPC bridge
│   │   ├── tsconfig.json      # TypeScript config
│   │   └── dist/              # Compiled JavaScript (generated)
│   │       ├── main.js
│   │       └── preload.js
│   └── renderer/              # React frontend
│       ├── src/
│       │   ├── App.tsx        # Main React component
│       │   ├── hooks/
│       │   │   └── useElectron.ts  # Electron integration hook
│       │   └── vite-env.d.ts  # TypeScript types
│       ├── vite.config.ts     # Vite configuration
│       └── dist/              # Production build (generated)
├── core-engine/               # Python backend
│   ├── main.py                # FastAPI application
│   └── requirements.txt       # Python dependencies
├── package.json               # Root package (workspaces)
└── README.md                  # This file
```

## Available Scripts

### Root Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start all processes (Python + React + Electron) |
| `npm run dev` | Same as `npm start` |
| `npm run dev:python` | Start Python backend only |
| `npm run dev:renderer` | Start React dev server only |
| `npm run dev:electron` | Start Electron only (waits for React) |
| `npm run build` | Build both renderer and Electron |
| `npm run install:all` | Install all dependencies |

### Electron Scripts (from `app/electron/`)

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript → JavaScript |
| `npm run watch` | Watch mode for TypeScript |
| `npm run clean` | Remove dist folder |
| `npm run dev` | Run Electron in dev mode |

### React Scripts (from `app/renderer/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Features

### Implemented ✅

- ✅ **GPS Import** - Mock GPS coordinates with WGS84 → Web Mercator projection
- ✅ **Maze Generation** - 10-meter grid pattern clipped to field boundary
- ✅ **Interactive Drawing** - Draw 4-meter-wide paths to carve through the maze
- ✅ **Pan & Zoom** - Full camera controls (pan with mouse, zoom with wheel)
- ✅ **Shapefile Export** - Export maze walls to GIS-compatible format (.shp, .shx, .dbf, .prj)
- ✅ **Electron Integration** - Secure IPC bridge, menu bar, file dialogs
- ✅ **Python Process Management** - Auto-start, health checks, graceful shutdown
- ✅ **Dual Mode** - Works in Electron or browser

### Menu Bar

**File Menu:**
- New (Ctrl+N)
- Open (Ctrl+O)
- Save (Ctrl+S)
- Save As (Ctrl+Shift+S)
- Exit (Alt+F4)

**Edit Menu:**
- Undo (Ctrl+Z)
- Redo (Ctrl+Shift+Z)

**View Menu:**
- Zoom In (Ctrl+=)
- Zoom Out (Ctrl+-)
- Reset Zoom (Ctrl+0)
- Toggle Developer Tools (F12)

**Help Menu:**
- About

## Technology Stack

### Frontend
- **Electron** 25.0.0 - Desktop application framework
- **React** 19.2.0 - UI framework
- **TypeScript** 5.0+ - Type safety
- **Vite** 7.2+ - Build tool and dev server

### Backend
- **Python** 3.10+ - Programming language
- **FastAPI** - REST API framework
- **Shapely** - Geometric operations
- **PyProj** - Coordinate transformations
- **Pyshp** - Shapefile export

### Build Tools
- **TypeScript** - Compile Electron main process
- **Vite** - Bundle React application
- **electron-builder** - Package for distribution
- **concurrently** - Run multiple processes

## Troubleshooting

### Python backend fails to start

**Error:** `python: command not found`

**Solution:** Ensure Python is installed and in your PATH:
```bash
python --version  # Should show Python 3.10+
```

### Port 8000 already in use

**Solution:** Kill the process using port 8000:
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill
```

### Electron window doesn't open

**Issue:** Backend not ready

**Solution:** Check the console logs. Electron waits up to 30 seconds for the backend to respond to `/health` endpoint.

### React dev server fails to start

**Error:** Port 5173 already in use

**Solution:** Kill the process or change the port in `app/renderer/vite.config.ts`

### TypeScript compilation errors

**Solution:** Rebuild the Electron main process:
```bash
cd app/electron
npm run build
```

## Development Tips

### Hot Reload

- **Python:** Changes to `core-engine/main.py` auto-reload (uvicorn `--reload`)
- **React:** Changes to `app/renderer/src/` trigger HMR
- **Electron Main:** Changes to `app/electron/*.ts` require manual restart (or use `npm run electron:watch`)

### Debugging

**Python Backend:**
- Logs appear in the Electron console with `[Python]` prefix
- Access API directly: `http://localhost:8000/docs` (FastAPI Swagger UI)

**React Frontend:**
- Press F12 in Electron to open DevTools
- In browser mode, use normal browser DevTools

**Electron Main Process:**
- Use `console.log()` - appears in terminal
- Enable main process debugging in VS Code

### Testing API Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Import GPS data
curl http://localhost:8000/import-gps-data

# Generate maze
curl http://localhost:8000/generate-maze
```

## Production Build

(To be implemented)

```bash
npm run build
cd app/electron
npm run package
```

This will create a Windows installer in `dist/`.

## Contributing

1. Create a feature branch
2. Make your changes
3. Test in both Electron and browser modes
4. Submit a pull request

## License

(Add your license here)

## Acknowledgments

Built with:
- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Shapely](https://shapely.readthedocs.io/)
