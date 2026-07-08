// Built-in hardware variables available in every logic graph

import type { LogicVariable } from './types';

/** GPIO button states from ESP32 (updated by hal_buttons_poll). */
export const HARDWARE_VARIABLES: LogicVariable[] = [
  {
    id: 'hw-value-1',
    name: 'value_1',
    type: 'bool',
    defaultValue: false,
    source: 'hardware',
    readOnly: true,
    readExpr: 'value_1',
    includeHeader: 'hal_buttons.h',
    description: 'Button 1 press state (GPIO +)',
  },
  {
    id: 'hw-value-2',
    name: 'value_2',
    type: 'bool',
    defaultValue: false,
    source: 'hardware',
    readOnly: true,
    readExpr: 'value_2',
    includeHeader: 'hal_buttons.h',
    description: 'Button 2 press state (GPIO -)',
  },
];

export function isHardwareVariable(variable: LogicVariable): boolean {
  return variable.source === 'hardware'
    || HARDWARE_VARIABLES.some(hw => hw.name === variable.name);
}

/** Ensure built-in hardware variables are present in a graph's variable list. */
export function ensureHardwareVariables(variables: LogicVariable[]): LogicVariable[] {
  const result = [...variables];

  for (const hwVar of HARDWARE_VARIABLES) {
    const existing = result.find(v => v.name === hwVar.name);
    if (!existing) {
      result.unshift({ ...hwVar });
    } else if (existing.source !== 'hardware') {
      const index = result.indexOf(existing);
      result[index] = { ...hwVar, id: existing.id };
    }
  }

  return result;
}

export function findVariableByIdOrName(
  variables: LogicVariable[],
  idOrName: string
): LogicVariable | undefined {
  return variables.find(v => v.id === idOrName || v.name === idOrName);
}
