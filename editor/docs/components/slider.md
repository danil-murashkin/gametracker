# Slider — Slider

## 1. Component Name and Overview

**Slider** is a slider component corresponding to LVGL's `lv_slider` widget. Users select a value within a specified range by dragging the knob. In embedded UIs it is commonly used for volume adjustment, brightness control, parameter settings, and similar scenarios.

## 2. Component Type Identifier

```
type: 'slider'
```

## 3. Category

| Category ID | Category Name | Icon |
|---------|---------|------|
| `input` | Input | ✏️ |

Component panel icon: 🎚️

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 150 |
| defaultHeight | 20 |

## 5. Is Container

```
isContainer: false
```

Slider is not a container component and cannot contain child components.

## 6. Parent-Child Relationship Design

### Can be a child of the following components

- **Screen (screen root node)** — Placed directly on the page
- **Container (obj)** — Placed inside a generic container (common usage: paired with Label to show current value)
- **Tab View (tabview)** — Placed in a tab page content area
- **Tile View (tileview)** — Placed in a tile area
- **Window (win)** — Placed in the window content area

### Can contain the following child components

None. Slider is a leaf node component and does not support nested child components.

## 7. Property Design (props)

| Property Name | Type | Default Value | Description |
|--------|------|--------|------|
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `value` | `number` | `50` | Current value; must be within [min, max] range |
| `step` | `number` | `undefined` | Step increment; continuous sliding if not set |
| `orientation` | `string` | `undefined` | Direction: horizontal by default; set to `'vertical'` for vertical display |

### Property Definition (componentDefinitions.ts)

```typescript
defaultProps: { min: 0, max: 100, value: 50 }
```

## 8. Style Design (styles)

### Supported Style States

| State | Selector | Description |
|------|--------|------|
| `default` | `LV_STATE_DEFAULT` | Default state |
| `pressed` | `LV_STATE_PRESSED` | State while dragging knob |
| `focused` | `LV_STATE_FOCUSED` | Focused state |
| `disabled` | `LV_STATE_DISABLED` | Disabled state |

### Default Style (default state)

Slider track uses LVGL theme `color_primary_muted` (theme color at 20% opacity over white), with full rounded design.

| Style Property | Type | Default Value | Description |
|----------|------|--------|------|
| `bgColor` | `string` | `'#D3EAFD'` | Track background color, LVGL color_primary_muted |
| `borderColor` | `string` | `'transparent'` | Border color, no border by default |
| `borderWidth` | `number` | `0` | Border width |
| `borderRadius` | `number` | `9999` | Corner radius; 9999 means full rounded |
| `textColor` | `string` | `'#212121'` | Text color (Slider has no text; kept for consistency) |
| `opacity` | `number` | `1` | Opacity |
| `padding` | `number` | `0` | Padding |

### Part Styles in LVGL Theme

In the LVGL default theme:
- **Track (MAIN)**: `bgColor = #D3EAFD` (primary_muted), full rounded
- **Indicator (INDICATOR)**: `bgColor = #2196F3` (primary), full rounded, represents selected range
- **Knob (KNOB)**: `bgColor = #2196F3` (primary), circular, with shadow

### Recommended disabled State Style

```typescript
disabled: {
  bgColor: '#E0E0E0',
  opacity: 0.5,
}
```

## 9. Event Support

| LVGL Event Type | Description |
|--------------|------|
| `LV_EVENT_VALUE_CHANGED` | Triggered when value changes (fires continuously while dragging, most common) |
| `LV_EVENT_PRESSED` | Triggered when knob is pressed |
| `LV_EVENT_RELEASED` | Triggered when knob is released |
| `LV_EVENT_CLICKED` | Triggered on click |
| `LV_EVENT_FOCUSED` | Triggered when focus is gained |
| `LV_EVENT_DEFOCUSED` | Triggered when focus is lost |

The most commonly used event is `LV_EVENT_VALUE_CHANGED`, which fires continuously while the user drags the slider. Current value can be obtained via `lv_slider_get_value(slider)`.

## 10. UI Layer Design

### Editor Canvas Rendering (CanvasComponent.tsx)

In the editor canvas, Slider renders as a horizontal track + fill bar + circular knob:

```tsx
<div className="lvgl-slider" style={{
  width: '100%',
  height: '100%',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
}}>
  {/* Track */}
  <div style={{
    width: '100%',
    height: '4px',
    backgroundColor: '#e0e0e0',
    borderRadius: '2px',
    position: 'relative',
  }}>
    {/* Fill bar (selected range) */}
    <div style={{
      width: `${percentage}%`,
      height: '100%',
      backgroundColor: '#2196F3',
      borderRadius: '2px',
    }} />
  </div>
  {/* Knob */}
  <div style={{
    position: 'absolute',
    left: `calc(${percentage}% - 8px)`,
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#2196F3',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  }} />
</div>
```

`percentage` is calculated as:
```
percentage = ((value - min) / (max - min)) * 100
```

- Track height fixed at 4px, centered
- Fill bar from left to knob position, theme blue color
- Knob is 16px circle with shadow

### Simple Preview Rendering (PreviewPanel.tsx — Canvas 2D)

Drawn on Canvas 2D using the `drawSlider` function:

```typescript
function drawSlider(ctx, x, y, w, h, opts) {
  const trackHeight = 6;
  const trackY = y + (h - trackHeight) / 2;
  const progress = (opts.value - opts.min) / (opts.max - opts.min);
  const knobX = x + progress * w;

  // 1. Draw track background
  ctx.fillStyle = '#e0e0e0';
  roundRect(ctx, x, trackY, w, trackHeight, 3);
  ctx.fill();

  // 2. Draw fill bar
  ctx.fillStyle = '#2196f3';
  roundRect(ctx, x, trackY, w * progress, trackHeight, 3);
  ctx.fill();

  // 3. Draw knob
  ctx.fillStyle = '#2196f3';
  ctx.beginPath();
  ctx.arc(knobX, y + h / 2, 8, 0, Math.PI * 2);
  ctx.fill();
}
```

### LVGL WASM Preview Rendering (ui_from_json.c)

Passed to the WASM side via JSON, creating a real LVGL widget via the `create_slider` function:

```c
static lv_obj_t *create_slider(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *slider = lv_slider_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int mn = cjson_get_int(props, "min", 0);
        int mx = cjson_get_int(props, "max", 100);
        int val = cjson_get_int(props, "value", 50);
        lv_slider_set_range(slider, mn, mx);
        lv_slider_set_value(slider, val, LV_ANIM_OFF);
    }
    return slider;
}
```

Slider is fully interactive in WASM preview; users can drag the knob to change the value.

### Code Generation Output (ui.c.ts)

```c
// Create slider: my_slider
my_slider = lv_slider_create(parent);
lv_obj_set_pos(my_slider, 10, 20);
lv_obj_set_size(my_slider, 150, 20);

// Styles
lv_obj_set_style_bg_color(my_slider, lv_color_hex(0xD3EAFD), 0);
lv_obj_set_style_bg_opa(my_slider, LV_OPA_COVER, 0);
lv_obj_set_style_radius(my_slider, 9999, 0);

// Props
lv_slider_set_range(my_slider, 0, 100);
lv_slider_set_value(my_slider, 50, LV_ANIM_OFF);
```

Supported extended property code generation:
- `step` → Custom step logic needed in event callback (generates comment hint)
- `orientation: 'vertical'` → `lv_obj_set_style_transform_rotation(slider, 900, 0)` (v9) / `lv_obj_set_style_transform_angle(slider, 900, 0)` (v8)

## 11. LVGL API Mapping

### Creation Function

| LVGL Version | Function |
|-----------|------|
| v8 / v9 | `lv_slider_create(parent)` |

### Key APIs

| API Function | Description |
|----------|------|
| `lv_slider_set_value(slider, val, anim)` | Set current value |
| `lv_slider_get_value(slider)` | Get current value |
| `lv_slider_set_range(slider, min, max)` | Set value range |
| `lv_slider_set_left_value(slider, val, anim)` | Set left value (range mode) |
| `lv_slider_get_left_value(slider)` | Get left value (range mode) |
| `lv_slider_set_mode(slider, mode)` | Set mode (NORMAL / SYMMETRICAL / RANGE) |
| `lv_slider_is_dragged(slider)` | Query whether currently being dragged |

### Style Parts

| Part | Description |
|------|------|
| `LV_PART_MAIN` | Track background area |
| `LV_PART_INDICATOR` | Fill indicator (colored area from min to current value) |
| `LV_PART_KNOB` | Knob (draggable circular handle) |

Common style combinations:
- `LV_PART_MAIN | LV_STATE_DEFAULT` — Track background color, corner radius
- `LV_PART_INDICATOR` — Fill bar color
- `LV_PART_KNOB` — Knob size, color, shadow
- `LV_PART_KNOB | LV_STATE_PRESSED` — Knob style change while dragging

## 12. Design Notes

1. **Value range validation**: The editor should ensure `value` is always within `[min, max]`. Rendering uses `Math.max(0, Math.min(100, ...))` for percentage clamping to prevent knob exceeding track.

2. **Difference from Bar**: Slider and Bar (progress bar) look very similar visually, but Slider is interactive (has knob) while Bar is display-only. Both share track + indicator structure, but Slider additionally has `LV_PART_KNOB`.

3. **Vertical orientation**: LVGL does not natively support vertical Slider; it is achieved by rotating 90°. Code generation uses `transform_rotation(900)` or `transform_angle(900)`. The editor canvas does not currently support vertical rendering.

4. **Step value**: LVGL has no built-in step property. For step behavior, manually align values to step grid in `LV_EVENT_VALUE_CHANGED` callback. Code generation adds a comment hint.

5. **Full rounded design**: `borderRadius: 9999` ensures track and indicator appear as rounded capsule shape. This is the standard Slider visual style, consistent with Bar component.

6. **Knob size**: Editor canvas knob is fixed at 16px diameter. In LVGL, knob size is controlled via `LV_PART_KNOB` padding (larger padding = larger knob).

7. **Drag interaction**: Slider is not draggable in editor canvas or simple preview; only static state is shown. WASM preview supports full interactive dragging.

8. **Height recommendation**: Default height 20px includes knob display space. Track itself is only 4~6px high with knob centered. If height is too small (< 16px), knob may be clipped.

9. **Color hierarchy**: Slider uses three color layers:
   - Track background: `#D3EAFD` (light blue, primary_muted)
   - Fill indicator: `#2196F3` (theme blue)
   - Knob: `#2196F3` (theme blue) + shadow
   
   This hierarchy is reflected in both editor canvas and simple preview.

10. **Range mode**: LVGL supports `LV_SLIDER_MODE_RANGE` (dual-knob range selection), but the editor does not currently support this mode. Add manually in generated code if needed.
