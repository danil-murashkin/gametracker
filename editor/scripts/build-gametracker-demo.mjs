#!/usr/bin/env node
/**
 * Build examples/gametracker-demo.lvgl.json from assets/vault_boy_*.png
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const assetsDir = join(repoRoot, 'assets');
const outDir = join(repoRoot, 'examples');
const outFile = join(outDir, 'gametracker-demo.lvgl.json');

const NOW = Date.now();

function loadPngResource(fileName, id, createdAt = NOW) {
  const filePath = join(assetsDir, fileName);
  const buffer = readFileSync(filePath);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const baseName = fileName.replace(/\.[^.]+$/, '');

  return {
    id,
    name: baseName,
    originalName: fileName,
    width,
    height,
    format: 'RGB565',
    data: `data:image/png;base64,${buffer.toString('base64')}`,
    cArrayName: `img_${baseName}`,
    size: buffer.length,
    createdAt,
  };
}

function baseStyle(overrides = {}) {
  return {
    default: {
      bgColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 0,
      textColor: '#00FF00',
      opacity: 1,
      padding: 0,
      ...overrides,
    },
  };
}

function makeComponent({
  id,
  type,
  name,
  x,
  y,
  width,
  height,
  props = {},
  styles,
  flags,
  visible = true,
}) {
  return {
    id,
    type,
    name,
    x,
    y,
    width,
    height,
    children: [],
    props,
    styles: styles ?? baseStyle(),
    events: [],
    animations: [],
    parentId: null,
    locked: false,
    visible,
    ...(flags ? { flags } : {}),
  };
}

const IMG_ALIVE_ID = 'res-vault-boy-alive';
const IMG_DEAD_ID = 'res-vault-boy-dead';

const imgAlive = loadPngResource('vault_boy_alive.png', IMG_ALIVE_ID);
const imgDead = loadPngResource('vault_boy_dead.png', IMG_DEAD_ID);

const components = [
  makeComponent({
    id: 'comp-img-alive',
    type: 'img',
    name: 'img_alive',
    x: 50,
    y: 24,
    width: 140,
    height: 200,
    props: { src: IMG_ALIVE_ID },
  }),
  makeComponent({
    id: 'comp-img-dead',
    type: 'img',
    name: 'img_dead',
    x: 50,
    y: 24,
    width: 140,
    height: 200,
    props: { src: IMG_DEAD_ID },
    flags: { hidden: true },
    visible: false,
  }),
  makeComponent({
    id: 'comp-pb-health',
    type: 'bar',
    name: 'pb_health',
    x: 20,
    y: 236,
    width: 200,
    height: 18,
    props: { min: 0, max: 100, value: 100 },
    styles: baseStyle({
      bgColor: '#1a3d1a',
      indicatorColor: '#00FF00',
      borderRadius: 0,
    }),
  }),
  makeComponent({
    id: 'comp-lb-hits',
    type: 'label',
    name: 'lb_hits',
    x: 20,
    y: 264,
    width: 100,
    height: 24,
    props: { text: '0', textAlign: 'center' },
    styles: baseStyle({ textColor: '#00FF00' }),
  }),
  makeComponent({
    id: 'comp-lb-heal',
    type: 'label',
    name: 'lb_heal',
    x: 120,
    y: 264,
    width: 100,
    height: 24,
    props: { text: '100', textAlign: 'center' },
    styles: baseStyle({ textColor: '#00FF00' }),
  }),
];

const hardwareVariables = [];

const updateHealthCode = `char health_buf[16];

var_heal = 100;

var_hits++;
if (var_hits < 0) {
    var_hits = 0;
} else if (var_hits > 100) {
    var_hits = 100;
}

int32_t health = var_heal - var_hits;
if (health < 0) {
    health = 0;
} else if (health > 100) {
    health = 100;
}

lv_bar_set_value(ui_pb_health, health, LV_ANIM_OFF);

snprintf(health_buf, sizeof(health_buf), "%d", (int)var_hits);
lv_label_set_text(ui_lb_hits, health_buf);
snprintf(health_buf, sizeof(health_buf), "%d", (int)var_heal);
lv_label_set_text(ui_lb_heal, health_buf);

if (health > 0) {
    lv_obj_clear_flag(ui_img_alive, LV_OBJ_FLAG_HIDDEN);
    lv_obj_add_flag(ui_img_dead, LV_OBJ_FLAG_HIDDEN);
} else {
    lv_obj_add_flag(ui_img_alive, LV_OBJ_FLAG_HIDDEN);
    lv_obj_clear_flag(ui_img_dead, LV_OBJ_FLAG_HIDDEN);
}`;

const timerNodeId = 'node-health-timer';
const updateNodeId = 'node-health-update';

const logicGraph = {
  id: 'graph-health',
  name: 'health_update',
  description: 'Simulation test: +1 hits/sec, heal fixed at 100, bar = heal - hits',
  nodes: [
    {
      id: timerNodeId,
      type: 'trigger',
      subType: 'timer_trigger',
      label: 'Timer trigger',
      position: { x: 80, y: 80 },
      params: { mode: 'interval', duration: 1000 },
      inputs: [{ id: `${timerNodeId}-in-0`, name: 'Start', type: 'execution' }],
      outputs: [
        { id: `${timerNodeId}-out-0`, name: 'Execute', type: 'execution' },
        { id: `${timerNodeId}-out-1`, name: 'Count', type: 'int' },
      ],
    },
    {
      id: updateNodeId,
      type: 'custom',
      subType: 'c_code_block',
      label: 'Update health',
      position: { x: 320, y: 80 },
      params: { code: updateHealthCode },
      inputs: [{ id: `${updateNodeId}-in-0`, name: 'Execute', type: 'execution' }],
      outputs: [{ id: `${updateNodeId}-out-0`, name: 'Done', type: 'execution' }],
    },
  ],
  connections: [
    {
      id: 'conn-timer-update',
      sourceNode: timerNodeId,
      sourceOutput: `${timerNodeId}-out-0`,
      targetNode: updateNodeId,
      targetInput: `${updateNodeId}-in-0`,
      type: 'execution',
    },
  ],
  variables: [
    ...hardwareVariables,
    { id: 'var-hits', name: 'hits', type: 'int', defaultValue: 0 },
    { id: 'var-heal', name: 'heal', type: 'int', defaultValue: 100 },
  ],
};

const project = {
  version: '1.0.0',
  name: 'GameTracker Demo',
  createdAt: NOW,
  updatedAt: NOW,
  canvasSize: { width: 240, height: 320 },
  display: {
    width: 240,
    height: 320,
    colorDepth: 16,
    rotation: 0,
  },
  lvglConfig: {
    version: '9',
    colorFormat: 'RGB565',
    fontLarge: true,
    defaultFont: 'montserrat_14',
    useBuiltinSymbols: true,
    symbolFont: 'montserrat_14',
    memSize: 48,
  },
  pages: [
    {
      id: 'page-main',
      name: 'main',
      backgroundColor: '#000000',
      components,
    },
  ],
  resources: {
    images: [imgAlive, imgDead],
    fonts: [],
  },
  variables: [
    { id: 'var-hits', name: 'hits', type: 'int', defaultValue: '0' },
    { id: 'var-heal', name: 'heal', type: 'int', defaultValue: '100' },
  ],
  logicGraphs: [logicGraph],
  codeGenOptions: {
    outputFormat: 'multi-file',
    includeComments: true,
    useStaticAllocation: true,
    prefix: 'ui',
    indentSize: 4,
    indentStyle: 'spaces',
  },
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(project, null, 2), 'utf8');

console.log(`Wrote ${outFile}`);
console.log(`  images: ${project.resources.images.length}`);
console.log(`  components: ${components.length}`);
console.log(`  logic graphs: ${project.logicGraphs.length}`);
