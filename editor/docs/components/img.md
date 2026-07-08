# Image (img) — Component Design Document

## 1. Component Name and Overview

Image is a basic component in the LVGL editor for displaying image assets. In LVGL, an image object (`lv_image` / `lv_img`) displays precompiled C array images or images from an external file system. The image component supports transforms such as rotation and scaling.

An image is not a container component (`isContainer = false`) and cannot contain child components.

## 2. Component Type Identifier

```
type: 'img'
```

## 3. Category

| Field | Value |
|-------|-------|
| Category ID | `basic` |
| Category Name | Basic |
| Category Icon | 📦 |
| Component Icon | 🖼️ |

## 4. Default Size

| Property | Value |
|----------|-------|
| defaultWidth | 100 |
| defaultHeight | 100 |

## 5. Is Container

```
isContainer: false
```

An image is a display-only component and cannot contain child components.

## 6. Parent-Child Relationship Design

### Can Be a Child Of

- **Screen (root node)** — Placed directly on the page
- **Button (btn)** — As an icon inside a button
- **Container (obj)** — Placed inside a generic container
- **Tab View (tabview)** — Placed in a tab page content area
- **Tile View (tileview)** — Placed in a tile area
- **Window (win)** — Placed in the window content area

### Can Contain Child Components

None. An image is not a container and cannot contain any child components.

## 7. Property Design (props)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `src` | `string` | `''` | Image source. Can be a resource ID, resource name, C array name, or data URL |
| `rotation` | `number` | `0` | Rotation angle in degrees (multiplied by 10 during code generation to convert to LVGL's 0.1° units) |
| `scaleMode` | `string` | `undefined` | Scale mode: `'cover'` / `'contain'` (requires custom implementation) |

### props Type Definition

```typescript
interface ImgProps {
  src: string;
  rotation?: number;
  scaleMode?: 'cover' | 'contain';
}
```

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
| `borderColor` | `string` | `'transparent'` | Border color (no border) |
| `borderWidth` | `number` | `0` | Border width |
| `borderRadius` | `number` | `0` | Corner radius |
| `textColor` | `string` | `'#212121'` | Text color (for placeholder text) |
| `opacity` | `number` | `1` | Opacity |
| `padding` | `number` | `0` | Padding |

### Style Source Notes

The image component has no special styles in the LVGL default theme and uses base object defaults:
- Transparent background
- No border, no corner radius, no padding

### Extended Style Properties

Images support the following common extended styles (inherited from `StyleProps`):

- Shadow: `shadowColor`, `shadowWidth`, `shadowOffsetX`, `shadowOffsetY`, `shadowSpread`, `shadowOpacity`
- Outline: `outlineColor`, `outlineWidth`, `outlinePad`
- Transform: `transformAngle`, `transformZoomX`, `transformZoomY`, `transformPivotX`, `transformPivotY`
- Blend mode: `blendMode`

## 9. Event Support

Images support the following LVGL event types:

| Event Type | Description |
|------------|-------------|
| `LV_EVENT_CLICKED` | Click event |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_FOCUSED` | Focus gained |
| `LV_EVENT_DEFOCUSED` | Focus lost |

> Note: Images are not clickable by default. To respond to events, set `clickable = true` via flags.

## 10. UI Layer Design

### 10.1 Editor Canvas Rendering (CanvasComponent.tsx)

In the editor canvas, images are rendered with the `CanvasImageContent` subcomponent:

```tsx
// When an image resource is available
<div className="lvgl-img" style={{
  width: '100%', height: '100%',
  backgroundImage: `url(${matched.data})`,
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
}} />

// When no image resource is available (placeholder)
<div className="lvgl-img" style={{
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', height: '100%', fontSize: '24px',
}}>
  🖼️
</div>
```

Key behavior:
- Looks up image resources via `useResourceStore` (matched by ID, name, or C array name)
- When a resource is found, displays the actual image with `backgroundImage` (`contain` mode)
- When no resource is found, shows a 🖼️ placeholder icon
- Falls back to `#f0f0f0` (light gray) when the background is transparent, ensuring visibility on the canvas
- Supports selection highlight, hover effects, drag, and resize handles

### 10.2 Simple Preview Rendering (PreviewPanel.tsx)

In the Canvas 2D simple preview, images are drawn with the `drawImage()` function:

```typescript
drawImage(ctx, x, y, w, h, {
  src: comp.props.src,
  loadImage,
});
```

Key behavior:
- Loads images via the `loadImage()` callback (supports resource ID, name, data URL, HTTP URL)
- Uses an in-memory cache (`imageCache`) to avoid reloading
- Draws with `ctx.drawImage()` after the image loads
- Draws a gray placeholder rectangle + 🖼️ icon when the image is not loaded or `src` is empty
- Triggers a redraw automatically after the image loads

### 10.3 LVGL WASM Preview Rendering

#### JSON Serialization (editorStateToJson.ts)

Images are serialized as flattened JSON component nodes:

```json
{
  "type": "img",
  "id": "comp-xxx",
  "parent": null,
  "x": 20, "y": 20,
  "width": 100, "height": 100,
  "props": { "src": "" },
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
static lv_obj_t *create_img(lv_obj_t *parent, const cJSON *comp) {
    (void)comp;
    /* Image source handling would require asset management;
       for now just create the widget */
    return lv_image_create(parent);
}
```

Key behavior:
- Calls `lv_image_create()` to create the image object (v9 API)
- WASM preview does not currently handle image sources (requires asset management support)
- Only creates an empty image widget and applies position, size, and styles

### 10.4 Code Generation Output (ui.c.ts)

```c
// Create img: my_image
my_image = lv_image_create(parent);  // v9
// my_image = lv_img_create(parent); // v8
lv_obj_set_pos(my_image, 20, 20);
lv_obj_set_size(my_image, 100, 100);
lv_obj_set_style_bg_opa(my_image, LV_OPA_TRANSP, 0);

// Set image source (uses C array name when resource matches)
lv_image_set_src(my_image, &my_icon);  // v9
// lv_img_set_src(my_image, &my_icon); // v8

// Rotation (if rotation is set)
lv_image_set_rotation(my_image, 450);  // v9, 45° × 10
// lv_img_set_angle(my_image, 450);    // v8
```

Key behavior:
- v9 uses `lv_image_create` / `lv_image_set_src` / `lv_image_set_rotation`
- v8 uses `lv_img_create` / `lv_img_set_src` / `lv_img_set_angle`
- Image source matching: look up by ID or name in `imageResources` first; if found, use `cArrayName`; otherwise use `props.src` directly as the C variable name
- Rotation angle is multiplied by 10 (LVGL uses 0.1° units)
- `scaleMode` requires custom implementation; code generation emits a comment hint

## 11. LVGL API Mapping

### Creation Function

| Version | API |
|---------|-----|
| LVGL v9 | `lv_image_create(parent)` |
| LVGL v8 | `lv_img_create(parent)` |

### Key APIs

| API (v9) | API (v8) | Description |
|----------|----------|-------------|
| `lv_image_create(parent)` | `lv_img_create(parent)` | Create image object |
| `lv_image_set_src(img, src)` | `lv_img_set_src(img, src)` | Set image source |
| `lv_image_set_rotation(img, angle)` | `lv_img_set_angle(img, angle)` | Set rotation angle (0.1° units) |
| `lv_image_set_scale(img, zoom)` | `lv_img_set_zoom(img, zoom)` | Set scale (256 = 100%) |
| `lv_obj_set_pos(img, x, y)` | same | Set position |
| `lv_obj_set_size(img, w, h)` | same | Set size |
| `lv_obj_set_style_bg_opa(img, opa, sel)` | same | Set background opacity |

### Image Source Declaration Macros

| Version | Macro | Description |
|---------|-------|-------------|
| LVGL v9 | `LV_IMAGE_DECLARE(var_name)` | Declare external image C array |
| LVGL v8 | `LV_IMG_DECLARE(var_name)` | Declare external image C array |

## 12. Design Notes

1. **Image resource management**: The editor uses `resourceStore` to manage image resources. Each image resource includes `id`, `name`, `cArrayName` (C array variable name), and `data` (base64/data URL). `props.src` stores the resource ID or name; code generation converts it to a C array reference.

2. **v8/v9 API differences**: The image component has one of the largest API differences between v8 and v9. The code generator chooses the API set via `options.lvglVersion`. Key differences:
   - Create: `lv_img_create` → `lv_image_create`
   - Set source: `lv_img_set_src` → `lv_image_set_src`
   - Rotation: `lv_img_set_angle` → `lv_image_set_rotation`
   - Scale: `lv_img_set_zoom` → `lv_image_set_scale`
   - Declaration macro: `LV_IMG_DECLARE` → `LV_IMAGE_DECLARE`

3. **WASM preview limitations**: Image source handling is not fully implemented in WASM preview yet (`create_img` is marked TODO). Images in WASM preview appear as empty image widgets.

4. **Canvas visibility**: When `bgColor` is transparent and there is no image source, the editor canvas falls back to `#f0f0f0` so the image placeholder area remains visible and interactive.

5. **Image cache**: The simple preview uses `imageCache` (Map) to cache loaded `HTMLImageElement` instances and avoid reloading on every redraw.

6. **Rotation units**: LVGL uses 0.1° as the rotation unit. The editor's `rotation` property is in degrees; code generation multiplies by 10 automatically.

7. **Scale mode**: `scaleMode` (`cover`/`contain`) has no direct LVGL API equivalent and requires custom implementation. Code generation emits a comment hint for manual handling.

8. **Image declarations**: During code generation, used image resources get `LV_IMAGE_DECLARE` (v9) or `LV_IMG_DECLARE` (v8) declarations at the top of the file. Only actually used images are declared (filtered via `collectUsedImages`).
