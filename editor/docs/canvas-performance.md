# Canvas Rendering Architecture Design Document

## 1. Overview

The design canvas (Canvas) is the core interactive area of GameTracker Editor. It handles visual rendering of components, drag-and-drop movement, resize, box selection, alignment, and related operations. The architecture is optimized for high performance, ensuring smooth interaction even with large numbers of components.

## 2. Component Structure

```
Canvas (canvas container)
├── Viewport layer (canvas-viewport) — pan transform
│   └── Canvas layer (canvas) — zoom transform
│       ├── Grid (grid)
│       ├── CanvasComponent[] (component rendering)
│       │   └── CanvasComponent[] (recursive child components)
│       ├── BoxSelection (box selection rectangle)
│       └── AlignmentGuides (alignment guides)
└── ContextMenu (context menu)
```

## 3. State Management

### 3.1 Store Structure (editorStore)

| State | Description | Change Frequency |
|-------|-------------|------------------|
| `canvas` | Canvas dimensions, zoom, pan, grid configuration | Low |
| `pages` | Page list and component tree | Medium (dragged component updated every frame during drag) |
| `selection` | Selected/hovered component IDs | Low |
| `drag` | Drag state (whether dragging, start coordinates, current coordinates) | High (updated every frame during drag) |
| `alignmentGuides` | Alignment guides | Low |

### 3.2 Subscription Strategy

Canvas and CanvasComponent use fine-grained zustand selector subscriptions to avoid re-renders triggered by unrelated state changes:

- **Canvas** subscribes to: `canvas`, `pages`, `currentPageId`, `alignmentGuides`, and action functions
- **Canvas does not subscribe to `drag`**: Drag coordinates are high-frequency transient data, read via `getState()` in event handlers
- **CanvasComponent** subscribes to `selection.selectedIds` and `selection.hoveredId` individually; only components whose selection/hover state actually changes re-render

### 3.3 Component Tree Reference Stability

When `updateComponentInTree` recursively updates the component tree, it only creates new objects along the path that was actually modified; unmodified subtrees return the original reference. Combined with `React.memo`, this ensures unchanged components skip re-rendering.

## 4. Interaction Handling

### 4.1 Drag Movement

1. `mousedown` → `startDrag('move', ...)` records the start position
2. `mousemove` → RAF throttling → `moveComponentAndUpdateDrag()` performs a single `set()` that updates both component position and drag state
3. `mouseup` → `endDrag()` + `saveToHistory()`

### 4.2 Resize

1. `mousedown` on resize handle → `startDrag('resize', ...)` records the handle direction
2. `mousemove` → RAF throttling → `resizeComponentAndUpdateDrag()` performs a single `set()` that updates dimensions and drag state
3. `mouseup` → `endDrag()` + `saveToHistory()`

### 4.3 Box Selection

1. `mousedown` on canvas background → record start coordinates
2. `mousemove` → update box selection rectangle (local state + ref)
3. `mouseup` → compute components within the box → `selectComponents(ids)`

### 4.4 Pan and Zoom

- Middle mouse button drag / Space + left mouse button drag → pan the canvas
- Ctrl + scroll wheel → zoom the canvas

### 4.5 Event Callback Stability

All event handlers are wrapped with `useCallback`. They read transient state via refs and `getState()`, with minimal dependencies to keep callback references stable.

## 5. Rendering Optimizations

| Technique | Description |
|-----------|-------------|
| `React.memo` | CanvasComponent and CanvasImageContent use memo to skip re-rendering unchanged components |
| Fine-grained subscriptions | zustand selector pattern; components only subscribe to the state slices they need |
| Reference stability | Component tree updates preserve original references for unmodified nodes; event callback dependencies are minimized |
| Batched updates | move/resize operations are merged into a single `set()` call |
| RAF throttling | mousemove is throttled via `requestAnimationFrame`, processed at most once per frame |
| High-frequency state not subscribed | `drag` state is not subscribed via selectors; read on demand in event handlers only |

## 6. Component Rendering

### 6.1 CanvasComponent

Each LVGL component is rendered on the canvas as a `CanvasComponent`, responsible for:

- Rendering the corresponding preview content based on component type (button, label, slider, etc.)
- Applying style properties (background color, border, corner radius, shadow, gradient, opacity, etc.)
- Displaying selection state (selection box + resize handles)
- Recursively rendering child components
- Reading `appStore.defaultFontSize` as the default font size for text components

### 6.2 Special Handling for Container Components

- **Tabview**: Filters and displays child components for the current tab based on `activeTab` and `tabChildMap`
- **Tileview**: Filters and displays child components for the current tile based on `currentRow/Col` and `tileChildMap`
- **Win**: Title bar + content area layout

## 7. Key Files

| File | Responsibility |
|------|----------------|
| `src/components/Canvas/Canvas.tsx` | Canvas container, event handling, recursive component rendering |
| `src/components/Canvas/CanvasComponent.tsx` | Individual component rendering and interaction |
| `src/components/Canvas/Canvas.css` | Canvas styles |
| `src/components/Canvas/CanvasComponent.css` | Component styles |
| `src/components/Canvas/AlignmentGuides.tsx` | Alignment guides |
| `src/store/editorStore.ts` | Editor state management (component tree, selection, drag, history) |
| `src/store/appStore.ts` | Application-level state (default font size, etc.) |
