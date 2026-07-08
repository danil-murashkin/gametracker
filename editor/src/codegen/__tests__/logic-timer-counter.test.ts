/**
 * Minimal logic test: periodic timer increments counter every 1 second.
 * Also exports generated C to examples/generated/logic-timer-counter/ when run via npm run export:logic-counter.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateCode } from '../generator';
import {
  createComponent,
  createLogicConnection,
  createLogicGraph,
  createLogicNode,
  createLogicPort,
  createLogicVariable,
  createPage,
  defaultOptions,
} from './helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..', '..');
const exampleJsonPath = join(repoRoot, 'examples', 'logic-timer-counter.lvgl.json');
const exportDir = join(repoRoot, 'examples', 'generated', 'logic-timer-counter');

function buildCounterGraphFromNodes() {
  const timer = createLogicNode('timer_trigger', {
    id: 'timer1',
    label: 'Every 1s',
    params: { mode: 'interval', duration: 1000 },
    outputs: [
      createLogicPort({ id: 'timer1_exec', name: 'Execute', type: 'execution' }),
    ],
  });

  const varRead = createLogicNode('var_read', {
    id: 'read1',
    params: { variableName: 'counter' },
    outputs: [createLogicPort({ id: 'read1_val', name: 'Value', type: 'int' })],
  });

  const math = createLogicNode('math_op', {
    id: 'math1',
    params: { operator: '+' },
    inputs: [
      createLogicPort({ id: 'math1_a', name: 'A', type: 'int' }),
      createLogicPort({ id: 'math1_b', name: 'B', type: 'int', defaultValue: 1 }),
    ],
    outputs: [createLogicPort({ id: 'math1_res', name: 'Result', type: 'int' })],
  });

  const varWrite = createLogicNode('var_write', {
    id: 'write1',
    params: { variableName: 'counter' },
    inputs: [
      createLogicPort({ id: 'write1_exec', name: 'Execute', type: 'execution' }),
      createLogicPort({ id: 'write1_val', name: 'Value', type: 'int' }),
    ],
    outputs: [createLogicPort({ id: 'write1_done', name: 'Done', type: 'execution' })],
  });

  const varRead2 = createLogicNode('var_read', {
    id: 'read2',
    params: { variableName: 'counter' },
    outputs: [createLogicPort({ id: 'read2_val', name: 'Value', type: 'int' })],
  });

  const setText = createLogicNode('set_text', {
    id: 'st1',
    params: { targetComponent: 'lb_counter' },
    inputs: [
      createLogicPort({ id: 'st1_exec', name: 'Execute', type: 'execution' }),
      createLogicPort({ id: 'st1_text', name: 'Text', type: 'string' }),
    ],
    outputs: [createLogicPort({ id: 'st1_done', name: 'Done', type: 'execution' })],
  });

  return createLogicGraph({
    name: 'counter_tick',
    description: 'Timer increments counter every second (blocks-only)',
    variables: [createLogicVariable({ id: 'var-counter', name: 'counter', type: 'int', defaultValue: 0 })],
    nodes: [timer, varRead, math, varWrite, varRead2, setText],
    connections: [
      createLogicConnection({
        sourceNode: 'timer1',
        sourceOutput: 'timer1_exec',
        targetNode: 'write1',
        targetInput: 'write1_exec',
        type: 'execution',
      }),
      createLogicConnection({
        sourceNode: 'read1',
        sourceOutput: 'read1_val',
        targetNode: 'math1',
        targetInput: 'math1_a',
        type: 'data',
      }),
      createLogicConnection({
        sourceNode: 'math1',
        sourceOutput: 'math1_res',
        targetNode: 'write1',
        targetInput: 'write1_val',
        type: 'data',
      }),
      createLogicConnection({
        sourceNode: 'write1',
        sourceOutput: 'write1_done',
        targetNode: 'st1',
        targetInput: 'st1_exec',
        type: 'execution',
      }),
      createLogicConnection({
        sourceNode: 'read2',
        sourceOutput: 'read2_val',
        targetNode: 'st1',
        targetInput: 'st1_text',
        type: 'data',
      }),
    ],
  });
}

function buildCounterGraphWithNodesOnly() {
  const timer = createLogicNode('timer_trigger', {
    id: 'timer1',
    params: { mode: 'interval', duration: 1000 },
    outputs: [createLogicPort({ id: 'timer1_exec', name: 'Execute', type: 'execution' })],
  });

  const varRead = createLogicNode('var_read', {
    id: 'read1',
    params: { variableName: 'counter' },
    outputs: [createLogicPort({ id: 'read1_val', name: 'Value', type: 'int' })],
  });

  const math = createLogicNode('math_op', {
    id: 'math1',
    params: { operator: '+' },
    inputs: [
      createLogicPort({ id: 'math1_a', name: 'A', type: 'int' }),
      createLogicPort({ id: 'math1_b', name: 'B', type: 'int', defaultValue: 1 }),
    ],
    outputs: [createLogicPort({ id: 'math1_res', name: 'Result', type: 'int' })],
  });

  const varWrite = createLogicNode('var_write', {
    id: 'write1',
    params: { variableName: 'counter' },
    inputs: [
      createLogicPort({ id: 'write1_exec', name: 'Execute', type: 'execution' }),
      createLogicPort({ id: 'write1_val', name: 'Value', type: 'int' }),
    ],
    outputs: [createLogicPort({ id: 'write1_done', name: 'Done', type: 'execution' })],
  });

  return createLogicGraph({
    name: 'counter_nodes',
    variables: [createLogicVariable({ name: 'counter', type: 'int', defaultValue: 0 })],
    nodes: [timer, varRead, math, varWrite],
    connections: [
      createLogicConnection({
        sourceNode: 'timer1',
        sourceOutput: 'timer1_exec',
        targetNode: 'write1',
        targetInput: 'write1_exec',
        type: 'execution',
      }),
      createLogicConnection({
        sourceNode: 'read1',
        sourceOutput: 'read1_val',
        targetNode: 'math1',
        targetInput: 'math1_a',
        type: 'data',
      }),
      createLogicConnection({
        sourceNode: 'math1',
        sourceOutput: 'math1_res',
        targetNode: 'write1',
        targetInput: 'write1_val',
        type: 'data',
      }),
    ],
  });
}

function expectTimerCounterLogic(result: string) {
  expect(result).toContain('static int32_t var_counter = 0;');
  expect(result).toContain('lv_timer_create(logic_counter_tick_timer_cb, 1000, NULL);');
  expect(result).toContain('static void logic_counter_tick_timer_cb(lv_timer_t *timer)');
  expect(result).toContain('logic_counter_tick();');
  expect(result).not.toContain('lv_timer_del(timer)');
  expect(result).toContain('var_counter = (var_counter + 1);');
  expect(result).toContain('snprintf');
  expect(result).toContain('lv_label_set_text(ui_lb_counter,');
}

describe('logic timer counter (minimal test)', () => {
  it('generates periodic timer that increments counter and updates label', () => {
    const label = createComponent('label', {
      name: 'lb_counter',
      props: { text: '0' },
    });
    const page = createPage({ name: 'main', components: [label] });
    const graph = buildCounterGraphFromNodes();

    const code = generateCode([page], defaultOptions(), [graph]);
    expectTimerCounterLogic(code['ui_logic.c']);
    expect(code['ui.c']).toContain('ui_logic_init();');
  });

  it('increments counter via var_read + math + var_write data chain', () => {
    const graph = buildCounterGraphWithNodesOnly();
    const result = generateCode([], defaultOptions(), [graph])['ui_logic.c'];

    expect(result).toContain('var_counter = (var_counter + 1);');
    expect(result).toContain('lv_timer_create(logic_counter_nodes_timer_cb, 1000, NULL);');
  });

  it('loads example JSON and generates the same timer wiring', () => {
    const project = JSON.parse(readFileSync(exampleJsonPath, 'utf8'));
    const page = project.pages[0];
    const code = generateCode(
      [page],
      project.codeGenOptions ?? defaultOptions(),
      project.logicGraphs ?? [],
    );

    expectTimerCounterLogic(code['ui_logic.c']);
    expect(code['ui.h']).toContain('ui_lb_counter');
  });

  it('exports generated C files for simulator/firmware handoff', () => {
    const project = JSON.parse(readFileSync(exampleJsonPath, 'utf8'));
    const code = generateCode(
      project.pages,
      project.codeGenOptions ?? defaultOptions(),
      project.logicGraphs ?? [],
    );

    mkdirSync(exportDir, { recursive: true });
    for (const [fileName, content] of Object.entries(code)) {
      writeFileSync(join(exportDir, fileName), content, 'utf8');
    }

    expect(code['ui_logic.c']).toContain('lv_timer_create(');
  });
});
