// ui_logic.c template generator
// Generates C code from logic orchestration graphs

import type { CodeGenOptions } from '../types';
import type {
  LogicGraph,
  LogicNode,
  LogicConnection,
  LogicPort,
  LogicVariable,
  LogicNodeSubType,
} from '../../components/LogicEditor/types';
import {
  generateInclude,
  generateSectionHeader,
  generateUserCodeSection,
  getIndent,
} from '../formatters/cFormatter';
import { findVariableByIdOrName } from '../../components/LogicEditor/hardwareVariables';

/**
 * Generate ui_logic.c source file from logic graphs
 */
export function generateLogicSource(
  options: CodeGenOptions,
  graphs: LogicGraph[] = []
): string {
  const lines: string[] = [];
  
  // Includes
  lines.push(generateInclude('ui.h'));
  lines.push(generateInclude('ui_logic.h'));
  lines.push(generateInclude('string.h', true));
  lines.push(generateInclude('stdio.h', true));

  // Collect all variables from all graphs
  const allVariables = collectAllVariables(graphs);

  // Hardware headers (hal_buttons.h, etc.)
  const hardwareHeaders = collectHardwareHeaders(allVariables);
  for (const header of hardwareHeaders) {
    lines.push(generateInclude(header));
  }
  if (hardwareHeaders.length > 0) {
    lines.push('');
  }
  
  // Generate variable declarations
  if (options.generateComments) {
    lines.push(generateSectionHeader('Logic Variables', options));
  }
  lines.push('');
  
  if (allVariables.length > 0) {
    for (const variable of allVariables) {
      const decl = generateVariableDeclaration(variable);
      if (decl) {
        lines.push(decl);
      }
    }
    lines.push('');
  } else {
    if (options.generateComments) {
      lines.push('// No variables defined');
      lines.push('');
    }
  }

  // Forward declarations for timer callbacks
  const timerGraphs = graphs.filter(g =>
    g.nodes.some(n => n.subType === 'timer_trigger')
  );
  if (timerGraphs.length > 0) {
    if (options.generateComments) {
      lines.push(generateSectionHeader('Timer Callback Forward Declarations', options));
      lines.push('');
    }
    for (const graph of timerGraphs) {
      const funcName = toSnakeCase(`logic_${graph.name}`);
      lines.push(`static void ${funcName}_timer_cb(lv_timer_t *timer);`);
    }
    lines.push('');

    const manualStartTimerGraphs = timerGraphs.filter(g =>
      g.nodes.some(
        n =>
          n.subType === 'timer_trigger' &&
          hasTimerStartConnection(n, g) &&
          (n.params.mode || 'interval') !== 'delay'
      )
    );
    if (manualStartTimerGraphs.length > 0) {
      if (options.generateComments) {
        lines.push(generateSectionHeader('Timer Handles (manual Start)', options));
        lines.push('');
      }
      for (const graph of manualStartTimerGraphs) {
        const funcName = toSnakeCase(`logic_${graph.name}`);
        lines.push(`static lv_timer_t *${funcName}_timer_handle = NULL;`);
      }
      lines.push('');
    }
  }
  
  // Generate logic functions for each graph
  if (options.generateComments) {
    lines.push(generateSectionHeader('Logic Functions', options));
  }
  lines.push('');
  
  if (graphs.length > 0) {
    for (const graph of graphs) {
      const functionCode = generateLogicFunction(graph, options);
      lines.push(functionCode);
      lines.push('');
    }

    // Generate timer callbacks
    for (const graph of timerGraphs) {
      lines.push(generateTimerCallback(graph, options));
      lines.push('');
    }
    
    // Generate init function
    lines.push(generateInitFunction(graphs, options));
    lines.push('');
  } else {
    if (options.generateComments) {
      lines.push('// No logic graphs defined');
      lines.push('');
    }
    lines.push('void ui_logic_init(void) {');
    lines.push(getIndent(options) + '// No logic to initialize');
    lines.push('}');
    lines.push('');
  }
  
  // User code section
  if (options.userCodeMarkers) {
    lines.push(generateUserCodeSection('logic_custom', options));
  }
  
  return lines.join('\n');
}

function getTimerStartPort(timer: LogicNode): LogicPort | undefined {
  return timer.inputs.find(i => i.name === 'Start' && i.type === 'execution');
}

function hasTimerStartConnection(timer: LogicNode, graph: LogicGraph): boolean {
  const startPort = getTimerStartPort(timer);
  if (!startPort) return false;
  return graph.connections.some(
    c => c.targetNode === timer.id && c.targetInput === startPort.id
  );
}

/** Timer with no incoming Start connection starts automatically in ui_logic_init */
function isAutoStartTimer(timer: LogicNode, graph: LogicGraph): boolean {
  return timer.subType === 'timer_trigger' && !hasTimerStartConnection(timer, graph);
}

function isTimerStartConnection(connection: LogicConnection, timer: LogicNode): boolean {
  const startPort = getTimerStartPort(timer);
  return !!startPort && connection.targetInput === startPort.id;
}

function generateTimerStartCode(
  timerNode: LogicNode,
  graphName: string,
  options: CodeGenOptions,
  indentLevel: number
): string {
  const indent = getIndent(options).repeat(indentLevel);
  const inner = getIndent(options).repeat(indentLevel + 1);
  const funcName = toSnakeCase(`logic_${graphName}`);
  const duration = timerNode.params.duration || 1000;
  const mode = timerNode.params.mode || 'interval';

  if (mode === 'delay') {
    return `${indent}lv_timer_create(${funcName}_timer_cb, ${duration}, NULL);`;
  }

  const handle = `${funcName}_timer_handle`;
  return [
    `${indent}if (${handle} == NULL) {`,
    `${inner}${handle} = lv_timer_create(${funcName}_timer_cb, ${duration}, NULL);`,
    `${indent}} else {`,
    `${inner}lv_timer_reset(${handle});`,
    `${indent}}`,
  ].join('\n');
}

/**
 * Generate timer callback wrapper
 */
function generateTimerCallback(graph: LogicGraph, options: CodeGenOptions): string {
  const funcName = toSnakeCase(`logic_${graph.name}`);
  const indent = getIndent(options);
  const lines: string[] = [];

  if (options.generateComments) {
    lines.push(`/** Timer callback for ${graph.name} */`);
  }
  lines.push(`static void ${funcName}_timer_cb(lv_timer_t *timer) {`);
  lines.push(`${indent}(void)timer;`);
  lines.push(`${indent}${funcName}();`);

  // Check if any timer trigger is one-shot (delay mode)
  const timerNodes = graph.nodes.filter(n => n.subType === 'timer_trigger');
  for (const tn of timerNodes) {
    if (tn.params.mode === 'delay') {
      lines.push(`${indent}lv_timer_del(timer);`);
      break;
    }
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate init function that registers event callbacks and timers
 */
function generateInitFunction(graphs: LogicGraph[], options: CodeGenOptions): string {
  const lines: string[] = [];
  const indent = getIndent(options);
  
  if (options.generateComments) {
    lines.push('/**');
    lines.push(' * Initialize logic system');
    lines.push(' */');
  }
  lines.push('void ui_logic_init(void) {');
  
  let hasContent = false;

  for (const graph of graphs) {
    const functionName = toSnakeCase(`logic_${graph.name}`);

    // Register event triggers
    const eventTriggers = graph.nodes.filter(n => n.subType === 'event_trigger');
    for (const trigger of eventTriggers) {
      const eventType = trigger.params.eventType || 'LV_EVENT_CLICKED';
      const targetComp = trigger.params.targetComponent;
      if (targetComp) {
        const targetVar = `ui_${toSnakeCase(targetComp)}`;
        if (options.generateComments) {
          lines.push(`${indent}// ${graph.name}: ${eventType} on ${targetComp}`);
        }
        // Use a wrapper — the logic function has void(void) signature,
        // so we generate an inline event callback
        lines.push(`${indent}lv_obj_add_event_cb(${targetVar}, ${functionName}_event_cb, ${eventType}, NULL);`);
        hasContent = true;
      }
    }

    // Register timer triggers (only when Start input is not wired)
    const timerTriggers = graph.nodes.filter(n => n.subType === 'timer_trigger');
    for (const trigger of timerTriggers) {
      if (!isAutoStartTimer(trigger, graph)) {
        if (options.generateComments) {
          lines.push(`${indent}// ${graph.name}: timer waits for Start input`);
        }
        continue;
      }
      const duration = trigger.params.duration || 1000;
      const mode = trigger.params.mode || 'interval';
      if (options.generateComments) {
        lines.push(`${indent}// ${graph.name}: timer ${mode}, ${duration}ms (auto-start)`);
      }
      lines.push(`${indent}lv_timer_create(${functionName}_timer_cb, ${duration}, NULL);`);
      hasContent = true;
    }
  }

  if (!hasContent) {
    lines.push(`${indent}// No triggers to register`);
  }
  
  lines.push('}');

  // Generate event callback wrappers for graphs that have event triggers
  const eventGraphs = graphs.filter(g =>
    g.nodes.some(n => n.subType === 'event_trigger')
  );
  if (eventGraphs.length > 0) {
    lines.push('');
    for (const graph of eventGraphs) {
      const functionName = toSnakeCase(`logic_${graph.name}`);
      if (options.generateComments) {
        lines.push(`/** Event callback wrapper for ${graph.name} */`);
      }
      lines.push(`static void ${functionName}_event_cb(lv_event_t *e) {`);
      lines.push(`${indent}(void)e;`);
      lines.push(`${indent}${functionName}();`);
      lines.push('}');
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Collect all unique variables from all graphs
 */
function collectHardwareHeaders(variables: LogicVariable[]): string[] {
  const headers = new Set<string>();
  for (const variable of variables) {
    if (variable.source === 'hardware' && variable.includeHeader) {
      headers.add(variable.includeHeader);
    }
  }
  return Array.from(headers);
}

/**
 * Collect all variables from all graphs
 */
function collectAllVariables(graphs: LogicGraph[]): LogicVariable[] {
  const variableMap = new Map<string, LogicVariable>();
  
  for (const graph of graphs) {
    for (const variable of graph.variables) {
      if (!variableMap.has(variable.name)) {
        variableMap.set(variable.name, variable);
      }
    }
  }
  
  return Array.from(variableMap.values());
}

/**
 * Generate C variable declaration
 */
function generateVariableDeclaration(variable: LogicVariable): string | null {
  if (variable.source === 'hardware') {
    return null;
  }

  const cType = getCType(variable.type);
  const defaultValue = formatDefaultValue(variable.type, variable.defaultValue);
  const varName = toSnakeCase(`var_${variable.name}`);

  return `static ${cType} ${varName} = ${defaultValue};`;
}

/**
 * Resolve a variable reference from node params and graph context
 */
function resolveVariableRef(
  graph: LogicGraph,
  variableIdOrName: string
): LogicVariable | undefined {
  return findVariableByIdOrName(graph.variables, variableIdOrName);
}

/**
 * Get C expression for reading a variable
 */
function getVariableReadExpr(
  graph: LogicGraph,
  variableIdOrName: string
): string {
  const variable = resolveVariableRef(graph, variableIdOrName);
  if (variable?.readExpr) {
    return variable.readExpr;
  }
  if (variable?.name) {
    return toSnakeCase(`var_${variable.name}`);
  }
  return toSnakeCase(`var_${variableIdOrName}`);
}

/**
 * Get C type from variable type
 */
function getCType(type: string): string {
  switch (type) {
    case 'int': return 'int32_t';
    case 'float': return 'float';
    case 'string': return 'char*';
    case 'bool': return 'bool';
    default: return 'int32_t';
  }
}

/**
 * Format default value for C
 */
function formatDefaultValue(type: string, value: unknown): string {
  switch (type) {
    case 'int': return String(Number(value) || 0);
    case 'float': return (Number(value) || 0).toFixed(1) + 'f';
    case 'string': return value ? `"${String(value).replace(/"/g, '\\"')}"` : '""';
    case 'bool': return value ? 'true' : 'false';
    default: return '0';
  }
}

/**
 * Convert string to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/__+/g, '_')
    .replace(/^_/, '');
}

/**
 * Generate a logic function from a graph
 */
function generateLogicFunction(graph: LogicGraph, options: CodeGenOptions): string {
  const lines: string[] = [];
  const functionName = toSnakeCase(`logic_${graph.name}`);
  
  if (options.generateComments) {
    lines.push(`/**`);
    lines.push(` * Logic: ${graph.name}`);
    if (graph.description) {
      lines.push(` * ${graph.description}`);
    }
    lines.push(` */`);
  }
  
  lines.push(`void ${functionName}(void) {`);
  
  const body = generateFunctionBody(graph, options);
  if (body.trim()) {
    lines.push(body);
  } else {
    lines.push(getIndent(options) + '// Empty logic graph');
  }
  
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Generate function body from graph nodes by following execution flow
 */
function generateFunctionBody(graph: LogicGraph, options: CodeGenOptions): string {
  // Find trigger nodes (entry points)
  const triggerNodes = graph.nodes.filter(n => n.type === 'trigger');
  
  if (triggerNodes.length === 0) {
    // No trigger nodes — generate all action nodes linearly
    const lines: string[] = [];
    for (const node of graph.nodes) {
      if (node.type === 'action' || node.type === 'custom') {
        const code = generateNodeCode(node, graph, options, 1);
        if (code) lines.push(code);
      }
    }
    return lines.join('\n');
  }
  
  // Follow execution flow from each trigger
  const visited = new Set<string>();
  const lines: string[] = [];
  
  for (const trigger of triggerNodes) {
    const code = generateExecutionChain(trigger.id, graph, options, 1, visited);
    if (code) lines.push(code);
  }
  
  return lines.join('\n');
}

/**
 * Recursively follow execution chain and generate code
 */
function generateExecutionChain(
  nodeId: string,
  graph: LogicGraph,
  options: CodeGenOptions,
  indentLevel: number,
  visited: Set<string>
): string {
  if (visited.has(nodeId)) return '';
  visited.add(nodeId);
  
  const node = graph.nodes.find(n => n.id === nodeId);
  if (!node) return '';
  
  const lines: string[] = [];
  
  // Generate code for this node
  const nodeCode = generateNodeCode(node, graph, options, indentLevel);
  if (nodeCode) lines.push(nodeCode);
  
  // For branching nodes (if_else, switch), the branches are handled inside generateNodeCode
  // For linear nodes, follow the execution output
  if (node.subType !== 'if_else' && node.subType !== 'switch') {
    for (const execOutput of node.outputs.filter(o => o.type === 'execution')) {
      const connection = graph.connections.find(
        c => c.sourceNode === node.id && c.sourceOutput === execOutput.id
      );
      if (!connection) continue;

      const target = graph.nodes.find(n => n.id === connection.targetNode);
      if (target?.subType === 'timer_trigger' && isTimerStartConnection(connection, target)) {
        lines.push(generateTimerStartCode(target, graph.name, options, indentLevel));
      }
    }

    const nextNodeId = getNextExecutionNode(node, graph);
    if (nextNodeId) {
      const nextCode = generateExecutionChain(nextNodeId, graph, options, indentLevel, visited);
      if (nextCode) lines.push(nextCode);
    }
  }
  
  return lines.join('\n');
}

/**
 * Find the next node connected via execution output
 */
function getNextExecutionNode(node: LogicNode, graph: LogicGraph): string | null {
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

/**
 * Find the node connected to a specific named output
 */
function getOutputTargetNode(node: LogicNode, outputName: string, graph: LogicGraph): string | null {
  const output = node.outputs.find(o => o.name === outputName);
  if (!output) return null;
  
  const connection = graph.connections.find(
    c => c.sourceNode === node.id && c.sourceOutput === output.id
  );
  
  return connection?.targetNode || null;
}

/**
 * Get input value for a node port (traces back through connections)
 */
function getInputValue(node: LogicNode, inputName: string, graph: LogicGraph): string {
  const inputPort = node.inputs.find(i => i.name === inputName);
  if (!inputPort) return '0';
  
  const connection = graph.connections.find(
    c => c.targetNode === node.id && c.targetInput === inputPort.id
  );
  
  if (!connection) {
    return inputPort.defaultValue !== undefined ? String(inputPort.defaultValue) : '0';
  }
  
  const sourceNode = graph.nodes.find(n => n.id === connection.sourceNode);
  if (!sourceNode) return '0';
  
  return generateNodeExpression(sourceNode, graph);
}

/**
 * Generate expression for a data node
 */
function generateNodeExpression(node: LogicNode, graph: LogicGraph): string {
  switch (node.subType) {
    case 'var_read': {
      const ref = node.params.variableName || node.params.variableId || 'unknown';
      return getVariableReadExpr(graph, ref);
    }
    case 'math_op': {
      const a = getInputValue(node, 'A', graph);
      const b = getInputValue(node, 'B', graph);
      const op = node.params.operator || '+';
      return `(${a} ${op} ${b})`;
    }
    case 'compare': {
      const a = getInputValue(node, 'A', graph);
      const b = getInputValue(node, 'B', graph);
      const op = node.params.operator || '==';
      return `(${a} ${op} ${b})`;
    }
    case 'logic_op': {
      const a = getInputValue(node, 'A', graph);
      const b = getInputValue(node, 'B', graph);
      const op = node.params.operator || 'AND';
      if (op === 'NOT') return `(!${a})`;
      const cOp = op === 'AND' ? '&&' : '||';
      return `(${a} ${cOp} ${b})`;
    }
    case 'string_op': {
      const a = getInputValue(node, 'A', graph);
      const b = getInputValue(node, 'B', graph);
      const operation = node.params.operation || 'concat';
      if (operation === 'length') return `strlen(${a})`;
      if (operation === 'concat') return `/* strcat(${a}, ${b}) */`;
      return a;
    }
    case 'get_property': {
      const target = node.params.targetComponent || 'obj';
      const prop = node.params.property || 'x';
      const targetVar = `ui_${toSnakeCase(target)}`;
      const propGetters: Record<string, string> = {
        x: `lv_obj_get_x(${targetVar})`,
        y: `lv_obj_get_y(${targetVar})`,
        width: `lv_obj_get_width(${targetVar})`,
        height: `lv_obj_get_height(${targetVar})`,
        opacity: `lv_obj_get_style_opa(${targetVar}, LV_PART_MAIN)`,
      };
      return propGetters[prop] || `lv_obj_get_${prop}(${targetVar})`;
    }
    default:
      return '0';
  }
}

// ============ Node Code Generators ============

/**
 * Generate C code for a single node
 */
function generateNodeCode(
  node: LogicNode,
  graph: LogicGraph,
  options: CodeGenOptions,
  indentLevel: number
): string {
  const subType = node.subType as LogicNodeSubType;
  const indent = getIndent(options).repeat(indentLevel);
  
  switch (subType) {
    case 'event_trigger':
      return options.generateComments
        ? `${indent}// Event: ${node.params.eventType || 'LV_EVENT_CLICKED'} on ${node.params.targetComponent || '?'}`
        : '';
    case 'timer_trigger':
      return options.generateComments
        ? `${indent}// Timer: ${node.params.mode || 'repeat'}, ${node.params.duration || 1000}ms`
        : '';
    case 'if_else':
      return generateIfElseCode(node, graph, options, indentLevel);
    case 'switch':
      return generateSwitchCode(node, graph, options, indentLevel);
    case 'compare':
    case 'logic_op':
      return ''; // Inline expression nodes
    case 'set_property':
      return generateSetPropertyCode(node, indent);
    case 'navigate_page':
      return generateNavigatePageCode(node, indent);
    case 'show_hide':
      return generateShowHideCode(node, indent);
    case 'set_text':
      return generateSetTextCode(node, graph, indent);
    case 'set_value':
      return generateSetValueCode(node, graph, indent);
    case 'call_function':
      return generateCallFunctionCode(node, indent);
    case 'delay':
      return generateDelayCode(node, indent, options);
    case 'var_read':
    case 'math_op':
    case 'string_op':
    case 'get_property':
      return ''; // Data nodes don't generate standalone code
    case 'var_write':
      return generateVarWriteCode(node, graph, indent);
    case 'c_code_block':
      return generateCustomCodeBlock(node, indent);
    default:
      return options.generateComments ? `${indent}// Unknown node type: ${subType}` : '';
  }
}

function generateIfElseCode(
  node: LogicNode,
  graph: LogicGraph,
  options: CodeGenOptions,
  indentLevel: number
): string {
  const indent = getIndent(options).repeat(indentLevel);
  const condition = getInputValue(node, 'Condition', graph);
  const lines: string[] = [];
  
  lines.push(`${indent}if (${condition}) {`);
  
  // Follow "True" / "True" execution output
  const trueNodeId = getOutputTargetNode(node, 'True', graph)
    || getOutputTargetNode(node, 'True', graph);
  if (trueNodeId) {
    const visited = new Set<string>();
    const trueCode = generateExecutionChain(trueNodeId, graph, options, indentLevel + 1, visited);
    if (trueCode.trim()) {
      lines.push(trueCode);
    } else {
      lines.push(`${indent}${getIndent(options)}// True branch`);
    }
  } else {
    lines.push(`${indent}${getIndent(options)}// True branch`);
  }
  
  // Follow "False" / "False" execution output
  const falseNodeId = getOutputTargetNode(node, 'False', graph)
    || getOutputTargetNode(node, 'False', graph);
  if (falseNodeId) {
    lines.push(`${indent}} else {`);
    const visited = new Set<string>();
    const falseCode = generateExecutionChain(falseNodeId, graph, options, indentLevel + 1, visited);
    if (falseCode.trim()) {
      lines.push(falseCode);
    } else {
      lines.push(`${indent}${getIndent(options)}// False branch`);
    }
    lines.push(`${indent}}`);
  } else {
    lines.push(`${indent}}`);
  }
  
  return lines.join('\n');
}

function generateSwitchCode(
  node: LogicNode,
  graph: LogicGraph,
  options: CodeGenOptions,
  indentLevel: number
): string {
  const indent = getIndent(options).repeat(indentLevel);
  const innerIndent = getIndent(options).repeat(indentLevel + 1);
  const bodyIndent = getIndent(options).repeat(indentLevel + 2);
  const value = getInputValue(node, 'Value', graph);
  const cases = node.params.cases || [0, 1, 2];
  const lines: string[] = [];
  
  lines.push(`${indent}switch (${value}) {`);
  
  for (const caseVal of cases) {
    lines.push(`${innerIndent}case ${caseVal}: {`);
    
    // Try to find execution output for this case
    const caseNodeId = getOutputTargetNode(node, `Case ${caseVal}`, graph)
      || getOutputTargetNode(node, String(caseVal), graph);
    if (caseNodeId) {
      const visited = new Set<string>();
      const caseCode = generateExecutionChain(caseNodeId, graph, options, indentLevel + 2, visited);
      if (caseCode.trim()) {
        lines.push(caseCode);
      }
    }
    
    lines.push(`${bodyIndent}break;`);
    lines.push(`${innerIndent}}`);
  }
  
  // Default case
  const defaultNodeId = getOutputTargetNode(node, 'Default', graph)
    || getOutputTargetNode(node, 'Default', graph);
  lines.push(`${innerIndent}default: {`);
  if (defaultNodeId) {
    const visited = new Set<string>();
    const defaultCode = generateExecutionChain(defaultNodeId, graph, options, indentLevel + 2, visited);
    if (defaultCode.trim()) {
      lines.push(defaultCode);
    }
  }
  lines.push(`${bodyIndent}break;`);
  lines.push(`${innerIndent}}`);
  
  lines.push(`${indent}}`);
  
  return lines.join('\n');
}

function generateSetPropertyCode(node: LogicNode, indent: string): string {
  const target = node.params.targetComponent || 'obj';
  const property = node.params.property || 'x';
  const value = node.params.value !== undefined ? node.params.value : 'value';
  const targetName = `ui_${toSnakeCase(target)}`;
  
  const setters: Record<string, string> = {
    x: `lv_obj_set_x(${targetName}, ${value});`,
    y: `lv_obj_set_y(${targetName}, ${value});`,
    width: `lv_obj_set_width(${targetName}, ${value});`,
    height: `lv_obj_set_height(${targetName}, ${value});`,
    opacity: `lv_obj_set_style_opa(${targetName}, ${value}, LV_PART_MAIN);`,
  };
  
  return `${indent}${setters[property] || `// Set property: ${property} on ${targetName}`}`;
}

function generateNavigatePageCode(node: LogicNode, indent: string): string {
  const targetPage = node.params.targetPage || 'page1';
  const animation = node.params.animation || 'none';
  const pageName = `ui_${toSnakeCase(targetPage)}`;
  
  if (animation === 'none') {
    return `${indent}lv_scr_load(${pageName});`;
  }
  const animMap: Record<string, string> = {
    fade: 'LV_SCR_LOAD_ANIM_FADE_IN',
    slide_left: 'LV_SCR_LOAD_ANIM_MOVE_LEFT',
    slide_right: 'LV_SCR_LOAD_ANIM_MOVE_RIGHT',
    slide_up: 'LV_SCR_LOAD_ANIM_MOVE_TOP',
    slide_down: 'LV_SCR_LOAD_ANIM_MOVE_BOTTOM',
  };
  const animType = animMap[animation] || 'LV_SCR_LOAD_ANIM_FADE_IN';
  return `${indent}lv_scr_load_anim(${pageName}, ${animType}, 300, 0, false);`;
}

function generateShowHideCode(node: LogicNode, indent: string): string {
  const target = node.params.targetComponent || 'obj';
  const action = node.params.action || 'toggle';
  const targetName = `ui_${toSnakeCase(target)}`;
  
  switch (action) {
    case 'show':
      return `${indent}lv_obj_clear_flag(${targetName}, LV_OBJ_FLAG_HIDDEN);`;
    case 'hide':
      return `${indent}lv_obj_add_flag(${targetName}, LV_OBJ_FLAG_HIDDEN);`;
    case 'toggle':
      return [
        `${indent}if (lv_obj_has_flag(${targetName}, LV_OBJ_FLAG_HIDDEN)) {`,
        `${indent}    lv_obj_clear_flag(${targetName}, LV_OBJ_FLAG_HIDDEN);`,
        `${indent}} else {`,
        `${indent}    lv_obj_add_flag(${targetName}, LV_OBJ_FLAG_HIDDEN);`,
        `${indent}}`,
      ].join('\n');
    default:
      return `${indent}// Unknown show/hide action: ${action}`;
  }
}

function generateSetTextCode(node: LogicNode, graph: LogicGraph, indent: string): string {
  const target = node.params.targetComponent || 'label';
  const text = getInputValue(node, 'Text', graph);
  const targetName = `ui_${toSnakeCase(target)}`;

  // If the input is not a string literal, format it as a number.
  // This enables "blocks-only" flows like: timer → math → set_text(label, counter)
  const trimmed = String(text).trim();
  const isStringLiteral = trimmed.startsWith('"') && trimmed.endsWith('"');
  if (isStringLiteral) {
    return `${indent}lv_label_set_text(${targetName}, ${trimmed});`;
  }

  const bufName = `txt_${toSnakeCase(node.id)}`;
  return [
    `${indent}char ${bufName}[16];`,
    `${indent}snprintf(${bufName}, sizeof(${bufName}), "%d", (int)(${trimmed}));`,
    `${indent}lv_label_set_text(${targetName}, ${bufName});`,
  ].join('\n');
}

function generateSetValueCode(node: LogicNode, graph: LogicGraph, indent: string): string {
  const target = node.params.targetComponent || 'slider';
  const value = getInputValue(node, 'Value', graph);
  const targetName = `ui_${toSnakeCase(target)}`;
  const compType = node.params.componentType || 'slider';
  
  // Choose the correct LVGL API based on component type
  const valueSetters: Record<string, string> = {
    slider: `lv_slider_set_value(${targetName}, ${value}, LV_ANIM_ON);`,
    bar: `lv_bar_set_value(${targetName}, ${value}, LV_ANIM_ON);`,
    arc: `lv_arc_set_value(${targetName}, ${value});`,
    spinner: `// Spinner value cannot be set directly`,
  };
  
  return `${indent}${valueSetters[compType] || `lv_slider_set_value(${targetName}, ${value}, LV_ANIM_ON);`}`;
}

function generateCallFunctionCode(node: LogicNode, indent: string): string {
  const functionName = node.params.functionName || 'custom_function';
  const args = node.params.arguments || [];
  const argsStr = args.length > 0 ? args.join(', ') : '';
  
  return `${indent}${functionName}(${argsStr});`;
}

function generateDelayCode(node: LogicNode, indent: string, options: CodeGenOptions): string {
  const duration = node.params.duration || 1000;
  
  if (options.generateComments) {
    return [
      `${indent}// Delay ${duration}ms — subsequent actions should be in a timer callback`,
      `${indent}// Consider restructuring with lv_timer_create for non-blocking delay`,
    ].join('\n');
  }
  return `${indent}// Delay ${duration}ms`;
}

function generateVarWriteCode(node: LogicNode, graph: LogicGraph, indent: string): string {
  const ref = node.params.variableName || node.params.variableId || 'unknown';
  const variable = resolveVariableRef(graph, ref);
  if (variable?.readOnly || variable?.source === 'hardware') {
    return `${indent}/* write to read-only hardware variable ${variable?.name || ref} skipped */`;
  }
  const value = getInputValue(node, 'Value', graph);
  const cVarName = variable?.name
    ? toSnakeCase(`var_${variable.name}`)
    : toSnakeCase(`var_${ref}`);

  return `${indent}${cVarName} = ${value};`;
}

function generateCustomCodeBlock(node: LogicNode, indent: string): string {
  const code = (node.params.code || '// Custom code').trim();
  
  // Indent each line of custom code
  return code.split('\n').map((line: string) => `${indent}${line}`).join('\n');
}
