# Arc (arc) — Arc Component Design Document

## 1. Component Name and Overview

Arc is a circular display component that shows numeric progress through an arc's angular range. It consists of a background arc and a foreground indicator arc, commonly used for gauges, knob indicators, circular progress, and similar scenarios. Unlike Bar's linear progress, Arc presents data in arc form, which is more compact and visually appealing.

## 2. Component Type Identifier

```
type: 'arc'
```

## 3. Category

| Category ID | Category Name | Icon |
|---------|---------|------|
| display | Display | 🔄 |

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 100 |
| defaultHeight | 100 |

Arc is typically square to ensure the arc is centered and not distorted.

## 5. Container Status

```
isContainer: false
```

Arc is a pure display component and cannot contain child components.

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
| `startAngle` | `number` | `135` | Background arc start angle (degrees); 0° is 3 o'clock, increasing clockwise |
| `endAngle` | `number` | `45` | Background arc end angle (degrees) |
| `value` | `number` | `60` | Current value, range [min, max] |
| `min` | `number` | `0` | Minimum value (optional, default 0) |
| `max` | `number` | `100` | Maximum value (optional, default 100) |
| `mode` | `'normal' \| 'symmetrical' \| 'reverse'` | `'normal'` | Arc mode (optional extension) |

### Property Constraints

- `startAngle` and `endAngle` range from 0–360; when `startAngle > endAngle`, the arc crosses the 0° position
- Default angles 135°→45° form an arc of approximately 270° (from lower left to lower right, passing through the top), which is the classic LVGL arc appearance
- `value` is clamped to the `[min, max]` range

### Angle Reference

```
         270° (12 o'clock)
          |
180° ----+---- 0° (3 o'clock)
(9 o'clock) |
          90° (6 o'clock)

Default: startAngle=135 → endAngle=45
Arc from lower left 135° through 180°→270°→0° to lower right 45°
Total arc = 360 - 135 + 45 = 270°
```

## 8. Style Design (styles)

### Default Style (default state)

| Style Property | Default | Description |
|----------|--------|------|
| `bgColor` | `transparent` | Transparent background (arc does not need rectangular background fill) |
| `borderColor` | `#2196F3` | Reused in the editor as arc indicator color |
| `borderWidth` | `15` | Reused in the editor as arc width |
| `borderRadius` | `0` | Not applicable (arc shape is drawn via SVG/Canvas) |
| `textColor` | `#212121` | Center value text color |
| `opacity` | `1` | Fully opaque |
| `padding` | `0` | No padding |

### LVGL Parts Style Mapping

| Part | Editor Style Mapping | LVGL Default |
|------|---------------|-------------|
| `LV_PART_MAIN` | bgColor → bg_opa=TRANSP | No background fill |
| `LV_PART_INDICATOR` | borderColor → arc_color | `#2196F3` (color_primary) |
| `LV_PART_MAIN` (arc) | — | `#E0E0E0` (color_grey) as background arc |
| `LV_PART_KNOB` | — | Optional knob (hidden by default) |

### Supported Style States

| State | Description |
|------|------|
| `default` | Default state, always applied |
| `pressed` | Pressed state (arc can be configured as interactive) |
| `focused` | Focused state |
| `disabled` | Disabled state |

## 9. Event Support

| Event Type | Description |
|----------|------|
| `LV_EVENT_CLICKED` | Click event |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_VALUE_CHANGED` | Value changed event (triggered when user drags or value is set via code) |
| `LV_EVENT_FOCUSED` | Gained focus |
| `LV_EVENT_DEFOCUSED` | Lost focus |

> Note: LVGL arc is interactive by default (users can drag to change the value). In the editor it is categorized under "Display" and is primarily used for read-only display, but users are not restricted from adding interaction events.

## 10. UI Layer Design

### Editor Canvas Rendering (CanvasComponent.tsx)

```tsx
<div className="lvgl-arc" style={{
  width: '100%', height: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}}>
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
    {/* Background arc */}
    <circle cx="50" cy="50" r="40" fill="none"
      stroke="#e0e0e0" strokeWidth="8" />
    {/* Indicator arc */}
    <circle cx="50" cy="50" r="40" fill="none"
      stroke={defaultStyle.borderColor || '#2196F3'}
      strokeWidth="8"
      strokeDasharray={`${(props.value || 60) * 2.51} 251`}
      strokeLinecap="round"
      transform="rotate(-90 50 50)" />
  </svg>
</div>
```

Key points:
- Uses SVG `<circle>` + `strokeDasharray` to simulate arc progress
- Background circle uses gray `#e0e0e0`
- Indicator color is taken from `defaultStyle.borderColor` (default `#2196F3`)
- `strokeDasharray` calculation: circumference ≈ 2π×40 ≈ 251; `value * 2.51` is the fill length
- `rotate(-90)` moves the start point to 12 o'clock

### Simple Preview Rendering (PreviewPanel.tsx — Canvas 2D)

```typescript
function drawArc(ctx, x, y, w, h, opts) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.min(w, h) / 2 - 5;
  const progress = (opts.value - opts.min) / (opts.max - opts.min);
  const startAngle = -Math.PI * 0.75;  // 135° mapping
  const endAngle = Math.PI * 0.75;     // 45° mapping
  const currentAngle = startAngle + (endAngle - startAngle) * progress;

  // Background arc
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.stroke();

  // Progress arc
  ctx.strokeStyle = '#2196f3';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, currentAngle);
  ctx.stroke();

  // Center value
  ctx.fillStyle = '#333';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${opts.value}`, centerX, centerY);
}
```

Key points:
- Uses Canvas 2D `arc()` to draw arcs
- Default arc range -135°→135° (approximately 270° arc)
- Draws current value text at the center of the arc
- `lineCap = 'round'` makes arc endpoints rounded

### LVGL WASM Preview Rendering

**editorStateToJson.ts**: Props (startAngle, endAngle, value, min, max) are serialized directly.

**ui_from_json.c**:

```c
static lv_obj_t *create_arc(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *arc = lv_arc_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int mn = cjson_get_int(props, "min", 0);
        int mx = cjson_get_int(props, "max", 100);
        int val = cjson_get_int(props, "value", 75);
        lv_arc_set_range(arc, mn, mx);
        lv_arc_set_value(arc, val);
    }
    return arc;
}
```

Key points:
- Uses `lv_arc_create` to create a real LVGL arc widget
- Current WASM implementation does not set `startAngle`/`endAngle` (uses LVGL defaults); can be extended
- Styles are applied via the generic `apply_styles` function

### Code Generation Output (ui.c.ts)

```c
// Create
lv_obj_t *arc_1 = lv_arc_create(parent);
lv_obj_set_pos(arc_1, 50, 50);
lv_obj_set_size(arc_1, 100, 100);

// Style
lv_obj_set_style_bg_opa(arc_1, LV_OPA_TRANSP, 0);
lv_obj_set_style_border_color(arc_1, lv_color_hex(0x2196F3), 0);
lv_obj_set_style_border_width(arc_1, 15, 0);

// Properties
lv_arc_set_bg_angles(arc_1, 135, 45);
lv_arc_set_range(arc_1, 0, 100);
lv_arc_set_value(arc_1, 60);
```

Optional mode settings:

```c
// mode property
lv_arc_set_mode(arc_1, LV_ARC_MODE_NORMAL);      // default
lv_arc_set_mode(arc_1, LV_ARC_MODE_SYMMETRICAL);  // symmetrical mode
lv_arc_set_mode(arc_1, LV_ARC_MODE_REVERSE);      // reverse mode
```

## 11. LVGL API Mapping

### Creation Function

| LVGL Version | Function |
|-----------|------|
| v8 / v9 | `lv_arc_create(parent)` |

### Key APIs

| API | Description |
|-----|------|
| `lv_arc_set_range(arc, min, max)` | Set value range |
| `lv_arc_set_value(arc, value)` | Set current value |
| `lv_arc_set_bg_angles(arc, start, end)` | Set background arc start/end angles |
| `lv_arc_set_angles(arc, start, end)` | Set indicator arc angles directly |
| `lv_arc_set_mode(arc, mode)` | Set mode: NORMAL / SYMMETRICAL / REVERSE |
| `lv_arc_set_rotation(arc, deg)` | Set overall rotation offset |
| `lv_arc_get_value(arc)` | Get current value |
| `lv_arc_get_angle_start(arc)` | Get indicator start angle |
| `lv_arc_get_angle_end(arc)` | Get indicator end angle |

### LVGL Parts

| Part | Description |
|------|------|
| `LV_PART_MAIN` | Background arc (track) |
| `LV_PART_INDICATOR` | Foreground indicator arc |
| `LV_PART_KNOB` | Knob (circular handle at arc end) |

### Default Theme Styles (lv_theme_default)

- **MAIN part (arc track)**: `arc_color = color_grey` (`#E0E0E0`), `arc_width` determined by component size
- **INDICATOR part**: `arc_color = color_primary` (`#2196F3`)
- **KNOB part**: Hidden by default; can be enabled via styles

## 12. Design Notes

1. **Angle system differences**: LVGL's angle system uses 3 o'clock as 0°, increasing clockwise. The editor canvas requires angle conversion when rendering with SVG/Canvas (Canvas 2D's 0° is also at 3 o'clock, but SVG's `rotate(-90)` moves the start to 12 o'clock).

2. **Reuse of borderColor/borderWidth**: The editor's `StyleProps` has no dedicated `arcColor`/`arcWidth` properties, so `borderColor` and `borderWidth` are reused to represent arc color and width. Code generation requires special handling—do not generate `lv_obj_set_style_border_*`; map to `lv_obj_set_style_arc_color` and `lv_obj_set_style_arc_width` instead.

3. **Transparent background**: Arc's `bgColor` defaults to `transparent`, which is correct—arc does not need rectangular background fill. In the editor canvas, `resolvedBgColor` remains `transparent` for arc type without fallback.

4. **Square constraint**: Arc will distort in non-square containers. The editor can offer a "maintain square" constraint in the property panel, or automatically keep width and height equal when resizing.

5. **Interactivity**: LVGL arc is interactive by default (users can drag the knob to change the value). For display-only use, remove `LV_OBJ_FLAG_CLICKABLE` in code or use `lv_arc_set_mode` with appropriate settings.

6. **Relationship to Spinner**: Spinner is essentially an Arc with continuous rotation animation. They share the same default styles (`bgColor=transparent, borderColor=#2196F3, borderWidth=15`), but Spinner does not expose value/angle properties.

7. **WASM preview angle settings**: The current `create_arc` in `ui_from_json.c` does not set `startAngle`/`endAngle`, using LVGL defaults. To fully reproduce the editor design, extend the WASM side to read these two properties and call `lv_arc_set_bg_angles`.
