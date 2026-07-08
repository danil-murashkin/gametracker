# Tile View (tileview) — Tile View Container Component

## 1. Component Name and Overview

Tile View is the tile view container component in the LVGL editor, corresponding to LVGL's `lv_tileview`. It provides a two-dimensional grid layout where each grid cell (tile) is an independent full-screen content area; users switch between tiles via swipe gestures. Suitable for smartwatch interfaces, multi-screen dashboards, swipe navigation pages, and similar scenarios.

Tile View child mounting is similar to Tab View, mapping child components to different tiles via `tileChildMap`, but uses two-dimensional coordinates (row-col) as keys.

## 2. Component Type Identifier

```
type: 'tileview'
```

## 3. Category

```
category: 'container'  // Container category, icon: 📁
```

Displayed in the component panel as **Tile View**, icon: 🔲.

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 200 |
| defaultHeight | 200 |

## 5. Is Container

```
isContainer: true
```

Tile View is a container component; child components are assigned to tiles via tileChildMap.

## 6. Parent-Child Relationship Design

### Can be a child of the following components

- Can be a direct child of **Screen (page root node)**
- Can be a child of any `isContainer=true` component, including:
  - Container (obj)
  - Button (btn)
  - Tab View (tabview) — Mounted to the corresponding tab page
  - Another Tile View (nested, not recommended)
  - Window (win) — Mounted to the content area

### Can contain the following child components

Tile View can contain **all types** of components. Child components logically belong to a tile, mapped via `tileChildMap`.

### Child Component Mounting Mechanism (Core Design)

Tile View uses the **tileChildMap mapping mechanism**, consistent with Tab View's tabChildMap design but using two-dimensional coordinates as keys:

```
Child component → tileChildMap mapping → Corresponding tile (row-col)
```

#### tileChildMap Data Structure

```typescript
tileChildMap: Record<string, string[]>
// key: "row-col" format string (e.g. "0-0", "0-1", "1-0", "1-1")
// value: child component ID array
```

Example (2×2 grid):

```typescript
{
  tileChildMap: {
    "0-0": ["comp_id_1", "comp_id_2"],  // Child components at row 0, col 0
    "0-1": ["comp_id_3"],                // Child components at row 0, col 1
    "1-0": [],                            // No child components at row 1, col 0
    "1-1": ["comp_id_4"]                 // Child components at row 1, col 1
  }
}
```

#### Mounting Flow

1. **Adding child component** (`addComponent`):
   - New component added to tileview's `children[]` array
   - Store automatically adds new component ID to `tileChildMap[currentRow-currentCol]`
   - i.e.: New components default to the currently displayed tile

   ```typescript
   // editorStore.ts - addComponent
   if (parent?.type === 'tileview') {
     const tileChildMap = { ...(parent.props?.tileChildMap || {}) };
     const key = `${parent.props?.currentRow || 0}-${parent.props?.currentCol || 0}`;
     if (!tileChildMap[key]) tileChildMap[key] = [];
     tileChildMap[key] = [...tileChildMap[key], id];
     get().updateComponent(parentId, { props: { ...parent.props, tileChildMap } });
   }
   ```

2. **Reparenting** (`reparentComponent`):
   - Remove mapping from all tiles in old parent's tileChildMap
   - Add to new parent (if tileview) `tileChildMap[currentRow-currentCol]`

   ```typescript
   // editorStore.ts - reparentComponent
   // Remove old mapping
   if (oldParent?.type === 'tileview') {
     const tileChildMap = { ...(oldParent.props?.tileChildMap || {}) };
     for (const key of Object.keys(tileChildMap)) {
       tileChildMap[key] = tileChildMap[key].filter(cid => cid !== id);
     }
     get().updateComponent(comp.parentId, { props: { ...oldParent.props, tileChildMap } });
   }
   // Add new mapping
   if (newParent?.type === 'tileview') {
     const tileChildMap = { ...(newParent.props?.tileChildMap || {}) };
     const key = `${newParent.props?.currentRow || 0}-${newParent.props?.currentCol || 0}`;
     if (!tileChildMap[key]) tileChildMap[key] = [];
     tileChildMap[key] = [...tileChildMap[key], id];
     get().updateComponent(newParentId, { props: { ...newParent.props, tileChildMap } });
   }
   ```

3. **Deleting child component** (`deleteComponents`):
   - Clean deleted component IDs from all tiles in parent's `tileChildMap`

   ```typescript
   // editorStore.ts - deleteComponents
   if (parent?.type === 'tileview') {
     const tileChildMap = { ...(parent.props?.tileChildMap || {}) };
     for (const key of Object.keys(tileChildMap)) {
       tileChildMap[key] = tileChildMap[key].filter(cid => cid !== id);
     }
     get().updateComponent(comp.parentId, { props: { ...parent.props, tileChildMap } });
   }
   ```

4. **Fallback mechanism**: Child components not mapped in `tileChildMap` default fallback to `tile_0_0` (row 0, col 0).

## 7. Property Design (props)

| Property Name | Type | Default Value | Description |
|--------|------|--------|------|
| rows | `number` | `2` | Row count; determines vertical tile count |
| cols | `number` | `2` | Column count; determines horizontal tile count |
| currentRow | `number` | `0` | Currently displayed tile row index (0-based) |
| currentCol | `number` | `0` | Currently displayed tile column index (0-based) |
| tileChildMap | `Record<string, string[]>` | `{}` | Tile to child component mapping; key is "row-col" format, value is child component ID array |

### rows / cols Property Notes

- `rows × cols` determines total tile count (e.g. 2×2 = 4 tiles)
- Modifying rows/cols must sync `tileChildMap` updates and clean out-of-range mappings
- Each tile size equals tileview size (full-screen tile)

### tileChildMap Property Notes

- key format is `"row-col"`, e.g. `"0-0"`, `"0-1"`, `"1-0"`, `"1-1"`
- Maintained automatically by the Store layer; users generally do not need to edit manually
- Unmapped children fallback to `tile_0_0`

### currentRow / currentCol Property Notes

- Determines which tile's content is displayed in the editor
- Switch currentRow/currentCol at design time to edit different tiles' child components
- At runtime corresponds to initial position of `lv_obj_set_tile_id()`

## 8. Style Design (styles)

### Default Style State (default)

Tile View uses LVGL default theme **scr style** (screen style):

| Style Property | Type | Default Value | Description |
|----------|------|--------|------|
| bgColor | `string` | `'#F5F5F5'` | Background color, light gray (LVGL color_scr) |
| borderColor | `string` | `'transparent'` | No border |
| borderWidth | `number` | `0` | Border width 0 |
| borderRadius | `number` | `0` | No corner radius |
| textColor | `string` | `'#212121'` | Text color |
| opacity | `number` | `1` | Fully opaque |
| padding | `number` | `0` | No padding |

### Supported Style States

| State | Description |
|------|------|
| `default` | Default state, required |
| `pressed` | Pressed state (optional) |
| `focused` | Focused state (optional) |
| `disabled` | Disabled state (optional) |

Note: Tile View styles apply to the overall container. Individual tile styles are controlled by LVGL internally; the editor does not currently expose tile styling separately.

## 9. Event Support

| Event Type | Description |
|----------|------|
| `LV_EVENT_CLICKED` | Click event |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_VALUE_CHANGED` | **Triggered on tile switch**, most common event |
| `LV_EVENT_FOCUSED` | Focus gained |
| `LV_EVENT_DEFOCUSED` | Focus lost |
| `LV_EVENT_READY` | Ready event |
| `LV_EVENT_CANCEL` | Cancel event |

`LV_EVENT_VALUE_CHANGED` is Tile View's most important event, triggered when the user swipes to switch tiles.

## 10. UI Layer Design

### Editor Canvas Rendering (Canvas)

On the canvas, Tile View renders as:

```
┌─────────────────────────────┐
│                             │
│  Current tile (currentRow,     │
│  currentCol) child components │
│                               │
│  [0,0] [0,1]               │  ← tile navigation indicator (optional)
│  [1,0] [1,1]               │
└─────────────────────────────┘
```

- Only displays child components for current `currentRow`-`currentCol` tile
- Child visibility determined by `tileChildMap[currentRow-currentCol]`
- Switch currentRow/currentCol at design time to edit different tiles
- Child components not belonging to current tile are hidden on canvas

### Simple Preview Rendering (PreviewPanel)

Similar to canvas rendering but without edit interactions. Shows current tile's child components; tiles can be switched via interaction.

### LVGL WASM Preview Rendering

In `editorStateToJson.ts`, Tile View child components map to tiles via virtual IDs:

```typescript
// Virtual parent ID format: {tileview_id}__tile__{row-col}
// Example: "abc123__tile__0-0", "abc123__tile__0-1", "abc123__tile__1-0"

childToVirtualParent[childId] = `${parentComp.id}__tile__${tileKey}`;
```

In serialized JSON, child components' `parent` field points to virtual ID:

```json
[
  {
    "type": "tileview",
    "id": "abc123",
    "parent": null,
    "props": { "rows": 2, "cols": 2, "currentRow": 0, "currentCol": 0, "tileChildMap": {"0-0": ["child1"], "1-0": ["child2"]} }
  },
  {
    "type": "label",
    "id": "child1",
    "parent": "abc123__tile__0-0",
    "props": { "text": "Tile 0,0 Content" }
  },
  {
    "type": "label",
    "id": "child2",
    "parent": "abc123__tile__1-0",
    "props": { "text": "Tile 1,0 Content" }
  }
]
```

On the WASM side (`ui_from_json.c`):
1. Create tileview: `lv_tileview_create(parent)`
2. Add tile: `lv_tileview_add_tile(tileview, col, row, LV_DIR_ALL)` returns tile object
3. Register tile with virtual ID (`id__tile__R-C`) in `id_map`
4. When creating child components, find corresponding tile as parent via virtual ID in `id_map`

### Code Generation Output (codegen)

In `ui.c.ts`, Tile View generates the following C code:

```c
// Create tileview: TileView_xxxx
TileView_xxxx = lv_tileview_create(parent);
lv_obj_set_pos(TileView_xxxx, 0, 0);
lv_obj_set_size(TileView_xxxx, 200, 200);

// Add all tiles (iterate rows × cols)
lv_obj_t * TileView_xxxx_tile_0_0 = lv_tileview_add_tile(TileView_xxxx, 0, 0, LV_DIR_ALL);
lv_obj_t * TileView_xxxx_tile_0_1 = lv_tileview_add_tile(TileView_xxxx, 1, 0, LV_DIR_ALL);
lv_obj_t * TileView_xxxx_tile_1_0 = lv_tileview_add_tile(TileView_xxxx, 0, 1, LV_DIR_ALL);
lv_obj_t * TileView_xxxx_tile_1_1 = lv_tileview_add_tile(TileView_xxxx, 1, 1, LV_DIR_ALL);

// Set initial tile position
lv_obj_set_tile_id(TileView_xxxx, 0, 0, LV_ANIM_OFF);

// Child components are created on the corresponding tile
// Child components in tileChildMap["0-0"] → parent is TileView_xxxx_tile_0_0
child_1 = lv_label_create(TileView_xxxx_tile_0_0);
// Child components in tileChildMap["1-0"] → parent is TileView_xxxx_tile_1_0
child_2 = lv_btn_create(TileView_xxxx_tile_1_0);
```

Child parent assignment logic in code generation (`ui.c.ts`):

```typescript
// Build child → tile variable name mapping
const childToTile: Record<string, string> = {};
for (const [tileKey, childIds] of Object.entries(tileChildMap)) {
  const [r, c] = tileKey.split('-');
  for (const childId of childIds) {
    childToTile[childId] = `${varName}_tile_${r}_${c}`;
  }
}
// Unmapped children fallback to tile_0_0
const defaultTile = `${varName}_tile_0_0`;
for (const child of component.children) {
  const tileParent = childToTile[child.id] || defaultTile;
  generateComponentCode(child, tileParent, ...);
}
```

## 11. LVGL API Mapping

### LVGL v9 Creation Function

```c
lv_obj_t * lv_tileview_create(lv_obj_t * parent);
```

### Key APIs

| API | Description |
|-----|------|
| `lv_tileview_create(parent)` | Create tileview |
| `lv_tileview_add_tile(tileview, col, row, dir)` | Add a tile, returns tile object (`lv_obj_t *`). `col` is column index, `row` is row index, `dir` is allowed swipe direction |
| `lv_obj_set_tile_id(tileview, col, row, anim)` | Set currently displayed tile (by column/row index) |
| `lv_obj_set_tile(tileview, tile_obj, anim)` | Set currently displayed tile (by tile object) |
| `lv_tileview_get_tile_active(tileview)` | Get currently active tile object |

### lv_tileview_add_tile Parameter Notes

```c
lv_obj_t * lv_tileview_add_tile(
    lv_obj_t * tv,    // tileview object
    uint8_t col,       // Column index (horizontal position)
    uint8_t row,       // Row index (vertical position)
    lv_dir_t dir       // Allowed swipe directions from this tile
);
```

`dir` parameter controls which directions can be swiped from this tile:
- `LV_DIR_ALL` — All directions
- `LV_DIR_HOR` — Horizontal only
- `LV_DIR_VER` — Vertical only
- `LV_DIR_LEFT | LV_DIR_RIGHT` — Combined directions

### LVGL Internal Structure

```
tileview (lv_obj, scrollable container)
├── tile_0_0 (lv_obj, at col=0, row=0)
├── tile_0_1 (lv_obj, at col=1, row=0)
├── tile_1_0 (lv_obj, at col=0, row=1)
└── tile_1_1 (lv_obj, at col=1, row=1)
```

Tileview is essentially a scrollable container; each tile is a child object the same size as tileview, with page-level swiping via snap mechanism.

## 12. Design Notes

1. **tileChildMap is core**: Like Tab View's tabChildMap, Tile View child mounting fully depends on `tileChildMap`. The Store layer maintains this mapping automatically in `addComponent`, `reparentComponent`, and `deleteComponents`.

2. **Two-dimensional coordinate keys**: tileChildMap keys use `"row-col"` format (e.g. `"0-0"`, `"1-2"`); note **row comes first, col second**. LVGL API `lv_tileview_add_tile(tv, col, row, dir)` uses **col first, row second** — convert when generating code.

3. **Design-time tile switching**: In the editor, modify `currentRow` and `currentCol` to switch the tile being edited. Newly added child components automatically belong to the current tile.

4. **rows/cols modification**: When changing row/column count:
   - Increasing rows/cols: New tile tileChildMap entries are empty
   - Decreasing rows/cols: Handle child components on removed tiles (migrate or delete)

5. **Swipe direction**: Current editor code generation defaults all tiles to `LV_DIR_ALL` swipe direction. Per-tile swipe direction configuration may be supported in the future.

6. **Fallback to tile_0_0**: Unmapped children default fallback to the first tile (0-0), not the current tile. This differs from Tab View fallback to activeTab.

7. **Full-screen tiles**: Each tile size equals tileview size. LVGL achieves tile switching via snap scrolling; partially visible tiles are not supported.

8. **Performance**: All `rows × cols` tiles are created and consume memory. For large grids (e.g. 5×5 = 25 tiles), watch memory and rendering performance.

9. **Comparison with Tab View**:
   - Tab View: One-dimensional switching (tab index), switched via tab bar clicks
   - Tile View: Two-dimensional switching (row, col), switched via swipe gestures
   - Both use the same childMap mechanism design; only key format differs
