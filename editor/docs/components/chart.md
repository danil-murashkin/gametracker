# Chart (chart) — Chart Component Design Document

## 1. Component Name and Overview

Chart is a data visualization display component supporting three types: line chart, bar chart, and scatter chart. It can display one or more data series and supports grid lines, legends, axis ranges, and other configuration. In embedded UIs it is commonly used for sensor data display, statistical visualization, trend analysis, and similar scenarios.

## 2. Component Type Identifier

```
type: 'chart'
```

## 3. Category

| Category ID | Category Name | Icon |
|---------|---------|------|
| display | Display | 📈 |

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 200 |
| defaultHeight | 150 |

## 5. Container Status

```
isContainer: false
```

Chart is a pure display component and cannot contain child components.

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

### Main Properties

| Property | Type | Default | Description |
|--------|------|--------|------|
| `type` | `'line' \| 'bar' \| 'scatter'` | `'line'` | Chart type |
| `series` | `ChartSeries[]` | See below | Data series array (new multi-series format) |
| `yAxisMin` | `number` | `0` | Y-axis minimum value |
| `yAxisMax` | `number` | `100` | Y-axis maximum value |
| `xLabels` | `string[]` | `[]` | X-axis labels (optional) |
| `showLegend` | `boolean` | `false` | Whether to show legend |
| `showGrid` | `boolean` | `true` | Whether to show grid lines |
| `data` | `number[]` | `[10, 20, 30, 25, 40]` | Legacy single-series data (backward compatible) |
| `lineColor` | `string` | `'#2196F3'` | Legacy line color (backward compatible) |

### ChartSeries Type Definition

```typescript
interface ChartSeries {
  name: string;       // Series name
  data: number[];     // Data point array
  color: string;      // Series color (hex)
  lineWidth: number;  // Line width (px)
  pointSize: number;  // Data point size (px)
}
```

### Default series Value

```typescript
series: [
  {
    name: 'Series 1',
    data: [10, 20, 30, 25, 40],
    color: '#2196F3',
    lineWidth: 2,
    pointSize: 4
  }
]
```

### Backward Compatibility

`data` and `lineColor` are legacy single-series fields. When the `series` array is empty or absent, it falls back to building a single series from `data` + `lineColor`. Both code generation and the rendering layer support these two data formats.

## 8. Style Design (styles)

### Default Style (default state) — Card Style

| Style Property | Default | Description |
|----------|--------|------|
| `bgColor` | `#ffffff` | White background (card style) |
| `borderColor` | `#E0E0E0` | Gray border (color_grey) |
| `borderWidth` | `2` | Border width |
| `borderRadius` | `8` | Corner radius |
| `textColor` | `#212121` | Text color (axis labels, etc.) |
| `opacity` | `1` | Fully opaque |
| `padding` | `10` | Padding (spacing between chart drawing area and border) |

### Supported Style States

| State | Description |
|------|------|
| `default` | Default state, always applied |
| `pressed` | Pressed state |
| `focused` | Focused state |
| `disabled` | Disabled state |

## 9. Event Support

| Event Type | Description |
|----------|------|
| `LV_EVENT_CLICKED` | Click event |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_VALUE_CHANGED` | Value changed event (when data is updated) |
| `LV_EVENT_FOCUSED` | Gained focus |
| `LV_EVENT_DEFOCUSED` | Lost focus |

## 10. UI Layer Design

### Editor Canvas Rendering (CanvasComponent.tsx)

```tsx
// Compatible with old and new data formats
const series = props.series || (props.data
  ? [{ data: props.data, color: props.lineColor || '#2196F3' }]
  : [{ data: [10, 20, 30, 25, 40], color: '#2196F3' }]);
const chartData = series[0]?.data || [10, 20, 30, 25, 40];
const chartColor = series[0]?.color || '#2196F3';
const maxVal = Math.max(...chartData, 1);

<div className="lvgl-chart" style={{
  width: '100%', height: '100%',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
  padding: '8px',
  boxSizing: 'border-box',
}}>
  {chartData.map((val, i) => (
    <div key={i} style={{
      width: `${Math.max(8, 80 / chartData.length)}%`,
      height: `${Math.max(2, (val / maxVal) * 100)}%`,
      backgroundColor: chartColor,
      borderRadius: '2px 2px 0 0',
    }} />
  ))}
</div>
```

Key points:
- Canvas uniformly renders in simplified bar chart form (does not distinguish line/bar/scatter)
- Uses flex layout; each data point is rendered as a bar
- Bar height is calculated as a ratio of data value to maximum value
- Only renders the first series' data (simplified display)

### Simple Preview Rendering (PreviewPanel.tsx — Canvas 2D)

```typescript
function drawChart(ctx, x, y, w, h, opts) {
  // Background (card style)
  ctx.fillStyle = opts.bgColor;
  ctx.strokeStyle = opts.borderColor;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill(); ctx.stroke();

  const pad = 10;
  const chartX = x + pad, chartY = y + pad;
  const chartW = w - pad * 2, chartH = h - pad * 2;
  const maxVal = Math.max(...opts.data, 1);
  const minVal = Math.min(...opts.data, 0);
  const range = maxVal - minVal || 1;

  // Grid lines
  if (opts.showGrid) {
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) { /* horizontal grid */ }
  }

  if (opts.type === 'bar') {
    // Bar chart: one rectangle per data point
  } else {
    // Line chart: connected lines + data point dots
    ctx.strokeStyle = opts.lineColor; ctx.lineWidth = 2;
    // ... draw lines and dots
  }
}
```

Key points:
- Distinguishes `bar` and `line` rendering modes
- Line chart draws connected lines and data point dots
- Bar chart draws equal-width rectangles
- Supports grid line toggle
- Uses legacy `data` + `lineColor` fields

### LVGL WASM Preview Rendering

**editorStateToJson.ts**: Props are fully serialized, including the series array and legacy data field.

**ui_from_json.c**:

```c
static lv_obj_t *create_chart(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *chart = lv_chart_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        // Chart type
        const char *type_str = cjson_get_string(props, "type");
        if (type_str && strcmp(type_str, "bar") == 0)
            lv_chart_set_type(chart, LV_CHART_TYPE_BAR);
        else
            lv_chart_set_type(chart, LV_CHART_TYPE_LINE);

        // Legacy data field
        cJSON *data = cJSON_GetObjectItemCaseSensitive(props, "data");
        if (cJSON_IsArray(data)) {
            int cnt = cJSON_GetArraySize(data);
            lv_chart_set_point_count(chart, cnt);
            lv_chart_series_t *ser = lv_chart_add_series(chart,
                lv_color_hex(0x2196F3), LV_CHART_AXIS_PRIMARY_Y);
            cJSON *val;
            cJSON_ArrayForEach(val, data) {
                if (cJSON_IsNumber(val))
                    lv_chart_set_next_value(chart, ser, val->valueint);
            }
        }
    }
    return chart;
}
```

Key points:
- Current WASM implementation only supports single-series via legacy `data` field
- Multi-series `series` array WASM support is pending extension
- Chart types line and bar are supported

### Code Generation Output (ui.c.ts)

**Multi-series mode (series array):**

```c
// Create
lv_obj_t *chart_1 = lv_chart_create(parent);
lv_obj_set_pos(chart_1, 10, 10);
lv_obj_set_size(chart_1, 200, 150);

// Style (card style)
lv_obj_set_style_bg_color(chart_1, lv_color_hex(0xFFFFFF), 0);
lv_obj_set_style_bg_opa(chart_1, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(chart_1, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(chart_1, 2, 0);
lv_obj_set_style_radius(chart_1, 8, 0);
lv_obj_set_style_pad_all(chart_1, 10, 0);

// Chart type
lv_chart_set_type(chart_1, LV_CHART_TYPE_LINE);

// Y-axis range
lv_chart_set_range(chart_1, LV_CHART_AXIS_PRIMARY_Y, 0, 100);

// Series 0
lv_chart_series_t *chart_1_ser_0 = lv_chart_add_series(chart_1,
    lv_color_hex(0x2196F3), LV_CHART_AXIS_PRIMARY_Y);
lv_chart_set_next_value(chart_1, chart_1_ser_0, 10);
lv_chart_set_next_value(chart_1, chart_1_ser_0, 20);
lv_chart_set_next_value(chart_1, chart_1_ser_0, 30);
lv_chart_set_next_value(chart_1, chart_1_ser_0, 25);
lv_chart_set_next_value(chart_1, chart_1_ser_0, 40);
```

**Legacy single-series mode (data array):**

```c
lv_chart_set_point_count(chart_1, 5);
lv_chart_series_t *chart_1_ser = lv_chart_add_series(chart_1,
    lv_color_hex(0x2196F3), LV_CHART_AXIS_PRIMARY_Y);
lv_chart_set_ext_y_array(chart_1, chart_1_ser,
    (int32_t[]){10, 20, 30, 25, 40});  // v9: int32_t, v8: lv_coord_t
```

**Hide grid lines:**

```c
// showGrid === false
lv_obj_set_style_line_opa(chart_1, LV_OPA_TRANSP, LV_PART_MAIN);
```

## 11. LVGL API Mapping

### Creation Function

| LVGL Version | Function |
|-----------|------|
| v8 / v9 | `lv_chart_create(parent)` |

### Key APIs

| API | Description |
|-----|------|
| `lv_chart_set_type(chart, type)` | Set chart type: `LV_CHART_TYPE_LINE` / `LV_CHART_TYPE_BAR` / `LV_CHART_TYPE_SCATTER` |
| `lv_chart_set_point_count(chart, cnt)` | Set number of data points |
| `lv_chart_add_series(chart, color, axis)` | Add data series |
| `lv_chart_set_next_value(chart, ser, val)` | Add data points one by one |
| `lv_chart_set_ext_y_array(chart, ser, arr)` | Set external Y data array |
| `lv_chart_set_range(chart, axis, min, max)` | Set axis range |
| `lv_chart_refresh(chart)` | Refresh chart display |
| `lv_chart_set_div_line_count(chart, hdiv, vdiv)` | Set grid line count |
| `lv_chart_set_zoom_x(chart, zoom)` | X-axis zoom |
| `lv_chart_set_zoom_y(chart, zoom)` | Y-axis zoom |

### LVGL Parts

| Part | Description |
|------|------|
| `LV_PART_MAIN` | Chart background and grid lines |
| `LV_PART_ITEMS` | Data points (line chart dots, bar chart bars) |
| `LV_PART_INDICATOR` | Cursor/crosshair |
| `LV_PART_CURSOR` | Cursor |
| `LV_PART_TICKS` | Axis ticks |

### Default Theme Styles (lv_theme_default)

- **MAIN part**: card style — `bg_color=#FFFFFF, border_color=#E0E0E0, border_width=2, radius=8, pad=10`
- **ITEMS part**: `bg_color=color_primary` (data point color)
- **TICKS part**: `text_color=color_text, line_color=color_grey`

## 12. Design Notes

1. **Multi-series vs. legacy compatibility**: The `series` array is the new multi-series data format; `data` + `lineColor` is the legacy single-series format. Both coexist for backward compatibility. Code generation prefers `series` and falls back to `data`. The editor property panel should guide users toward the `series` format.

2. **Simplified canvas rendering**: Chart rendering in the editor canvas is highly simplified (bar chart form only) and does not fully reflect LVGL's real rendering. True appearance should be viewed in WASM preview.

3. **Data point count**: LVGL chart requires `point_count` to be set in advance. Using `lv_chart_set_next_value` automatically cycles and overwrites old data. When using `lv_chart_set_ext_y_array`, ensure array length matches `point_count`.

4. **Performance considerations**: On embedded devices, large numbers of data points (>100) may cause rendering performance degradation. The editor property panel can advise users to keep data point counts reasonable.

5. **Scatter chart support**: Code generation supports `LV_CHART_TYPE_SCATTER`, but scatter rendering is not implemented in the editor canvas and simple preview; it falls back to line chart rendering.

6. **Grid line control**: The `showGrid` property hides grid lines by setting `line_opa = LV_OPA_TRANSP`. Finer grid control (horizontal/vertical division line count) can be achieved via `lv_chart_set_div_line_count`, but is not currently exposed as an editor property.

7. **WASM preview extension**: Current `ui_from_json.c` only supports the legacy `data` field. Full multi-series support requires extending the C side to parse the `series` JSON array, calling `lv_chart_add_series` and `lv_chart_set_next_value` for each series.

8. **Card style consistency**: Chart uses card style (white background + gray border), maintaining visual consistency with Table, Calendar, Textarea, Dropdown, and other components per LVGL default theme design guidelines.
