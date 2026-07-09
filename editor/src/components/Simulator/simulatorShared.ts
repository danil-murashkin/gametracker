import type { LvglComponent } from '../../types';
import type { FontResource, ImageResource } from '../../resources/types';
import { loadImageFromBase64, generateImageCCode, DEFAULT_IMAGE_OPTIONS } from '../../resources/converters/imageConverter';
import { getCharsetRanges } from '../../resources/converters/fontConverter';
import type { FontCompileRequest } from '../CompilePreview/compilerService';

/** Map JS keyboard event.key to LVGL key codes */
export const LV_KEY_MAP: Record<string, number> = {
  Enter: 10,
  Escape: 27,
  Backspace: 8,
  Delete: 127,
  ArrowRight: 19,
  ArrowLeft: 20,
  ArrowUp: 17,
  ArrowDown: 18,
  Tab: 9,
  Home: 2,
  End: 3,
};

/** Hardware GPIO buttons — same keys as Simulator tab (↑/+ = value_1, ↓/− = value_2) */
export const HW_BUTTON_KEYS: Record<string, 1 | 2> = {
  ArrowUp: 1,
  '+': 1,
  '=': 1,
  NumpadAdd: 1,
  ArrowDown: 2,
  '-': 2,
  NumpadSubtract: 2,
};

export function isHardwareButtonKey(key: string): key is keyof typeof HW_BUTTON_KEYS {
  return key in HW_BUTTON_KEYS;
}

export function renderFramebuffer(
  canvas: HTMLCanvasElement,
  fbData: Uint8Array,
  width: number,
  height: number,
): void {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const off = i * 4;
    pixels[off] = fbData[off + 2];
    pixels[off + 1] = fbData[off + 1];
    pixels[off + 2] = fbData[off];
    pixels[off + 3] = fbData[off + 3] || 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

export function collectUsedCustomFontSizes(
  pages: { components: LvglComponent[] }[],
  fontResources: FontResource[],
  defaultFont?: string,
  defaultFontSize?: number,
): Map<string, Set<number>> {
  const usedFonts = new Map<string, Set<number>>();
  const isBuiltin = (name: string) => /^montserrat_\d+$/.test(name);
  const customFontNames = new Set(fontResources.map((f) => f.cFontName));

  const addFont = (fontName: string, size: number) => {
    if (!usedFonts.has(fontName)) {
      usedFonts.set(fontName, new Set());
    }
    usedFonts.get(fontName)!.add(size);
  };

  const walkComponents = (components: LvglComponent[]) => {
    for (const comp of components) {
      if (comp.props.fontResource) {
        const fontName = comp.props.fontResource as string;
        if (!isBuiltin(fontName) && customFontNames.has(fontName)) {
          addFont(fontName, (comp.props.fontSize as number) || 16);
        }
      } else if (
        comp.props.fontSize !== undefined &&
        defaultFont &&
        !isBuiltin(defaultFont) &&
        customFontNames.has(defaultFont)
      ) {
        const fontSize = comp.props.fontSize as number;
        if (fontSize !== (defaultFontSize || 16)) {
          addFont(defaultFont, fontSize);
        }
      }
      if (comp.styles.default.textFont) {
        const fontName = comp.styles.default.textFont;
        if (!isBuiltin(fontName) && customFontNames.has(fontName)) {
          addFont(fontName, comp.styles.default.textFontSize || 16);
        }
      }
      for (const state of ['pressed', 'focused', 'disabled'] as const) {
        const stateStyles = comp.styles[state];
        if (stateStyles?.textFont) {
          const fontName = stateStyles.textFont;
          if (!isBuiltin(fontName) && customFontNames.has(fontName)) {
            addFont(fontName, stateStyles.textFontSize || 16);
          }
        }
      }
      walkComponents(comp.children);
    }
  };

  for (const page of pages) {
    walkComponents(page.components);
  }

  if (defaultFont && !isBuiltin(defaultFont) && customFontNames.has(defaultFont)) {
    addFont(defaultFont, defaultFontSize || 16);
  }

  return usedFonts;
}

export async function buildCompileUserFiles(
  code: Record<string, string>,
  pages: { components: LvglComponent[] }[],
  imageResources: ImageResource[],
): Promise<Record<string, string>> {
  const userFiles: Record<string, string> = Object.fromEntries(Object.entries(code));

  if (imageResources.length === 0) {
    return userFiles;
  }

  const usedImageIds = new Set<string>();
  const walkImages = (components: LvglComponent[]) => {
    for (const comp of components) {
      if (comp.type === 'img' && comp.props.src) {
        const matched = imageResources.find(
          (img) => img.id === comp.props.src || img.name === comp.props.src,
        );
        if (matched) usedImageIds.add(matched.id);
      }
      walkImages(comp.children);
    }
  };

  for (const page of pages) walkImages(page.components);

  const usedImages = imageResources.filter((img) => usedImageIds.has(img.id));
  for (const img of usedImages) {
    try {
      const { imageData } = await loadImageFromBase64(img.data);
      const convOptions = { ...DEFAULT_IMAGE_OPTIONS, format: img.format };
      const result = generateImageCCode(img.cArrayName, imageData, convOptions);
      userFiles[`${img.cArrayName}.c`] = result.cCode;
    } catch (err) {
      console.error(`Failed to generate C code for image ${img.name}:`, err);
    }
  }

  return userFiles;
}

export function buildFontRequests(
  pages: { components: LvglComponent[] }[],
  fontResources: FontResource[],
  defaultFont?: string,
  defaultFontSize?: number,
): FontCompileRequest[] {
  const usedFontSizes = collectUsedCustomFontSizes(pages, fontResources, defaultFont, defaultFontSize);
  return fontResources
    .filter((font) => usedFontSizes.has(font.cFontName))
    .map((font) => {
      const ranges = getCharsetRanges(font.charset, font.customChars);
      const rangeStr =
        ranges.length > 0
          ? ranges.map(([start, end]) => `0x${start.toString(16)}-0x${end.toString(16)}`).join(',')
          : '0x20-0x7E';
      const sizes = [...usedFontSizes.get(font.cFontName)!].sort((a, b) => a - b);
      return {
        data: font.data,
        cFontName: font.cFontName,
        sizes,
        ranges: rangeStr,
        bpp: font.bpp,
      };
    });
}
