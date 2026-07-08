# Font Integration Design Document

## 1. Overall Architecture

The LVGL Editor font system supports built-in fonts and user-uploaded custom fonts (TTF/OTF). Font size is selected per component as needed. At compile time, all actually used font + size combinations are collected dynamically and converted to LVGL C source files via `lv_font_conv`.

```
User-uploaded fonts (TTF/OTF)
       │
       ▼
  ResourceStore (frontend state management)
  ├── Parse font metadata (family, style)
  ├── Store base64 data
  └── Generate cFontName (e.g. ui_font_noto)
       │
       ▼
  Project Settings
  ├── Select default font (built-in or custom)
  └── When using a custom default font, select default font size
       │
       ▼
  Component Property Panel
  ├── Select font (default / built-in / custom)
  ├── Built-in fonts: fixed size (encoded in name, e.g. montserrat_14)
  └── Custom fonts: selectable 8–48px font size
       │
       ▼
  Code Generation (codegen)
  ├── Scan all components, collect actually used font + size combinations
  ├── ui.h: LV_FONT_DECLARE(ui_font_noto_16)
  ├── ui.c: Set default font for each screen
  └── ui.c: Generate font-setting code only for components whose font/size differs from default
       │
       ▼
  Compile Preview (CompilePreview)
  ├── Dynamically collect all used custom font + size combinations
  ├── Build FontCompileRequest (base64 + conversion parameters)
  └── POST /api/compile (files + fonts)
       │
       ▼
  Server (vite-plugin-compile)
  ├── Decode base64 → temporary .ttf/.otf files
  ├── Call lv_font_conv for each size to generate .c files
  └── Compile with UI code via emcc → WASM
```

## 2. Font Types

### 2.1 Built-in Fonts

LVGL built-in Montserrat fonts with size fixed in the name:

- `montserrat_8` ~ `montserrat_48` (even sizes)
- Default font: `montserrat_14`
- When selecting a built-in font, **font size cannot be set separately** (size is determined by the font name)

### 2.2 Custom Fonts

User-uploaded TTF/OTF font files:

- Upload configuration requires only: name, C variable name, charset, BPP
- **No need to select font size at upload time** — size is chosen per component in the property panel
- At compile time, all required sizes are generated dynamically based on actual usage

## 3. Default Font Mechanism

### 3.1 Project Settings

Configured in Project Settings (`ProjectSettings`):

- **Default font**: Built-in font or an uploaded custom font
- **Default font size**: Shown only when the default font is custom; selectable 8–48px

Configuration is stored in `ProjectConfig.lvglConfig`:

```typescript
interface LvglConfig {
  defaultFont: string;        // e.g. "montserrat_14" or "ui_font_noto"
  defaultFontSize?: number;   // Required only for custom fonts, e.g. 16
  // ...
}
```

### 3.2 Inheritance Rules

- Each screen (page) sets the default font during initialization
- Components inherit the font settings of their screen by default
- Font-setting code is generated only for components whose font or size differs from the default

## 4. Component Font Selection

### 4.1 Property Panel Behavior

The `ComponentFontSelector` component provides three options:

| Selection | Font Size Selector | Behavior |
|-----------|-------------------|----------|
| **Default** | Shown for custom default font; hidden for built-in default font | Inherits project default font; optional different size |
| **Built-in font** | Hidden | Uses the specified built-in font (fixed size) |
| **Custom font** | Shown (8–48px) | Uses the specified custom font + selected size |

### 4.2 Code Generation Logic

For each component, the code generator performs the following checks:

```
Component has no font set (fontResource is empty)
  → No font code generated (inherits default)

Component font == default font AND size == default size
  → No font code generated (inherits default)

Component font == default font BUT size != default size
  → Generate lv_obj_set_style_text_font (same font, different size)

Component font != default font
  → Generate lv_obj_set_style_text_font (different font)
```

## 5. End-to-End Flow

### 5.1 Font Upload

When the user uploads a TTF/OTF file via the resource management panel, the frontend:

1. `fontFileToBase64()` converts the file to a base64 data URI
2. `parseFontMetadata()` parses the font name table to extract family and style
3. Generates `cFontName` (format: `ui_font_<sanitized_name>`)
4. Stores in the `ResourceStore.fonts` array

### 5.2 Code Generation

When `generateCode()` is called:

1. **Collect font usage**: `collectUsedCustomFonts()` traverses all components on all pages, collecting actually used custom font + size combinations
2. **ui.h**: Generates `LV_FONT_DECLARE(cFontName_size)` for each used font + size combination
3. **ui.c screen init**: Sets the project default font for each screen
4. **ui.c components**: Generates `lv_obj_set_style_text_font` only for components whose font/size differs from the default

### 5.3 Compile Preview

`CompilePreview.handleCompile()` executes:

1. `collectUsedCustomFontSizes()` dynamically collects all custom font + size combinations actually used by components
2. Calls `generateCode()` to generate C source files
3. Converts font resources to `FontCompileRequest[]`, where `sizes` is the dynamically collected size array
4. Calls `compileCode(userFiles, width, height, onStatus, fontRequests)`

### 5.4 Server-Side Font Conversion

The `/api/compile` endpoint in `vite-plugin-compile.ts`:

1. Receives the `fonts` array
2. For each font:
   - Decodes base64 and writes to a temporary file
   - Calls `lv_font_conv` for each size to generate `.c` files
   - Reads the generated C source file content
3. Adds font `.c` files to the emcc compilation source file list

### 5.5 Compilation Output

emcc compiles all `.c` files (UI code + font C arrays) into `output.js` + `output.wasm`, which runs in the browser.

## 6. Canvas Preview

Component previews on the design canvas (Canvas) also reflect the default font size:

- `appStore.defaultFontSize` stores the current project's default font size
- `CanvasComponent` reads this value as the default font size for text components (btn, label, checkbox, etc.)
- When a component has its own `fontSize` set, the component's value is used

## 7. Key Files

| File | Responsibility |
|------|----------------|
| `src/store/projectStore.ts` | `LvglConfig` type definition (includes `defaultFont`, `defaultFontSize`) |
| `src/store/appStore.ts` | `defaultFontSize` state, `parseFontSize()` utility |
| `src/resources/types.ts` | `FontResource` type definition |
| `src/resources/converters/fontConverter.ts` | Font metadata parsing, charset range calculation, lv_font_conv command generation |
| `src/components/ProjectSettings/ProjectSettings.tsx` | Project settings UI (default font + default font size) |
| `src/components/PropertyEditor/PropertyEditor.tsx` | Component font selector (`ComponentFontSelector`) |
| `src/components/Canvas/CanvasComponent.tsx` | Canvas component preview (reads `defaultFontSize`) |
| `src/codegen/templates/ui.h.ts` | Generates `LV_FONT_DECLARE` declarations (only for actually used combinations) |
| `src/codegen/templates/ui.c.ts` | Component font code generation (includes inheritance logic) |
| `src/codegen/generator.ts` | Code generation entry point, passes `defaultFont` and `defaultFontSize` |
| `src/components/CompilePreview/CompilePreview.tsx` | Compile preview, dynamically collects sizes and builds font requests |
| `src/components/CompilePreview/compilerService.ts` | Compile service client, sends font data |
| `vite-plugin-compile.ts` | Server-side compile plugin, calls lv_font_conv and compiles |

## 8. lv_font_conv Usage

### Installation

```bash
npm install -g lv_font_conv
```

### Command Format

```bash
lv_font_conv \
  --font <input.ttf> \
  --size=<N> \
  --bpp=<1|2|4|8> \
  --range=<start>-<end> \
  --format=lvgl \
  --output=<name>.c \
  --no-compress
```

### Example

```bash
lv_font_conv \
  --font NotoSansSC-Regular.ttf \
  --size=16 \
  --bpp=4 \
  --range=0x20-0x7e \
  --format=lvgl \
  --output=ui_font_noto_16.c \
  --no-compress
```

The generated `.c` file contains a global variable `lv_font_t ui_font_noto_16`; the variable name is taken from the output filename (without `.c`).

## 9. Font Variable Naming Conventions

| Level | Format | Example |
|-------|--------|---------|
| cFontName | `ui_font_<name>` | `ui_font_noto` |
| Variable name with size | `<cFontName>_<size>` | `ui_font_noto_16` |
| ui.h declaration | `LV_FONT_DECLARE(<var>)` | `LV_FONT_DECLARE(ui_font_noto_16)` |
| ui.c reference | `&<var>` | `&ui_font_noto_16` |
| lv_font_conv output | `--output=<var>.c` | `--output=ui_font_noto_16.c` |

The `LV_FONT_DECLARE(x)` macro expands to `extern const lv_font_t x;`, matching the global variable declaration generated by `lv_font_conv`.

## 10. Supported Charsets and Configuration Options

### Charset Presets

| ID | Name | Unicode Range |
|----|------|---------------|
| `ascii` | ASCII | 0x20-0x7E |
| `latin` | Latin Extended | 0x20-0x7E, 0xA0-0x24F |
| `cjk-basic` | CJK Basic | 0x20-0x7E, 0x4E00-0x9FFF |
| `custom` | Custom | User-specified character list |

### BPP (Anti-aliasing Bit Depth)

- **1 bpp**: No anti-aliasing, smallest size
- **2 bpp**: 4-level grayscale
- **4 bpp**: 16-level grayscale (recommended)
- **8 bpp**: 256-level grayscale, best quality

### Configuration Options

- `charset: CharsetType` — Charset type
- `customChars?: string` — Character list when using a custom charset
- `bpp: 1 | 2 | 4 | 8` — Anti-aliasing bit depth
- `compress: boolean` — Whether to compress (compile preview currently uses `--no-compress`)

## 11. Known Limitations and Future Improvements

### Known Limitations

- **Large CJK character set**: `cjk-basic` includes approximately 20,000 Chinese characters; generated C files can reach several MB, with long compile times
- **Server dependency**: Requires globally installed `lv_font_conv`; errors if not installed
- **No font subsetting**: Custom charsets require users to manually specify characters; no automatic analysis of characters actually used in the UI
- **No caching**: Fonts are re-converted on every compile; no caching of previously converted results

### Future Improvements

1. **Font conversion cache**: Cache conversion results based on font hash + size + charset + bpp to avoid redundant conversions
2. **Automatic charset extraction**: Analyze all text content in the UI to automatically generate a minimal charset
3. **WASM version of lv_font_conv**: Compile lv_font_conv to WASM for in-browser conversion, eliminating server dependency
4. **Font preview**: Use CSS @font-face in the resource management panel to preview uploaded fonts
5. **Font merging**: Support merging different ranges from multiple fonts into a single LVGL font (lv_font_conv `--font` can be specified multiple times)
6. **Progress feedback**: Provide a progress bar or estimated time for large charset conversions
