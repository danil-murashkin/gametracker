# Container (obj) — Generic Container Component

## 1. Component Name and Overview

Container is the most fundamental container component in the LVGL editor, corresponding to LVGL's `lv_obj` (base object). It is the base class of all LVGL components; when used as a container it provides a rectangular area that can hold arbitrary child components. It defaults to card style with white background, gray border, and rounded corners, suitable for layout grouping, panels, cards, and similar scenarios.

## 2. Component Type Identifier

```
type: 'obj'
```

## 3. Category

```
category: 'container'  // Container category, icon: 📁
```

Displayed in the component panel as **Container**, icon: 📦.

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 200 |
| defaultHeight | 150 |

## 5. Is Container

```
isContainer: true
```

Container is a container component and can contain child components.

## 6. Parent-Child Relationship Design

### Can be a child of the following components

- Can be a direct child of **Screen (page root node)**
- Can be a child of any `isContainer=true` component, including:
  - Another Container (obj)
  - Button (btn)
  - Tab View (tabview) — Mounted to the corresponding tab page
  - Tile View (tileview) — Mounted to the corresponding tile
  - Window (win) — Mounted to the content area

### Can contain the following child components

Container can contain **all types** of components, including:
- Basic components: Button, Label, Image, Line
- Input components: Textarea, Dropdown, Checkbox, Switch, Slider
- Container components: Container (nested), Tab View, Tile View, Window
- Display components: Progress Bar, Arc, Spinner, Chart, Table, Calendar

### Child Component Mounting Mechanism

Container uses the simplest **direct mounting** mechanism:

```
Child components mount directly on the Container itself (lv_obj_create(container))
```

Flow:

1. **Adding child component**: `addComponent(type, x, y, containerId)` → New component's `parentId` is set to Container's ID; component is added to Container's `children[]` array.
2. **Reparenting**: `reparentComponent(childId, containerId)` → Removed from old parent's `children[]`, added to Container's `children[]`, `parentId` updated.
3. **Deleting child component**: `deleteComponents([childId])` → Removed from Container's `children[]`.

Container does not need an additional childMap (unlike tabview's `tabChildMap` or tileview's `tileChildMap`), because all child components belong to the same container space.

**Store layer operations** (`editorStore.ts`):

```typescript
// addComponent: add directly to parent's children
addComponentToTree(page.components, newComponent, parentId)

// reparentComponent: move to new parent
moveComponentToParent(page.components, id, newParentId)

// deleteComponents: remove from tree
deleteComponentFromTree(page.components, ids)
```

## 7. Property Design (props)

Container's `defaultProps` is an empty object `{}` with no component-specific properties. The following optional layout properties are supported:

| Property Name | Type | Default Value | Description |
|--------|------|--------|------|
| layout | `'flex' \| 'grid'` | None (free positioning) | Layout mode. Set to `'flex'` for Flex layout, `'grid'` for Grid layout |
| scrollDir | `'none' \| 'hor' \| 'ver' \| 'all'` | None | Scroll direction constraint |

### Flex Layout Properties (when `layout='flex'`)

| Property Name | Type | Default Value | Description |
|--------|------|--------|------|
| flexDirection | `'row' \| 'column' \| 'row-reverse' \| 'column-reverse'` | `'row'` | Flex main axis direction |
| flexWrap | `boolean` | `false` | Whether to wrap |
| justifyContent | `string` | `'flex-start'` | Main axis alignment |
| alignItems | `string` | `'flex-start'` | Cross axis alignment |
| alignContent | `string` | `'flex-start'` | Multi-line alignment |
| gap | `number` | None | Child spacing (sets both row gap and column gap) |

### Grid Layout Properties (when `layout='grid'`)

| Property Name | Type | Default Value | Description |
|--------|------|--------|------|
| gridColumns | `string` | None | Column definition, e.g. `"1fr 1fr"` or `"100 200"` |
| gridRows | `string` | None | Row definition, e.g. `"1fr 1fr"` |
| gridColumnGap | `number` | None | Column gap |
| gridRowGap | `number` | None | Row gap |

## 8. Style Design (styles)

### Default Style State (default)

Container uses LVGL default theme **card style**:

| Style Property | Type | Default Value | Description |
|----------|------|--------|------|
| bgColor | `string` | `'#ffffff'` | Background color, white (LVGL color_card) |
| borderColor | `string` | `'#E0E0E0'` | Border color, light gray (LVGL color_grey) |
| borderWidth | `number` | `2` | Border width |
| borderRadius | `number` | `8` | Corner radius |
| textColor | `string` | `'#212121'` | Text color (LVGL color_text) |
| opacity | `number` | `1` | Opacity (1 = fully opaque) |
| padding | `number` | `16` | Padding |

### Supported Style States

| State | Description |
|------|------|
| `default` | Default state, required |
| `pressed` | Pressed state (optional), corresponds to `LV_STATE_PRESSED` |
| `focused` | Focused state (optional), corresponds to `LV_STATE_FOCUSED` |
| `disabled` | Disabled state (optional), corresponds to `LV_STATE_DISABLED` |

### Complete Style Property List

Each style state supports the following properties (defined in `StyleProps` type):

| Category | Property | Description |
|------|------|------|
| Basic | bgColor, borderColor, borderWidth, borderRadius, textColor, opacity, padding | Basic appearance |
| Margin | paddingTop, paddingBottom, paddingLeft, paddingRight | Per-direction padding |
| Corner radius | borderRadiusTopLeft, borderRadiusTopRight, borderRadiusBottomLeft, borderRadiusBottomRight | Per-corner radius |
| Border | borderSide | Border display direction (full/top/bottom/left/right/top_bottom/left_right/none) |
| Gradient | bgGradColor, bgGradDir, bgGradStop | Background gradient |
| Outline | outlineColor, outlineWidth, outlinePad | Outer outline |
| Shadow | shadowColor, shadowWidth, shadowOffsetX, shadowOffsetY, shadowSpread, shadowOpacity | Shadow effect |
| Transform | transformAngle, transformZoomX, transformZoomY, transformPivotX, transformPivotY | Rotation and scale |
| Text | textFont, textFontSize, textLetterSpace, textLineSpace, textDecor | Text style |
| Scrollbar | scrollbarMode, scrollbarWidth, scrollbarColor | Scrollbar style |
| Blend | blendMode | Blend mode |

## 9. Event Support

Container supports all LVGL event types (defined in `LvglEventType`):

| Event Type | Description |
|----------|------|
| `LV_EVENT_CLICKED` | Click event |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_VALUE_CHANGED` | Value change event |
| `LV_EVENT_FOCUSED` | Focus gained |
| `LV_EVENT_DEFOCUSED` | Focus lost |
| `LV_EVENT_READY` | Ready event |
| `LV_EVENT_CANCEL` | Cancel event |

Event binding supports two handler types:
- **builtin**: Built-in actions (navigate, setProperty, show, hide, enable, disable, setText, setValue)
- **custom**: Custom C code

## 10. UI Layer Design

### Editor Canvas Rendering (Canvas)

In `CanvasComponent.tsx`, Container renders as a `<div>` with styles mapped directly:

```
- Background color → CSS background-color (linear-gradient when gradient is used)
- Border → CSS border
- Corner radius → CSS border-radius
- Padding → CSS padding
- Shadow → CSS box-shadow
- Transform → CSS transform (rotate + scale)
- Child components → Recursively rendered as nested <div>
```

Container appears as a white card area on the canvas; child components are absolutely positioned inside. When selected, shows blue border and 8 resize handles.

### Simple Preview Rendering (PreviewPanel)

In `PreviewPanel.tsx`, Container rendering is similar to the canvas but without edit interactions (selection box, drag handles, etc.); visual presentation only. Child components render recursively.

### LVGL WASM Preview Rendering

In `editorStateToJson.ts`, Container is serialized to JSON:

```json
{
  "type": "obj",
  "id": "xxx",
  "parent": "screen or parent_id",
  "x": 0, "y": 0,
  "width": 200, "height": 150,
  "props": {},
  "styles": { "default": { "bgColor": "#ffffff", ... } }
}
```

On the WASM side (`ui_from_json.c`), created via `lv_obj_create(parent)`, then position, size, and styles are applied. Child components' `parent` field points directly to Container's ID.

### Code Generation Output (codegen)

In `ui.c.ts`, Container generates the following C code:

```c
// Create obj: Container_xxxx
Container_xxxx = lv_obj_create(parent);
lv_obj_set_pos(Container_xxxx, 0, 0);
lv_obj_set_size(Container_xxxx, 200, 150);
lv_obj_set_style_bg_color(Container_xxxx, lv_color_hex(0xffffff), 0);
lv_obj_set_style_bg_opa(Container_xxxx, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(Container_xxxx, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(Container_xxxx, 2, 0);
lv_obj_set_style_radius(Container_xxxx, 8, 0);
lv_obj_set_style_pad_all(Container_xxxx, 16, 0);

// Child components are created directly with Container_xxxx as parent
child_xxxx = lv_label_create(Container_xxxx);
```

If Flex layout is set:

```c
lv_obj_set_layout(Container_xxxx, LV_LAYOUT_FLEX);
lv_obj_set_flex_flow(Container_xxxx, LV_FLEX_FLOW_ROW);
lv_obj_set_flex_align(Container_xxxx, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);
```

If Grid layout is set:

```c
lv_obj_set_layout(Container_xxxx, LV_LAYOUT_GRID);
static int32_t Container_xxxx_col_dsc[] = {LV_GRID_FR(1), LV_GRID_FR(1), LV_GRID_TEMPLATE_LAST};
static int32_t Container_xxxx_row_dsc[] = {LV_GRID_FR(1), LV_GRID_FR(1), LV_GRID_TEMPLATE_LAST};
lv_obj_set_grid_dsc_array(Container_xxxx, Container_xxxx_col_dsc, Container_xxxx_row_dsc);
```

## 11. LVGL API Mapping

### LVGL v9 Creation Function

```c
lv_obj_t * lv_obj_create(lv_obj_t * parent);
```

### Key APIs

| API | Description |
|-----|------|
| `lv_obj_create(parent)` | Create base object |
| `lv_obj_set_pos(obj, x, y)` | Set position |
| `lv_obj_set_size(obj, w, h)` | Set size |
| `lv_obj_set_width(obj, w)` / `lv_obj_set_height(obj, h)` | Set width/height individually |
| `lv_obj_set_style_bg_color(obj, color, selector)` | Set background color |
| `lv_obj_set_style_border_color(obj, color, selector)` | Set border color |
| `lv_obj_set_style_border_width(obj, width, selector)` | Set border width |
| `lv_obj_set_style_radius(obj, radius, selector)` | Set corner radius |
| `lv_obj_set_style_pad_all(obj, pad, selector)` | Set padding |
| `lv_obj_set_layout(obj, LV_LAYOUT_FLEX)` | Set Flex layout |
| `lv_obj_set_layout(obj, LV_LAYOUT_GRID)` | Set Grid layout |
| `lv_obj_set_flex_flow(obj, flow)` | Set Flex flow |
| `lv_obj_set_flex_align(obj, main, cross, track)` | Set Flex alignment |
| `lv_obj_set_grid_dsc_array(obj, col_dsc, row_dsc)` | Set Grid descriptor |
| `lv_obj_set_scroll_dir(obj, dir)` | Set scroll direction |
| `lv_obj_add_flag(obj, flag)` | Add flag |
| `lv_obj_clear_flag(obj, flag)` | Clear flag |
| `lv_obj_add_event_cb(obj, cb, event, user_data)` | Add event callback |

## 12. Design Notes

1. **Most basic container**: Container (obj) is the base class of all LVGL components. When used as a container it is the simplest and most generic. Other container components (tabview, tileview, win) are specializations built on obj.

2. **Child positioning**: Child components inside Container default to **absolute positioning** (x, y relative to Container's content area). When Flex or Grid layout is enabled, child positions are managed by the layout engine.

3. **Nesting depth**: Container supports unlimited nesting, but deep nesting affects LVGL rendering performance. Recommend nesting no more than 5 levels.

4. **Scroll behavior**: LVGL obj is scrollable by default (`LV_OBJ_FLAG_SCROLLABLE`). When child components exceed Container bounds, scrollbars appear automatically. Disable via `flags.scrollable = false`.

5. **Card Style origin**: Default style comes from LVGL default theme card style (`lv_theme_default.c`), shared with textarea, dropdown, chart, table, calendar, and other components.

6. **Layout switching**: When switching from free positioning to Flex/Grid layout, child x/y coordinates are ignored by the layout engine. When switching back to free positioning, child positions must be reset.

7. **Difference from Button**: Button (btn) is also `isContainer=true`, but Button has default click styling (pressed state) and primary-color background. Container is better suited for pure layout purposes.
