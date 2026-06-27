/* global Blockly, workspaceToRules, validateRules */

function showBootError(message) {
  const layout = document.getElementById('app-layout');
  const header = document.querySelector('header');
  const err = document.getElementById('boot-error');
  if (layout) {
    layout.hidden = true;
  }
  if (header) {
    header.hidden = true;
  }
  if (err) {
    err.hidden = false;
    err.innerHTML =
      '<h1>Ошибка Blockly</h1>' +
      '<p>' +
      message +
      '</p>' +
      '<p>Запустите <code>.\\start.ps1</code> и откройте <a href="http://localhost:8081">http://localhost:8081</a></p>';
  }
}

function initBlockly() {
  if (typeof Blockly === 'undefined') {
    showBootError('Библиотека Blockly не загрузилась. Запустите локальный сервер.');
    return;
  }

  const toolbox = {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category',
        name: 'Logic',
        colour: '#5C81A6',
        contents: [
          { kind: 'block', type: 'logic_rules' },
          { kind: 'block', type: 'logic_state' },
          { kind: 'block', type: 'logic_transition' },
        ],
      },
    ],
  };

  let workspace;
  try {
    workspace = Blockly.inject('workspace', {
      toolbox,
      media: 'node_modules/blockly/media/',
      grid: { spacing: 20, length: 3, colour: '#444', snap: true },
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 3, minScale: 0.3 },
      trashcan: true,
    });
  } catch (e) {
    showBootError(e.message || String(e));
    return;
  }

  const statusEl = document.getElementById('status');
  const jsonOut = document.getElementById('json-out');

  function setStatus(msg, ok) {
    statusEl.textContent = msg;
    statusEl.style.color = ok ? '#8f8' : '#f88';
  }

  function refreshJson() {
    const rules = workspaceToRules(workspace);
    const err = validateRules(rules);
    if (err) {
      jsonOut.value = '';
      setStatus(err, false);
      return null;
    }
    const text = JSON.stringify(rules, null, 2);
    jsonOut.value = text;
    setStatus('OK', true);
    return text;
  }

  function loadDemo() {
    workspace.clear();
    Blockly.Xml.domToWorkspace(
      Blockly.utils.xml.textToDom(
        '<xml xmlns="https://developers.google.com/blockly/xml">' +
          '<block type="logic_rules" x="40" y="40">' +
          '<field name="INITIAL">home</field>' +
          '<statement name="STATES">' +
          '<block type="logic_state"><field name="ID">home</field><field name="LABEL">Home</field>' +
          '<field name="COLOR">#0066ff</field><next>' +
          '<block type="logic_state"><field name="ID">warn</field><field name="LABEL">Warning</field>' +
          '<field name="COLOR">#ff6600</field><next>' +
          '<block type="logic_state"><field name="ID">ok</field><field name="LABEL">OK</field>' +
          '<field name="COLOR">#00cc66</field></block></next></block></next></block>' +
          '</statement><statement name="TRANSITIONS">' +
          '<block type="logic_transition"><field name="FROM">home</field><field name="EVENT">enc_cw</field>' +
          '<field name="TO">warn</field><next>' +
          '<block type="logic_transition"><field name="FROM">warn</field><field name="EVENT">enc_cw</field>' +
          '<field name="TO">ok</field><next>' +
          '<block type="logic_transition"><field name="FROM">ok</field><field name="EVENT">enc_cw</field>' +
          '<field name="TO">home</field><next>' +
          '<block type="logic_transition"><field name="FROM">*</field><field name="EVENT">enc_press</field>' +
          '<field name="TO">home</field></block></next></block></next></block></next></block>' +
          '</statement></block></xml>',
      ),
      workspace,
    );
    refreshJson();
    setStatus('Demo loaded', true);
  }

  document.getElementById('btn-demo').addEventListener('click', loadDemo);
  document.getElementById('btn-validate').addEventListener('click', () => refreshJson());
  document.getElementById('btn-export').addEventListener('click', () => {
    const text = refreshJson();
    if (!text) {
      return;
    }
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rules.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus('Downloaded rules.json', true);
  });
  document.getElementById('btn-copy').addEventListener('click', () => {
    const text = refreshJson();
    if (!text) {
      return;
    }
    navigator.clipboard.writeText(text).then(() => setStatus('Copied to clipboard', true));
  });

  workspace.addChangeListener(() => refreshJson());
  loadDemo();
}

if (location.protocol !== 'file:') {
  initBlockly();
}
