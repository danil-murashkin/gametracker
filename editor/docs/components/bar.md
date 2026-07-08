# Progress Bar (bar) — Progress Bar Component Design Document

## 1. Component Name and Overview

Progress Bar is a read-only display component used to show progress of a value within a given range. It consists of a background track and a fill indicator; the fill ratio is determined by the `value`, `min`, and `max` properties. In embedded UIs it is commonly used for download progress, battery level, loading status, and similar scenarios.

## 2. Component Type Identifier

```
type: 'bar'
```

## 3. Category

| Category ID | Category Name | Icon |
|---------|---------|------|
| display | Display | 📊 |

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 150 |
| defaultHeight | 20 |

## 5. Container Status

```
isContainer: false
```

Progress Bar is a pure display component and cannot contain child components.

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
| `min` | `number` | `0` | Minimum value of the progress bar |
| `max` | `number` | `100` | Maximum value of the progress bar |
| `value` | `number` | `60` | Current progress value, range [min, max] |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Orientation (optional extension); vertical mode is implemented by rotating 90° |

### Property Constraints

- `min` must be less than `max`
- `value` is clamped to the `[min, max]` range
- Fill percentage formula: `percent = (value - min) / (max - min) * 100`

## 8. Style Design (styles)

### Default Style (default state)

| Style Property | Default | Description |
|----------|--------|------|
| `bgColor` | `#D3EAFD` | Background track color (LVGL primary muted = primary@20% over white) |
| `borderColor` | `transparent` | No border |
| `borderWidth` | `0` | No border |
| `borderRadius` | `9999` | Fully rounded (pill shape), consistent with LVGL default bar circle style |
| `textColor` | `#212121` | Text color (bar itself does not display text, but inherited by possible child labels) |
| `opacity` | `1` | Fully opaque |
| `padding` | `0` | No padding |

### Indicator Style

In LVGL, the bar fill uses `LV_PART_INDICATOR` with color `color_primary` (`#2196F3`). In the editor canvas and preview, the indicator color is hardcoded to `#2196F3`.

### Supported Style States

| State | Description |
|------|------|
| `default` | Default state, always applied |
| `pressed` | Pressed state (bar is usually non-interactive, but style overrides are supported) |
| `focused` | Focused state (keyboard/encoder navigation) |
| `disabled` | Disabled state, typically with reduced opacity |

Each state can override all style properties defined in `StyleProps` (bgColor, borderColor, borderWidth, borderRadius, textColor, opacity, padding, shadow*, transform*, outline*, etc.).

## 9. Event Support

Bar is a read-only display component. Supported LVGL event types:

| Event Type | Description |
|----------|------|
| `LV_EVENT_CLICKED` | Click event (if clickable flag is set) |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_VALUE_CHANGED` | Value changed event (triggered when value is set via code) |
| `LV_EVENT_FOCUSED` | Gained focus |
| `LV_EVENT_DEFOCUSED` | Lost focus |

### Built-in Action Support

The following built-in actions can be bound via `EventBinding`:

- `navigate` — Page navigation
- `setProperty` — Set target component property
- `show` / `hide` — Show/hide target component
- `enable` / `disable` — Enable/disable target component
- `setText` / `setValue` — Set target component text/value

## 10. UI Layer Design

### Editor Canvas Rendering (CanvasComponent.tsx)

```tsx
// Calculate fill percentage
const barMin = props.min ?? 0;
const barMax = props.max ?? 100;
const barVal = props.value ?? 60;
const barPercent = barMax > barMin
  ? Math.max(0, Math.min(100, (barVal - barMin) / (barMax - barMin) * 100))
  : 0;

// Render structure: outer background track + inner fill bar
<div className="lvgl-bar" style={{
  width: '100%', height: '100%',
  backgroundColor: '#e0e0e0',
  borderRadius: defaultStyle.borderRadius,
  overflow: 'hidden',
}}>
  <div style={{
    width: `${barPercent}%`, height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: defaultStyle.borderRadius,
    transition: 'width 0.15s',
  }} />
</div>
```

Key points:
- Outer div serves as the background track, using gray `#e0e0e0`
- Inner div serves as the fill indicator, using theme color `#2196F3`
- `borderRadius` is inherited from styles; default 9999 achieves pill shape
- `transition` is added for smooth animation when adjusting value in the property panel

### Simple Preview Rendering (PreviewPanel.tsx — Canvas 2D)

```typescript
function drawBar(ctx, x, y, w, h, opts) {
  const progress = (opts.value - opts.min) / (opts.max - opts.min);
  // Background track
  ctx.fillStyle = '#e0e0e0';
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  // Fill indicator
  ctx.fillStyle = '#2196f3';
  roundRect(ctx, x, y, w * progress, h, 4);
  ctx.fill();
}
```

Key points:
- Uses Canvas 2D `roundRect` helper to draw rounded rectangles
- Draw gray background first, then blue fill
- Fill width = total width × progress

### LVGL WASM Preview Rendering

**editorStateToJson.ts**: Flattens the component tree to JSON; bar component props (min, max, value) are serialized and passed directly.

**ui_from_json.c**:

```c
static lv_obj_t *create_bar(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *bar = lv_bar_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int mn = cjson_get_int(props, "min", 0);
        int mx = cjson_get_int(props, "max", 100);
        int val = cjson_get_int(props, "value", 50);
        lv_bar_set_range(bar, mn, mx);
        lv_bar_set_value(bar, val, LV_ANIM_OFF);
    }
    return bar;
}
```

Key points:
- Uses `lv_bar_create` to create a real LVGL bar widget
- Reads min/max/value from JSON props and applies them
- Styles are applied via the generic `apply_styles` function

### Code Generation Output (ui.c.ts)

```c
// Create
lv_obj_t *bar_1 = lv_bar_create(parent);
lv_obj_set_pos(bar_1, 10, 50);
lv_obj_set_size(bar_1, 150, 20);

// Style
lv_obj_set_style_bg_color(bar_1, lv_color_hex(0xD3EAFD), 0);
lv_obj_set_style_bg_opa(bar_1, LV_OPA_COVER, 0);
lv_obj_set_style_radius(bar_1, 9999, 0);

// Properties
lv_bar_set_range(bar_1, 0, 100);
lv_bar_set_value(bar_1, 60, LV_ANIM_OFF);
```

Vertical orientation support:

```c
// When orientation === 'vertical'
lv_obj_set_style_transform_rotation(bar_1, 900, 0);  // LVGL v9
// or
lv_obj_set_style_transform_angle(bar_1, 900, 0);     // LVGL v8
```

## 11. LVGL API Mapping

### Creation Function

| LVGL Version | Function |
|-----------|------|
| v8 / v9 | `lv_bar_create(parent)` |

### Key APIs

| API | Description |
|-----|------|
| `lv_bar_set_range(bar, min, max)` | Set value range |
| `lv_bar_set_value(bar, value, LV_ANIM_OFF)` | Set current value |
| `lv_bar_set_start_value(bar, value, LV_ANIM_OFF)` | Set start value (for range mode) |
| `lv_bar_set_mode(bar, mode)` | Set mode: `LV_BAR_MODE_NORMAL` / `LV_BAR_MODE_SYMMETRICAL` / `LV_BAR_MODE_RANGE` |
| `lv_bar_get_value(bar)` | Get current value |
| `lv_bar_get_min_value(bar)` | Get minimum value |
| `lv_bar_get_max_value(bar)` | Get maximum value |

### LVGL Parts

| Part | Description |
|------|------|
| `LV_PART_MAIN` | Background track |
| `LV_PART_INDICATOR` | Fill indicator |

### Default Theme Styles (lv_theme_default)

- **MAIN part**: `bg_color = color_primary_muted` (`#D3EAFD`), `radius = LV_RADIUS_CIRCLE`
- **INDICATOR part**: `bg_color = color_primary` (`#2196F3`), `radius = LV_RADIUS_CIRCLE`

## 12. Design Notes

1. **Read-only vs. Interactive**: Bar is a read-only display component, unlike Slider. Slider allows the user to drag and change the value; Bar can only have its value set via code. No drag interaction is needed in the editor.

2. **Indicator color not directly configurable**: The editor's `StyleProps` only apply to `LV_PART_MAIN`. The indicator (`LV_PART_INDICATOR`) color is hardcoded to `#2196F3` in the canvas and preview. Future extensions could add an `indicatorColor` property.

3. **Meaning of borderRadius = 9999**: In CSS and LVGL, very large border-radius values are automatically clamped to half the shorter side of the component, forming a pill/capsule shape. This is the default appearance of LVGL bar.

4. **Vertical orientation**: LVGL does not natively support vertical bars; rotation by 90° is required. Code generation uses `transform_rotation` (v9) or `transform_angle` (v8) with value 900 (0.1° units).

5. **Animation transition**: The third parameter of `lv_bar_set_value` can be `LV_ANIM_ON` to enable smooth transition animation. The editor generates `LV_ANIM_OFF` by default; users can modify this in custom code.

6. **Value range validation**: The editor property panel should ensure `min < max` and that `value` is within `[min, max]`. Out-of-range values should be automatically clamped.

7. **Style consistency with Slider**: Bar and Slider share the same background style in the LVGL default theme (`color_primary_muted` + circle), maintaining visual consistency.
