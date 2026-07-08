# Line (line) — Component Design Document

## 1. Component Name and Overview

Line is a basic component in the LVGL editor for drawing straight line segments. In LVGL, a line object (`lv_line`) defines segment shape via a set of point coordinates and supports line width, line color, and related properties. Lines are commonly used for separators and decorative lines in the UI.

A line is not a container component (`isContainer = false`) and cannot contain child components.

## 2. Component Type Identifier

```
type: 'line'
```

## 3. Category

| Field | Value |
|-------|-------|
| Category ID | `basic` |
| Category Name | Basic |
| Category Icon | 📦 |
| Component Icon | 📏 |

## 4. Default Size

| Property | Value |
|----------|-------|
| defaultWidth | 100 |
| defaultHeight | 4 |

> Note: The default line height is 4px to provide enough interactive area in the editor. In actual LVGL rendering, the visual line thickness is determined by `lineWidth`.

## 5. Is Container

```
isContainer: false
```

A line is a display-only component and cannot contain child components.

## 6. Parent-Child Relationship Design

### Can Be a Child Of

- **Screen (root node)** — Placed directly on the page
- **Button (btn)** — As a decorative line inside a button
- **Container (obj)** — Placed inside a generic container
- **Tab View (tabview)** — Placed in a tab page content area
- **Tile View (tileview)** — Placed in a tile area
- **Window (win)** — Placed in the window content area

### Can Contain Child Components

None. A line is not a container and cannot contain any child components.

## 7. Property Design (props)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `points` | `number[][]` | `[[0,0],[100,0]]` | Point coordinate array for the segment; each point is `[x, y]` |
| `lineWidth` | `number` | `2` | Line width in pixels; mapped to LVGL `line_width` style |
| `lineColor` | `string` | `undefined` | Line color (optional; overrides `borderColor` in styles) |

### props Type Definition

```typescript
interface LineProps {
  points: number[][];  // [[x1,y1], [x2,y2], ...]
  lineWidth?: number;
  lineColor?: string;
}
```

### points Notes

- Default `[[0,0],[100,0]]` represents a horizontal line from left to right
- Coordinates are relative to the line object's origin
- Multiple points (polyline) are supported, but the editor defaults to two points (a straight segment)
- WASM preview supports at most 2 points

## 8. Style Design (styles)

### Supported Style States

| State | Selector | Description |
|-------|----------|-------------|
| `default` | `LV_STATE_DEFAULT` | Default/normal state |
| `pressed` | `LV_STATE_PRESSED` | Pressed state |
| `focused` | `LV_STATE_FOCUSED` | Focused state |
| `disabled` | `LV_STATE_DISABLED` | Disabled state |

### Default State Styles

| Style Property | Type | Default | Description |
|----------------|------|---------|-------------|
| `bgColor` | `string` | `'transparent'` | Background color (transparent) |
| `borderColor` | `string` | `'#212121'` | Border color (used as line color reference; LVGL theme `color_text`) |
| `borderWidth` | `number` | `1` | Border width (mapped to LVGL `line_width`) |
| `borderRadius` | `number` | `0` | Corner radius (not used for lines) |
| `textColor` | `string` | `'#212121'` | Text color |
| `opacity` | `number` | `1` | Opacity |
| `padding` | `number` | `0` | Padding |

### Style Source Notes

Default line styles come from the LVGL default theme:
- Line color (`line_color`) uses `color_text` (`#212121`)
- Line width (`line_width`) defaults to 1
- Transparent background

> Note: In the editor style system, line color and width are stored as `borderColor` and `borderWidth`, but in LVGL they map to `line_color` and `line_width` style properties. `props.lineColor` and `props.lineWidth` provide more direct control.

### Extended Style Properties

Lines support the following common extended styles:

- Transform: `transformAngle`, `transformZoomX`, `transformZoomY`, `transformPivotX`, `transformPivotY`
- Blend mode: `blendMode`

## 9. Event Support

Lines support the following LVGL event types:

| Event Type | Description |
|------------|-------------|
| `LV_EVENT_CLICKED` | Click event |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_FOCUSED` | Focus gained |
| `LV_EVENT_DEFOCUSED` | Focus lost |

> Note: Lines are not clickable by default. Because the interactive area is very small, lines rarely have events bound in practice.

## 10. UI Layer Design

### 10.1 Editor Canvas Rendering (CanvasComponent.tsx)

In the editor canvas, lines are rendered with React DOM:

```tsx
<div className="lvgl-line" style={{
  width: '100%',
  height: '2px',
  backgroundColor: defaultStyle.borderColor || defaultStyle.textColor || '#333',
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
}} />
```

Key behavior:
- Uses a `div` to simulate a line with fixed 2px height
- Vertically centered in the component area (`top: 50%` + `translateY(-50%)`)
- Color taken from `borderColor` or `textColor`
- Always rendered as a horizontal line (angle is not computed from `points`)
- Supports selection highlight, hover effects, drag, and resize handles

### 10.2 Simple Preview Rendering (PreviewPanel.tsx)

In the Canvas 2D simple preview, lines are drawn with the `drawLine()` function:

```typescript
drawLine(ctx, x, y, w, h, {
  lineColor: comp.props.lineColor || bgColorStyle,
  lineWidth: comp.props.lineWidth || 2,
});
```

Drawing implementation:

```typescript
function drawLine(ctx, x, y, w, h, opts) {
  ctx.strokeStyle = opts.lineColor;
  ctx.lineWidth = opts.lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
}
```

Key behavior:
- Uses Canvas 2D `stroke` to draw the segment
- Line is vertically centered in the component area
- Line cap style is round (`lineCap = 'round'`)
- Color from `props.lineColor`, falling back to style `bgColor`
- Line width from `props.lineWidth`, default 2px
- Supports animation state overlays

### 10.3 LVGL WASM Preview Rendering

#### JSON Serialization (editorStateToJson.ts)

Lines are serialized as flattened JSON component nodes:

```json
{
  "type": "line",
  "id": "comp-xxx",
  "parent": null,
  "x": 10, "y": 50,
  "width": 100, "height": 4,
  "props": { "points": [[0,0],[100,0]] },
  "styles": {
    "default": {
      "bgColor": "transparent",
      "borderColor": "#212121",
      "borderWidth": 1,
      "borderRadius": 0,
      "textColor": "#212121",
      "opacity": 1,
      "padding": 0
    }
  }
}
```

#### C-Side Creation (ui_from_json.c)

```c
static lv_obj_t *create_line(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *line = lv_line_create(parent);
    static lv_point_precise_t line_points[2];
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    int w = cjson_get_int(comp, "width", 100);
    line_points[0].x = 0; line_points[0].y = 0;
    line_points[1].x = w; line_points[1].y = 0;

    if (props) {
        cJSON *pts = cJSON_GetObjectItemCaseSensitive(props, "points");
        if (cJSON_IsArray(pts) && cJSON_GetArraySize(pts) >= 2) {
            cJSON *p0 = cJSON_GetArrayItem(pts, 0);
            cJSON *p1 = cJSON_GetArrayItem(pts, 1);
            if (cJSON_IsArray(p0) && cJSON_IsArray(p1)) {
                line_points[0].x = cJSON_GetArrayItem(p0, 0)->valueint;
                line_points[0].y = cJSON_GetArrayItem(p0, 1)->valueint;
                line_points[1].x = cJSON_GetArrayItem(p1, 0)->valueint;
                line_points[1].y = cJSON_GetArrayItem(p1, 1)->valueint;
            }
        }
    }
    lv_line_set_points(line, line_points, 2);
    return line;
}
```

Key behavior:
- Calls `lv_line_create()` to create the line
- Parses the `props.points` array for two endpoint coordinates
- Uses a `static` point array (LVGL requires point data to remain valid for the line's lifetime)
- Defaults to a horizontal line (`[0,0]` to `[width,0]`)
- Calls `lv_line_set_points()` to set point coordinates
- Applies position, size, and styles

### 10.4 Code Generation Output (ui.c.ts)

```c
// Create line: my_line
my_line = lv_line_create(parent);
lv_obj_set_pos(my_line, 10, 50);
lv_obj_set_size(my_line, 100, 4);
lv_obj_set_style_bg_opa(my_line, LV_OPA_TRANSP, 0);
lv_obj_set_style_border_color(my_line, lv_color_hex(0x212121), 0);
lv_obj_set_style_border_width(my_line, 1, 0);

// Custom line width (if props.lineWidth is not the default)
lv_obj_set_style_line_width(my_line, 3, 0);

// Custom line color (if props.lineColor is set)
lv_obj_set_style_line_color(my_line, lv_color_hex(0xFF0000), 0);
```

Key behavior:
- Creation uses `lv_line_create`
- `props.lineWidth` maps to `lv_obj_set_style_line_width` (only emitted when not the default value of 2)
- `props.lineColor` maps to `lv_obj_set_style_line_color`
- Point coordinate data must exist as a `static` array in generated code (the current code generator does not emit point arrays directly and relies on default behavior)

> Note: In the current code generator (`generatePropsCode`), the line's `points` property does not generate corresponding `lv_line_set_points` code. This is a known simplification; lines use default horizontal line behavior.

## 11. LVGL API Mapping

### Creation Function

| Version | API |
|---------|-----|
| LVGL v9 | `lv_line_create(parent)` |
| LVGL v8 | `lv_line_create(parent)` |

### Key APIs

| API | Description |
|-----|-------------|
| `lv_line_create(parent)` | Create line object |
| `lv_line_set_points(line, points, count)` | Set line segment point array |
| `lv_obj_set_style_line_width(line, width, sel)` | Set line width |
| `lv_obj_set_style_line_color(line, color, sel)` | Set line color |
| `lv_obj_set_style_line_rounded(line, en, sel)` | Set rounded line caps |
| `lv_obj_set_style_line_dash_width(line, w, sel)` | Set dashed segment width |
| `lv_obj_set_style_line_dash_gap(line, gap, sel)` | Set dash gap |
| `lv_obj_set_pos(line, x, y)` | Set position |
| `lv_obj_set_size(line, w, h)` | Set size |

### Point Coordinate Types

| Version | Type | Description |
|---------|------|-------------|
| LVGL v9 | `lv_point_precise_t` | Precise coordinates (supports floats) |
| LVGL v8 | `lv_point_t` | Integer coordinates |

## 12. Design Notes

1. **Point data lifetime**: LVGL's `lv_line_set_points` does not copy point data; it stores a pointer reference. Point arrays must therefore be `static` or global and remain valid for the entire lifetime of the line object. WASM preview uses `static lv_point_precise_t line_points[2]`.

2. **Editor simplification**: In the editor canvas and simple preview, lines are always rendered as horizontal lines (actual coordinates in `points` are ignored). This is a design simplification because precisely editing segment endpoints in a visual editor would require more complex interaction.

3. **Style mapping differences**: Line color and width are stored as `borderColor` and `borderWidth` in the editor style system, but LVGL uses `line_color` and `line_width` style properties. `props.lineColor` and `props.lineWidth` provide more precise control and take priority over style fields.

4. **Default height**: The default line height is 4px (not 1px) to provide enough mouse interaction area (selection, drag, resize) in the editor. Actual rendered line thickness is determined by line width.

5. **Incomplete code generation**: The current code generator does not emit `lv_line_set_points` calls or the corresponding `static` point array declarations. Generated code will not display a line segment until the user adds point data manually. This is a planned improvement.

6. **Multi-point polylines**: Although `points` supports multiple points (polyline), the editor UI currently only supports editing two-point straight segments. WASM preview also only handles the first two points.

7. **v8/v9 point type differences**: v9 uses `lv_point_precise_t` (float coordinates); v8 uses `lv_point_t` (integer coordinates). Code generation must choose the correct type based on version.
