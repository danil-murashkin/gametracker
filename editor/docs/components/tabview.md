# Tab View (tabview) — Tab View Container Component

## 1. Component Name and Overview

Tab View is the tab view container component in the LVGL editor, corresponding to LVGL's `lv_tabview`. It provides a set of switchable tab pages, each an independent content area; users switch displayed content by clicking the tab bar. Suitable for settings pages, multi-function panels, step wizards, and similar scenarios.

Tab View is one of the container components with the most complex child mounting mechanism; child components are mapped to different tab pages via `tabChildMap`, rather than being mounted directly on the tabview itself.

## 2. Component Type Identifier

```
type: 'tabview'
```

## 3. Category

```
category: 'container'  // Container category, icon: 📁
```

Displayed in the component panel as **Tab View**, icon: 📑.

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 250 |
| defaultHeight | 200 |

## 5. Is Container

```
isContainer: true
```

Tab View is a container component; child components are assigned to tab pages via tabChildMap.

## 6. Parent-Child Relationship Design

### Can be a child of the following components

- Can be a direct child of **Screen (page root node)**
- Can be a child of any `isContainer=true` component, including:
  - Container (obj)
  - Button (btn)
  - Another Tab View (nested, not recommended)
  - Tile View (tileview) — Mounted to the corresponding tile
  - Window (win) — Mounted to the content area

### Can contain the following child components

Tab View can contain **all types** of components. Child components logically belong to a tab page, mapped via `tabChildMap`.

### Child Component Mounting Mechanism (Core Design)

Tab View child mounting is one of the editor's core designs, using the **tabChildMap mapping mechanism**:

```
Child component → tabChildMap mapping → Corresponding tab page
```

#### tabChildMap Data Structure

```typescript
tabChildMap: Record<string, string[]>
// key: tab index string (e.g. "0", "1", "2")
// value: child component ID array
```

Example:

```typescript
{
  tabChildMap: {
    "0": ["comp_id_1", "comp_id_2"],  // Child components in Tab 1
    "1": ["comp_id_3"],                // Child components in Tab 2
    "2": []                            // No child components in Tab 3
  }
}
```

#### Mounting Flow

1. **Adding child component** (`addComponent`):
   - New component added to tabview's `children[]` array
   - Store automatically adds new component ID to `tabChildMap[activeTab]`
   - i.e.: New components default to the currently active tab page

   ```typescript
   // editorStore.ts - addComponent
   if (parent?.type === 'tabview') {
     const tabChildMap = { ...(parent.props?.tabChildMap || {}) };
     const activeTab = String(parent.props?.activeTab || 0);
     if (!tabChildMap[activeTab]) tabChildMap[activeTab] = [];
     tabChildMap[activeTab] = [...tabChildMap[activeTab], id];
     get().updateComponent(parentId, { props: { ...parent.props, tabChildMap } });
   }
   ```

2. **Reparenting** (`reparentComponent`):
   - Remove mapping from old parent's childMap
   - Add to new parent (if tabview) `tabChildMap[activeTab]`

   ```typescript
   // editorStore.ts - reparentComponent
   // Remove old mapping
   if (oldParent?.type === 'tabview') {
     const tabChildMap = { ...(oldParent.props?.tabChildMap || {}) };
     for (const key of Object.keys(tabChildMap)) {
       tabChildMap[key] = tabChildMap[key].filter(cid => cid !== id);
     }
     get().updateComponent(comp.parentId, { props: { ...oldParent.props, tabChildMap } });
   }
   // Add new mapping
   if (newParent?.type === 'tabview') {
     const tabChildMap = { ...(newParent.props?.tabChildMap || {}) };
     const activeTab = String(newParent.props?.activeTab || 0);
     if (!tabChildMap[activeTab]) tabChildMap[activeTab] = [];
     tabChildMap[activeTab] = [...tabChildMap[activeTab], id];
     get().updateComponent(newParentId, { props: { ...newParent.props, tabChildMap } });
   }
   ```

3. **Deleting child component** (`deleteComponents`):
   - Clean deleted component IDs from all tabs in parent's `tabChildMap`

   ```typescript
   // editorStore.ts - deleteComponents
   if (parent?.type === 'tabview') {
     const tabChildMap = { ...(parent.props?.tabChildMap || {}) };
     for (const key of Object.keys(tabChildMap)) {
       tabChildMap[key] = tabChildMap[key].filter(cid => cid !== id);
     }
     get().updateComponent(comp.parentId, { props: { ...parent.props, tabChildMap } });
   }
   ```

4. **Fallback mechanism**: Child components not mapped in `tabChildMap` default fallback to the tab page corresponding to `activeTab`.

## 7. Property Design (props)

| Property Name | Type | Default Value | Description |
|--------|------|--------|------|
| tabs | `string[]` | `['Tab 1', 'Tab 2']` | Tab page name array; each element is tab title text |
| activeTab | `number` | `0` | Currently active tab index (0-based) |
| tabPosition | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Tab bar position |
| tabChildMap | `Record<string, string[]>` | `{}` | Tab to child component mapping; key is tab index string, value is child component ID array |
| tabBarSize | `number` | `50` | Tab bar height/width (depends on tabPosition) |

### tabs Property Notes

- Array length determines tab count
- Each element is the tab label display text
- Adding/removing tabs must sync `tabChildMap` updates

### tabChildMap Property Notes

- This is Tab View's most critical property, maintaining child-to-tab page mapping
- Maintained automatically by the Store layer; users generally do not need to edit manually
- key is tab index as string (`"0"`, `"1"`, ...)
- value is array of all child component IDs under that tab
- Unmapped children fallback to activeTab

## 8. Style Design (styles)

### Default Style State (default)

Tab View uses LVGL default theme **scr style** (screen style) + no padding:

| Style Property | Type | Default Value | Description |
|----------|------|--------|------|
| bgColor | `string` | `'#F5F5F5'` | Background color, light gray (LVGL color_scr) |
| borderColor | `string` | `'transparent'` | No border |
| borderWidth | `number` | `0` | Border width 0 |
| borderRadius | `number` | `0` | No corner radius |
| textColor | `string` | `'#212121'` | Text color |
| opacity | `number` | `1` | Fully opaque |
| padding | `number` | `0` | No padding (pad_zero) |

### Supported Style States

| State | Description |
|------|------|
| `default` | Default state, required |
| `pressed` | Pressed state (optional) |
| `focused` | Focused state (optional) |
| `disabled` | Disabled state (optional) |

Note: Tab View styles mainly apply to the overall container. Tab bar and individual tab button styles are controlled by LVGL internal theme; the editor does not currently expose tab bar styling separately.

## 9. Event Support

| Event Type | Description |
|----------|------|
| `LV_EVENT_CLICKED` | Click event |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_VALUE_CHANGED` | **Triggered on tab switch**, most common event |
| `LV_EVENT_FOCUSED` | Focus gained |
| `LV_EVENT_DEFOCUSED` | Focus lost |
| `LV_EVENT_READY` | Ready event |
| `LV_EVENT_CANCEL` | Cancel event |

`LV_EVENT_VALUE_CHANGED` is Tab View's most important event, triggered when the user switches tabs.

## 10. UI Layer Design

### Editor Canvas Rendering (Canvas)

On the canvas, Tab View renders as:

```
┌─────────────────────────────┐
│ [Tab 1] [Tab 2] [Tab 3]    │  ← Tab bar (position determined by tabPosition)
├─────────────────────────────┤
│                             │
│   Child components of the   │  ← Content area
│   current activeTab           │
│                             │
└─────────────────────────────┘
```

- Tab bar displays at top/bottom/left/right per `tabPosition`
- Clicking tabs switches `activeTab`, showing only that tab's child components
- Child visibility determined by `tabChildMap[activeTab]`
- Child components not belonging to current activeTab are hidden on canvas

### Simple Preview Rendering (PreviewPanel)

Similar to canvas rendering but without edit interactions. Tab bar is clickable to switch, showing corresponding tab's child components.

### LVGL WASM Preview Rendering

In `editorStateToJson.ts`, Tab View child components map to tab pages via virtual IDs:

```typescript
// Virtual parent ID format: {tabview_id}__tab__{tabIndex}
// Example: "abc123__tab__0", "abc123__tab__1"

childToVirtualParent[childId] = `${parentComp.id}__tab__${tabIndex}`;
```

In serialized JSON, child components' `parent` field points to virtual ID:

```json
[
  {
    "type": "tabview",
    "id": "abc123",
    "parent": null,
    "props": { "tabs": ["Tab 1", "Tab 2"], "activeTab": 0, "tabPosition": "top", "tabChildMap": {"0": ["child1"], "1": ["child2"]} }
  },
  {
    "type": "label",
    "id": "child1",
    "parent": "abc123__tab__0",
    "props": { "text": "Content 1" }
  },
  {
    "type": "label",
    "id": "child2",
    "parent": "abc123__tab__1",
    "props": { "text": "Content 2" }
  }
]
```

On the WASM side (`ui_from_json.c`):
1. Create tabview: `lv_tabview_create(parent)`
2. Add tab page: `lv_tabview_add_tab(tabview, "Tab 1")` returns tab page object
3. Register tab page with virtual ID (`id__tab__N`) in `id_map`
4. When creating child components, find corresponding tab page as parent via virtual ID in `id_map`

### Code Generation Output (codegen)

In `ui.c.ts`, Tab View generates the following C code:

```c
// Create tabview: TabView_xxxx
TabView_xxxx = lv_tabview_create(parent);
lv_obj_set_pos(TabView_xxxx, 0, 0);
lv_obj_set_size(TabView_xxxx, 250, 200);

// Set tab bar position and size (LVGL v9)
lv_tabview_set_tab_bar_position(TabView_xxxx, LV_DIR_TOP);
lv_tabview_set_tab_bar_size(TabView_xxxx, 50);

// Add tab pages
lv_obj_t * TabView_xxxx_tab_0 = lv_tabview_add_tab(TabView_xxxx, "Tab 1");
lv_obj_t * TabView_xxxx_tab_1 = lv_tabview_add_tab(TabView_xxxx, "Tab 2");

// Child components are created on the corresponding tab page
// Child components in tabChildMap["0"] → parent is TabView_xxxx_tab_0
child_1 = lv_label_create(TabView_xxxx_tab_0);
// Child components in tabChildMap["1"] → parent is TabView_xxxx_tab_1
child_2 = lv_btn_create(TabView_xxxx_tab_1);

// Set active tab (if not the first)
lv_tabview_set_active(TabView_xxxx, 1, LV_ANIM_OFF);
```

Child parent assignment logic in code generation (`ui.c.ts`):

```typescript
// Build child → tab page variable name mapping
const childToTab: Record<string, string> = {};
for (const [tabIndex, childIds] of Object.entries(tabChildMap)) {
  for (const childId of childIds) {
    childToTab[childId] = `${varName}_tab_${tabIndex}`;
  }
}
// Unmapped children fallback to activeTab
const defaultTab = `${varName}_tab_${component.props.activeTab || 0}`;
for (const child of component.children) {
  const tabParent = childToTab[child.id] || defaultTab;
  generateComponentCode(child, tabParent, ...);
}
```

## 11. LVGL API Mapping

### LVGL v9 Creation Function

```c
lv_obj_t * lv_tabview_create(lv_obj_t * parent);
```

Note: LVGL v8 has a different signature: `lv_tabview_create(parent, dir, tab_size)`; the editor auto-adapts in v8 mode.

### Key APIs

| API | Description |
|-----|------|
| `lv_tabview_create(parent)` | Create tabview (v9) |
| `lv_tabview_add_tab(tabview, name)` | Add a tab page, returns tab page object (`lv_obj_t *`) |
| `lv_tabview_set_active(tabview, index, anim)` | Set active tab |
| `lv_tabview_set_tab_bar_position(tabview, dir)` | Set tab bar position (v9); dir is `LV_DIR_TOP/BOTTOM/LEFT/RIGHT` |
| `lv_tabview_set_tab_bar_size(tabview, size)` | Set tab bar size (v9) |
| `lv_tabview_get_active(tabview)` | Get current active tab index |
| `lv_tabview_get_tab_bar(tabview)` | Get tab bar object |
| `lv_tabview_get_content(tabview)` | Get content area object |

### LVGL Source Reference

Tab View implementation is in `tools/lvgl/src/widgets/tabview/lv_tabview.c`, internal structure:

```
tabview (lv_obj)
├── tab_bar (lv_obj, contains tab buttons)
│   ├── tab_btn_0 (lv_btn)
│   ├── tab_btn_1 (lv_btn)
│   └── ...
└── content (lv_obj, contains tab pages)
    ├── tab_page_0 (lv_obj)
    ├── tab_page_1 (lv_obj)
    └── ...
```

## 12. Design Notes

1. **tabChildMap is core**: Tab View child mounting fully depends on `tabChildMap`. The Store layer maintains this mapping automatically in `addComponent`, `reparentComponent`, and `deleteComponents` to ensure data consistency.

2. **Design-time tab switching**: On the editor canvas, clicking tab labels updates the `activeTab` property, switching displayed child components. This is editor-only behavior and does not affect runtime.

3. **New child default assignment**: Child components added via drag-and-drop to Tab View default to current `activeTab`. Users must switch to the target tab before adding child components.

4. **Tab add/remove sync**: When adding or removing tabs, `tabChildMap` must be updated. When deleting a tab, child components on that tab must be migrated to another tab or deleted.

5. **WASM preview virtual IDs**: WASM preview uses virtual IDs in `{id}__tab__{N}` format to identify tab pages. These are not real component IDs; used only for parent lookup on the WASM side.

6. **v8/v9 API differences**:
   - v9: `lv_tabview_create(parent)` + `lv_tabview_set_tab_bar_position()` + `lv_tabview_set_tab_bar_size()`
   - v8: `lv_tabview_create(parent, dir, tab_size)` specifies position and size at creation

7. **Performance**: Each tab page is a full lv_obj; invisible tabs still consume memory. Watch memory usage when tab count exceeds 10.

8. **Tab bar styling**: The editor does not currently expose tab bar and tab button style configuration. Tab bar appearance is controlled by LVGL default theme. Custom tab bar styling may be supported in the future.

9. **Nested containers**: Tab pages can contain other container components (Container, another Tab View) for complex nested layouts. Note UX when nesting Tab Views.
