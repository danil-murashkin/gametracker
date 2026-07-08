# Textarea — Text Input Area

## 1. Component Name and Overview

**Textarea** is a multi-line text input component corresponding to LVGL's `lv_textarea` widget. Users can enter and edit text content within it, with support for placeholder hint text. In embedded UIs it is commonly used for form input, text editing, search boxes, and similar scenarios.

## 2. Component Type Identifier

```
type: 'textarea'
```

## 3. Category

| Category ID | Category Name | Icon |
|---------|---------|------|
| `input` | Input | ✏️ |

Component panel icon: 📝

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 150 |
| defaultHeight | 80 |

## 5. Is Container

```
isContainer: false
```

Textarea is not a container component and cannot contain child components.

## 6. Parent-Child Relationship Design

### Can be a child of the following components

- **Screen (screen root node)** — Placed directly on the page
- **Container (obj)** — Placed inside a generic container
- **Tab View (tabview)** — Placed in a tab page content area
- **Tile View (tileview)** — Placed in a tile area
- **Window (win)** — Placed in the window content area
- **Button (btn)** — Technically possible but not recommended

### Can contain the following child components

None. Textarea is a leaf node component and does not support nested child components.

## 7. Property Design (props)

| Property Name | Type | Default Value | Description |
|--------|------|--------|------|
| `text` | `string` | `''` | Text content in the text box. When empty, displays placeholder |
| `placeholder` | `string` | `'Enter text...'` | Placeholder hint text, displayed in gray when text is empty |
| `fontSize` | `number` | `14` | Text font size (optional, maps to built-in Montserrat font sizes) |
| `fontResource` | `string` | `undefined` | Custom font resource name (optional, takes priority over fontSize). Font must be uploaded in the resource manager and sizes configured first |
| `maxLength` | `number` | `undefined` | Maximum input character limit; no limit if not set |
| `password` | `boolean` | `false` | Whether password mode is enabled; when on, input is displayed as dots |
| `oneLine` | `boolean` | `false` | Whether single-line mode is enabled; when on, line breaks are disabled |

### Font Selection Notes

The property panel provides a font selection dropdown supporting:
- **Default**: Uses LVGL default font
- **Built-in fonts**: Built-in Montserrat fonts such as montserrat_14 ~ montserrat_32
- **Uploaded fonts**: Custom fonts (TTF/OTF) uploaded by the user in the resource manager

When a custom font is selected, the font size dropdown only shows sizes configured for that font (because custom fonts are compiled per size). When a built-in font is selected, all available built-in font sizes are shown.

When `fontResource` is set, the code generator outputs `lv_obj_set_style_text_font(obj, &{fontResource}_{fontSize}, 0)`; otherwise it uses the built-in `lv_font_montserrat_{fontSize}`.

### Property Definition (componentDefinitions.ts)

```typescript
defaultProps: { text: '', placeholder: 'Enter text...' }
```

## 8. Style Design (styles)

### Supported Style States

| State | Selector | Description |
|------|--------|------|
| `default` | `LV_STATE_DEFAULT` | Default state |
| `pressed` | `LV_STATE_PRESSED` | Pressed state (on touch/click) |
| `focused` | `LV_STATE_FOCUSED` | Focused state (keyboard navigation or click activation) |
| `disabled` | `LV_STATE_DISABLED` | Disabled state |

### Default Style (default state)

Uses LVGL default theme **card style** (white background + gray border), consistent with dropdown, chart, table, and other components.

| Style Property | Type | Default Value | Description |
|----------|------|--------|------|
| `bgColor` | `string` | `'#ffffff'` | Background color, card-style white |
| `borderColor` | `string` | `'#E0E0E0'` | Border color, LVGL color_grey |
| `borderWidth` | `number` | `2` | Border width |
| `borderRadius` | `number` | `8` | Corner radius |
| `textColor` | `string` | `'#212121'` | Text color, LVGL color_text |
| `opacity` | `number` | `1` | Opacity (0~1) |
| `padding` | `number` | `10` | Padding, corresponds to LVGL pad_small |

### Recommended focused State Style

```typescript
focused: {
  borderColor: '#2196F3',  // Border changes to theme color when focused
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
| `LV_EVENT_VALUE_CHANGED` | Triggered when text content changes |
| `LV_EVENT_FOCUSED` | Triggered when focus is gained |
| `LV_EVENT_DEFOCUSED` | Triggered when focus is lost |
| `LV_EVENT_READY` | Triggered when the user presses Enter/confirm (commonly used in single-line mode) |
| `LV_EVENT_CANCEL` | Triggered when the user cancels input |
| `LV_EVENT_CLICKED` | Triggered on click |
| `LV_EVENT_PRESSED` | Triggered on press |
| `LV_EVENT_RELEASED` | Triggered on release |

The most commonly used events are `LV_EVENT_VALUE_CHANGED` (listen for text changes) and `LV_EVENT_READY` (listen for input completion).

## 10. UI Layer Design

### Editor Canvas Rendering (CanvasComponent.tsx)

In the editor canvas, Textarea renders as a bordered rectangular area displaying text or placeholder:

```tsx
<div className="lvgl-textarea" style={{
  width: '100%',
  height: '100%',
  fontSize: '12px',
  color: '#999',
  backgroundColor: resolvedBgColor,
  border: !defaultStyle.borderWidth ? '1px solid #cccccc' : undefined,
  borderRadius: defaultStyle.borderRadius || 4,
  padding: '6px 8px',
  boxSizing: 'border-box',
}}>
  {props.text || props.placeholder || 'Enter text...'}
</div>
```

- When `text` is empty, displays `placeholder` with gray text color `#999`
- Background color uses `resolvedBgColor`, ensuring visibility on the canvas (falls back to `#ffffff` when transparent)
- Not interactively editable; visual preview only

### Simple Preview Rendering (PreviewPanel.tsx — Canvas 2D)

Drawn on Canvas 2D using the `drawTextarea` function:

```typescript
function drawTextarea(ctx, x, y, w, h, opts) {
  // 1. Draw background rectangle (supports gradient)
  ctx.fillStyle = opts.gradientFill || opts.bgColor;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  ctx.stroke();

  // 2. Draw text or placeholder
  const displayText = opts.text || opts.placeholder;
  ctx.fillStyle = opts.text ? opts.textColor : '#999';
  ctx.fillText(displayText, x + 8, y + 8);
}
```

- Supports background gradient (bgGradDir / bgGradColor)
- Renders with textColor when text is present, gray when rendering placeholder

### LVGL WASM Preview Rendering (ui_from_json.c)

Passed to the WASM side via JSON serialization, creating a real LVGL widget via the `create_textarea` function:

```c
static lv_obj_t *create_textarea(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *ta = lv_textarea_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *text = cjson_get_string(props, "text");
        if (text && text[0]) lv_textarea_set_text(ta, text);
        const char *ph = cjson_get_string(props, "placeholder");
        if (ph) lv_textarea_set_placeholder_text(ta, ph);
    }
    return ta;
}
```

JSON data is generated by the `flattenTree` function in `editorStateToJson.ts`, flattening the component tree while preserving parent references.

### Code Generation Output (ui.c.ts)

```c
// Create textarea: my_textarea
my_textarea = lv_textarea_create(parent);
lv_obj_set_pos(my_textarea, 10, 20);
lv_obj_set_size(my_textarea, 150, 80);

// Styles
lv_obj_set_style_bg_color(my_textarea, lv_color_hex(0xffffff), 0);
lv_obj_set_style_bg_opa(my_textarea, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(my_textarea, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(my_textarea, 2, 0);
lv_obj_set_style_radius(my_textarea, 8, 0);
lv_obj_set_style_text_color(my_textarea, lv_color_hex(0x212121), 0);
lv_obj_set_style_pad_all(my_textarea, 10, 0);

// Props
lv_textarea_set_placeholder_text(my_textarea, "Enter text...");
lv_textarea_set_text(my_textarea, "Hello");
```

Supported extended property code generation:
- `maxLength` → `lv_textarea_set_max_length()`
- `password` → `lv_textarea_set_password_mode()`
- `oneLine` → `lv_textarea_set_one_line()` (v8) / `lv_textarea_set_max_line(, 1)` (v9)

## 11. LVGL API Mapping

### Creation Function

| LVGL Version | Function |
|-----------|------|
| v8 / v9 | `lv_textarea_create(parent)` |

### Key APIs

| API Function | Description |
|----------|------|
| `lv_textarea_set_text(ta, text)` | Set text content |
| `lv_textarea_set_placeholder_text(ta, text)` | Set placeholder text |
| `lv_textarea_get_text(ta)` | Get current text |
| `lv_textarea_set_max_length(ta, len)` | Set maximum character count |
| `lv_textarea_set_password_mode(ta, en)` | Set password mode |
| `lv_textarea_set_one_line(ta, en)` | Set single-line mode (v8) |
| `lv_textarea_set_max_line(ta, n)` | Set maximum lines (v9; pass 1 for single-line) |
| `lv_textarea_add_char(ta, c)` | Append a single character |
| `lv_textarea_add_text(ta, text)` | Append text |
| `lv_textarea_del_char(ta)` | Delete character before cursor |
| `lv_textarea_set_cursor_pos(ta, pos)` | Set cursor position |

### Style Parts

| Part | Description |
|------|------|
| `LV_PART_MAIN` | Text area body (background, border) |
| `LV_PART_TEXTAREA_PLACEHOLDER` | Placeholder text style |
| `LV_PART_CURSOR` | Cursor style |
| `LV_PART_SCROLLBAR` | Scrollbar style |

## 12. Design Notes

1. **Keyboard integration**: On embedded devices, Textarea typically needs to be used with a virtual keyboard (`lv_keyboard`). The editor does not currently generate keyboard association code; users must handle this manually in `ui_events.c`.

2. **Placeholder color**: LVGL placeholder text color is set via the `LV_PART_TEXTAREA_PLACEHOLDER` part. The editor canvas uses fixed gray `#999` to simulate this, consistent with LVGL default behavior.

3. **Cursor not visible**: The cursor is not rendered in the editor canvas or simple preview; only the WASM preview renders the cursor natively via LVGL.

4. **Multi-line vs single-line**: Defaults to multi-line mode. When `oneLine` is true, the component behaves like a single-line input; height is recommended at 36~40px.

5. **Scroll behavior**: When text exceeds the visible area, LVGL automatically enables scrolling. The editor canvas simulates clipping via `overflow: hidden`.

6. **Password mode**: When password mode is enabled, LVGL replaces input characters with dots (`•`). The editor canvas does not simulate this behavior; it is only visible in WASM preview.

7. **Background color fallback**: In the editor canvas, if bgColor is set to transparent, it automatically falls back to `#ffffff`, ensuring the component is visible and interactive on the design canvas.

8. **Font limitations**: LVGL fonts are fixed at compile time; the fontSize property in the editor is for reference only. The corresponding font file must be enabled in the project.
