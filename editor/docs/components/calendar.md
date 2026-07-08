# Calendar (calendar) — Calendar Component Design Document

## 1. Component Name and Overview

Calendar is a date display and selection component that presents a date grid in month view. It supports setting the currently displayed year/month, highlighting today's date, marking specific dates, date range selection, and other features. In embedded UIs it is commonly used for date pickers, schedule management, countdown interfaces, smart home timer settings, and similar scenarios.

## 2. Component Type Identifier

```
type: 'calendar'
```

## 3. Category

| Category ID | Category Name | Icon |
|---------|---------|------|
| display | Display | 📅 |

## 4. Default Dimensions

| Property | Value |
|------|-----|
| defaultWidth | 220 |
| defaultHeight | 220 |

Calendar requires a larger size to accommodate the month title, weekday header row, and 6-row date grid.

## 5. Container Status

```
isContainer: false
```

Calendar is a pure display component and cannot contain child components.

## 6. Parent-Child Relationship Design

### Can be a child of the following components

- `obj` (Container)
- `btn` (Button)
- `tabview` (Tab View, placed within a tab page)
- `tileview` (Tile View, placed within a tile)
- `win` (Window, placed within the content area)
- Screen root node (Screen)

### Child components it can contain

None. `isContainer: false`; does not accept any child components.

## 7. Property Design (props)

| Property | Type | Default | Description |
|--------|------|--------|------|
| `year` | `number` | `2024` | Currently displayed year |
| `month` | `number` | `1` | Currently displayed month (1-12) |
| `showDayNames` | `boolean` | `true` | Whether to show weekday header row (Sun, Mon, Tue...Sat) |
| `showToday` | `boolean` | `true` | Whether to highlight today's date |
| `highlightedDates` | `HighlightedDate[]` | `[]` | List of dates to highlight/mark |
| `dateRangeMode` | `boolean` | `false` | Whether to enable date range selection mode |
| `rangeStart` | `string` | `''` | Range start date (format: `'YYYY-MM-DD'`) |
| `rangeEnd` | `string` | `''` | Range end date (format: `'YYYY-MM-DD'`) |

### HighlightedDate Type Definition

```typescript
interface HighlightedDate {
  year: number;
  month: number;
  day: number;
}
```

### Property Constraints

- `month` range is 1-12
- `year` should be a reasonable year (e.g., 1970-2099)
- Dates in `highlightedDates` should be valid dates
- `rangeStart` and `rangeEnd` only take effect when `dateRangeMode: true`
- `rangeStart` should be earlier than or equal to `rangeEnd`

## 8. Style Design (styles)

### Default Style (default state) — Card Style

| Style Property | Default | Description |
|----------|--------|------|
| `bgColor` | `#ffffff` | White background (card style) |
| `borderColor` | `#E0E0E0` | Gray border (color_grey) |
| `borderWidth` | `2` | Border width |
| `borderRadius` | `8` | Corner radius |
| `textColor` | `#212121` | Date number text color |
| `opacity` | `1` | Fully opaque |
| `padding` | `0` | No outer padding (internal layout manages spacing) |

### Supported Style States

| State | Description |
|------|------|
| `default` | Default state, always applied |
| `pressed` | Pressed state (when a date is clicked) |
| `focused` | Focused state |
| `disabled` | Disabled state |

### Internal Area Styles

| Area | Editor Rendering | LVGL Part |
|------|-----------|-----------|
| Month title bar | Blue background `#2196F3`, white text | `LV_PART_MAIN` (calendar header) |
| Weekday header row | Gray text `#666`, 10px font size | day names area |
| Date grid | Black text `#212121`, 10px font size | `LV_PART_ITEMS` |
| Today's date | LVGL default highlight | `lv_calendar_set_today_date` |
| Highlighted dates | LVGL default mark style | `lv_calendar_set_highlighted_dates` |

## 9. Event Support

| Event Type | Description |
|----------|------|
| `LV_EVENT_CLICKED` | Click event (date clicked) |
| `LV_EVENT_PRESSED` | Press event |
| `LV_EVENT_RELEASED` | Release event |
| `LV_EVENT_LONG_PRESSED` | Long press event |
| `LV_EVENT_VALUE_CHANGED` | Value changed event (triggered when selected date changes) |
| `LV_EVENT_FOCUSED` | Gained focus |
| `LV_EVENT_DEFOCUSED` | Lost focus |

### Date Selection

LVGL calendar supports obtaining the clicked date via `lv_calendar_get_pressed_date(calendar, &date)`, usable in `LV_EVENT_VALUE_CHANGED` callbacks.

## 10. UI Layer Design

### Editor Canvas Rendering (CanvasComponent.tsx)

```tsx
<div className="lvgl-calendar" style={{
  width: '100%', height: '100%',
  fontSize: '10px',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden', color: '#333',
}}>
  {/* Month title bar */}
  <div style={{
    textAlign: 'center', padding: '6px 4px',
    fontWeight: 'bold', borderBottom: '1px solid #eee',
    backgroundColor: '#f8f8f8',
  }}>
    {props.year || 2024} / {props.month || 1}
  </div>

  {/* Date grid */}
  <div style={{
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px', flex: 1, padding: '2px',
  }}>
    {/* Weekday headers */}
    {['日', '一', '二', '三', '四', '五', '六'].map(d => (
      <div key={d} style={{
        textAlign: 'center', fontWeight: 'bold',
        color: '#666', padding: '2px 0',
      }}>{d}</div>
    ))}
    {/* Date numbers (simplified to 1-28) */}
    {Array.from({ length: 28 }).map((_, i) => (
      <div key={i} style={{ textAlign: 'center', padding: '1px 0' }}>
        {i + 1}
      </div>
    ))}
  </div>
</div>
```

Key points:
- Uses flex vertical layout: title bar + date grid
- Date grid uses CSS Grid with 7 columns
- Simplified rendering: fixed display of days 1-28, does not calculate actual month days or starting weekday
- Title bar displays `year/month` format

### Simple Preview Rendering (PreviewPanel.tsx — Canvas 2D)

```typescript
function drawCalendar(ctx, x, y, w, h, opts) {
  // Background (card style)
  ctx.fillStyle = opts.bgColor;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill(); ctx.stroke();

  const headerH = 30;
  const dayHeaderH = 20;

  // Month title bar (blue background)
  ctx.fillStyle = '#2196F3';
  roundRect(ctx, x, y, w, headerH, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${opts.year}年 ${monthNames[opts.month - 1]}`,
    x + w / 2, y + headerH / 2);

  // Weekday header row
  const cellW = w / 7;
  ctx.fillStyle = '#666';
  ctx.font = '10px sans-serif';
  for (let i = 0; i < 7; i++) {
    ctx.fillText(days[i], x + cellW * i + cellW / 2,
      y + headerH + dayHeaderH / 2);
  }

  // Date numbers (calculate actual month)
  const firstDay = new Date(opts.year, opts.month - 1, 1).getDay();
  const daysInMonth = new Date(opts.year, opts.month, 0).getDate();
  const cellH = Math.min(18, (h - headerH - dayHeaderH) / 6);
  let day = 1;
  for (let row = 0; row < 6 && day <= daysInMonth; row++) {
    for (let col = 0; col < 7 && day <= daysInMonth; col++) {
      if (row === 0 && col < firstDay) continue;
      ctx.fillText(`${day}`,
        x + cellW * col + cellW / 2,
        y + headerH + dayHeaderH + cellH * row + cellH / 2);
      day++;
    }
  }
}
```

Key points:
- Blue title bar displays year and month
- Calculates actual month days and starting weekday
- Renders at most 6 rows of dates
- Cell size adapts to component height

### LVGL WASM Preview Rendering

**editorStateToJson.ts**: Props (year, month, showDayNames, showToday, highlightedDates, etc.) are fully serialized.

**ui_from_json.c**:

```c
static lv_obj_t *create_calendar(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *cal = lv_calendar_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int year = cjson_get_int(props, "year", 2026);
        int month = cjson_get_int(props, "month", 1);
        lv_calendar_set_today_date(cal, year, month, 1);
        lv_calendar_set_showed_date(cal, year, month);
    }
    return cal;
}
```

Key points:
- Uses `lv_calendar_create` to create a real LVGL calendar
- Sets today's date and displayed month
- Current WASM implementation does not handle `highlightedDates` (can be extended)

### Code Generation Output (ui.c.ts)

```c
// Create
lv_obj_t *calendar_1 = lv_calendar_create(parent);
lv_obj_set_pos(calendar_1, 10, 10);
lv_obj_set_size(calendar_1, 220, 220);

// Style (card style)
lv_obj_set_style_bg_color(calendar_1, lv_color_hex(0xFFFFFF), 0);
lv_obj_set_style_bg_opa(calendar_1, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(calendar_1, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(calendar_1, 2, 0);
lv_obj_set_style_radius(calendar_1, 8, 0);

// Display month
lv_calendar_set_showed_date(calendar_1, 2024, 1);

// Today's date
lv_calendar_set_today_date(calendar_1, 2024, 1, 1);
```

**Highlighted dates:**

```c
// When highlightedDates is not empty
static lv_calendar_date_t calendar_1_hl_dates[] = {
    {.year = 2024, .month = 1, .day = 15},
    {.year = 2024, .month = 1, .day = 20},
};
lv_calendar_set_highlighted_dates(calendar_1, calendar_1_hl_dates, 2);
```

**Hide weekday headers:**

```c
// showDayNames === false
// Note: Day names visibility needs custom header configuration
```

## 11. LVGL API Mapping

### Creation Function

| LVGL Version | Function |
|-----------|------|
| v8 / v9 | `lv_calendar_create(parent)` |

### Key APIs

| API | Description |
|-----|------|
| `lv_calendar_set_today_date(cal, year, month, day)` | Set today's date (highlighted display) |
| `lv_calendar_set_showed_date(cal, year, month)` | Set currently displayed year/month |
| `lv_calendar_set_highlighted_dates(cal, dates, cnt)` | Set highlighted/marked date list |
| `lv_calendar_get_pressed_date(cal, &date)` | Get clicked date |
| `lv_calendar_header_arrow_create(cal)` | Create month navigation header with arrows (v9) |
| `lv_calendar_header_dropdown_create(cal)` | Create month navigation header with dropdown (v9) |

### LVGL Date Structure

```c
typedef struct {
    uint32_t year;
    uint32_t month;  // 1-12
    uint32_t day;    // 1-31
} lv_calendar_date_t;
```

### LVGL Parts

| Part | Description |
|------|------|
| `LV_PART_MAIN` | Calendar background |
| `LV_PART_ITEMS` | Date cells |

### Default Theme Styles (lv_theme_default)

- **MAIN part**: card style — `bg_color=#FFFFFF, border_color=#E0E0E0, border_width=2, radius=8, pad=0`
- **ITEMS part**: Date cell styles
- **Header**: LVGL calendar can optionally add header components (arrow navigation or dropdown selection)

## 12. Design Notes

1. **Month navigation header**: LVGL v9 provides `lv_calendar_header_arrow_create` and `lv_calendar_header_dropdown_create` navigation headers. The editor does not currently expose navigation headers as a configurable option, and code generation does not add them automatically. Users can add them in custom code.

2. **Simplified canvas rendering**: Calendar rendering in the editor canvas is simplified (fixed 28 days), without calculating actual month days or starting weekday. Simple preview (Canvas 2D) calculates the real calendar layout. Full appearance should be viewed in WASM preview.

3. **Static array for highlighted dates**: Code generation uses a `static` array for `highlightedDates` because `lv_calendar_set_highlighted_dates` does not copy data—it only stores a pointer. The array must remain valid for the calendar's lifetime.

4. **showDayNames implementation**: LVGL calendar shows weekday headers by default. Hiding weekday headers requires custom header configuration; current code generation only outputs a comment hint without implementing the hide logic.

5. **Date range mode**: `dateRangeMode`, `rangeStart`, and `rangeEnd` are editor extension properties; LVGL does not natively support date range selection. Implementation requires custom logic in event callbacks, combined with `highlightedDates` to mark dates within the range.

6. **Size constraints**: LVGL calendar has minimum size requirements (must accommodate 7×6 date grid + title). Too small a size causes date text overlap. The editor can set minimum width/height constraints (recommended ≥ 180×180).

7. **Internationalization**: The editor canvas currently uses Chinese weekday headers (日, 一, 二...六). LVGL weekday headers can be customized via `lv_calendar_set_day_names`. Code generation does not handle internationalization; uses LVGL default English abbreviations.

8. **WASM preview extension**: Current `ui_from_json.c` does not handle `highlightedDates` and `showDayNames`. To fully reproduce the editor design, extend the C side to parse the `highlightedDates` JSON array and call `lv_calendar_set_highlighted_dates`.

9. **Dynamic today date**: The `showToday` property in code generation uses `year`/`month` from props + day=1 as today's date. In real applications this should be replaced with the actual runtime date (e.g., via RTC). Code generation output includes comments reminding users to update.
