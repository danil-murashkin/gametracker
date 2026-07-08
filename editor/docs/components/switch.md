# Switch — Toggle Switch

## 1. Component Name and Overview

**Switch** is a toggle switch component corresponding to LVGL's `lv_switch` widget. It provides a sliding on/off control; users can click or slide to toggle state. In embedded UIs it is commonly used for feature toggles, mode switching, WiFi/Bluetooth switches, and similar scenarios.

## 2. Component Type Identifier

```
type: 'switch'
```

## 3. Category

| Category ID | Category Name | Icon |
|---------|---------|------|
| `input` | Input | ✏️ |

Component panel icon: 🔀

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 50 |
| defaultHeight | 26 |

## 5. Is Container

```
isContainer: false
```

Switch is not a container component and cannot contain child components.

## 6. Parent-Child Relationship Design

### Can be a child of the following components

- **Screen (screen root node)** — Placed directly on the page
- **Container (obj)** — Placed inside a generic container (common usage: paired with Label to form a settings item)
- **Tab View (tabview)** — Placed in a tab page content area
- **Tile View (tileview)** — Placed in a tile area
- **Window (win)** — Placed in the window content area

### Can contain the following child components

None. Switch is a leaf node component and does not support nested child components.

## 7. Property Design (props)

| Property Name | Type | Default Value | Description |
|--------|------|--------|------|
| `checked` | `boolean` | `false` | Whether in on state. When on, knob slides to the right and track becomes theme color |

### Property Definition (componentDefinitions.ts)

```typescript
defaultProps: { checked: false }
```

## 8. Style Design (styles)

### Supported Style States

| State | Selector | Description |
|------|--------|------|
| `default` | `LV_STATE_DEFAULT` | Default off state |
| `pressed` | `LV_STATE_PRESSED` | Pressed state |
| `focused` | `LV_STATE_FOCUSED` | Focused state |
| `disabled` | `LV_STATE_DISABLED` | Disabled state |

Note: `LV_STATE_CHECKED` is a built-in LVGL state applied automatically when on.

### Default Style (default state)

When off, the track is gray with full rounded corners (pill shape).

| Style Property | Type | Default Value | Description |
|----------|------|--------|------|
| `bgColor` | `string` | `'#E0E0E0'` | Track background color (off state), LVGL color_grey |
| `borderColor` | `string` | `'transparent'` | Border color, no border by default |
| `borderWidth` | `number` | `0` | Border width |
| `borderRadius` | `number` | `9999` | Corner radius; 9999 means full rounded (pill shape) |
| `textColor` | `string` | `'#212121'` | Text color (Switch has no text; kept for consistency) |
| `opacity` | `number` | `1` | Opacity |
| `padding` | `number` | `0` | Padding |

### checked State in LVGL Theme

In the LVGL default theme, when Switch is on:
- Track background becomes `color_primary` (`#2196F3`)
- Knob stays white

The editor canvas dynamically switches colors via `props.checked` to simulate this behavior.

### Recommended disabled State Style

```typescript
disabled: {
  bgColor: '#F5F5F5',
  opacity: 0.5,
}
```

## 9. Event Support

| LVGL Event Type | Description |
|--------------|------|
| `LV_EVENT_VALUE_CHANGED` | Triggered when switch state changes (most common) |
| `LV_EVENT_CLICKED` | Triggered on click |
| `LV_EVENT_PRESSED` | Triggered on press |
| `LV_EVENT_RELEASED` | Triggered on release |
| `LV_EVENT_FOCUSED` | Triggered when focus is gained |
| `LV_EVENT_DEFOCUSED` | Triggered when focus is lost |

The most commonly used event is `LV_EVENT_VALUE_CHANGED`, triggered after the user toggles the switch. Current state can be obtained via `lv_obj_has_state(sw, LV_STATE_CHECKED)`.

## 10. UI Layer Design

### Editor Canvas Rendering (CanvasComponent.tsx)

In the editor canvas, Switch renders as a rounded track + circular knob:

```tsx
<div className="lvgl-switch" style={{
  width: '100%',
  height: '100%',
  borderRadius: defaultStyle.borderRadius || 13,
  backgroundColor: props.checked ? '#2196F3' : '#ccc',
  position: 'relative',
  minHeight: '20px',
}}>
  <div style={{
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    top: '50%',
    marginTop: '-10px',
    left: props.checked ? 'calc(100% - 23px)' : '3px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    transition: 'left 0.2s',
  }} />
</div>
```

- When on, track is blue `#2196F3`, knob slides to the right
- When off, track is gray `#ccc`, knob on the left
- Knob has shadow for depth
- Supports CSS transition animation (visible only in editor)

### Simple Preview Rendering (PreviewPanel.tsx — Canvas 2D)

Drawn on Canvas 2D using the `drawSwitch` function:

```typescript
function drawSwitch(ctx, x, y, w, h, opts) {
  const trackWidth = Math.min(w, 50);
  const trackHeight = 24;
  const trackX = x + (w - trackWidth) / 2;
  const trackY = y + (h - trackHeight) / 2;

  // 1. Draw track
  ctx.fillStyle = opts.checked ? '#4caf50' : '#ccc';
  roundRect(ctx, trackX, trackY, trackWidth, trackHeight, trackHeight / 2);
  ctx.fill();

  // 2. Draw knob
  const knobRadius = trackHeight / 2 - 2;
  const knobX = opts.checked
    ? trackX + trackWidth - knobRadius - 2
    : trackX + knobRadius + 2;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(knobX, trackY + trackHeight / 2, knobRadius, 0, Math.PI * 2);
  ctx.fill();
}
```

Note: The simple preview uses green `#4caf50` (Material Green) for the on state, slightly different from the canvas rendering blue.

### LVGL WASM Preview Rendering (ui_from_json.c)

Passed to the WASM side via JSON, creating a real LVGL widget via the `create_switch` function:

```c
static lv_obj_t *create_switch(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *sw = lv_switch_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int checked = cjson_get_bool(props, "checked", 0);
        if (checked) lv_obj_add_state(sw, LV_STATE_CHECKED);
    }
    return sw;
}
```

### Code Generation Output (ui.c.ts)

```c
// Create switch: my_switch
my_switch = lv_switch_create(parent);
lv_obj_set_pos(my_switch, 10, 20);
lv_obj_set_size(my_switch, 50, 26);

// Styles
lv_obj_set_style_bg_color(my_switch, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_bg_opa(my_switch, LV_OPA_COVER, 0);
lv_obj_set_style_radius(my_switch, 9999, 0);

// Props (generated only when checked=true)
lv_obj_add_state(my_switch, LV_STATE_CHECKED);
```

## 11. LVGL API Mapping

### Creation Function

| LVGL Version | Function |
|-----------|------|
| v8 / v9 | `lv_switch_create(parent)` |

### Key APIs

| API Function | Description |
|----------|------|
| `lv_switch_create(parent)` | Create switch widget |
| `lv_obj_add_state(sw, LV_STATE_CHECKED)` | Set on state |
| `lv_obj_clear_state(sw, LV_STATE_CHECKED)` | Set off state |
| `lv_obj_has_state(sw, LV_STATE_CHECKED)` | Query whether on |
| `lv_obj_add_state(sw, LV_STATE_DISABLED)` | Set disabled state |

Switch has no dedicated set/get functions; state is fully controlled via LVGL generic state management APIs.

### Style Parts

| Part | Description |
|------|------|
| `LV_PART_MAIN` | Track area |
| `LV_PART_INDICATOR` | Fill indicator (colored area when on) |
| `LV_PART_KNOB` | Knob (circular slider) |

Common style combinations:
- `LV_PART_MAIN | LV_STATE_DEFAULT` — Track style when off
- `LV_PART_INDICATOR | LV_STATE_CHECKED` — Indicator color when on
- `LV_PART_KNOB` — Knob size, color, shadow

## 12. Design Notes

1. **No text property**: Unlike Checkbox, Switch does not include a text label. To show descriptive text beside it, use a Label component, typically arranged horizontally in the same Container.

2. **State management**: Switch on/off state, like Checkbox, is managed via `LV_STATE_CHECKED`. The editor maps `props.checked` boolean to this state.

3. **Full rounded design**: `borderRadius: 9999` ensures the track appears as a pill (capsule) shape, the standard Switch visual style. Changing this value affects overall appearance.

4. **Color inconsistency**: On-state colors differ slightly across the three rendering layers:
   - Editor canvas: `#2196F3` (blue)
   - Simple preview: `#4caf50` (green)
   - LVGL WASM: Depends on theme settings (default blue)
   
   Recommend unifying to theme color `#2196F3`.

5. **Size constraints**: Default size 50×26 is an optimized touch-friendly dimension. Too small makes the knob hard to see; recommend width ≥ 40px, height ≥ 20px.

6. **Knob shadow**: The editor canvas knob uses `boxShadow` for depth. In LVGL, similar effect can be achieved via shadow style properties on `LV_PART_KNOB`.

7. **Animation**: The editor canvas uses CSS `transition` to simulate knob slide animation. LVGL also supports state transition animation via `lv_obj_set_style_anim_time()`.

8. **No padding**: Switch default padding is 0 because internal layout (track + knob) is managed automatically by LVGL; no extra padding needed.
