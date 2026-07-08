import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LogicGraph } from './types';
import {
  applyNodeEffects,
  cloneLogicRuntimeState,
  collectDebugPortValues,
  createLogicRuntimeState,
  executeTimerTick,
  getNextExecutionStepNodeId,
} from './logicRuntime';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..', '..');
const exampleJsonPath = join(__dirname, '..', '..', '..', '..', 'examples', 'logic-timer-counter.lvgl.json');

describe('logicRuntime debug stepping', () => {
  it('steps timer → write variable → set text (blocks-only)', () => {
    const project = JSON.parse(readFileSync(exampleJsonPath, 'utf8'));
    const graph = project.logicGraphs[0] as LogicGraph;
    const runtimeState = createLogicRuntimeState([graph]);

    const timer = graph.nodes.find(n => n.subType === 'timer_trigger')!;
    const nextId = getNextExecutionStepNodeId(timer, graph, runtimeState);
    expect(nextId).toBe('node-write-counter');

    const nextNode = graph.nodes.find(n => n.id === nextId)!;
    applyNodeEffects(nextNode, graph, runtimeState);

    expect(runtimeState.variables.counter).toBe(1);

    const next2Id = getNextExecutionStepNodeId(nextNode, graph, runtimeState);
    expect(next2Id).toBe('node-set-text');
    const next2Node = graph.nodes.find(n => n.id === next2Id)!;
    applyNodeEffects(next2Node, graph, runtimeState);
    expect(runtimeState.labelTextByName.lb_counter).toBe('1');

    expect(collectDebugPortValues(next2Node, graph, runtimeState)).toMatchObject({
      'node-set-text-in-1': 1,
    });
  });

  it('fire timer executes full chain', () => {
    const project = JSON.parse(readFileSync(exampleJsonPath, 'utf8'));
    const graph = project.logicGraphs[0] as LogicGraph;
    const runtimeState = createLogicRuntimeState([graph]);
    const timer = graph.nodes.find(n => n.subType === 'timer_trigger')!;

    const visited = executeTimerTick(graph, timer, runtimeState);
    expect(visited).toEqual(['node-write-counter', 'node-set-text']);
    expect(runtimeState.variables.counter).toBe(1);

    executeTimerTick(graph, timer, cloneLogicRuntimeState(runtimeState));
    expect(runtimeState.variables.counter).toBe(1);
  });

  it('gametracker demo health_update tick sets bar and image flags', () => {
    const project = JSON.parse(readFileSync(join(repoRoot, 'examples', 'gametracker-demo.lvgl.json'), 'utf8'));
    const graph = project.logicGraphs.find((g: LogicGraph) => g.name === 'health_update') as LogicGraph;
    const runtimeState = createLogicRuntimeState([graph]);
    const timer = graph.nodes.find(n => n.subType === 'timer_trigger')!;

    executeTimerTick(graph, timer, runtimeState);

    // After first tick: hits=1, heal=100, health=99
    expect(runtimeState.variables.hits).toBe(1);
    expect(runtimeState.variables.heal).toBe(100);
    expect(runtimeState.barValueByName.pb_health).toBe(99);
    expect(runtimeState.hiddenByName.img_alive).toBe(false);
    expect(runtimeState.hiddenByName.img_dead).toBe(true);
  });
});
