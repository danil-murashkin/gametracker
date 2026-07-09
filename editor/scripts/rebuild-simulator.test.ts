/**
 * Rebuild Simulator WASM from GameTracker Demo via dev-server /api/compile.
 * Run: npm run rebuild:simulator
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { generateCode } from '../src/codegen';
import { buildCompileUserFiles, buildFontRequests } from '../src/components/Simulator/simulatorShared';
import type { Page } from '../src/types';
import type { FontResource, ImageResource } from '../src/resources/types';
import type { LogicGraph } from '../src/components/LogicEditor/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const demoPath = resolve(repoRoot, 'examples', 'GameTracker Demo.lvgl.json');
const PORT = Number(process.env.SIMULATOR_PORT ?? 8083);

describe('rebuild simulator', () => {
  it(
    'compiles GameTracker Demo with square pb_health outline frame',
    async () => {
      const demo = JSON.parse(readFileSync(demoPath, 'utf-8')) as {
        pages: Page[];
        canvasSize: { width: number; height: number };
        resources?: { images?: ImageResource[]; fonts?: FontResource[] };
        logicGraphs?: LogicGraph[];
      };

      const pages = demo.pages;
      const imageResources = demo.resources?.images ?? [];
      const fontResources = demo.resources?.fonts ?? [];
      const logicGraphs = demo.logicGraphs ?? [];

      const code = generateCode(
        pages,
        {},
        logicGraphs,
        undefined,
        imageResources,
        fontResources,
      );

      const uiC = code['ui.c'] ?? '';
      expect(uiC).toContain('ui_pb_health_frame = lv_obj_create');
      expect(uiC).toContain('lv_obj_set_pos(ui_pb_health_frame, 56, 226)');
      expect(uiC).toContain('lv_obj_set_size(ui_pb_health_frame, 128, 18)');
      expect(uiC).toContain('lv_obj_set_style_border_width(ui_pb_health_frame, 2, 0)');
      expect(uiC).toContain('lv_obj_set_pos(ui_pb_health, 60, 230)');

      const userFiles = await buildCompileUserFiles(code, pages, imageResources);
      const fonts = buildFontRequests(pages, fontResources);
      const { width, height } = demo.canvasSize;

      const resp = await fetch(`http://127.0.0.1:${PORT}/api/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: userFiles, fonts, width, height }),
      });

      expect(resp.ok, `HTTP ${resp.status}`).toBe(true);

      const data = (await resp.json()) as { success: boolean; error?: string; buildId?: string };
      if (!data.success) {
        console.error(data.error);
      }
      expect(data.success, data.error).toBe(true);
      expect(data.buildId).toBeTruthy();
    },
    600_000,
  );
});
