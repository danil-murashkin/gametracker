# GameTracker Editor — Component Design Documentation Index

This directory contains detailed design documentation for every component in GameTracker Editor. Each component document covers property design, the style system, parent-child relationships, the UI rendering layer, code generation, and LVGL API mapping.

---

## Component Overview

The editor supports **19 components** in total, grouped into 4 categories:

| Category | Icon | Count | Description |
|----------|------|-------|-------------|
| Basic (`basic`) | 📦 | 5 | Fundamental building blocks for the UI |
| Input (`input`) | ✏️ | 5 | User interaction and input controls |
| Container (`container`) | 📁 | 4 | Layout containers that can hold child components |
| Display (`display`) | 📊 | 5 | Data display and visualization components |

---

## Basic Components

| Component | Type | Icon | Default Size | Container | Description | Doc |
|-----------|------|------|--------------|-----------|-------------|-----|
| Button | `btn` | 🔘 | 100×40 | ✅ | Button; automatically creates an internal Label child to display text. Supports click interaction. The only basic component with `isContainer=true` | [btn.md](btn.md) |
| Label | `label` | 🏷️ | 80×24 | ❌ | Text label for static or dynamic text. Transparent background; inherits parent text color | [label.md](label.md) |
| Image | `img` | 🖼️ | 100×100 | ❌ | Image display component. Uses `lv_image_create` in v9 and `lv_img_create` in v8 | [img.md](img.md) |
| Line | `line` | 📏 | 100×4 | ❌ | Line drawing component; defines segments via a point coordinate array | [line.md](line.md) |
| Spinner | `spinner` | ⏳ | 50×50 | ❌ | Rotating loading animation built on the Arc component; supports custom rotation speed | [spinner.md](spinner.md) |

---

## Input Components

| Component | Type | Icon | Default Size | Container | Description | Doc |
|-----------|------|------|--------------|-----------|-------------|-----|
| Textarea | `textarea` | 📝 | 150×80 | ❌ | Multi-line text input with placeholder support. Uses card styling (white background, gray border) | [textarea.md](textarea.md) |
| Dropdown | `dropdown` | 📋 | 120×36 | ❌ | Dropdown selector with multi-option configuration and default selection | [dropdown.md](dropdown.md) |
| Checkbox | `checkbox` | ☑️ | 120×28 | ❌ | Checkbox with check mark and text label. Checked state controlled via `LV_STATE_CHECKED` | [checkbox.md](checkbox.md) |
| Switch | `switch` | 🔀 | 50×26 | ❌ | Toggle switch with rounded pill shape. Checked state controlled via `LV_STATE_CHECKED` | [switch.md](switch.md) |
| Slider | `slider` | 🎚️ | 150×20 | ❌ | Slider control with min, max, and current value settings | [slider.md](slider.md) |

---

## Container Components

Container components are the most complex part of the editor. The core design concern is the **child mounting mechanism**.

| Component | Type | Icon | Default Size | Child Mounting | Description | Doc |
|-----------|------|------|--------------|----------------|-------------|-----|
| Container | `obj` | 📦 | 200×150 | Direct mount | Generic container; children are created directly on it. The most basic container type | [obj.md](obj.md) |
| Tab View | `tabview` | 📑 | 250×200 | `tabChildMap` mapping | Tab view; children are mapped to the corresponding tab page via `tabChildMap` | [tabview.md](tabview.md) |
| Tile View | `tileview` | 🔲 | 200×200 | `tileChildMap` mapping | Tile view; children are mapped to the corresponding tile via `tileChildMap` (key format `"row-col"`) | [tileview.md](tileview.md) |
| Window | `win` | 🪟 | 250×200 | Content area | Window container; children mount to the content area returned by `lv_win_get_content()` | [win.md](win.md) |

### Container Child Mounting Mechanism

The editor Store layer (`editorStore.ts`) automatically maintains each container's `childMap`:

- **addComponent** — When adding a component to a tabview/tileview, automatically adds the child component ID to the `childMap` entry for the current `activeTab`/`currentTile`
- **reparentComponent** — When moving a component, removes it from the old parent's `childMap` and adds it to the new parent's `childMap`
- **deleteComponents** — When deleting a component, cleans up the corresponding ID from the parent's `childMap`

In code generation and WASM preview, a **virtual ID** mechanism mounts children onto internal containers correctly:
- Tab View: `{parentId}__tab__{tabIndex}`
- Tile View: `{parentId}__tile__{row}-{col}`
- Window: `{parentId}__win_content`

---

## Display Components

| Component | Type | Icon | Default Size | Container | Description | Doc |
|-----------|------|------|--------------|-----------|-------------|-----|
| Progress Bar | `bar` | 📊 | 150×20 | ❌ | Progress bar with range and current value settings. Rounded pill shape | [bar.md](bar.md) |
| Arc | `arc` | 🔄 | 100×100 | ❌ | Arc control with start/end angles and current value | [arc.md](arc.md) |
| Chart | `chart` | 📈 | 200×150 | ❌ | Chart component supporting line and bar charts. Multi-series data with configurable axes and grid | [chart.md](chart.md) |
| Table | `table` | 📋 | 200×150 | ❌ | Table component with row/column configuration, cell data, column widths, and alignment | [table.md](table.md) |
| Calendar | `calendar` | 📅 | 220×220 | ❌ | Calendar component with year/month display, today marker, date highlighting, and range selection | [calendar.md](calendar.md) |

---

## Common Design

### Style System

All components support 4 style states:

| State | LVGL Selector | Description |
|-------|---------------|-------------|
| `default` | `LV_PART_MAIN \| LV_STATE_DEFAULT` | Default state styles |
| `pressed` | `LV_PART_MAIN \| LV_STATE_PRESSED` | Pressed state styles |
| `focused` | `LV_PART_MAIN \| LV_STATE_FOCUSED` | Focused state styles |
| `disabled` | `LV_PART_MAIN \| LV_STATE_DISABLED` | Disabled state styles |

Common style properties (`StyleProps`) include background color, border, corner radius, text color, opacity, padding, shadow, gradient, outline, transform, and more. See individual component docs for details.

### Event System

LVGL event types supported by the editor:

| Event | Description | Typical Components |
|-------|-------------|-------------------|
| `LV_EVENT_CLICKED` | Click | btn, checkbox, switch |
| `LV_EVENT_PRESSED` | Press | btn |
| `LV_EVENT_RELEASED` | Release | btn |
| `LV_EVENT_LONG_PRESSED` | Long press | btn |
| `LV_EVENT_VALUE_CHANGED` | Value changed | slider, arc, dropdown, switch, checkbox, tabview |
| `LV_EVENT_FOCUSED` | Focus gained | textarea, dropdown |
| `LV_EVENT_DEFOCUSED` | Focus lost | textarea, dropdown |
| `LV_EVENT_READY` | Ready | textarea |
| `LV_EVENT_CANCEL` | Cancel | textarea |

### UI Rendering Layer

Each component has 4 rendering implementations in the editor:

1. **Editor Canvas** (`CanvasComponent.tsx`) — React/HTML simulated rendering with drag, selection, and resize support
2. **Simple Preview** (`PreviewPanel.tsx`) — Canvas 2D drawing for lightweight preview
3. **LVGL WASM Preview** (`ui_from_json.c`) — Real LVGL runtime rendering via a JSON component tree
4. **Code Generation** (`ui.c.ts`) — Generates compilable C code supporting LVGL v8/v9

### LVGL Version Compatibility

The editor defaults to LVGL v9 APIs. Main version differences:

| Feature | v8 | v9 |
|---------|----|----|
| Image create | `lv_img_create` | `lv_image_create` |
| Image set source | `lv_img_set_src` | `lv_image_set_src` |
| Tabview create | `lv_tabview_create(parent, dir, size)` | `lv_tabview_create(parent)` |
| Tabview set active | `lv_tabview_set_act` | `lv_tabview_set_active` |
| Window create | `lv_win_create(parent, height)` | `lv_win_create(parent)` |
| Coordinate type | `lv_coord_t` | `int32_t` |
| Rotation property | `transform_angle` | `transform_rotation` |

---

## File Structure

```
docs/components/
├── README.md          ← This file (component index)
├── btn.md             ← Button
├── label.md           ← Label
├── img.md             ← Image
├── line.md            ← Line
├── spinner.md         ← Spinner loading animation
├── textarea.md        ← Textarea text input
├── dropdown.md        ← Dropdown
├── checkbox.md        ← Checkbox
├── switch.md          ← Switch
├── slider.md          ← Slider
├── obj.md             ← Container
├── tabview.md         ← Tab View
├── tileview.md        ← Tile View
├── win.md             ← Window
├── bar.md             ← Progress Bar
├── arc.md             ← Arc
├── chart.md           ← Chart
├── table.md           ← Table
└── calendar.md        ← Calendar
```
