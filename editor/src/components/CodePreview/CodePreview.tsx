import React, { useState, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../../store/editorStore';
import { useThemeStore } from '../../store/themeStore';
import { useLogicEditorStore } from '../LogicEditor';
import { useResourceStore } from '../../resources/resourceStore';
import { useAppStore } from '../../store/appStore';
import { useProjectStore } from '../../store/projectStore';
import { generateCode, getGeneratedFileNames, collectGeneratedExportFiles, exportGeneratedCodeToDirectory } from '../../codegen/generator';
import type { CodeGenOptions, GeneratedCode } from '../../codegen/types';
import { toast } from '../Toast';
import './CodePreview.css';

const CodePreview: React.FC = () => {
  const { pages } = useEditorStore();
  const { graphs: logicGraphs } = useLogicEditorStore();
  const { currentTheme } = useThemeStore();
  const imageResources = useResourceStore((s) => s.images);
  const fontResources = useResourceStore((s) => s.fonts);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const getProjectConfig = useProjectStore((s) => s.getProjectConfig);
  const [selectedFile, setSelectedFile] = useState<keyof GeneratedCode>('ui.c');
  const [isLoading, setIsLoading] = useState(true);
  const [projectDefaultFont, setProjectDefaultFont] = useState<string | undefined>();
  const [projectDefaultFontSize, setProjectDefaultFontSize] = useState<number | undefined>();
  const [projectUseBuiltinSymbols, setProjectUseBuiltinSymbols] = useState<boolean>(true);
  const [projectSymbolFont, setProjectSymbolFont] = useState<string | undefined>();

  useEffect(() => {
    if (!currentProjectId) return;
    getProjectConfig(currentProjectId).then(cfg => {
      if (cfg) {
        setProjectDefaultFont(cfg.lvglConfig.defaultFont);
        setProjectDefaultFontSize(cfg.lvglConfig.defaultFontSize);
        setProjectUseBuiltinSymbols(cfg.lvglConfig.useBuiltinSymbols !== false);
        setProjectSymbolFont(cfg.lvglConfig.symbolFont);
      }
    });
  }, [currentProjectId, getProjectConfig]);

  const fileNames = getGeneratedFileNames();

  const codeGenOptions: Partial<CodeGenOptions> = useMemo(() => ({
    lvglVersion: '9',
  }), []);

  const generatedCode = useMemo(() => {
    try {
      return generateCode(pages, codeGenOptions, logicGraphs, currentTheme, imageResources, fontResources, projectDefaultFont, projectDefaultFontSize, projectUseBuiltinSymbols, projectSymbolFont);
    } catch {
      console.error('Code generation error');
      return null;
    }
  }, [pages, codeGenOptions, logicGraphs, currentTheme, imageResources, fontResources, projectDefaultFont, projectDefaultFontSize, projectUseBuiltinSymbols, projectSymbolFont]);

  const currentCode = generatedCode?.[selectedFile] || '// Code generation failed';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      toast.success('Code copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleDownload = async () => {
    try {
      const result = await exportGeneratedCodeToDirectory({ [selectedFile]: currentCode });
      if (result === 'saved') {
        toast.success(`${selectedFile} saved`);
      } else if (result === 'cancelled') {
        return;
      } else {
        toast.success(`${selectedFile} downloaded`);
      }
    } catch {
      toast.error('Save failed');
    }
  };

  const handleDownloadAll = async () => {
    if (!generatedCode) return;

    try {
      const files = await collectGeneratedExportFiles(
        pages,
        codeGenOptions,
        logicGraphs,
        currentTheme,
        imageResources,
        fontResources,
        projectDefaultFont,
        projectDefaultFontSize,
        projectUseBuiltinSymbols,
        projectSymbolFont,
      );
      const result = await exportGeneratedCodeToDirectory(files);
      if (result === 'saved') {
        toast.success(`Saved ${Object.keys(files).length} files`);
      } else if (result === 'cancelled') {
        return;
      } else {
        toast.success('All files downloaded');
      }
    } catch {
      toast.error('Save failed');
    }
  };

  return (
    <div className="generated-code-panel">
      <div className="generated-code-panel-header">
        <div className="generated-code-panel-tabs">
          {fileNames.map(fileName => (
            <button
              key={fileName}
              className={`generated-code-tab ${selectedFile === fileName ? 'active' : ''}`}
              onClick={() => setSelectedFile(fileName)}
            >
              {fileName}
            </button>
          ))}
        </div>
        <div className="generated-code-panel-actions">
          <span className="generated-code-version-label" title="LVGL target version">LVGL v9</span>
          <button className="generated-code-action-btn" onClick={handleCopy} title="Copy code">
            📋 Copy
          </button>
          <button className="generated-code-action-btn" onClick={handleDownload} title="Save current file to folder">
            💾 Download
          </button>
          <button className="generated-code-action-btn primary" onClick={handleDownloadAll} title="Save all files to folder">
            📁 Download All
          </button>
        </div>
      </div>
      <div className="generated-code-panel-editor">
        <div className="generated-code-panel-editor-inner">
          <Editor
            width="100%"
            height="100%"
            language="c"
            theme="vs-light"
            value={currentCode}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'off',
              automaticLayout: true,
              folding: true,
              renderLineHighlight: 'line',
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
            onMount={() => setIsLoading(false)}
            loading={
              <div className="generated-code-panel-loading">
                <span>Loading editor...</span>
              </div>
            }
          />
        </div>
        {isLoading && (
          <div className="generated-code-panel-loading">
            <span>Loading editor...</span>
          </div>
        )}
      </div>
      <div className="generated-code-panel-footer">
        <span className="generated-code-stats">
          {currentCode.split('\n').length} Lines | {new Blob([currentCode]).size} bytes
        </span>
      </div>
    </div>
  );
};

export default CodePreview;
