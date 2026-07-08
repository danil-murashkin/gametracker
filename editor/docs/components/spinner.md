# Spinner (spinner) — Loading Animation Component Design Document

## 1. Component Name and Overview

Spinner is a display component in the LVGL editor for showing loading/waiting states. In LVGL, Spinner is a specialized component based on Arc (arc), indicating that a background operation is in progress via a continuously rotating arc animation. Spinner rotation speed and arc length can be configured via properties.

Spinner is not a container component (`isContainer = false`) and cannot contain child components.

## 2. Component Type Identifier

```
type: 'spinner'
```

## 3. Category

| Field | Value |
|-------|-------|
| Category ID | `display` |
| Category Name | Display |
| Category Icon | 📊 |
| Component Icon | ⏳ |

## 4. Default Size

| Property | Value |
|----------|-------|
| defaultWidth | 50 |
| defaultHeight | 50 |

> Spinner is usually square with equal width and height to ensure correct circular rotation animation.

## 5. Is Container

```
isContainer: false
```

Spinner is a display-only component and cannot contain child components.

## 6. Parent-Child Relationship Design

### Can Be a Child Of

- **Screen (root node)** — Placed directly on the page
- **Button (btn)** — As a loading state indicator inside a button
- **Container (obj)** — Placed inside a generic container
- **Tab View (tabview)** — Placed in a tab page content area
- **Tile View (tileview)** — Placed in a tile area
- **Window (win)** — Placed in the window content area

### Can Contain Child Components

None. Spinner is not a container and cannot contain any child components.

## 7. Property Design (props)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `speed` | `number` | `1000` | Time for one full rotation in milliseconds |
| `arcLength` | `number` | `60` | Angular length of the rotating arc in degrees |

### props Type Definition

```typescript
interface SpinnerProps {
  speed: number;
  arcLength?: number;
}
```

### Property Notes

- `speed`: Controls Spinner rotation speed. Smaller values rotate faster. 1000ms means one full rotation per second.
- `arcLength`: Controls the visible length of the rotating arc. 60° means the arc spans 1/6 of the circle. Larger values produce longer arcs.

In LVGL, these properties are passed as creation parameters to `lv_spinner_create(parent, speed, arcLength)` and cannot be changed after creation.

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
| `borderColor` | `string` | `'#2196F3'` | Border color (used as arc indicator color; LVGL theme primary color) |
| `borderWidth` | `number` | `15` | Border width (mapped to arc line width) |
| `borderRadius` | `number` | `0` | Corner radius (not used) |
| `textColor` | `string` | `'#212121'` | Text color |
| `opacity` | `number` | `1` | Opacity |
| `padding` | `number` | `0` | Padding |

### Style Source Notes

Default Spinner styles match the Arc component and come from the LVGL default theme:
- Arc background track color: `#E0E0E0` (`color_grey`)
- Arc indicator color: `#2196F3` (`color_primary`)
- Arc line width: 15px

> Note: In the editor style system, `borderColor` stores the arc indicator color and `borderWidth` stores the arc line width. This is a mapping convention; LVGL actually uses `arc_color` (`LV_PART_INDICATOR`) and `arc_width` style properties.

### Extended Style Properties

Spinner supports the following common extended styles:

- Transform: `transformAngle`, `transformZoomX`, `transformZoomY`, `transformPivotX`, `transformPivotY`
- Blend mode: `blendMode`

## 9. Event Support

Spinner supports the following LVGL event types:

| Event Type | Description |
|------------|-------------|
| `LV_EVENT_CLICKED` | Click event |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_FOCUSED` | Focus gained |
| `LV_EVENT_DEFOCUSED` | Focus lost |

> Note: Spinner usually does not need event bindings; it is purely visual feedback. It is not clickable by default.

## 10. UI Layer Design

### 10.1 Editor Canvas Rendering (CanvasComponent.tsx)

In the editor canvas, Spinner is rendered with React DOM + CSS animation:

```tsx
<div className="lvgl-spinner" style={{
  width: '100%', height: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}}>
  <div style={{
    width: '80%', height: '80%',
    border: '4px solid #e0e0e0',
    borderTopColor: defaultStyle.borderColor || '#2196F3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  }} />
</div>
```

Key behavior:
- Uses the CSS `border` trick to simulate a rotating arc: gray ring + colored top border
- Continuous rotation via CSS `animation: spin 1s linear infinite`
- Arc color from `borderColor` (default `#2196F3`)
- Background track color fixed at `#e0e0e0`
- Inner ring size is 80% of the component
- Transparent background (`resolvedBgColor` returns `'transparent'` for spinner type)
- Supports selection highlight, hover effects, drag, and resize handles

> Requires `@keyframes spin { to { transform: rotate(360deg); } }` in CSS

### 10.2 Simple Preview Rendering (PreviewPanel.tsx)

In the Canvas 2D simple preview, Spinner is drawn with the `drawSpinner()` function:

```typescript
drawSpinner(ctx, x, y, w, h, {
  borderColor: styles.borderColor || '#2196F3',
});
```

Drawing implementation:

```typescript
function drawSpinner(ctx, x, y, w, h, opts) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.min(w, h) / 2 - 4;

  // Background ring
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Rotating arc (static snapshot)
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, Math.PI / 3);
  ctx.stroke();
}
```

Key behavior:
- Draws a full gray background ring
- Draws a colored arc segment on top (from -90° to 60°, about 150° arc length)
- Arc endpoints are round (`lineCap = 'round'`)
- Spinner is static in the simple preview (no rotation); shows a snapshot only
- Line width fixed at 4px (simplified rendering)
- Supports animation state overlays

### 10.3 LVGL WASM Preview Rendering

#### JSON Serialization (editorStateToJson.ts)

Spinner is serialized as a flattened JSON component node:

```json
{
  "type": "spinner",
  "id": "comp-xxx",
  "parent": null,
  "x": 100, "y": 100,
  "width": 50, "height": 50,
  "props": { "speed": 1000 },
  "styles": {
    "default": {
      "bgColor": "transparent",
      "borderColor": "#2196F3",
      "borderWidth": 15,
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
static lv_obj_t *create_spinner(lv_obj_t *parent, const cJSON *comp) {
    (void)comp;
    return lv_spinner_create(parent);
}
```

Key behavior:
- Calls `lv_spinner_create(parent)` to create Spinner (v9 simplified signature)
- WASM preview does not currently pass `speed` and `arcLength` (uses LVGL defaults)
- LVGL automatically starts the rotation animation internally
- Applies position, size, and styles

> Note: Spinner actually rotates in WASM preview (driven by LVGL internal animation). This is the main difference from the editor canvas and simple preview.

### 10.4 Code Generation Output (ui.c.ts)

```c
// Create spinner: my_spinner
my_spinner = lv_spinner_create(parent, 1000, 60);
lv_obj_set_pos(my_spinner, 100, 100);
lv_obj_set_size(my_spinner, 50, 50);
lv_obj_set_style_bg_opa(my_spinner, LV_OPA_TRANSP, 0);
lv_obj_set_style_border_color(my_spinner, lv_color_hex(0x2196F3), 0);
lv_obj_set_style_border_width(my_spinner, 15, 0);
```

Key behavior:
- Creation uses the special signature: `lv_spinner_create(parent, speed, arcLength)`
- `speed` and `arcLength` are passed as creation parameters (not set afterward)
- If `speed` or `arcLength` differ from defaults, the code generator emits explanatory comments
- Spinner properties cannot be modified via API after creation (LVGL limitation)

Special handling in the code generator (`getCreateFunction`):

```typescript
if (type === 'spinner') {
  const speed = props?.speed || 1000;
  const arcLength = props?.arcLength || 60;
  return `lv_spinner_create(${parentVar}, ${speed}, ${arcLength})`;
}
```

Property code generation (`generatePropsCode`):

```typescript
case 'spinner':
  if (props.speed && props.speed !== 1000) {
    lines.push(`// Note: Spinner speed ${props.speed}ms set in create function`);
  }
  if (props.arcLength && props.arcLength !== 60) {
    lines.push(`// Note: Spinner arc length ${props.arcLength}° set in create function`);
  }
  break;
```

## 11. LVGL API Mapping

### Creation Function

| Version | API | Description |
|---------|-----|-------------|
| LVGL v9 | `lv_spinner_create(parent)` | Simplified signature (used by WASM preview) |
| LVGL v9 | `lv_spinner_create(parent, speed, arcLength)` | Full signature (used by code generation) |
| LVGL v8 | `lv_spinner_create(parent, speed, arcLength)` | Full signature |

> Note: The `lv_spinner_create` signature in LVGL v9 may differ across versions/configurations. The code generator uses the parameterized version for compatibility.

### Key APIs

| API | Description |
|-----|-------------|
| `lv_spinner_create(parent, speed, arc_length)` | Create Spinner and set speed and arc length |
| `lv_obj_set_pos(spinner, x, y)` | Set position |
| `lv_obj_set_size(spinner, w, h)` | Set size |
| `lv_obj_set_style_arc_color(spinner, color, LV_PART_INDICATOR)` | Set arc indicator color |
| `lv_obj_set_style_arc_width(spinner, width, LV_PART_INDICATOR)` | Set arc indicator line width |
| `lv_obj_set_style_arc_color(spinner, color, LV_PART_MAIN)` | Set background track color |
| `lv_obj_set_style_arc_width(spinner, width, LV_PART_MAIN)` | Set background track line width |
| `lv_obj_add_flag(spinner, LV_OBJ_FLAG_HIDDEN)` | Hide Spinner |

### Spinner vs. Arc

Spinner is a specialized form of Arc:
- Spinner internally creates an Arc object
- Automatically adds rotation animation (`lv_anim`)
- Does not support user interaction (arc cannot be dragged)
- Does not support value/range settings (unlike Arc)

## 12. Design Notes

1. **Creation-time parameters**: `speed` and `arcLength` are creation parameters passed to `lv_spinner_create`. They cannot be changed via API after creation. To change them, destroy and recreate the Spinner.

2. **Three-layer rendering differences**:
   - Editor canvas: CSS animation with continuous rotation (closest visual match to real behavior)
   - Simple preview: Static arc snapshot (no rotation)
   - WASM preview: Rotation driven by LVGL internal animation (real LVGL behavior)

3. **Style mapping convention**: In the editor style system, `borderColor` maps to arc indicator color and `borderWidth` maps to arc line width. In LVGL, these are `arc_color` and `arc_width` style properties applied to `LV_PART_INDICATOR`.

4. **Background track**: Spinner's gray background track color (`#E0E0E0`) is hardcoded in the editor and not exposed through the style system. In LVGL it can be changed via `arc_color` on `LV_PART_MAIN`.

5. **Square constraint**: Spinner should keep equal width and height for a circular appearance. The editor does not enforce this, but the UI should encourage users to keep it square.

6. **WASM preview simplification**: `create_spinner` in WASM preview does not pass `speed` and `arcLength`, so LVGL defaults are used. Changes to these properties in the editor are not reflected in WASM preview.

7. **Performance**: Spinner rotation is driven by LVGL's internal `lv_anim` system and continuously triggers redraws. Multiple simultaneous Spinners on resource-constrained embedded devices may affect performance.

8. **Show/hide**: Spinner is typically shown when an async operation starts and hidden when it ends. This can be controlled via the `LV_OBJ_FLAG_HIDDEN` flag or the event system's built-in `show`/`hide` actions.
