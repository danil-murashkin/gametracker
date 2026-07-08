import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LogicGraph } from '../LogicEditor/types';
import {
  collectAutoStartTimers,
  createPreviewLogicState,
  executeTimerTick,
} from './previewLogicRunner';

const __dirname = dirname(fileURLToPath(import.meta.url));
const exampleJsonPath = join(__dirname, '..', '..', '..', '..', 'examples', 'logic-timer-counter.lvgl.json');

describe('previewLogicRunner', () => {
  it('runs periodic auto-start timer and updates label text', () => {
    const project = JSON.parse(readFileSync(exampleJsonPath, 'utf8'));
    const graph = project.logicGraphs[0] as LogicGraph;
    const state = createPreviewLogicState([graph]);
    const timers = collectAutoStartTimers([graph]);

    expect(timers).toHaveLength(1);
    expect(state.variables.counter).toBe(0);

    executeTimerTick(graph, timers[0].timer, state);

    expect(state.variables.counter).toBe(1);
    expect(state.labelTextByName.lb_counter).toBe('1');

    executeTimerTick(graph, timers[0].timer, state);
    expect(state.variables.counter).toBe(2);
    expect(state.labelTextByName.lb_counter).toBe('2');
  });

  it('ignores delay-mode timers in preview simulation', () => {
    const graph: LogicGraph = {
      id: 'g1',
      name: 'once',
      nodes: [{
        id: 't1',
        type: 'trigger',
        subType: 'timer_trigger',
        label: 'Timer',
        position: { x: 0, y: 0 },
        params: { mode: 'delay', duration: 1000 },
        inputs: [{ id: 't1-in', name: 'Start', type: 'execution' }],
        outputs: [{ id: 't1-out', name: 'Execute', type: 'execution' }],
      }],
      connections: [],
      variables: [],
    };

    expect(collectAutoStartTimers([graph])).toHaveLength(0);
  });
});
