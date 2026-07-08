# Dropdown — Dropdown Select Box

## 1. Component Name and Overview

**Dropdown** is a dropdown selection component corresponding to LVGL's `lv_dropdown` widget. When clicked, it expands an option list from which the user selects one option. In embedded UIs it is commonly used for settings pages, form selection, mode switching, and similar scenarios.

## 2. Component Type Identifier

```
type: 'dropdown'
```

## 3. Category

| Category ID | Category Name | Icon |
|---------|---------|------|
| `input` | Input | ✏️ |

Component panel icon: 📋

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 120 |
| defaultHeight | 36 |

## 5. Is Container

```
isContainer: false
```

Dropdown is not a container component and cannot contain child components.

## 6. Parent-Child Relationship Design

### Can be a child of the following components

- **Screen (screen root node)** — Placed directly on the page
- **Container (obj)** — Placed inside a generic container
- **Tab View (tabview)** — Placed in a tab page content area
- **Tile View (tileview)** — Placed in a tile area
- **Window (win)** — Placed in the window content area
- **Button (btn)** — Technically possible but not recommended

### Can contain the following child components

None. Dropdown is a leaf node component and does not support nested child components.

## 7. Property Design (props)

| Property Name | Type | Default Value | Description |
|--------|------|--------|------|
| `options` | `string[]` | `['Option 1', 'Option 2', 'Option 3']` | Option list; each element is option text |
| `selected` | `number` | `0` | Index of the currently selected item (0-based) |
| `direction` | `string` | `undefined` | Dropdown direction: `'down'` (default) or `'up'` |
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
defaultProps: { options: ['Option 1', 'Option 2', 'Option 3'], selected: 0 }
```

## 8. Style Design (styles)

### Supported Style States

| State | Selector | Description |
|------|--------|------|
| `default` | `LV_STATE_DEFAULT` | Default state |
| `pressed` | `LV_STATE_PRESSED` | Pressed state |
| `focused` | `LV_STATE_FOCUSED` | Focused state |
| `disabled` | `LV_STATE_DISABLED` | Disabled state |

### Default Style (default state)

Uses LVGL default theme **card style**, consistent with textarea, chart, table, and other components.

| Style Property | Type | Default Value | Description |
|----------|------|--------|------|
| `bgColor` | `string` | `'#ffffff'` | Background color, card-style white |
| `borderColor` | `string` | `'#E0E0E0'` | Border color, LVGL color_grey |
| `borderWidth` | `number` | `2` | Border width |
| `borderRadius` | `number` | `8` | Corner radius |
| `textColor` | `string` | `'#212121'` | Text color, LVGL color_text |
| `opacity` | `number` | `1` | Opacity (0~1) |
| `padding` | `number` | `10` | Padding |

### Recommended focused State Style

```typescript
focused: {
  borderColor: '#2196F3',
  borderWidth: 2,
}
```

### Recommended disabled State Style

```typescript
disabled: {
  bgColor: '#F5F5F5',
  textColor: '#9E9E9E',
  opacity: 0.6,
}
```

## 9. Event Support

| LVGL Event Type | Description |
|--------------|------|
| `LV_EVENT_VALUE_CHANGED` | Triggered when the selected item changes (most common) |
| `LV_EVENT_CLICKED` | Triggered on click |
| `LV_EVENT_PRESSED` | Triggered on press |
| `LV_EVENT_RELEASED` | Triggered on release |
| `LV_EVENT_FOCUSED` | Triggered when focus is gained |
| `LV_EVENT_DEFOCUSED` | Triggered when focus is lost |
| `LV_EVENT_READY` | Triggered when selection is complete |
| `LV_EVENT_CANCEL` | Triggered when selection is cancelled |

The most commonly used event is `LV_EVENT_VALUE_CHANGED`, triggered after the user selects a new option.

## 10. UI Layer Design

### Editor Canvas Rendering (CanvasComponent.tsx)

In the editor canvas, Dropdown renders as a select box with a dropdown arrow, displaying the currently selected item text:

```tsx
<div className="lvgl-dropdown" style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  height: '100%',
  padding: '0 8px',
  backgroundColor: resolvedBgColor,
  border: !defaultStyle.borderWidth ? '1px solid #cccccc' : undefined,
  borderRadius: defaultStyle.borderRadius || 4,
  boxSizing: 'border-box',
  color: defaultStyle.textColor || '#333',
}}>
  <span>{props.options?.[props.selected || 0] || 'Select...'}</span>
  <span style={{ color: '#999', fontSize: '10px' }}>▼</span>
</div>
```

- Left side displays the currently selected item text
- Right side displays the dropdown arrow `▼`
- Not interactively expandable; visual preview only
- Background color falls back to `#ffffff` when transparent

### Simple Preview Rendering (PreviewPanel.tsx — Canvas 2D)

Drawn on Canvas 2D using the `drawDropdown` function:

```typescript
function drawDropdown(ctx, x, y, w, h, opts) {
  // 1. Draw background rectangle (supports gradient)
  ctx.fillStyle = opts.gradientFill || opts.bgColor;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  ctx.stroke();

  // 2. Draw selected item text
  const selectedText = opts.options[opts.selected] || 'Select...';
  ctx.fillStyle = opts.textColor;
  ctx.fillText(selectedText, x + 10, y + h / 2);

  // 3. Draw dropdown arrow (triangle)
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.moveTo(x + w - 20, y + h / 2 - 3);
  ctx.lineTo(x + w - 10, y + h / 2 - 3);
  ctx.lineTo(x + w - 15, y + h / 2 + 3);
  ctx.closePath();
  ctx.fill();
}
```

### LVGL WASM Preview Rendering (ui_from_json.c)

Passed to the WASM side via JSON, creating a real LVGL widget via the `create_dropdown` function:

```c
static lv_obj_t *create_dropdown(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *dd = lv_dropdown_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        // Join array options into a newline-separated string
        cJSON *options = cJSON_GetObjectItemCaseSensitive(props, "options");
        if (cJSON_IsArray(options)) {
            char buf[512] = {0};
            int first = 1;
            cJSON *opt;
            cJSON_ArrayForEach(opt, options) {
                if (cJSON_IsString(opt)) {
                    if (!first) strncat(buf, "\n", sizeof(buf) - strlen(buf) - 1);
                    strncat(buf, opt->valuestring, sizeof(buf) - strlen(buf) - 1);
                    first = 0;
                }
            }
            lv_dropdown_set_options(dd, buf);
        }
        int sel = cjson_get_int(props, "selected", 0);
        lv_dropdown_set_selected(dd, (uint32_t)sel);
    }
    return dd;
}
```

LVGL dropdown options use a single string separated by `\n` newlines; the WASM side must convert the JSON array to this format.

### Code Generation Output (ui.c.ts)

```c
// Create dropdown: my_dropdown
my_dropdown = lv_dropdown_create(parent);
lv_obj_set_pos(my_dropdown, 10, 20);
lv_obj_set_size(my_dropdown, 120, 36);

// Styles
lv_obj_set_style_bg_color(my_dropdown, lv_color_hex(0xffffff), 0);
lv_obj_set_style_bg_opa(my_dropdown, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(my_dropdown, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(my_dropdown, 2, 0);
lv_obj_set_style_radius(my_dropdown, 8, 0);
lv_obj_set_style_text_color(my_dropdown, lv_color_hex(0x212121), 0);
lv_obj_set_style_pad_all(my_dropdown, 10, 0);

// Props
lv_dropdown_set_options(my_dropdown, "Option 1\nOption 2\nOption 3");
lv_dropdown_set_selected(my_dropdown, 0);
```

The options array is joined with `\n` into a single C string during code generation. Supported extended properties:
- `direction` → `lv_dropdown_set_dir()`

## 11. LVGL API Mapping

### Creation Function

| LVGL Version | Function |
|-----------|------|
| v8 / v9 | `lv_dropdown_create(parent)` |

### Key APIs

| API Function | Description |
|----------|------|
| `lv_dropdown_set_options(dd, opts)` | Set option list (`\n`-separated string) |
| `lv_dropdown_add_option(dd, opt, pos)` | Insert option at specified position |
| `lv_dropdown_set_selected(dd, idx)` | Set selected item index |
| `lv_dropdown_get_selected(dd)` | Get current selected item index |
| `lv_dropdown_get_selected_str(dd, buf, len)` | Get current selected item text |
| `lv_dropdown_set_dir(dd, dir)` | Set dropdown direction (LV_DIR_BOTTOM / LV_DIR_TOP) |
| `lv_dropdown_open(dd)` | Programmatically open dropdown list |
| `lv_dropdown_close(dd)` | Programmatically close dropdown list |
| `lv_dropdown_set_text(dd, text)` | Set fixed display text (does not change with selection) |

### Style Parts

| Part | Description |
|------|------|
| `LV_PART_MAIN` | Dropdown body (button area in closed state) |
| `LV_PART_INDICATOR` | Dropdown arrow icon |
| `LV_PART_ITEMS` | Expanded option list items |
| `LV_PART_SELECTED` | Currently selected option item when expanded |
| `LV_PART_SCROLLBAR` | Option list scrollbar |

## 12. Design Notes

1. **Option format conversion**: The editor stores options internally as a `string[]` array, but the LVGL API uses a single `\n`-separated string. Both code generation and WASM preview require format conversion.

2. **Dropdown list layering**: When LVGL's dropdown expands, it creates a floating list managed as an independent object internally. The editor canvas and simple preview do not simulate the expanded state.

3. **Option count limit**: The WASM-side option concatenation buffer is 512 bytes; overly long option lists may be truncated. Recommended: no more than 50 characters per option, no more than 20 total options.

4. **Background color fallback**: In the editor canvas, if bgColor is set to transparent, it automatically falls back to `#ffffff`.

5. **Dropdown direction**: Expands downward by default. When the component is near the bottom of the screen, set `direction: 'up'` to avoid the list being clipped.

6. **Option list styling**: Expanded option list styling is controlled via `LV_PART_ITEMS` and `LV_PART_SELECTED`; the editor does not currently expose styling for these parts—add manually in generated code.

7. **Dynamic options**: To update options at runtime, `lv_dropdown_set_options()` replaces all options; `lv_dropdown_add_option()` adds options one at a time.

8. **Arrow rendering**: The editor canvas uses Unicode character `▼` to simulate the arrow, the simple preview uses a triangle path, and LVGL natively uses the `LV_SYMBOL_DOWN` symbol font. Visual appearance differs slightly across all three.
