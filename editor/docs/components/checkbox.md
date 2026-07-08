# Checkbox — Checkbox

## 1. Component Name and Overview

**Checkbox** is a checkbox component corresponding to LVGL's `lv_checkbox` widget. It consists of a checkable square marker and a text label; clicking toggles checked/unchecked state. In embedded UIs it is commonly used for settings toggles, multi-select lists, terms agreement, and similar scenarios.

## 2. Component Type Identifier

```
type: 'checkbox'
```

## 3. Category

| Category ID | Category Name | Icon |
|---------|---------|------|
| `input` | Input | ✏️ |

Component panel icon: ☑️

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 120 |
| defaultHeight | 28 |

## 5. Is Container

```
isContainer: false
```

Checkbox is not a container component and cannot contain child components.

## 6. Parent-Child Relationship Design

### Can be a child of the following components

- **Screen (screen root node)** — Placed directly on the page
- **Container (obj)** — Placed inside a generic container (most common usage: multiple checkboxes in a container form an option group)
- **Tab View (tabview)** — Placed in a tab page content area
- **Tile View (tileview)** — Placed in a tile area
- **Window (win)** — Placed in the window content area

### Can contain the following child components

None. Checkbox is a leaf node component and does not support nested child components.

## 7. Property Design (props)

| Property Name | Type | Default Value | Description |
|--------|------|--------|------|
| `text` | `string` | `'Checkbox'` | Text label beside the checkbox |
| `checked` | `boolean` | `false` | Whether checked. When checked, marker fills with theme color and shows a checkmark |
| `fontSize` | `number` | `14` | Text font size (optional, maps to built-in Montserrat font sizes) |
| `fontResource` | `string` | `undefined` | Custom font resource name (optional, takes priority over fontSize). Font must be uploaded in the resource manager and sizes configured first |

### Font Selection Notes

The property panel provides a font selection dropdown supporting:
- **Default**: Uses LVGL default font
- **Built-in fonts**: Built-in Montserrat fonts such as montserrat_14 ~ montserrat_32
- **Uploaded fonts**: Custom fonts (TTF/OTF) uploaded by the user in the resource manager

When a custom font is selected, the font size dropdown only shows sizes configured for that font (because custom fonts are compiled per size). When a built-in font is selected, all available built-in font sizes are shown.

When `fontResource` is set, the code generator outputs `lv_obj_set_style_text_font(obj, &{fontResource}_{fontSize}, 0)`; otherwise it uses the built-in `lv_font_montserrat_{fontSize}`.

### Property Definition (componentDefinitions.ts)

```typescript
defaultProps: { text: 'Checkbox', checked: false }
```

## 8. Style Design (styles)

### Supported Style States

| State | Selector | Description |
|------|--------|------|
| `default` | `LV_STATE_DEFAULT` | Default unchecked state |
| `pressed` | `LV_STATE_PRESSED` | Pressed state |
| `focused` | `LV_STATE_FOCUSED` | Focused state |
| `disabled` | `LV_STATE_DISABLED` | Disabled state |

Note: `LV_STATE_CHECKED` is a built-in LVGL state set via `lv_obj_add_state`; it is not configured separately in the editor style panel.

### Default Style (default state)

Checkbox overall background is transparent; border color is theme color (for marker), consistent with LVGL default theme behavior.

| Style Property | Type | Default Value | Description |
|----------|------|--------|------|
| `bgColor` | `string` | `'transparent'` | Overall background transparent |
| `borderColor` | `string` | `'#2196F3'` | Border color, LVGL color_primary (for marker border) |
| `borderWidth` | `number` | `2` | Border width |
| `borderRadius` | `number` | `4` | Corner radius (marker corner radius) |
| `textColor` | `string` | `'#212121'` | Text color |
| `opacity` | `number` | `1` | Opacity |
| `padding` | `number` | `10` | Padding (spacing reference between marker and text) |

### Recommended disabled State Style

```typescript
disabled: {
  textColor: '#9E9E9E',
  borderColor: '#BDBDBD',
  opacity: 0.6,
}
```

## 9. Event Support

| LVGL Event Type | Description |
|--------------|------|
| `LV_EVENT_VALUE_CHANGED` | Triggered when checked state changes (most common) |
| `LV_EVENT_CLICKED` | Triggered on click |
| `LV_EVENT_PRESSED` | Triggered on press |
| `LV_EVENT_RELEASED` | Triggered on release |
| `LV_EVENT_FOCUSED` | Triggered when focus is gained |
| `LV_EVENT_DEFOCUSED` | Triggered when focus is lost |

The most commonly used event is `LV_EVENT_VALUE_CHANGED`, triggered after the user toggles checked state. Current state can be obtained via `lv_obj_has_state(cb, LV_STATE_CHECKED)`.

## 10. UI Layer Design

### Editor Canvas Rendering (CanvasComponent.tsx)

In the editor canvas, Checkbox renders as a horizontal layout of square marker + text label:

```tsx
<div className="lvgl-checkbox" style={{
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: defaultStyle.textColor || '#333',
}}>
  <div style={{
    width: '16px',
    height: '16px',
    border: '2px solid #666',
    borderRadius: '2px',
    backgroundColor: props.checked ? '#2196F3' : '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }}>
    {props.checked && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
  </div>
  <span style={{ fontSize: 13 }}>{props.text || 'Checkbox'}</span>
</div>
```

- When checked, marker background becomes theme blue `#2196F3`, showing white checkmark `✓`
- When unchecked, marker is white background + gray border
- Overall background transparent; stays transparent on canvas (no fallback)

### Simple Preview Rendering (PreviewPanel.tsx — Canvas 2D)

Drawn on Canvas 2D using the `drawCheckbox` function:

```typescript
function drawCheckbox(ctx, x, y, w, h, opts) {
  const boxSize = 18;
  const boxY = y + (h - boxSize) / 2;

  // 1. Draw square marker
  ctx.fillStyle = opts.checked ? '#2196f3' : '#fff';
  roundRect(ctx, x, boxY, boxSize, boxSize, 3);
  ctx.fill();
  ctx.stroke();

  // 2. Draw checkmark when selected
  if (opts.checked) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, boxY + boxSize / 2);
    ctx.lineTo(x + boxSize / 2 - 1, boxY + boxSize - 5);
    ctx.lineTo(x + boxSize - 4, boxY + 5);
    ctx.stroke();
  }

  // 3. Draw text label
  ctx.fillStyle = opts.textColor;
  ctx.fillText(opts.text, x + boxSize + 8, y + h / 2);
}
```

### LVGL WASM Preview Rendering (ui_from_json.c)

Passed to the WASM side via JSON, creating a real LVGL widget via the `create_checkbox` function:

```c
static lv_obj_t *create_checkbox(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *cb = lv_checkbox_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *text = cjson_get_string(props, "text");
        if (text) lv_checkbox_set_text(cb, text);
        int checked = cjson_get_bool(props, "checked", 0);
        if (checked) lv_obj_add_state(cb, LV_STATE_CHECKED);
    }
    return cb;
}
```

### Code Generation Output (ui.c.ts)

```c
// Create checkbox: my_checkbox
my_checkbox = lv_checkbox_create(parent);
lv_obj_set_pos(my_checkbox, 10, 20);
lv_obj_set_size(my_checkbox, 120, 28);

// Styles
lv_obj_set_style_bg_opa(my_checkbox, LV_OPA_TRANSP, 0);
lv_obj_set_style_border_color(my_checkbox, lv_color_hex(0x2196F3), 0);
lv_obj_set_style_border_width(my_checkbox, 2, 0);
lv_obj_set_style_radius(my_checkbox, 4, 0);
lv_obj_set_style_text_color(my_checkbox, lv_color_hex(0x212121), 0);
lv_obj_set_style_pad_all(my_checkbox, 10, 0);

// Props
lv_checkbox_set_text(my_checkbox, "Checkbox");
lv_obj_add_state(my_checkbox, LV_STATE_CHECKED);  // Generated only when checked=true
```

## 11. LVGL API Mapping

### Creation Function

| LVGL Version | Function |
|-----------|------|
| v8 / v9 | `lv_checkbox_create(parent)` |

### Key APIs

| API Function | Description |
|----------|------|
| `lv_checkbox_set_text(cb, text)` | Set text label |
| `lv_checkbox_get_text(cb)` | Get text label |
| `lv_obj_add_state(cb, LV_STATE_CHECKED)` | Set checked state |
| `lv_obj_clear_state(cb, LV_STATE_CHECKED)` | Clear checked state |
| `lv_obj_has_state(cb, LV_STATE_CHECKED)` | Query whether checked |
| `lv_obj_add_state(cb, LV_STATE_DISABLED)` | Set disabled state |

### Style Parts

| Part | Description |
|------|------|
| `LV_PART_MAIN` | Overall area (background, text) |
| `LV_PART_INDICATOR` | Square marker area |

Marker styling (background color when checked, border color, etc.) is controlled via `LV_PART_INDICATOR` with state selectors:
- `LV_PART_INDICATOR | LV_STATE_DEFAULT` — Marker style when unchecked
- `LV_PART_INDICATOR | LV_STATE_CHECKED` — Marker style when checked

## 12. Design Notes

1. **Checked state management**: Checkbox checked state is managed via LVGL's `LV_STATE_CHECKED` state flag, not as an independent property. The editor maps `props.checked` boolean to this state.

2. **Marker style independence**: In LVGL, marker (square) styling is controlled via the `LV_PART_INDICATOR` part, independent of `LV_PART_MAIN`. The editor's `borderColor` and `borderRadius` primarily affect marker visual appearance.

3. **Transparent background**: Checkbox defaults to transparent background, which is LVGL standard behavior. The editor canvas keeps it transparent with no background fallback, so it may be less visible on light backgrounds.

4. **Text position**: In LVGL, text is always to the right of the marker; custom positioning is not supported. All three editor rendering layers follow this layout.

5. **Combined usage**: Multiple Checkboxes are typically placed in a Container (obj) with Flex layout for vertical option groups. The editor supports this pattern but users must manually configure container layout.

6. **Size auto-fit**: Checkbox actual width depends on text length. Default width 120px suits short text; longer text may need manual width adjustment or `widthMode: 'content'`.

7. **Touch area**: On embedded devices, the entire Checkbox area (including text) is clickable, not just the marker. Clicking anywhere on the component area selects it in the editor canvas.

8. **No checkable flag**: Unlike Button, Checkbox does not require manually setting `LV_OBJ_FLAG_CHECKABLE`; LVGL handles this internally.
