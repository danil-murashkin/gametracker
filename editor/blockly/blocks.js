/* global Blockly */

Blockly.Blocks['logic_rules'] = {
  init() {
    this.appendDummyInput().appendField('FSM rules');
    this.appendDummyInput()
      .appendField('initial')
      .appendField(new Blockly.FieldTextInput('home'), 'INITIAL');
    this.appendStatementInput('STATES').setCheck('logic_state').appendField('states');
    this.appendStatementInput('TRANSITIONS')
      .setCheck('logic_transition')
      .appendField('transitions');
    this.setColour(230);
  },
};

Blockly.Blocks['logic_state'] = {
  init() {
    this.appendDummyInput()
      .appendField('state id')
      .appendField(new Blockly.FieldTextInput('home'), 'ID');
    this.appendDummyInput()
      .appendField('label')
      .appendField(new Blockly.FieldTextInput('Home'), 'LABEL');
    this.appendDummyInput()
      .appendField('color')
      .appendField(new Blockly.FieldColour('#0066ff'), 'COLOR');
    this.setPreviousStatement(true, 'logic_state');
    this.setNextStatement(true, 'logic_state');
    this.setColour(160);
  },
};

Blockly.Blocks['logic_transition'] = {
  init() {
    this.appendDummyInput()
      .appendField('from')
      .appendField(new Blockly.FieldTextInput('home'), 'FROM');
    this.appendDummyInput()
      .appendField('event')
      .appendField(
        new Blockly.FieldDropdown([
          ['enc_cw', 'enc_cw'],
          ['enc_ccw', 'enc_ccw'],
          ['enc_press', 'enc_press'],
          ['jumper_inc', 'jumper_inc'],
          ['jumper_dec', 'jumper_dec'],
        ]),
        'EVENT',
      );
    this.appendDummyInput()
      .appendField('to')
      .appendField(new Blockly.FieldTextInput('warn'), 'TO');
    this.setPreviousStatement(true, 'logic_transition');
    this.setNextStatement(true, 'logic_transition');
    this.setColour(30);
  },
};
