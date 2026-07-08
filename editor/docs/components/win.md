# Window (win) — Window Container Component

## 1. Component Name and Overview

Window is the window container component in the LVGL editor, corresponding to LVGL's `lv_win`. It provides a window structure with a title bar (header) and content area; the title bar can contain title text and action buttons (such as a close button). Suitable for dialogs, settings panels, popup windows, information cards, and similar scenarios.

The special aspect of Window's child mounting mechanism is that child components are not mounted directly on the win object, but on the content area returned by `lv_win_get_content()`.

## 2. Component Type Identifier

```
type: 'win'
```

## 3. Category

```
category: 'container'  // Container category, icon: 📁
```

Displayed in the component panel as **Window**, icon: 🪟.

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 250 |
| defaultHeight | 200 |

## 5. Is Container

```
isContainer: true
```

Window is a container component; child components mount to its internal content area.

## 6. Parent-Child Relationship Design

### Can be a child of the following components

- Can be a direct child of **Screen (page root node)**
- Can be a child of any `isContainer=true` component, including:
  - Container (obj)
  - Button (btn)
  - Tab View (tabview) — Mounted to the corresponding tab page
  - Tile View (tileview) — Mounted to the corresponding tile
  - Another Window (nested, not recommended)

### Can contain the following child components

Window can contain **all types** of components. At runtime, child components are placed in Window's content area.

### Child Component Mounting Mechanism (Core Design)

Window uses the **content area mounting mechanism**:

```
Child component → lv_win_get_content(win) → content area
```

#### Mounting Principle

LVGL's `lv_win` internal structure has two parts:
- **header**: Title bar containing title text and buttons, managed by `lv_win_add_title()` and `lv_win_add_btn()`
- **content**: Content area obtained via `lv_win_get_content()`; child components should be created here

In the editor, Window's `children[]` array stores all child components, but during code generation and WASM preview, these child components' parent is not the win object itself, but win's content area.

#### Mounting Flow

1. **Adding child component** (`addComponent`):
   - New component added to win's `children[]` array
   - `parentId` set to win's ID
   - Window does not need an additional childMap (unlike tabview/tileview), because all child components belong to the same content area

   ```typescript
   // editorStore.ts - addComponent
   // Window uses generic logic; no special handling required
   addComponentToTree(page.components, newComponent, parentId)
   ```

2. **Reparenting** (`reparentComponent`):
   - Generic logic: remove from old parent, add to win's children
   - If old parent is tabview/tileview, clean corresponding childMap

3. **Deleting child component** (`deleteComponents`):
   - Generic logic: remove from win's children

#### Difference from Container (obj)

Although Window Store layer operations are similar to Container (both operate children array directly), there is a fundamental difference at code generation and WASM preview:

| Layer | Container (obj) | Window (win) |
|------|-----------------|--------------|
| Store layer | Children in `children[]` | Children in `children[]` |
| Code generation | `lv_xxx_create(container)` | `lv_xxx_create(win_content)` |
| WASM preview | parent = container_id | parent = `{win_id}__win_content` |

## 7. Property Design (props)

| Property Name | Type | Default Value | Description |
|--------|------|--------|------|
| title | `string` | `'Window'` | Window title text displayed in title bar |
| headerHeight | `number` | `40` | Title bar height (pixels) |
| showCloseBtn | `boolean` | `true` | Whether to show close button (uses LV_SYMBOL_CLOSE icon) |
| headerButtons | `Array<{icon: string, width: number}>` | `[]` | Additional title bar button list |

### title Property Notes

- Set via `lv_win_add_title(win, title)`
- Displayed on the left of the title bar (or in add order)

### headerHeight Property Notes

- Controls title bar height
- In LVGL v9, set separately after `lv_win_create(parent)`
- In LVGL v8, specified at `lv_win_create(parent, headerHeight)`

### showCloseBtn Property Notes

- When `true`, adds a close button to the title bar
- Generated code: `lv_win_add_btn(win, LV_SYMBOL_CLOSE, 40)`
- Close button behavior must be implemented via event binding

### headerButtons Property Notes

- Additional title bar button array
- Each button has `icon` (LVGL symbol constant, e.g. `LV_SYMBOL_SETTINGS`) and `width` (button width)
- Buttons added to title bar in array order

## 8. Style Design (styles)

### Default Style State (default)

Window uses LVGL default theme **clip_corner** style; header uses gray background, content uses screen style:

| Style Property | Type | Default Value | Description |
|----------|------|--------|------|
| bgColor | `string` | `'#F5F5F5'` | Background color, light gray (LVGL color_scr, applies to content area) |
| borderColor | `string` | `'#E0E0E0'` | Border color, light gray |
| borderWidth | `number` | `2` | Border width |
| borderRadius | `number` | `8` | Corner radius (clip_corner effect) |
| textColor | `string` | `'#212121'` | Text color |
| opacity | `number` | `1` | Fully opaque |
| padding | `number` | `0` | No padding (content area has its own padding) |

### Supported Style States

| State | Description |
|------|------|
| `default` | Default state, required |
| `pressed` | Pressed state (optional) |
| `focused` | Focused state (optional) |
| `disabled` | Disabled state (optional) |

Note: Window styles mainly apply to the overall container. Title bar (header) background color is controlled by LVGL theme (default `color_grey = #E0E0E0`); the editor does not currently expose header styling separately.

## 9. Event Support

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

For Window, the most common event scenario is close button click. The close button is an independent button object added via `lv_win_add_btn()`; its events must be bound separately.

## 10. UI Layer Design

### Editor Canvas Rendering (Canvas)

On the canvas, Window renders as:

```
┌─────────────────────────────┐
│ Window Title          [✕]   │  ← header area (gray background)
├─────────────────────────────┤
│                             │
│   Child component content   │  ← content area
│                             │
│                             │
└─────────────────────────────┘
```

- Header area displays title text and button icons
- Content area displays child components
- Header height controlled by `headerHeight` property
- Child y coordinates are relative to content area top (excluding header)

### Simple Preview Rendering (PreviewPanel)

Similar to canvas rendering but without edit interactions. Shows complete window structure (header + content); child components render within content area.

### LVGL WASM Preview Rendering

In `editorStateToJson.ts`, Window child components map to content area via virtual ID:

```typescript
// Virtual parent ID format: {win_id}__win_content
// Example: "abc123__win_content"

// All child components map to the same content virtual ID
for (const comp of components) {
  childToVirtualParent[comp.id] = `${parentComp.id}__win_content`;
}
```

In serialized JSON, child components' `parent` field points to virtual ID:

```json
[
  {
    "type": "win",
    "id": "abc123",
    "parent": null,
    "props": { "title": "Window", "headerHeight": 40, "showCloseBtn": true, "headerButtons": [] }
  },
  {
    "type": "label",
    "id": "child1",
    "parent": "abc123__win_content",
    "props": { "text": "Content" }
  }
]
```

On the WASM side (`ui_from_json.c`):
1. Create win: `lv_win_create(parent)`
2. Add title: `lv_win_add_title(win, "Window")`
3. Add button: `lv_win_add_btn(win, LV_SYMBOL_CLOSE, 40)`
4. Get content: `lv_win_get_content(win)` returns content object
5. Register content with virtual ID (`id__win_content`) in `id_map`
6. When creating child components, find content as parent via virtual ID in `id_map`

### Code Generation Output (codegen)

In `ui.c.ts`, Window generates the following C code:

```c
// Create win: Window_xxxx
Window_xxxx = lv_win_create(parent);
lv_obj_set_pos(Window_xxxx, 0, 0);
lv_obj_set_size(Window_xxxx, 250, 200);

// Style settings
lv_obj_set_style_bg_color(Window_xxxx, lv_color_hex(0xF5F5F5), 0);
lv_obj_set_style_bg_opa(Window_xxxx, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(Window_xxxx, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(Window_xxxx, 2, 0);
lv_obj_set_style_radius(Window_xxxx, 8, 0);

// Add title
lv_win_add_title(Window_xxxx, "Window");

// Add close button
lv_win_add_btn(Window_xxxx, LV_SYMBOL_CLOSE, 40);

// Get content area; child components are created on content
lv_obj_t * Window_xxxx_content = lv_win_get_content(Window_xxxx);

// Child components use content as parent
child_1 = lv_label_create(Window_xxxx_content);
child_2 = lv_btn_create(Window_xxxx_content);
```

Child parent assignment logic in code generation (`ui.c.ts`):

```typescript
// All Window child components are attached to the content area
if (component.type === 'win') {
  if (component.children.length > 0) {
    lines.push(`${indent}lv_obj_t * ${varName}_content = lv_win_get_content(${varName});`);
    for (const child of component.children) {
      lines.push(...generateComponentCode(child, `${varName}_content`, ...));
    }
  }
}
```

## 11. LVGL API Mapping

### LVGL v9 Creation Function

```c
lv_obj_t * lv_win_create(lv_obj_t * parent);
```

Note: LVGL v8 has a different signature: `lv_win_create(parent, header_height)`; the editor auto-adapts in v8 mode.

### Key APIs

| API | Description |
|-----|------|
| `lv_win_create(parent)` | Create window (v9) |
| `lv_win_add_title(win, title)` | Add title text to header |
| `lv_win_add_btn(win, icon, width)` | Add button to header; `icon` is LVGL symbol (e.g. `LV_SYMBOL_CLOSE`), `width` is button width |
| `lv_win_get_content(win)` | Get content area object (`lv_obj_t *`); child components should be created on this object |
| `lv_win_get_header(win)` | Get header area object |

### LVGL Internal Structure

```
win (lv_obj, overall container)
├── header (lv_obj, title bar, flex layout)
│   ├── title (lv_label, title text)
│   ├── btn_close (lv_btn, close button)
│   └── btn_xxx (lv_btn, other buttons)
└── content (lv_obj, content area)
    ├── child_1 (user child component)
    ├── child_2 (user child component)
    └── ...
```

Window uses flex layout internally:
- Overall vertical flex (header on top, content below)
- Header horizontal flex (title and buttons arranged horizontally)
- Content area scrollable by default

### LVGL Symbol Constants (for headerButtons)

| Symbol | Description |
|------|------|
| `LV_SYMBOL_CLOSE` | Close ✕ |
| `LV_SYMBOL_SETTINGS` | Settings ⚙ |
| `LV_SYMBOL_HOME` | Home 🏠 |
| `LV_SYMBOL_LEFT` | Left arrow ← |
| `LV_SYMBOL_RIGHT` | Right arrow → |
| `LV_SYMBOL_REFRESH` | Refresh 🔄 |
| `LV_SYMBOL_EDIT` | Edit ✏ |
| `LV_SYMBOL_SAVE` | Save 💾 |

## 12. Design Notes

1. **Content area is key**: Window child components must be created on the content area returned by `lv_win_get_content()`, not on the win object itself. This is Window's biggest difference from Container. The editor handles this mapping automatically in code generation and WASM preview.

2. **Store layer needs no special childMap**: Unlike Tab View and Tile View, Window does not need childMap mapping because all child components belong to the same content area. Store layer addComponent/reparentComponent/deleteComponents use generic logic.

3. **Header not editable for child components**: In current design, header content (title and buttons) is configured via props; custom child components cannot be placed in the header. All drag-and-drop added child components go to the content area.

4. **headerHeight v8/v9 differences**:
   - v9: `lv_win_create(parent)` then set header height via style or internal mechanism
   - v8: `lv_win_create(parent, headerHeight)` specified at creation
   - Editor auto-adapts during code generation

5. **Close button behavior**: `showCloseBtn=true` only adds a button with close icon to the header; it does not automatically close/hide the window. Users must implement close behavior via event binding (e.g. `lv_obj_add_flag(win, LV_OBJ_FLAG_HIDDEN)`).

6. **WASM preview virtual ID**: Window uses a single virtual ID in `{id}__win_content` format (unlike tabview with multiple tab page virtual IDs), because Window has only one content area.

7. **Content area scrollable**: Window's content area is scrollable by default. When child components exceed content area bounds, scrollbars appear automatically.

8. **Style scope**: Styles configured in the editor mainly apply to the win container overall. Header background (default gray) and content background are controlled by LVGL theme internally. Separate header and content style configuration may be exposed in the future.

9. **Relationship to dialogs**: LVGL has no separate dialog component; Window can be combined with `lv_obj_add_flag(win, LV_OBJ_FLAG_FLOATING)` for floating dialog effect. The editor does not currently support floating flag configuration directly, but it can be extended via flags property.
