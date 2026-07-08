import React from 'react';
import './HelpPanel.css';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Basic Actions',
    shortcuts: [
      { keys: 'Ctrl + Z', description: 'Undo' },
      { keys: 'Ctrl + Shift + Z', description: 'Redo' },
      { keys: 'Ctrl + Y', description: 'Redo' },
      { keys: 'Delete / Backspace', description: 'Delete selected' },
      { keys: 'Escape', description: 'Clear selection' },
    ],
  },
  {
    title: 'Select action',
    shortcuts: [
      { keys: 'Ctrl + A', description: 'Select all' },
      { keys: 'Ctrl + Click', description: 'Multi-select / toggle' },
      { keys: 'Mouse drag', description: 'Box select multiple' },
    ],
  },
  {
    title: 'Clipboard',
    shortcuts: [
      { keys: 'Ctrl + C', description: 'Copy' },
      { keys: 'Ctrl + X', description: 'Cut' },
      { keys: 'Ctrl + V', description: 'Paste' },
      { keys: 'Ctrl + D', description: 'Copy and paste (quick copy)' },
    ],
  },
  {
    title: 'Canvas',
    shortcuts: [
      { keys: 'Space + drag', description: 'Pan canvas' },
      { keys: 'Middle-mouse drag', description: 'Pan canvas' },
      { keys: 'Ctrl + Roller', description: 'Zoom canvas' },
    ],
  },
  {
    title: 'Other',
    shortcuts: [
      { keys: 'F1 / ?', description: 'Show keyboard shortcuts' },
      { keys: 'Ctrl + S', description: 'Save project' },
      { keys: 'Ctrl + O', description: 'Open Project' },
      { keys: 'Ctrl + N', description: 'New Project' },
    ],
  },
];

const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="help-panel-overlay" onClick={onClose}>
      <div className="help-panel" onClick={e => e.stopPropagation()}>
        <div className="help-panel-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <button className="help-panel-close" onClick={onClose}>×</button>
        </div>
        <div className="help-panel-content">
          {shortcutGroups.map((group, index) => (
            <div key={index} className="shortcut-group">
              <h3>{group.title}</h3>
              <div className="shortcut-list">
                {group.shortcuts.map((shortcut, idx) => (
                  <div key={idx} className="shortcut-item">
                    <kbd className="shortcut-keys">{shortcut.keys}</kbd>
                    <span className="shortcut-desc">{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="help-panel-footer">
          <span>Press Escape or click outside to close</span>
        </div>
      </div>
    </div>
  );
};

export default HelpPanel;
