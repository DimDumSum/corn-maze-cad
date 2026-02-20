# Store Architecture Refactoring Summary

## Overview
Refactored from command-based history to snapshot-based undo/redo with `designElements` as the single source of truth.

## Changes Made

### 1. **Unified Store** - `designStore.ts`

**Before:** Three separate stores
- `projectStore.ts` - field, maze, pathElements
- `historyStore.ts` - command pattern with execute/undo/redo
- `designStore.ts` - designElements for pending designs

**After:** Single unified `designStore.ts` containing:
- `field` - Field boundary geometry
- `designElements` - **Primary source of truth** for all user-created geometry
- `constraintZones` - Buffer/exclusion zones
- `maze` - **Computed result** from backend (not source of truth)
- `violations` - Validation errors
- `undoStack` / `redoStack` - **Snapshot-based history**

### 2. **Snapshot-Based Undo/Redo**

**Old Approach (Command Pattern):**
```typescript
interface Command {
  name: string;
  undo: () => void;
  redo: () => void;
}

// Usage
const command = createGenerateMazeCommand(prevMaze, newMaze);
execute(command); // Calls command.redo() and pushes to stack
undo(); // Calls command.undo()
```

**New Approach (Snapshots):**
```typescript
// Automatic snapshot creation
addDesignElement(element) {
  // 1. Deep copy current state
  const snapshot = designElements.map(el => ({...el, points: [...el.points]}));

  // 2. Push to undo stack
  undoStack.push(snapshot);

  // 3. Clear redo stack
  redoStack = [];

  // 4. Add new element
  designElements.push(newElement);
}

// Simple state restoration
undo() {
  const previousState = undoStack.pop();
  redoStack.push(designElements); // Save current
  designElements = previousState; // Restore
}
```

### 3. **Design Elements as Source of Truth**

**Old Architecture:**
- User draws → Async carve → Update `pathElements` Map → Update `maze` walls
- `pathElements` stored carved paths
- Undo/redo replayed commands to rebuild state

**New Architecture:**
- User draws → Add to `designElements` (instant)
- Click Carve → Backend validates → Backend carves → Update `maze` (computed)
- `designElements` is the source of truth
- `maze` is just a computed rendering from backend
- Undo/redo restores `designElements` snapshots

### 4. **API Changes**

**Removed:**
- `useHistoryStore` - merged into `useDesignStore`
- `useProjectStore` - merged into `useDesignStore`
- `execute(command)` - automatic history now
- `createGenerateMazeCommand()` - no longer needed
- `pathElements` Map - replaced by `designElements` array

**Added to `useDesignStore`:**
```typescript
// Design element management (auto-history)
addDesignElement(element: Omit<DesignElement, 'id'>): string
removeDesignElement(id: string): void
updateDesignElement(id: string, updates: Partial<DesignElement>): void
clearElements(): void

// Undo/Redo (snapshot-based)
undo(): void
redo(): void
canUndo(): boolean
canRedo(): boolean

// Project state
setField(field: FieldBoundary | null): void
setMaze(maze: MazeWalls | null): void  // Computed result only
clearMaze(): void

// Validation
setViolations(violations: Violation[]): void
setIsCarving(isCarving: boolean): void

// Constraint zones
addConstraintZone(zone): string
removeConstraintZone(id: string): void

// Project management
resetProject(): void
markSaved(): void
markDirty(): void
```

## Files Updated

### Core Store
- ✅ `app/renderer/src/stores/designStore.ts` - **Complete rewrite**

### Components
- ✅ `app/renderer/src/components/Toolbar/Toolbar.tsx` - Updated imports, use unified store
- ✅ `app/renderer/src/App.tsx` - Updated imports, removed command pattern, direct maze updates

### Tools (Already Compatible)
- ✅ `CircleTool.ts` - Uses `addDesignElement` (auto-history)
- ✅ `DrawPathTool.ts` - Uses `addDesignElement` (auto-history)
- ✅ `LineTool.ts` - Uses `addDesignElement` (auto-history)
- ✅ `RectangleTool.ts` - Uses `addDesignElement` (auto-history)
- ✅ `ArcTool.ts` - Uses `addDesignElement` (auto-history)

### Files to Deprecate/Remove
- ❌ `app/renderer/src/stores/historyStore.ts` - **Can be deleted**
- ❌ `app/renderer/src/stores/projectStore.ts` - **Can be deleted**
- ❌ `app/renderer/src/commands/GenerateMazeCommand.ts` - **Can be deleted**
- ❌ `app/renderer/src/commands/CarvePathCommand.ts` - **Can be deleted**
- ❌ `app/renderer/src/commands/DeletePathCommand.ts` - **Can be deleted**

## Migration Guide

### For Component Code

**Before:**
```typescript
import { useHistoryStore } from './stores/historyStore';
import { useProjectStore } from './stores/projectStore';

const { execute } = useHistoryStore();
const { field, maze, setField, setMaze } = useProjectStore();

// Create command
const command = createGenerateMazeCommand(prevMaze, newMaze);
execute(command);
```

**After:**
```typescript
import { useDesignStore } from './stores/designStore';

const { field, maze, setField, setMaze, undo, redo } = useDesignStore();

// Direct update (no command)
setMaze(newMaze);
```

### For Tools

**Before:**
```typescript
const { addElement } = useDesignStore.getState();
addElement({ type: 'circle', points, width, closed });
```

**After (Same API):**
```typescript
const { addDesignElement } = useDesignStore.getState();
addDesignElement({ type: 'circle', points, width, closed });
// History automatically created!
```

## Benefits

1. **Simpler Architecture**
   - One store instead of three
   - No command pattern complexity
   - Clear source of truth

2. **Better Performance**
   - Shallow snapshots (copy by reference for most data)
   - No command replay overhead
   - Faster undo/redo

3. **More Predictable**
   - State restoration is just copying arrays
   - No async undo/redo side effects
   - Easier to debug

4. **Extensible**
   - Easy to add constraint zones
   - Simple to add new element types
   - Natural fit for collaborative editing

## Testing Checklist

- [ ] Draw circle → Undo → Redo ✓
- [ ] Draw multiple elements → Undo all → Redo all ✓
- [ ] Generate maze (no undo needed - it's a computed result)
- [ ] Carve designs → Clears designElements after success ✓
- [ ] Validation shows violations correctly ✓
- [ ] Toolbar Undo/Redo buttons enable/disable properly ✓

## Notes

- `maze` is intentionally NOT in undo/redo history (it's computed from backend)
- Generating a new maze doesn't create undo history (it just overwrites computed result)
- Only `designElements` changes create history snapshots
- Maximum history size: 50 snapshots (configurable via `MAX_HISTORY_SIZE`)
