import type { LogicGraph, LogicNode, LogicConnection, LogicVariable } from './types';

export interface LogicRuntimeState {
  variables: Record<string, number | string | boolean>;
  labelTextByName: Record<string, string>;
  barValueByName: Record<string, number>;
  hiddenByName: Record<string, boolean>;
}

export type PreviewLogicState = LogicRuntimeState;

export function createLogicRuntimeState(graphs: LogicGraph[]): LogicRuntimeState {
  const variables: Record<string, number | string | boolean> = {};

  for (const graph of graphs) {
    for (const variable of graph.variables) {
      if (!(variable.name in variables)) {
        variables[variable.name] = normalizeDefaultValue(variable);
      }
    }
  }

  return {
    variables,
    labelTextByName: {},
    barValueByName: {},
    hiddenByName: {},
  };
}

export const createPreviewLogicState = createLogicRuntimeState;

function normalizeDefaultValue(variable: LogicVariable): number | string | boolean {
  switch (variable.type) {
    case 'int':
      return Number(variable.defaultValue) || 0;
    case 'float':
      return Number(variable.defaultValue) || 0;
    case 'bool':
      return Boolean(variable.defaultValue);
    case 'string':
      return String(variable.defaultValue ?? '');
    default:
      return 0;
  }
}

function getTimerStartPort(timer: LogicNode) {
  return timer.inputs.find(i => i.name === 'Start' && i.type === 'execution');
}

function isTimerStartConnection(connection: LogicConnection, timer: LogicNode): boolean {
  const startPort = getTimerStartPort(timer);
  return !!startPort && connection.targetInput === startPort.id;
}

export function hasTimerStartConnection(timer: LogicNode, graph: LogicGraph): boolean {
  const startPort = getTimerStartPort(timer);
  if (!startPort) return false;
  return graph.connections.some(
    c => c.targetNode === timer.id && c.targetInput === startPort.id
  );
}

export function isAutoStartTimer(timer: LogicNode, graph: LogicGraph): boolean {
  return timer.subType === 'timer_trigger' && !hasTimerStartConnection(timer, graph);
}

export interface AutoStartTimerRef {
  graph: LogicGraph;
  timer: LogicNode;
  durationMs: number;
}

export function collectAutoStartTimers(graphs: LogicGraph[]): AutoStartTimerRef[] {
  const result: AutoStartTimerRef[] = [];

  for (const graph of graphs) {
    for (const node of graph.nodes) {
      if (node.subType !== 'timer_trigger') continue;
      if (!isAutoStartTimer(node, graph)) continue;
      const mode = node.params.mode || 'delay';
      if (mode === 'delay') continue;
      result.push({
        graph,
        timer: node,
        durationMs: Math.max(1, Number(node.params.duration) || 1000),
      });
    }
  }

  return result;
}

function getConnectionTarget(node: LogicNode, outputName: string, graph: LogicGraph): string | null {
  const output = node.outputs.find(o => o.name === outputName && o.type === 'execution');
  if (!output) return null;
  const connection = graph.connections.find(
    c => c.sourceNode === node.id && c.sourceOutput === output.id
  );
  return connection?.targetNode ?? null;
}

export function getNextExecutionStepNodeId(
  node: LogicNode,
  graph: LogicGraph,
  state: LogicRuntimeState
): string | null {
  if (node.subType === 'if_else') {
    const condition = Boolean(getInputValue(node, 'Condition', graph, state));
    return getConnectionTarget(node, condition ? 'True' : 'False', graph);
  }

  if (node.subType === 'switch') {
    const value = Number(getInputValue(node, 'Value', graph, state));
    const cases = node.params.cases || [0, 1, 2];
    const caseOutput = cases.includes(value) ? `Case ${value}` : 'Default';
    return getConnectionTarget(node, caseOutput, graph)
      ?? getConnectionTarget(node, 'Default', graph);
  }

  for (const execOutput of node.outputs.filter(o => o.type === 'execution')) {
    const connection = graph.connections.find(
      c => c.sourceNode === node.id && c.sourceOutput === execOutput.id
    );
    if (!connection) continue;

    const target = graph.nodes.find(n => n.id === connection.targetNode);
    if (target?.subType === 'timer_trigger' && isTimerStartConnection(connection, target)) {
      continue;
    }

    return connection.targetNode;
  }

  return null;
}

export function applyNodeEffects(
  node: LogicNode,
  graph: LogicGraph,
  state: LogicRuntimeState
): void {
  if (node.type === 'trigger') return;
  executeNode(node, graph, state);
}

export function collectDebugPortValues(
  node: LogicNode,
  graph: LogicGraph,
  state: LogicRuntimeState
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const input of node.inputs) {
    if (input.type !== 'execution') {
      values[input.id] = getInputValue(node, input.name, graph, state);
    }
  }

  for (const output of node.outputs) {
    if (output.type !== 'execution') {
      values[output.id] = getDataValue(node, graph, state);
    }
  }

  return values;
}

export function executeTimerTick(
  graph: LogicGraph,
  timer: LogicNode,
  state: LogicRuntimeState
): string[] {
  const visited: string[] = [];
  const execOutput = timer.outputs.find(o => o.type === 'execution' && o.name === 'Execute')
    ?? timer.outputs.find(o => o.type === 'execution');
  if (!execOutput) return visited;

  const connection = graph.connections.find(
    c => c.sourceNode === timer.id && c.sourceOutput === execOutput.id
  );
  if (!connection) return visited;

  walkExecutionChain(connection.targetNode, graph, state, new Set(), visited);
  return visited;
}

function walkExecutionChain(
  nodeId: string,
  graph: LogicGraph,
  state: LogicRuntimeState,
  visited: Set<string>,
  visitedOrder: string[]
): void {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);
  visitedOrder.push(nodeId);

  const node = graph.nodes.find(n => n.id === nodeId);
  if (!node) return;

  executeNode(node, graph, state);

  if (node.subType === 'if_else' || node.subType === 'switch') {
    const nextId = getNextExecutionStepNodeId(node, graph, state);
    if (nextId) {
      walkExecutionChain(nextId, graph, state, visited, visitedOrder);
    }
    return;
  }

  const nextId = getNextExecutionStepNodeId(node, graph, state);
  if (nextId) {
    walkExecutionChain(nextId, graph, state, visited, visitedOrder);
  }
}

function executeNode(node: LogicNode, graph: LogicGraph, state: LogicRuntimeState): void {
  switch (node.subType) {
    case 'c_code_block':
      runCCodeBlock(String(node.params.code || ''), state);
      break;
    case 'var_write':
      assignVariable(node, graph, state);
      break;
    case 'set_text':
      setLabelText(node, graph, state);
      break;
    case 'set_value':
      setComponentValue(node, graph, state);
      break;
    case 'show_hide':
      setVisibility(node, state);
      break;
    default:
      break;
  }
}

function getInputPort(node: LogicNode, name: string) {
  return node.inputs.find(i => i.name === name);
}

function getDataValue(node: LogicNode, graph: LogicGraph, state: LogicRuntimeState): number | string | boolean {
  switch (node.subType) {
    case 'var_read': {
      const ref = String(node.params.variableName || node.params.variableId || '');
      return state.variables[ref] ?? 0;
    }
    case 'math_op': {
      const a = Number(getInputValue(node, 'A', graph, state));
      const b = Number(getInputValue(node, 'B', graph, state));
      const op = String(node.params.operator || '+');
      switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0 ? 0 : a / b;
        case '%': return b === 0 ? 0 : a % b;
        default: return a + b;
      }
    }
    case 'compare': {
      const a = getInputValue(node, 'A', graph, state);
      const b = getInputValue(node, 'B', graph, state);
      const op = String(node.params.operator || '==');
      switch (op) {
        case '==': return a === b;
        case '!=': return a !== b;
        case '>': return Number(a) > Number(b);
        case '<': return Number(a) < Number(b);
        case '>=': return Number(a) >= Number(b);
        case '<=': return Number(a) <= Number(b);
        default: return a === b;
      }
    }
    case 'logic_op': {
      const a = getInputValue(node, 'A', graph, state);
      const op = String(node.params.operator || 'AND');
      if (op === 'NOT') return !a;
      const b = getInputValue(node, 'B', graph, state);
      return op === 'AND' ? Boolean(a && b) : Boolean(a || b);
    }
    case 'string_op': {
      const operation = node.params.operation || 'concat';
      const a = String(getInputValue(node, 'A', graph, state));
      if (operation === 'length') return a.length;
      if (operation === 'concat') return `${a}${String(getInputValue(node, 'B', graph, state))}`;
      return a;
    }
    case 'get_property': {
      const prop = String(node.params.property || 'x');
      const target = String(node.params.targetComponent || 'obj');
      if (prop === 'x' || prop === 'y' || prop === 'width' || prop === 'height') {
        return `[${target}.${prop}]`;
      }
      return 0;
    }
    default:
      return 0;
  }
}

function getInputValue(
  node: LogicNode,
  inputName: string,
  graph: LogicGraph,
  state: LogicRuntimeState
): number | string | boolean {
  const inputPort = getInputPort(node, inputName);
  if (!inputPort) return 0;

  const connection = graph.connections.find(
    c => c.targetNode === node.id && c.targetInput === inputPort.id
  );

  if (!connection) {
    return inputPort.defaultValue !== undefined ? inputPort.defaultValue : 0;
  }

  const sourceNode = graph.nodes.find(n => n.id === connection.sourceNode);
  if (!sourceNode) return 0;

  return getDataValue(sourceNode, graph, state);
}

function resolveVariableName(node: LogicNode): string {
  return String(node.params.variableName || node.params.variableId || 'unknown');
}

function assignVariable(node: LogicNode, graph: LogicGraph, state: LogicRuntimeState): void {
  const name = resolveVariableName(node);
  const value = getInputValue(node, 'Value', graph, state);
  state.variables[name] = value;
}

function setLabelText(node: LogicNode, graph: LogicGraph, state: LogicRuntimeState): void {
  const target = String(node.params.targetComponent || 'label');
  const text = getInputValue(node, 'Text', graph, state);
  state.labelTextByName[target] = String(text);
}

function setComponentValue(node: LogicNode, graph: LogicGraph, state: LogicRuntimeState): void {
  const target = String(node.params.targetComponent || 'bar');
  const value = Number(getInputValue(node, 'Value', graph, state));
  state.barValueByName[target] = value;
}

function setVisibility(node: LogicNode, state: LogicRuntimeState): void {
  const target = String(node.params.targetComponent || 'obj');
  const action = String(node.params.action || 'hide');
  if (action === 'show') {
    state.hiddenByName[target] = false;
  } else if (action === 'hide') {
    state.hiddenByName[target] = true;
  } else if (action === 'toggle') {
    state.hiddenByName[target] = !state.hiddenByName[target];
  }
}

function uiNameToComponentName(uiName: string): string {
  return uiName.replace(/^ui_/, '');
}

function evaluateCCondition(
  cond: string,
  state: LogicRuntimeState,
  locals: Record<string, string | number>
): boolean {
  // Support the simple patterns we generate/use in demos:
  //   var_x < 100, var_x > 0, var_x == 5, etc.
  const m = cond.trim().match(/^(.*?)\s*(==|!=|<=|>=|<|>)\s*(.*?)$/);
  if (!m) return false;
  const left = evaluateSimpleExpression(m[1].trim(), state, locals);
  const right = evaluateSimpleExpression(m[3].trim(), state, locals);
  switch (m[2]) {
    case '==': return left === right;
    case '!=': return left !== right;
    case '<': return left < right;
    case '>': return left > right;
    case '<=': return left <= right;
    case '>=': return left >= right;
    default: return false;
  }
}

function runCCodeBlock(code: string, state: LogicRuntimeState): void {
  const locals: Record<string, string | number> = {};
  const lines = code.split('\n').map(line => line.trim()).filter(Boolean);

  type IfFrame = {
    parentExec: boolean;
    exec: boolean;
    matched: boolean; // some branch in this if/else-if/else chain was taken
  };
  const stack: IfFrame[] = [];
  const canExecute = () => stack.every(f => f.exec);

  for (const line of lines) {
    // --- Basic if/else support (enough for clamp-style code blocks) ---
    const ifM = line.match(/^if\s*\((.*)\)\s*\{\s*$/);
    if (ifM) {
      const parentExec = canExecute();
      const cond = parentExec ? evaluateCCondition(ifM[1], state, locals) : false;
      stack.push({ parentExec, exec: parentExec && cond, matched: parentExec && cond });
      continue;
    }

    const elseIfM = line.match(/^\}\s*else\s+if\s*\((.*)\)\s*\{\s*$/);
    if (elseIfM) {
      const top = stack[stack.length - 1];
      if (!top) continue;
      const parentExec = top.parentExec;
      const cond = parentExec && !top.matched ? evaluateCCondition(elseIfM[1], state, locals) : false;
      top.exec = parentExec && !top.matched && cond;
      top.matched = top.matched || (parentExec && cond);
      continue;
    }

    const elseM = line.match(/^\}\s*else\s*\{\s*$/);
    if (elseM) {
      const top = stack[stack.length - 1];
      if (!top) continue;
      top.exec = top.parentExec && !top.matched;
      top.matched = top.matched || top.exec;
      continue;
    }

    if (line === '}') {
      // End of an if/else chain block
      if (stack.length > 0) stack.pop();
      continue;
    }

    if (!canExecute()) {
      continue;
    }

    // Local numeric declarations like: int32_t health = var_heal - var_hits;
    const localDecl = line.match(/^(?:int32_t|int|uint32_t|float|double|bool)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);?$/);
    if (localDecl) {
      const name = localDecl[1];
      locals[name] = evaluateSimpleExpression(localDecl[2].trim(), state, locals);
      continue;
    }

    const increment = line.match(/^var_([a-z0-9_]+)\+\+;?$/i);
    if (increment) {
      const varName = cVarToLogicName(increment[1]);
      state.variables[varName] = (Number(state.variables[varName]) || 0) + 1;
      continue;
    }

    const assign = line.match(/^var_([a-z0-9_]+)\s*=\s*([^;]+);?$/i);
    if (assign) {
      const varName = cVarToLogicName(assign[1]);
      state.variables[varName] = evaluateSimpleExpression(assign[2].trim(), state, locals);
      continue;
    }

    // Local assignments like: health = 0;
    const localAssign = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);?$/);
    if (localAssign) {
      const name = localAssign[1];
      // Avoid treating function calls as assignments (e.g., lv_bar_set_value(...))
      if (!name.startsWith('lv_') && !name.startsWith('ui_')) {
        locals[name] = evaluateSimpleExpression(localAssign[2].trim(), state, locals);
        continue;
      }
    }

    const snprintf = line.match(
      /^snprintf\(\s*([a-z0-9_]+)\s*,\s*sizeof\(\1\)\s*,\s*"%d"\s*,\s*\(int\)([^)]+)\s*\);?$/i
    );
    if (snprintf) {
      const valueExpr = snprintf[2].trim();
      const value = evaluateSimpleExpression(valueExpr, state, locals);
      locals[snprintf[1]] = String(Number(value) || 0);
      continue;
    }

    const labelText = line.match(/^lv_label_set_text\(\s*ui_([a-z0-9_]+)\s*,\s*([a-z0-9_]+)\s*\);?$/i);
    if (labelText) {
      const componentName = uiNameToComponentName(`ui_${labelText[1]}`);
      const bufferName = labelText[2];
      state.labelTextByName[componentName] = locals[bufferName] ?? String(bufferName);
      continue;
    }

    const barValue = line.match(/^lv_bar_set_value\(\s*ui_([a-z0-9_]+)\s*,\s*([^,]+),/i);
    if (barValue) {
      const componentName = uiNameToComponentName(`ui_${barValue[1]}`);
      state.barValueByName[componentName] = Number(
        evaluateSimpleExpression(barValue[2].trim(), state, locals)
      );
      continue;
    }

    const showFlag = line.match(/^lv_obj_(add|clear)_flag\(\s*ui_([a-z0-9_]+)\s*,\s*LV_OBJ_FLAG_HIDDEN\s*\);?$/i);
    if (showFlag) {
      const componentName = uiNameToComponentName(`ui_${showFlag[2]}`);
      state.hiddenByName[componentName] = showFlag[1].toLowerCase() === 'add';
    }
  }
}

function cVarToLogicName(cVarSuffix: string): string {
  return cVarSuffix;
}

function evaluateSimpleExpression(
  expr: string,
  state: LogicRuntimeState,
  locals: Record<string, string | number>
): number {
  // Allow wrapping parentheses from conditions: (var_x + 1)
  const trimmed = expr.trim()
    .replace(/^\((?:int|int32_t|uint32_t)\)\s*/, '') // strip simple casts
    .replace(/^\(int\)\s*/, '');
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return evaluateSimpleExpression(trimmed.slice(1, -1), state, locals);
  }

  const varMatch = trimmed.match(/^var_([a-z0-9_]+)$/i);
  if (varMatch) {
    return Number(state.variables[cVarToLogicName(varMatch[1])]) || 0;
  }

  const localMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (localMatch && localMatch[1] in locals) {
    return Number(locals[localMatch[1]]) || 0;
  }

  const binary = trimmed.match(/^(.+?)\s*([+\-*/])\s*(.+)$/);
  if (binary) {
    const left = evaluateSimpleExpression(binary[1].trim(), state, locals);
    const right = evaluateSimpleExpression(binary[3].trim(), state, locals);
    switch (binary[2]) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return right === 0 ? 0 : left / right;
      default: return left;
    }
  }

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function cloneLogicRuntimeState(state: LogicRuntimeState): LogicRuntimeState {
  return {
    variables: { ...state.variables },
    labelTextByName: { ...state.labelTextByName },
    barValueByName: { ...state.barValueByName },
    hiddenByName: { ...state.hiddenByName },
  };
}

export const clonePreviewLogicState = cloneLogicRuntimeState;
