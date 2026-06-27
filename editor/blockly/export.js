/* global Blockly */

function collectStates(block) {
  const states = {};
  let child = block.getInputTargetBlock('STATES');
  while (child) {
    const id = child.getFieldValue('ID').trim();
    if (id) {
      states[id] = {
        label: child.getFieldValue('LABEL'),
        color: child.getFieldValue('COLOR'),
      };
    }
    child = child.getNextBlock();
  }
  return states;
}

function collectTransitions(block) {
  const transitions = [];
  let child = block.getInputTargetBlock('TRANSITIONS');
  while (child) {
    transitions.push({
      from: child.getFieldValue('FROM').trim(),
      event: child.getFieldValue('EVENT'),
      to: child.getFieldValue('TO').trim(),
    });
    child = child.getNextBlock();
  }
  return transitions;
}

function workspaceToRules(workspace) {
  const root = workspace.getBlocksByType('logic_rules', false)[0];
  if (!root) {
    return null;
  }

  const initial = root.getFieldValue('INITIAL').trim();
  const states = collectStates(root);
  const transitions = collectTransitions(root);

  if (!initial || Object.keys(states).length === 0) {
    return null;
  }

  return {
    version: 1,
    initial,
    states,
    transitions,
  };
}

function validateRules(rules) {
  if (!rules) {
    return 'Add a "FSM rules" block to the workspace';
  }
  if (!rules.states[rules.initial]) {
    return 'Initial state "' + rules.initial + '" is not defined in states';
  }
  for (const tr of rules.transitions) {
    if (tr.from !== '*' && !rules.states[tr.from]) {
      return 'Unknown state in transition: "' + tr.from + '"';
    }
    if (!rules.states[tr.to]) {
      return 'Unknown target state: "' + tr.to + '"';
    }
  }
  return null;
}
