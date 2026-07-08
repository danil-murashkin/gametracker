# Label (label) — Component Design Document

## 1. Component Name and Overview

Label is the most fundamental text display component in the LVGL editor. Labels show static or dynamic text on the UI and are one of the core building blocks. In LVGL, a label object (`lv_label`) has a transparent background by default and only displays text. It supports long-text modes (wrap, scroll, ellipsis, clip).

A label is not a container component (`isContainer = false`) and cannot contain child components.

## 2. Component Type Identifier

```
type: 'label'
```

## 3. Category

| Field | Value |
|-------|-------|
| Category ID | `basic` |
| Category Name | Basic |
| Category Icon | 📦 |
| Component Icon | 🏷️ |

## 4. Default Size

| Property | Value |
|----------|-------|
| defaultWidth | 80 |
| defaultHeight | 24 |

## 5. Is Container

```
isContainer: false
```

A label is a display-only component and cannot contain child components.

## 6. Parent-Child Relationship Design

### Can Be a Child Of

- **Screen (root node)** — Placed directly on the page
- **Button (btn)** — As additional text on a button (the button already has a built-in label)
- **Container (obj)** — Placed inside a generic container
- **Tab View (tabview)** — Placed in a tab page content area
- **Tile View (tileview)** — Placed in a tile area
- **Window (win)** — Placed in the window content area

### Can Contain Child Components

None. A label is not a container and cannot contain any child components.

## 7. Property Design (props)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `text` | `string` | `'Label'` | Text displayed by the label |
| `longMode` | `string` | `undefined` | Long-text mode: `'wrap'` / `'scroll'` / `'dot'` / `'clip'` |
| `fontSize` | `number` | `14` | Font size (optional) |
| `textAlign` | `string` | `undefined` | Text alignment: `'left'` / `'center'` / `'right'` |
| `fontResource` | `string` | `undefined` | Custom font resource name (optional; takes priority over `fontSize`). Requires uploading the font in the resource manager and configuring sizes |

### Font Selection Notes

The property panel provides a font selection dropdown supporting:
- **Default**: LVGL default font
- **Built-in fonts**: Built-in Montserrat fonts such as montserrat_14 ~ montserrat_32
- **Uploaded fonts**: Custom fonts uploaded by the user in the resource manager (TTF/OTF)

When a custom font is selected, the font size dropdown only shows sizes configured for that font (custom fonts are compiled per size). When a built-in font is selected, all available built-in font sizes are shown.

When `fontResource` is set, the code generator outputs `lv_obj_set_style_text_font(obj, &{fontResource}_{fontSize}, 0)`; otherwise it uses the built-in `lv_font_montserrat_{fontSize}`.

### props Type Definition

```typescript
interface LabelProps {
  text: string;
  longMode?: 'wrap' | 'scroll' | 'dot' | 'clip';
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontResource?: string;
}
```

## 8. Style Design (styles)

### Supported Style States

| State | Selector | Description |
|-------|----------|-------------|
| `default` | `LV_STATE_DEFAULT` | Default/normal state |
| `pressed` | `LV_STATE_PRESSED` | Pressed state (labels usually do not respond to press, but styles can be set) |
| `focused` | `LV_STATE_FOCUSED` | Focused state |
| `disabled` | `LV_STATE_DISABLED` | Disabled state |

### Default State Styles

| Style Property | Type | Default | Description |
|----------------|------|---------|-------------|
| `bgColor` | `string` | `'transparent'` | Background color (transparent; `bg_opa = LV_OPA_TRANSP` in LVGL) |
| `borderColor` | `string` | `'transparent'` | Border color (no border) |
| `borderWidth` | `number` | `0` | Border width |
| `borderRadius` | `number` | `0` | Corner radius |
| `textColor` | `string` | `'#212121'` | Text color (LVGL theme `color_text` = `lv_palette_darken(GREY, 4)`) |
| `opacity` | `number` | `1` | Opacity |
| `padding` | `number` | `0` | Padding |

### Style Source Notes

Default label styles come from the LVGL default theme:
- Transparent background (`bg_opa = LV_OPA_TRANSP`)
- Text color inherited from parent or uses `color_text` (`#212121`)
- No border, no corner radius, no padding

### Extended Style Properties

Labels support the following common extended styles (inherited from `StyleProps`):

- Shadow: `shadowColor`, `shadowWidth`, `shadowOffsetX`, `shadowOffsetY`, `shadowSpread`, `shadowOpacity`
- Gradient: `bgGradColor`, `bgGradDir`, `bgGradStop`
- Outline: `outlineColor`, `outlineWidth`, `outlinePad`
- Transform: `transformAngle`, `transformZoomX`, `transformZoomY`, `transformPivotX`, `transformPivotY`
- Per-side padding: `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`
- Text decoration: `textDecor` (`'none'` / `'underline'` / `'strikethrough'`)
- Font: `textFont`, `textFontSize`, `textLetterSpace`, `textLineSpace`
- Blend mode: `blendMode`

## 9. Event Support

Labels support the following LVGL event types:

| Event Type | Description |
|------------|-------------|
| `LV_EVENT_CLICKED` | Click event |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_FOCUSED` | Focus gained |
| `LV_EVENT_DEFOCUSED` | Focus lost |

> Note: Labels are not clickable by default (`LV_OBJ_FLAG_CLICKABLE` is not set). To respond to click events, set `clickable = true` via flags.

## 10. UI Layer Design

### 10.1 Editor Canvas Rendering (CanvasComponent.tsx)

In the editor canvas, labels are rendered with React DOM:

```tsx
<span className="lvgl-label" style={{
  color: defaultStyle.textColor || '#333333',
  fontSize: props.fontSize || 13,
}}>
  {props.text || 'Label'}
</span>
```

Key behavior:
- Uses a `<span>` element to display text directly
- Background stays transparent (`resolvedBgColor` returns `'transparent'` for label type)
- Text color and font size are mapped directly
- Supports selection highlight, hover effects, drag, and resize handles
- Supports `textDecor` text decoration (via outer `textDecoration` CSS property)

### 10.2 Simple Preview Rendering (PreviewPanel.tsx)

In the Canvas 2D simple preview, labels are drawn with the `drawLabel()` function:

```typescript
drawLabel(ctx, x, y, w, h, {
  text: comp.props.text || 'Label',
  textColor,
  fontSize: comp.props.fontSize || 14,
  textDecor: styles.textDecor,
});
```

Key behavior:
- Uses Canvas 2D `fillText` to draw text
- Text alignment: `textAlign = 'left'`, `textBaseline = 'top'`
- No background rectangle is drawn (transparent background)
- Supports text decoration (underline/strikethrough)
- Supports animation state overlays

### 10.3 LVGL WASM Preview Rendering

#### JSON Serialization (editorStateToJson.ts)

Labels are serialized as flattened JSON component nodes:

```json
{
  "type": "label",
  "id": "comp-xxx",
  "parent": null,
  "x": 10, "y": 10,
  "width": 80, "height": 24,
  "props": { "text": "Label" },
  "styles": {
    "default": {
      "bgColor": "transparent",
      "borderColor": "transparent",
      "borderWidth": 0,
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
static lv_obj_t *create_label(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *lbl = lv_label_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *text = cjson_get_string(props, "text");
        if (text) lv_label_set_text(lbl, text);
    }
    return lbl;
}
```

Key behavior:
- Calls `lv_label_create()` to create the label
- Reads `props.text` and sets the text
- Applies position, size, and styles
- When `bgColor = "transparent"` in styles, sets `lv_obj_set_style_bg_opa(obj, LV_OPA_TRANSP, sel)`

### 10.4 Code Generation Output (ui.c.ts)

```c
// Create label: my_label
my_label = lv_label_create(parent);
lv_obj_set_pos(my_label, 10, 10);
lv_obj_set_size(my_label, 80, 24);
lv_obj_set_style_bg_opa(my_label, LV_OPA_TRANSP, 0);
lv_obj_set_style_text_color(my_label, lv_color_hex(0x212121), 0);
lv_label_set_text(my_label, "Label");
```

Key behavior:
- Creation uses `lv_label_create`
- Text is set directly on the label object (`lv_label_set_text`)
- Supports mapping `longMode` to `lv_label_set_long_mode`
- Supports mapping `fontSize` to `lv_obj_set_style_text_font` (using built-in Montserrat fonts)
- Supports mapping `textAlign` to `lv_obj_set_style_text_align`
- Custom font resources (`fontResource`) take priority over `fontSize`

## 11. LVGL API Mapping

### Creation Function

| Version | API |
|---------|-----|
| LVGL v9 | `lv_label_create(parent)` |
| LVGL v8 | `lv_label_create(parent)` |

### Key APIs

| API | Description |
|-----|-------------|
| `lv_label_create(parent)` | Create a label |
| `lv_label_set_text(label, text)` | Set text content |
| `lv_label_set_long_mode(label, mode)` | Set long-text mode |
| `lv_obj_set_pos(label, x, y)` | Set position |
| `lv_obj_set_size(label, w, h)` | Set size |
| `lv_obj_set_style_text_color(label, color, sel)` | Set text color |
| `lv_obj_set_style_text_font(label, font, sel)` | Set font |
| `lv_obj_set_style_text_align(label, align, sel)` | Set text alignment |
| `lv_obj_set_style_text_letter_space(label, space, sel)` | Set letter spacing |
| `lv_obj_set_style_text_line_space(label, space, sel)` | Set line spacing |
| `lv_obj_set_style_text_decor(label, decor, sel)` | Set text decoration |
| `lv_obj_set_style_bg_opa(label, LV_OPA_TRANSP, sel)` | Set transparent background |

### Long-Text Mode Constants

| Mode | LVGL Constant | Description |
|------|---------------|-------------|
| `wrap` | `LV_LABEL_LONG_WRAP` | Automatic line wrap |
| `scroll` | `LV_LABEL_LONG_SCROLL` | Horizontal scroll |
| `dot` | `LV_LABEL_LONG_DOT` | Trailing ellipsis |
| `clip` | `LV_LABEL_LONG_CLIP` | Clip overflow |

## 12. Design Notes

1. **Transparent background**: Labels have a transparent background by default, implemented in LVGL via `bg_opa = LV_OPA_TRANSP`. The editor canvas renders them transparently with no visibility fallback (unlike buttons).

2. **Text color inheritance**: In LVGL, label text color can be inherited from the parent. The editor defaults to `#212121` (LVGL theme `color_text`), but runtime appearance may differ due to parent styles.

3. **Size vs. text**: The default label size (80×24) is a fixed value. In real LVGL usage, label size is often determined by text content (`LV_SIZE_CONTENT`). The editor supports `widthMode` / `heightMode` set to `'content'` to simulate this behavior.

4. **Long-text mode**: When text exceeds the label size, `longMode` controls handling. It is unset by default (LVGL default is `LV_LABEL_LONG_WRAP`). Code generation only emits it when explicitly set by the user.

5. **Font size limits**: LVGL font sizes are determined at compile time. During code generation, `fontSize` maps to built-in Montserrat fonts (e.g. `lv_font_montserrat_14`). If the requested size has no compiled font, a comment is generated as a hint.

6. **Not clickable by default**: Labels are not clickable by default. To respond to events, set `clickable = true` in flags; code generation then outputs `lv_obj_add_flag(label, LV_OBJ_FLAG_CLICKABLE)`.

7. **C string escaping**: Text content is processed with `escapeCString()` during code generation so special characters (quotes, backslashes, newlines, etc.) are escaped correctly.

8. **Cross-page naming conflicts**: Like buttons, labels with the same name on multiple pages automatically receive a page name prefix.
