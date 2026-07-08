# Table (table) — Table Component Design Document

## 1. Component Name and Overview

Table is a structured data display component that presents text data in a row-column grid. It supports custom row/column counts, cell content, column widths, header rows, and cell alignment. In embedded UIs it is commonly used for parameter lists, device information display, configuration management, log records, and similar scenarios.

## 2. Component Type Identifier

```
type: 'table'
```

## 3. Category

| Category ID | Category Name | Icon |
|---------|---------|------|
| display | Display | 📋 |

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 200 |
| defaultHeight | 150 |

## 5. Container Status

```
isContainer: false
```

Table is a pure display component and cannot contain child components.

## 6. Parent-Child Relationship Design

### Can be a child of the following components

- `obj` (Container)
- `btn` (Button)
- `tabview` (Tab View, placed within a tab page)
- `tileview` (Tile View, placed within a tile)
- `win` (Window, placed within the content area)
- Screen root node (Screen)

### Child components it can contain

None. `isContainer: false`; does not accept any child components.

## 7. Property Design (props)

| Property | Type | Default | Description |
|--------|------|--------|------|
| `rows` | `number` | `3` | Row count (includes header row) |
| `cols` | `number` | `3` | Column count |
| `cellData` | `string[][]` | `[['','',''],['','',''],['','','']]` | 2D array; `cellData[row][col]` is cell text |
| `columnWidths` | `number[]` | `[60, 60, 60]` | Width per column (px); array length should match `cols` |
| `headerRow` | `boolean` | `true` | Whether to treat the first row as header (visually bold, gray background) |
| `cellAligns` | `string[][]` | `[['left','left','left'],...]` | 2D array; alignment per cell: `'left'` / `'center'` / `'right'` |

### Property Constraints

- `cellData` dimensions should match `rows × cols`; pad with empty strings when insufficient
- `columnWidths` length should match `cols`; use default width 60 when insufficient
- `cellAligns` dimensions should match `rows × cols`; default to `'left'` when insufficient
- When modifying `rows` or `cols`, the editor should automatically expand/trim `cellData`, `columnWidths`, and `cellAligns`

## 8. Style Design (styles)

### Default Style (default state) — Card Style (no rounded corners)

| Style Property | Default | Description |
|----------|--------|------|
| `bgColor` | `#ffffff` | White background (card style) |
| `borderColor` | `#E0E0E0` | Gray border (color_grey) |
| `borderWidth` | `2` | Border width |
| `borderRadius` | `0` | No rounded corners (tables are typically rectangular) |
| `textColor` | `#212121` | Cell text color |
| `opacity` | `1` | Fully opaque |
| `padding` | `0` | No outer padding (cells have their own padding) |

### Supported Style States

| State | Description |
|------|------|
| `default` | Default state, always applied |
| `pressed` | Pressed state (when a cell is clicked) |
| `focused` | Focused state |
| `disabled` | Disabled state |

### Header Row Style

The header row (first row, when `headerRow: true`) uses special styling in rendering:
- Background color: `#f0f0f0` (light gray)
- Bold font: `fontWeight: 600`
- These styles are hardcoded in the editor canvas and preview; LVGL implements via control flags such as `LV_TABLE_CELL_CTRL_MERGE_RIGHT`

## 9. Event Support

| Event Type | Description |
|----------|------|
| `LV_EVENT_CLICKED` | Click event (can obtain clicked cell row/column) |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_VALUE_CHANGED` | Value changed event (when selected cell changes) |
| `LV_EVENT_FOCUSED` | Gained focus |
| `LV_EVENT_DEFOCUSED` | Lost focus |

### Cell Click

LVGL table supports obtaining clicked cell coordinates via `lv_table_get_selected_cell(table, &row, &col)`, usable in event callbacks.

## 10. UI Layer Design

### Editor Canvas Rendering (CanvasComponent.tsx)

```tsx
<div className="lvgl-table" style={{
  width: '100%', height: '100%',
  display: 'grid',
  gridTemplateColumns: `repeat(${props.cols || 3}, 1fr)`,
  gridTemplateRows: `repeat(${props.rows || 3}, 1fr)`,
  gap: '1px',
  backgroundColor: '#ccc',  // Grid line color
  border: '1px solid #ccc',
  borderRadius: defaultStyle.borderRadius || 4,
  overflow: 'hidden',
}}>
  {Array.from({ length: (props.rows || 3) * (props.cols || 3) }).map((_, i) => {
    const row = Math.floor(i / (props.cols || 3));
    const col = i % (props.cols || 3);
    const isHeader = row === 0 && props.headerRow !== false;
    return (
      <div key={i} style={{
        backgroundColor: isHeader ? '#f0f0f0' : '#fff',
        padding: '4px',
        fontSize: '10px',
        fontWeight: isHeader ? 600 : 400,
        color: '#333',
      }}>
        {props.cellData?.[row]?.[col] || (i + 1)}
      </div>
    );
  })}
</div>
```

Key points:
- Uses CSS Grid layout to simulate a table
- `gap: '1px'` + gray background simulates grid lines
- Header row uses light gray background and bold font
- Cell content is read from `cellData`; empty values show index placeholder

### Simple Preview Rendering (PreviewPanel.tsx — Canvas 2D)

```typescript
function drawTable(ctx, x, y, w, h, opts) {
  // White background
  ctx.fillStyle = opts.bgColor;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = opts.borderColor;
  ctx.strokeRect(x, y, w, h);

  const cellW = w / opts.cols;
  const cellH = h / opts.rows;

  // Grid lines
  for (let r = 1; r < opts.rows; r++) { /* horizontal lines */ }
  for (let c = 1; c < opts.cols; c++) { /* vertical lines */ }

  // Header row background
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(x + 1, y + 1, w - 2, cellH - 1);

  // Cell text
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let r = 0; r < opts.rows; r++) {
    for (let c = 0; c < opts.cols; c++) {
      const label = r === 0 ? `Col ${c + 1}` : `${r},${c}`;
      ctx.fillText(label, x + cellW * c + cellW / 2, y + cellH * r + cellH / 2);
    }
  }
}
```

Key points:
- Draws grid with equal row/column division
- Header row filled with light gray background
- Cell text centered
- Preview uses placeholder text (`Col N` / `r,c`)

### LVGL WASM Preview Rendering

**editorStateToJson.ts**: Props (rows, cols, cellData, columnWidths, headerRow, cellAligns) are fully serialized.

**ui_from_json.c**:

```c
static lv_obj_t *create_table(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *tbl = lv_table_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int rows = cjson_get_int(props, "rows", 3);
        int cols = cjson_get_int(props, "cols", 3);
        lv_table_set_row_count(tbl, rows);
        lv_table_set_column_count(tbl, cols);
        // Fill header placeholders
        for (int c = 0; c < cols; c++) {
            char hdr[32];
            snprintf(hdr, sizeof(hdr), "Col %d", c + 1);
            lv_table_set_cell_value(tbl, 0, c, hdr);
        }
    }
    return tbl;
}
```

Key points:
- Uses `lv_table_create` to create a real LVGL table
- Sets row and column counts
- Current WASM implementation only fills header placeholder text; does not parse `cellData` (can be extended)

### Code Generation Output (ui.c.ts)

```c
// Create
lv_obj_t *table_1 = lv_table_create(parent);
lv_obj_set_pos(table_1, 10, 10);
lv_obj_set_size(table_1, 200, 150);

// Style (card style, no rounded corners)
lv_obj_set_style_bg_color(table_1, lv_color_hex(0xFFFFFF), 0);
lv_obj_set_style_bg_opa(table_1, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(table_1, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(table_1, 2, 0);
lv_obj_set_style_radius(table_1, 0, 0);

// Row/column counts
lv_table_set_row_cnt(table_1, 3);
lv_table_set_col_cnt(table_1, 3);

// Column widths
lv_table_set_col_width(table_1, 0, 60);
lv_table_set_col_width(table_1, 1, 60);
lv_table_set_col_width(table_1, 2, 60);

// Cell data (non-empty cells only)
lv_table_set_cell_value(table_1, 0, 0, "Name");
lv_table_set_cell_value(table_1, 0, 1, "Value");
lv_table_set_cell_value(table_1, 1, 0, "Temp");
lv_table_set_cell_value(table_1, 1, 1, "25°C");
```

Key points:
- Code generation uses `lv_table_set_row_cnt` / `lv_table_set_col_cnt` (note LVGL API names)
- Sets column widths per column
- Only generates `lv_table_set_cell_value` calls for non-empty cells
- Skips empty string cells to reduce generated code volume

## 11. LVGL API Mapping

### Creation Function

| LVGL Version | Function |
|-----------|------|
| v8 / v9 | `lv_table_create(parent)` |

### Key APIs

| API | Description |
|-----|------|
| `lv_table_set_row_count(table, cnt)` | Set row count (v9: `lv_table_set_row_cnt`) |
| `lv_table_set_column_count(table, cnt)` | Set column count (v9: `lv_table_set_col_cnt`) |
| `lv_table_set_cell_value(table, row, col, text)` | Set cell text |
| `lv_table_set_col_width(table, col, width)` | Set column width |
| `lv_table_get_selected_cell(table, &row, &col)` | Get selected cell coordinates |
| `lv_table_get_cell_value(table, row, col)` | Get cell text |
| `lv_table_set_cell_value_fmt(table, row, col, fmt, ...)` | Set cell text with formatting |
| `lv_table_add_cell_ctrl(table, row, col, ctrl)` | Add cell control flag |

### Cell Control Flags

| Flag | Description |
|------|------|
| `LV_TABLE_CELL_CTRL_MERGE_RIGHT` | Merge cell to the right |
| `LV_TABLE_CELL_CTRL_TEXT_CROP` | Text crop (no wrap) |
| `LV_TABLE_CELL_CTRL_CUSTOM_1` ~ `4` | Custom flags |

### LVGL Parts

| Part | Description |
|------|------|
| `LV_PART_MAIN` | Table background |
| `LV_PART_ITEMS` | Cells |

### Default Theme Styles (lv_theme_default)

- **MAIN part**: card style — `bg_color=#FFFFFF, border_color=#E0E0E0, border_width=2, radius=0, pad=0`
- **ITEMS part**: `border_color=color_grey, border_width=1, border_side=BOTTOM|RIGHT, text_color=color_text`

## 12. Design Notes

1. **borderRadius = 0**: Table has no rounded corners by default, unlike other card style components (borderRadius=8). This is because grid lines at rounded corners cause visual issues. LVGL default theme also sets table radius to 0.

2. **Dynamic management of cellData**: When the user modifies `rows` or `cols` in the property panel, the editor store should automatically adjust `cellData`, `columnWidths`, and `cellAligns` dimensions. Pad with empty values when adding rows/columns; trim from the end when reducing.

3. **Header row implementation differences**:
   - Editor canvas/preview: Distinguish header row via CSS/Canvas styles (gray background + bold)
   - LVGL: No native "header" concept; implement via `lv_table_add_cell_ctrl` or custom styles
   - Code generation: Does not currently generate header style code; users must handle in custom code

4. **Column width vs. total width**: Sum of `columnWidths` may not equal component total width. LVGL renders at specified column widths; overflow can scroll. The editor property panel can provide an "auto distribute evenly" button.

5. **Cell alignment**: The `cellAligns` property is not yet implemented in code generation. LVGL cell alignment requires control characters before text or using `lv_table_add_cell_ctrl`.

6. **Large data performance**: LVGL table does not support virtual scrolling; all cells are created. Large row counts (>50) may cause memory and rendering performance issues. The editor can advise row count limits in the property panel.

7. **WASM preview extension**: Current `ui_from_json.c` does not parse `cellData` and `columnWidths`. To fully reproduce the editor design, extend the C side to iterate the `cellData` JSON 2D array and call `lv_table_set_cell_value`, and iterate `columnWidths` to call `lv_table_set_col_width`.

8. **API naming differences**: Note slight LVGL v8 vs. v9 API naming differences (e.g., `set_row_count` vs. `set_row_cnt`). Code generation templates use `lv_table_set_row_cnt` / `lv_table_set_col_cnt`; confirm target version.
