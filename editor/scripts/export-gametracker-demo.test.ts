/**
 * Export GameTracker Demo generated C to common/ui_generated/ for firmware.
 * Run: npm run export:gametracker-demo
 * @vitest-environment node
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import { describe, expect, it } from 'vitest';
import { generateCode } from '../src/codegen';
import {
  DEFAULT_IMAGE_OPTIONS,
  generateImageCCode,
} from '../src/resources/converters/imageConverter';
import type { Page } from '../src/types';
import type { FontResource, ImageResource } from '../src/resources/types';
import type { LogicGraph } from '../src/components/LogicEditor/types';
import type { CodeGenOptions } from '../src/codegen/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const demoPath = join(repoRoot, 'examples', 'GameTracker Demo.lvgl.json');
const lvglTargetPath = join(repoRoot, 'common', 'lvgl-target.json');
const assetsDir = join(repoRoot, 'examples', 'assets');
const exportDir = join(repoRoot, 'common', 'ui_generated');

function loadImageAsImageData(filePath: string): ImageData {
  const buffer = readFileSync(filePath);
  if (filePath.toLowerCase().endsWith('.jpg') || filePath.toLowerCase().endsWith('.jpeg')) {
    const decoded = jpeg.decode(buffer, { useTArray: true });
    return {
      width: decoded.width,
      height: decoded.height,
      data: new Uint8ClampedArray(decoded.data),
    } as ImageData;
  }

  const png = PNG.sync.read(buffer);
  return {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length),
  } as ImageData;
}

function collectUsedImages(
  pages: Page[],
  imageResources: ImageResource[],
): ImageResource[] {
  const usedIds = new Set<string>();
  const walk = (components: Page['components']) => {
    for (const comp of components) {
      if (comp.type === 'img' && comp.props.src) {
        const matched = imageResources.find(
          (img) => img.id === comp.props.src || img.name === comp.props.src,
        );
        if (matched) usedIds.add(matched.id);
      }
      walk(comp.children);
    }
  };
  for (const page of pages) walk(page.components);
  return imageResources.filter((img) => usedIds.has(img.id));
}

describe('export gametracker demo', () => {
  it('writes generated C (LVGL 9) + images to common/ui_generated/', () => {
    const lvglTarget = JSON.parse(readFileSync(lvglTargetPath, 'utf8')) as {
      codegenVersion: '9';
    };

    const project = JSON.parse(readFileSync(demoPath, 'utf8')) as {
      pages: Page[];
      codeGenOptions?: Partial<CodeGenOptions>;
      logicGraphs?: LogicGraph[];
      resources?: { images?: ImageResource[]; fonts?: FontResource[] };
      lvglConfig?: {
        defaultFont?: string;
        defaultFontSize?: number;
        useBuiltinSymbols?: boolean;
        symbolFont?: string;
      };
    };

    const options: Partial<CodeGenOptions> = {
      ...(project.codeGenOptions ?? {}),
      lvglVersion: lvglTarget.codegenVersion,
    };

    const pages = project.pages;
    const logicGraphs = project.logicGraphs ?? [];
    const imageResources = project.resources?.images ?? [];
    const fontResources = project.resources?.fonts ?? [];

    const code = generateCode(
      pages,
      options,
      logicGraphs,
      undefined,
      imageResources,
      fontResources,
      project.lvglConfig?.defaultFont,
      project.lvglConfig?.defaultFontSize,
      project.lvglConfig?.useBuiltinSymbols,
      project.lvglConfig?.symbolFont,
    );

    const files: Record<string, string> = { ...code };

    for (const img of collectUsedImages(pages, imageResources)) {
      const assetPath = join(assetsDir, img.originalName ?? `${img.name}.png`);
      const imageData = loadImageAsImageData(assetPath);
      const convOptions = { ...DEFAULT_IMAGE_OPTIONS, format: img.format };
      files[`${img.cArrayName}.c`] = generateImageCCode(
        img.cArrayName,
        imageData,
        convOptions,
        lvglTarget.codegenVersion,
      ).cCode;
    }

    expect(files['ui.c']).toContain('ui_pb_health');
    expect(files['ui.c']).toContain('LV_IMAGE_DECLARE');
    expect(files['ui_logic.c']).toContain('lv_timer_create(');
    expect(files['img_vault_boy_alive.c']).toBeTruthy();
    expect(files['img_vault_boy_dead.c']).toBeTruthy();

    mkdirSync(exportDir, { recursive: true });
    for (const [fileName, content] of Object.entries(files)) {
      writeFileSync(join(exportDir, fileName), content, 'utf8');
    }

    const written = Object.keys(files).sort();
    console.log(`Exported ${written.length} files to ${exportDir}:`);
    for (const name of written) {
      console.log(`  ${name}`);
    }
  });
});
