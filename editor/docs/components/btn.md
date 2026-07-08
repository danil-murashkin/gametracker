# Button (btn) — Component Design Document

## 1. Component Name and Overview

Button is one of the most fundamental interactive components in the LVGL editor. Buttons trigger user actions and automatically include a centered text label. In LVGL, a button is a special container object (`lv_button`) with clickable behavior by default and built-in visual feedback for the pressed state.

A button is a container component (`isContainer = true`). In addition to its built-in text label, it can hold other child components (such as icons or extra labels) for more complex button layouts.

## 2. Component Type Identifier

```
type: 'btn'
```

## 3. Category

| Field | Value |
|-------|-------|
| Category ID | `basic` |
| Category Name | Basic |
| Category Icon | 📦 |
| Component Icon | 🔘 |

## 4. Default Size

| Property | Value |
|----------|-------|
| defaultWidth | 100 |
| defaultHeight | 40 |

## 5. Is Container

```
isContainer: true
```

A button is a container component. Although an internal `lv_label` is created automatically, users can drag other child components into the button.

## 6. Parent-Child Relationship Design

### Can Be a Child Of

- **Screen (root node)** — Placed directly on the page
- **Container (obj)** — Placed inside a generic container
- **Tab View (tabview)** — Placed in a tab page content area
- **Tile View (tileview)** — Placed in a tile area
- **Window (win)** — Placed in the window content area

### Can Contain Child Components

As a container, a button can contain:

- **Label (label)** — Additional text labels
- **Image (img)** — Icons/images
- **Line (line)** — Decorative lines
- **Spinner (spinner)** — Loading state indicator

> Note: When a button is created, a centered internal label is generated automatically to display `props.text`. That label is managed by the code generator and does not appear in the component tree. User-added child components are layered inside the button.

## 7. Property Design (props)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `text` | `string` | `'Button'` | Text displayed by the internal label |
| `fontSize` | `number` | `14` | Font size (optional; mapped to the internal label font size) |
| `textAlign` | `string` | `'center'` | Text alignment: `'left'` / `'center'` / `'right'` |
| `fontResource` | `string` | `undefined` | Custom font resource name (optional; takes priority over `fontSize`). Requires uploading the font in the resource manager and configuring sizes |

### Font Selection Notes

The property panel provides a font selection dropdown supporting:
- **Default**: LVGL default font
- **Built-in fonts**: Built-in Montserrat fonts such as montserrat_14 ~ montserrat_32
- **Uploaded fonts**: Custom fonts uploaded by the user in the resource manager (TTF/OTF)

When a custom font is selected, the font size dropdown only shows sizes configured for that font (custom fonts are compiled per size). When a built-in font is selected, all available built-in font sizes are shown.

When `fontResource` is set, the code generator outputs `lv_obj_set_style_text_font(label, &{fontResource}_{fontSize}, 0)`; otherwise it uses the built-in `lv_font_montserrat_{fontSize}`.

### props Type Definition

```typescript
interface BtnProps {
  text: string;
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
| `pressed` | `LV_STATE_PRESSED` | Pressed state |
| `focused` | `LV_STATE_FOCUSED` | Focused state (keyboard/encoder navigation) |
| `disabled` | `LV_STATE_DISABLED` | Disabled state |

### Default State Styles

| Style Property | Type | Default | Description |
|----------------|------|---------|-------------|
| `bgColor` | `string` | `'#2196F3'` | Background color (Material Blue 500, LVGL theme primary color) |
| `borderColor` | `string` | `'transparent'` | Border color (no border by default) |
| `borderWidth` | `number` | `0` | Border width |
| `borderRadius` | `number` | `8` | Corner radius |
| `textColor` | `string` | `'#ffffff'` | Text color (white) |
| `opacity` | `number` | `1` | Opacity (0~1) |
| `padding` | `number` | `10` | Padding (uniform on all sides) |

### Style Source Notes

Default button styles come from the LVGL default theme (`lv_theme_default.c`):
- Background color uses `color_primary` (`lv_palette_main(LV_PALETTE_BLUE)` = `#2196F3`)
- Text color uses white (`lv_color_white()`)
- No border (`border_width = 0`)
- 8px corner radius

### Extended Style Properties

Buttons also support the following common extended styles (inherited from `StyleProps`):

- Shadow: `shadowColor`, `shadowWidth`, `shadowOffsetX`, `shadowOffsetY`, `shadowSpread`, `shadowOpacity`
- Gradient: `bgGradColor`, `bgGradDir`, `bgGradStop`
- Outline: `outlineColor`, `outlineWidth`, `outlinePad`
- Transform: `transformAngle`, `transformZoomX`, `transformZoomY`, `transformPivotX`, `transformPivotY`
- Per-side padding: `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`
- Per-corner radius: `borderRadiusTopLeft`, `borderRadiusTopRight`, `borderRadiusBottomLeft`, `borderRadiusBottomRight`
- Border sides: `borderSide` (`'full'` / `'top'` / `'bottom'` / `'left'` / `'right'` / `'top_bottom'` / `'left_right'` / `'none'`)
- Text decoration: `textDecor` (`'none'` / `'underline'` / `'strikethrough'`)
- Blend mode: `blendMode` (`'normal'` / `'additive'` / `'subtractive'` / `'multiply'`)
- Font: `textFont`, `textFontSize`, `textLetterSpace`, `textLineSpace`

## 9. Event Support

Buttons support the following LVGL event types:

| Event Type | Description |
|------------|-------------|
| `LV_EVENT_CLICKED` | Click event (press and release) |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_VALUE_CHANGED` | Value changed event (when the button is set to checkable) |
| `LV_EVENT_FOCUSED` | Focus gained |
| `LV_EVENT_DEFOCUSED` | Focus lost |

### Event Handler Types

- **builtin**: Supports `navigate` (page navigation), `show`/`hide` (show/hide components), `enable`/`disable` (enable/disable components), `setText`, `setValue`, `setProperty`
- **custom**: User-written custom C code

## 10. UI Layer Design

### 10.1 Editor Canvas Rendering (CanvasComponent.tsx)

In the editor canvas, buttons are rendered with React DOM:

```tsx
<div className="lvgl-btn" style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  color: defaultStyle.textColor || '#ffffff',
  fontSize: props.fontSize || 13,
}}>
  {props.text || 'Button'}
</div>
```

Key behavior:
- Uses a `div` with flexbox to center text
- Background color is mapped directly to the outer container's `backgroundColor`
- Supports selection highlight, hover effects, drag, and resize handles
- Falls back to `#2196F3` when the background is transparent (ensures visibility on the canvas)
- Supports partial border rendering via `borderSide`
- Supports `textDecor` text decoration

### 10.2 Simple Preview Rendering (PreviewPanel.tsx)

In the Canvas 2D simple preview, buttons are drawn with the `drawButton()` function:

```typescript
drawButton(ctx, x, y, w, h, {
  bgColor: isHovered ? lightenColor(bgColorStyle, 20) : bgColorStyle,
  borderColor, borderWidth, borderRadius,
  text: comp.props.text || 'Button',
  textColor,
  gradientFill: isHovered ? undefined : getGradientFill(),
  textDecor: styles.textDecor,
  borderSide: styles.borderSide,
});
```

Key behavior:
- Uses Canvas 2D `roundRect` to draw a rounded rectangle background
- Text is centered (`textAlign: 'center'`, `textBaseline: 'middle'`)
- Background color lightens by 20% on hover
- Supports gradient fill, text decoration, and partial borders
- Supports animation state overlays (translation, scale, opacity)
- Supports shadow, transform (rotation/scale), and outline

### 10.3 LVGL WASM Preview Rendering

#### JSON Serialization (editorStateToJson.ts)

Buttons are serialized as flattened JSON component nodes:

```json
{
  "type": "btn",
  "id": "comp-xxx",
  "parent": null,
  "x": 50, "y": 50,
  "width": 100, "height": 40,
  "props": { "text": "Button" },
  "styles": {
    "default": {
      "bgColor": "#2196F3",
      "borderColor": "transparent",
      "borderWidth": 0,
      "borderRadius": 8,
      "textColor": "#ffffff",
      "opacity": 1,
      "padding": 10
    }
  }
}
```

#### C-Side Creation (ui_from_json.c)

```c
static lv_obj_t *create_btn(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *btn = lv_button_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *text = cjson_get_string(props, "text");
        if (text) {
            lv_obj_t *lbl = lv_label_create(btn);
            lv_label_set_text(lbl, text);
            lv_obj_center(lbl);
        }
    }
    return btn;
}
```

Key behavior:
- Calls `lv_button_create()` to create the button
- Reads `props.text`, automatically creates an internal `lv_label`, and centers it
- Applies position, size, and styles (including multi-state styles)
- Applies flags (hidden, clickable, scrollable)

### 10.4 Code Generation Output (ui.c.ts)

```c
// Create btn: my_button
my_button = lv_btn_create(parent);
lv_obj_set_pos(my_button, 50, 50);
lv_obj_set_size(my_button, 100, 40);
lv_obj_set_style_bg_color(my_button, lv_color_hex(0x2196F3), 0);
lv_obj_set_style_bg_opa(my_button, LV_OPA_COVER, 0);
lv_obj_set_style_radius(my_button, 8, 0);
lv_obj_set_style_text_color(my_button, lv_color_hex(0xFFFFFF), 0);
lv_obj_set_style_pad_all(my_button, 10, 0);

// Create label inside button
lv_obj_t *my_button_label = lv_label_create(my_button);
lv_label_set_text(my_button_label, "Button");
lv_obj_center(my_button_label);
```

Key behavior:
- Creation uses `lv_btn_create` (note: code generation uses `lv_btn_create`, WASM preview uses `lv_button_create`; both are equivalent in LVGL v9)
- Automatically generates internal label creation code
- Internal label variable name is `{varName}_label`
- Supports mapping `fontSize`, `textAlign`, and `fontResource` to the internal label
- Supports multi-state style output (pressed/focused/disabled use the corresponding `LV_STATE_*` selectors)
- Supports event binding code generation

## 11. LVGL API Mapping

### Creation Function

| Version | API |
|---------|-----|
| LVGL v9 | `lv_button_create(parent)` / `lv_btn_create(parent)` |
| LVGL v8 | `lv_btn_create(parent)` |

### Key APIs

| API | Description |
|-----|-------------|
| `lv_label_create(btn)` | Create a text label inside the button |
| `lv_label_set_text(label, text)` | Set label text |
| `lv_obj_center(label)` | Center the label within the button |
| `lv_obj_set_pos(btn, x, y)` | Set button position |
| `lv_obj_set_size(btn, w, h)` | Set button size |
| `lv_obj_set_style_bg_color(btn, color, sel)` | Set background color |
| `lv_obj_set_style_bg_opa(btn, opa, sel)` | Set background opacity |
| `lv_obj_set_style_radius(btn, r, sel)` | Set corner radius |
| `lv_obj_set_style_text_color(btn, color, sel)` | Set text color |
| `lv_obj_set_style_pad_all(btn, pad, sel)` | Set padding |
| `lv_obj_set_style_border_width(btn, w, sel)` | Set border width |
| `lv_obj_set_style_border_color(btn, color, sel)` | Set border color |
| `lv_obj_add_event_cb(btn, handler, event, data)` | Add event callback |
| `lv_obj_add_state(btn, LV_STATE_DISABLED)` | Set disabled state |
| `lv_obj_add_flag(btn, LV_OBJ_FLAG_HIDDEN)` | Set hidden |

## 12. Design Notes

1. **Internal label management**: The button's `text` property is implemented via an automatically created internal `lv_label`. In code generation, the label variable is named `{btnVarName}_label`; watch for naming conflicts.

2. **Container behavior**: A button is a container (`isContainer = true`). Users can add child components, which are created with the button as parent in generated code. The auto-created internal label is not in the component tree, so user-added children may overlap it.

3. **Transparent border handling**: Default is `borderColor = 'transparent'`, `borderWidth = 0`. In code generation, border color code is not emitted when `borderColor` is transparent.

4. **v8/v9 compatibility**:
   - Code generation uses `lv_btn_create` (works in v8/v9)
   - WASM preview uses `lv_button_create` (v9 name)
   - Both are equivalent in v9

5. **Canvas visibility**: When `bgColor` is transparent, the editor canvas falls back to `#2196F3` so the button remains visible and interactive during design.

6. **Hover feedback**: In the simple preview, the background lightens by 20% on hover to simulate interaction. The editor canvas uses CSS hover classes.

7. **Font property propagation**: `fontSize`, `textAlign`, and `fontResource` are applied to the internal label during code generation, not the button itself. Custom font resources (`fontResource`) take priority over `fontSize`.

8. **Cross-page naming conflicts**: When multiple pages contain buttons with the same name, the code generator automatically adds a page name prefix (e.g. `page1_my_button`) to avoid C variable name conflicts.
