import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import ComponentPanel from './components/ComponentPanel';
import Canvas from './components/Canvas';
import PropertyEditor from './components/PropertyEditor';
import EventPanel from './components/EventPanel';
import AnimationPanel from './components/AnimationPanel';
import PageManager from './components/PageManager';
import StatusBar from './components/StatusBar';
import AlignToolbar from './components/AlignToolbar';
import HelpPanel from './components/HelpPanel';
import Toast, { useToast } from './components/Toast';
import Modal, { modal } from './components/Modal';
import CodePreview from './components/CodePreview';
import { LogicEditor } from './components/LogicEditor';
import PreviewPanel from './components/Preview';
import SimulatorPanel from './components/Simulator';
import { HierarchyPanel } from './components/HierarchyPanel';
import { ThemeSelector } from './components/ThemeSelector';
import { ResourcePanel, useResourceStore } from './resources';
import { useLogicEditorStore } from './components/LogicEditor';
import { ProjectListPage } from './components/ProjectManager';
import { ProjectSettings } from './components/ProjectSettings';
import {
  downloadProject,
  loadProjectFromFile,
  saveProjectToFile,
} from './resources/projectManager';
import { useEditorStore } from './store/editorStore';
import { useAppStore, parseFontSize } from './store/appStore';
import { useProjectStore } from './store/projectStore';
import type { LvglComponent, Page } from './types';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { getComponentDefinition } from './utils/componentDefinitions';
import './App.css';

type TabType = 'design' | 'logic' | 'code' | 'preview' | 'simulator';

interface HeaderIconButtonProps {
  variant: 'tab' | 'toolbar';
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}

const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({
  variant,
  label,
  icon,
  onClick,
  active = false,
  disabled = false,
  title,
}) => (
  <button
    type="button"
    className={`${variant === 'tab' ? 'tab-btn' : 'toolbar-button'}${active ? ' active' : ''}${disabled ? ' disabled' : ''}`}
    onClick={onClick}
    disabled={disabled}
    title={title ?? label}
  >
    <span className={variant === 'tab' ? 'tab-btn-icon' : 'toolbar-button-icon'} aria-hidden>
      {icon}
    </span>
    <span className={variant === 'tab' ? 'tab-btn-label' : 'toolbar-button-label'}>{label}</span>
  </button>
);

const AppTabButton: React.FC<Omit<HeaderIconButtonProps, 'variant'>> = (props) => (
  <HeaderIconButton variant="tab" {...props} />
);

const ToolbarButton: React.FC<Omit<HeaderIconButtonProps, 'variant'> & { shortcut?: string }> = ({
  shortcut,
  label,
  ...props
}) => (
  <HeaderIconButton
    variant="toolbar"
    label={label}
    title={shortcut ? `${label} (${shortcut})` : label}
    {...props}
  />
);

/** ESP32-style dev board icon for the Simulator tab */
const PcbTabIcon: React.FC = () => (
  <svg className="tab-pcb-icon" viewBox="0 0 24 24" aria-hidden>
    <rect x="7" y="2.5" width="10" height="19" rx="1.4" fill="#2c3e50" stroke="#90a4ae" strokeWidth="1" />
    <path d="M9 4.5h6v1.2H9z" fill="#546e7a" />
    <path d="M10 5.2h1.2v0.4h-1.2zm2.4 0h1.2v0.4h-1.2zm2.4 0H16v0.4h-1.2z" fill="#78909c" />
    <rect x="8.8" y="8.2" width="6.4" height="6.4" rx="0.8" fill="#455a64" stroke="#b0bec5" strokeWidth="0.5" />
    <rect x="10.2" y="9.6" width="3.6" height="3.6" rx="0.4" fill="#37474f" />
    <rect x="5.2" y="7.5" width="1.6" height="0.75" rx="0.2" fill="#ffb300" />
    <rect x="5.2" y="9.2" width="1.6" height="0.75" rx="0.2" fill="#ffb300" />
    <rect x="5.2" y="10.9" width="1.6" height="0.75" rx="0.2" fill="#ffb300" />
    <rect x="5.2" y="12.6" width="1.6" height="0.75" rx="0.2" fill="#ffb300" />
    <rect x="5.2" y="14.3" width="1.6" height="0.75" rx="0.2" fill="#ffb300" />
    <rect x="17.2" y="7.5" width="1.6" height="0.75" rx="0.2" fill="#ffb300" />
    <rect x="17.2" y="9.2" width="1.6" height="0.75" rx="0.2" fill="#ffb300" />
    <rect x="17.2" y="10.9" width="1.6" height="0.75" rx="0.2" fill="#ffb300" />
    <rect x="17.2" y="12.6" width="1.6" height="0.75" rx="0.2" fill="#ffb300" />
    <rect x="17.2" y="14.3" width="1.6" height="0.75" rx="0.2" fill="#ffb300" />
    <rect x="9.2" y="17.8" width="5.6" height="2.2" rx="0.5" fill="#cfd8dc" stroke="#90a4ae" strokeWidth="0.4" />
    <rect x="10.8" y="18.4" width="2.4" height="1" rx="0.2" fill="#78909c" />
  </svg>
);

const App: React.FC = () => {
  const { currentView, currentProjectId, showProjectSettings, openProject, goToProjectList, setShowProjectSettings, setLastSaveTime, setDefaultFontSize } = useAppStore();
  const { loadProjectData, getProjectConfig, saveProjectData, exportProject, importProject, getProjectFileHandle, setProjectFileHandle } = useProjectStore();

  // On mount: check lastOpenProjectId
  useEffect(() => {
    const lastId = localStorage.getItem('lastOpenProjectId');
    if (lastId) {
      // Verify project still exists, then open
      getProjectConfig(lastId).then(cfg => {
        if (cfg) {
          // Load project data into stores
          loadProjectData(lastId).then(({ data, images, fonts }) => {
            useEditorStore.getState().setPages(data.pages as Page[]);
            useEditorStore.getState().setCanvasSize(cfg.display.width, cfg.display.height);
            useResourceStore.getState().importResources({ images, fonts });
            if (data.logicGraphs) {
              useLogicEditorStore.getState().setGraphs(data.logicGraphs);
            }
            // Set default font size from project config
            const fontRes = fonts.find(f => f.cFontName === cfg.lvglConfig.defaultFont);
            setDefaultFontSize(parseFontSize(cfg.lvglConfig.defaultFont, fontRes?.sizes, cfg.lvglConfig.defaultFontSize));
            openProject(lastId);
          }).catch(() => {
            // Failed to load, show project list
          });
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toast hook must be called unconditionally (before any early return)
  const { messages: toastMessages, removeToast: removeGlobalToast } = useToast();

  if (currentView === 'projectList') {
    return (
      <div className="app">
        <ProjectListPage />
        <Toast messages={toastMessages} onRemove={removeGlobalToast} />
        <Modal />
      </div>
    );
  }

  return <EditorView
    currentProjectId={currentProjectId}
    showProjectSettings={showProjectSettings}
    setShowProjectSettings={setShowProjectSettings}
    goToProjectList={goToProjectList}
    setLastSaveTime={setLastSaveTime}
    setDefaultFontSize={setDefaultFontSize}
    saveProjectData={saveProjectData}
    exportProject={exportProject}
    importProject={importProject}
    getProjectFileHandle={getProjectFileHandle}
    setProjectFileHandle={setProjectFileHandle}
    loadProjectData={loadProjectData}
    getProjectConfig={getProjectConfig}
    openProject={openProject}
  />;
};

// Separate editor view to keep hooks stable
interface EditorViewProps {
  currentProjectId: string | null;
  showProjectSettings: boolean;
  setShowProjectSettings: (v: boolean) => void;
  goToProjectList: () => void;
  setLastSaveTime: (t: number) => void;
  setDefaultFontSize: (size: number) => void;
  saveProjectData: (id: string, pages: Page[], logicGraphs: import('./components/LogicEditor/types').LogicGraph[], images: import('./resources/types').ImageResource[], fonts: import('./resources/types').FontResource[]) => Promise<void>;
  exportProject: (id: string) => Promise<import('./resources/types').ProjectFile>;
  importProject: (file: import('./resources/types').ProjectFile, name?: string) => Promise<string>;
  getProjectFileHandle: (id: string) => Promise<FileSystemFileHandle | undefined>;
  setProjectFileHandle: (id: string, handle: FileSystemFileHandle) => Promise<void>;
  loadProjectData: (id: string) => Promise<{ data: { pages: Page[]; logicGraphs: import('./components/LogicEditor/types').LogicGraph[] }; images: import('./resources/types').ImageResource[]; fonts: import('./resources/types').FontResource[] }>;
  getProjectConfig: (id: string) => Promise<import('./store/projectStore').ProjectConfig | undefined>;
  openProject: (id: string) => void;
}

function collectEditorSnapshot() {
  const pages = useEditorStore.getState().pages;
  const { images, fonts } = useResourceStore.getState();
  const logicGraphs = useLogicEditorStore.getState().graphs;
  return { pages, images, fonts, logicGraphs };
}

async function persistProjectSnapshot(
  projectId: string,
  saveProjectData: EditorViewProps['saveProjectData'],
) {
  const { pages, images, fonts, logicGraphs } = collectEditorSnapshot();
  await saveProjectData(projectId, pages, logicGraphs, images, fonts);
}

const EditorView: React.FC<EditorViewProps> = ({
  currentProjectId,
  showProjectSettings,
  setShowProjectSettings,
  goToProjectList,
  setLastSaveTime,
  setDefaultFontSize,
  saveProjectData,
  exportProject,
  importProject,
  getProjectFileHandle,
  setProjectFileHandle,
  loadProjectData,
  getProjectConfig,
  openProject,
}) => {
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  const { addComponent, pages, setPages, setCanvasSize } = useEditorStore();
  const { images, fonts, importResources } = useResourceStore();
  const logicGraphs = useLogicEditorStore(s => s.graphs);
  const { messages, removeToast, success, error } = useToast();

  // UI State
  const [showResourcePanel, setShowResourcePanel] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('design');
  const [projectName, setProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load project name
  useEffect(() => {
    if (!currentProjectId) return;
    getProjectConfig(currentProjectId).then(cfg => {
      if (cfg) setProjectName(cfg.name);
    });
  }, [currentProjectId, getProjectConfig]);

  // Configure drag sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const sensors = useSensors(mouseSensor);

  // Track dragging state for overlay
  const [activeDragType, setActiveDragType] = React.useState<string | null>(null);

  // Auto-save to IndexedDB
  useEffect(() => {
    if (!currentProjectId) return;

    const doSave = async () => {
      try {
        await persistProjectSnapshot(currentProjectId, saveProjectData);
        setLastSaveTime(Date.now());
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    };

    // Debounce: save shortly after any change, plus periodic interval
    const debounceTimer = setTimeout(doSave, 1000);
    const saveInterval = setInterval(doSave, 30000);

    // Save on beforeunload
    const handleBeforeUnload = () => {
      // Fire-and-forget; IndexedDB transactions may or may not complete
      doSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(debounceTimer);
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentProjectId, pages, images, fonts, logicGraphs, saveProjectData, setLastSaveTime]);

  // Project management handlers
  const handleSaveProject = useCallback(async () => {
    if (!currentProjectId) return;
    try {
      await persistProjectSnapshot(currentProjectId, saveProjectData);
      const project = await exportProject(currentProjectId);
      const existingHandle = await getProjectFileHandle(currentProjectId);
      const { result, handle } = await saveProjectToFile(project, { existingHandle });

      if (result === 'cancelled') {
        setLastSaveTime(Date.now());
        success('Project saved locally');
        return;
      }

      if (handle) {
        await setProjectFileHandle(currentProjectId, handle);
      }

      setLastSaveTime(Date.now());
      if (result === 'saved') {
        success('Project saved');
      } else {
        success('Project saved (downloaded)');
      }
    } catch (err) {
      error('Save failed: ' + String(err));
    }
  }, [
    currentProjectId,
    saveProjectData,
    exportProject,
    getProjectFileHandle,
    setProjectFileHandle,
    setLastSaveTime,
    success,
    error,
  ]);

  const handleExportProject = useCallback(async () => {
    if (!currentProjectId) return;
    try {
      await persistProjectSnapshot(currentProjectId, saveProjectData);
      const project = await exportProject(currentProjectId);
      const result = await downloadProject(project);
      if (result === 'cancelled') return;
      success('Project exported');
    } catch (err) {
      error('Export failed: ' + String(err));
    }
  }, [currentProjectId, saveProjectData, exportProject, success, error]);

  const handleImportProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const project = await loadProjectFromFile(file);
      const id = await importProject(project, project.name);
      const cfg = await getProjectConfig(id);
      if (cfg) {
        const { data, images: imgs, fonts: fnts } = await loadProjectData(id);
        setPages(data.pages as Page[]);
        setCanvasSize(cfg.display.width, cfg.display.height);
        importResources({ images: imgs, fonts: fnts });
        if (data.logicGraphs) {
          useLogicEditorStore.getState().setGraphs(data.logicGraphs);
        }
        const fontRes = fnts.find(f => f.cFontName === cfg.lvglConfig.defaultFont);
        setDefaultFontSize(parseFontSize(cfg.lvglConfig.defaultFont, fontRes?.sizes, cfg.lvglConfig.defaultFontSize));
        openProject(id);
        setProjectName(cfg.name);
      }
      success(`Project "${project.name}" imported successfully`);
    } catch (err) {
      error('Import failed: ' + String(err));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNewProjectClick = useCallback(async () => {
    if (await modal.confirm('Creating a new project returns to the project list. The current project will be saved. Continue?')) {
      if (currentProjectId) {
        await persistProjectSnapshot(currentProjectId, saveProjectData);
      }
      goToProjectList();
    }
  }, [currentProjectId, saveProjectData, goToProjectList]);

  const handleBackToList = useCallback(async () => {
    if (currentProjectId) {
      try {
        await persistProjectSnapshot(currentProjectId, saveProjectData);
      } catch {
        // ignore
      }
    }
    goToProjectList();
  }, [currentProjectId, saveProjectData, goToProjectList]);

  // Listen for keyboard shortcut events
  useEffect(() => {
    const handleToggleHelp = () => setShowHelpPanel(prev => !prev);
    const handleSaveProjectEvt = () => handleSaveProject();
    const handleOpenProject = () => handleImportProject();
    const handleNewProject = () => handleNewProjectClick();

    window.addEventListener('toggle-help-panel', handleToggleHelp);
    window.addEventListener('save-project', handleSaveProjectEvt);
    window.addEventListener('open-project', handleOpenProject);
    window.addEventListener('new-project', handleNewProject);

    return () => {
      window.removeEventListener('toggle-help-panel', handleToggleHelp);
      window.removeEventListener('save-project', handleSaveProjectEvt);
      window.removeEventListener('open-project', handleOpenProject);
      window.removeEventListener('new-project', handleNewProject);
    };
  }, [handleSaveProject, handleNewProjectClick]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'new-component') {
      setActiveDragType(active.data.current.componentType);
    }
  }, []);

  // Track last mouse position for accurate drop placement
  const lastMousePos = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragType(null);

    // Check if dropped on canvas
    if (over?.id === 'canvas-drop-area' && active.data.current?.type === 'new-component') {
      const componentType = active.data.current.componentType;

      const canvasElement = document.querySelector('.canvas');
      if (canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        const currentCanvas = useEditorStore.getState().canvas;

        // Use tracked mouse position — immune to CSS transform issues with dnd-kit delta
        const dropX = (lastMousePos.current.x - rect.left) / currentCanvas.zoom;
        const dropY = (lastMousePos.current.y - rect.top) / currentCanvas.zoom;

        // Find the deepest container component under the drop point
        const state = useEditorStore.getState();
        const currentPage = state.pages.find(p => p.id === state.currentPageId);
        const components = currentPage?.components || [];

        type HitResult = { comp: LvglComponent; absX: number; absY: number } | null;

        const findDeepestContainer = (
          comps: LvglComponent[],
          offsetX: number,
          offsetY: number,
        ): HitResult => {
          // Iterate in reverse so top-most (last rendered) components are checked first
          for (let i = comps.length - 1; i >= 0; i--) {
            const comp = comps[i];
            const absX = comp.x + offsetX;
            const absY = comp.y + offsetY;

            if (
              dropX >= absX && dropX <= absX + comp.width &&
              dropY >= absY && dropY <= absY + comp.height
            ) {
              const def = getComponentDefinition(comp.type);
              if (def?.isContainer) {
                // Check children first for a deeper container
                const deeper = findDeepestContainer(comp.children, absX, absY);
                return deeper || { comp, absX, absY };
              }
            }
          }
          return null;
        };

        const container = findDeepestContainer(components, 0, 0);

        // Calculate position relative to the container (or canvas root)
        let x = dropX;
        let y = dropY;
        let parentId: string | null = null;

        if (container) {
          x = dropX - container.absX;
          y = dropY - container.absY;
          parentId = container.comp.id;
        }

        // Center the component on the drop point
        const definition = getComponentDefinition(componentType);
        if (definition) {
          x -= definition.defaultWidth / 2;
          y -= definition.defaultHeight / 2;
        }

        // Clamp within bounds
        if (container) {
          x = Math.max(0, Math.min(x, container.comp.width - (definition?.defaultWidth || 50)));
          y = Math.max(0, Math.min(y, container.comp.height - (definition?.defaultHeight || 50)));
        } else {
          x = Math.max(0, Math.min(x, currentCanvas.width - 50));
          y = Math.max(0, Math.min(y, currentCanvas.height - 50));
        }

        addComponent(componentType, x, y, parentId);
      }
    }
  }, [addComponent]);

  // Render drag overlay
  const renderDragOverlay = () => {
    if (!activeDragType) return null;

    const definition = getComponentDefinition(activeDragType);
    if (!definition) return null;

    return (
      <div className="drag-overlay-item">
        <span className="drag-overlay-icon">{definition.icon}</span>
        <span className="drag-overlay-name">{definition.name}</span>
      </div>
    );
  };

  // Render main content based on active tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'design':
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="app-body">
              <div className="left-panel">
                <ComponentPanel />
                <HierarchyPanel />
              </div>
              <div className="canvas-area">
                <AlignToolbar />
                <Canvas />
                <PageManager />
              </div>
              <div className="right-panel">
                <PropertyEditor />
                <EventPanel />
                <AnimationPanel />
              </div>
              {showResourcePanel && (
                <div className="resource-panel-container">
                  <ResourcePanel />
                </div>
              )}
            </div>
            <DragOverlay dropAnimation={null}>
              {renderDragOverlay()}
            </DragOverlay>
          </DndContext>
        );

      case 'logic':
        return (
          <div className="app-body full-panel">
            <LogicEditor />
          </div>
        );

      case 'code':
        return (
          <div className="app-body full-panel">
            <CodePreview />
          </div>
        );

      case 'preview':
        return (
          <div className="app-body full-panel">
            <PreviewPanel />
          </div>
        );

      case 'simulator':
        return (
          <div className="app-body full-panel">
            <SimulatorPanel />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-logo">
          <button className="back-to-list-btn" onClick={handleBackToList} title="Back to project list">
            ◀
          </button>
          <span className="logo-icon">📐</span>
          <span className="logo-text project-name-display">{projectName || 'GameTracker Editor'}</span>
        </div>

        <div className="app-header-controls">
          <div className="app-tabs">
          <AppTabButton
            active={activeTab === 'design'}
            onClick={() => setActiveTab('design')}
            label="Design"
            icon="🎨"
          />
          <AppTabButton
            active={activeTab === 'logic'}
            onClick={() => setActiveTab('logic')}
            label="Logic"
            icon="🔗"
          />
          <AppTabButton
            active={activeTab === 'code'}
            onClick={() => setActiveTab('code')}
            label="Code"
            icon="💻"
          />
          <AppTabButton
            active={activeTab === 'preview'}
            onClick={() => setActiveTab('preview')}
            label="Preview"
            icon="📱"
          />
          <AppTabButton
            active={activeTab === 'simulator'}
            onClick={() => setActiveTab('simulator')}
            label="Simulator"
            icon={<PcbTabIcon />}
          />
          </div>
          <div className="toolbar-divider header-controls-divider" />
          <div className="app-toolbar">
          <ToolbarButton icon="💾" label="Save" onClick={handleSaveProject} shortcut="Ctrl+S" />
          <ToolbarButton icon="📤" label="Export" onClick={handleExportProject} />
          <ToolbarButton icon="📥" label="Import" onClick={handleImportProject} />
          <div className="toolbar-divider" />
          <ToolbarButton icon="↩️" label="Undo" onClick={() => useEditorStore.getState().undo()} shortcut="Ctrl+Z" />
          <ToolbarButton icon="↪️" label="Redo" onClick={() => useEditorStore.getState().redo()} shortcut="Ctrl+Y" />
          <div className="toolbar-divider" />
          <ToolbarButton
            icon="📦"
            label="Assets"
            onClick={() => setShowResourcePanel(!showResourcePanel)}
            active={showResourcePanel}
          />
          <ToolbarButton
            icon="⚙️"
            label="Settings"
            onClick={() => setShowProjectSettings(true)}
            active={showProjectSettings}
          />
          <ToolbarButton
            icon="❓"
            label="Help"
            onClick={() => setShowHelpPanel(true)}
            active={showHelpPanel}
            shortcut="F1"
          />
          <div className="toolbar-divider" />
          <ThemeSelector />
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.lvgl.json"
          onChange={handleFileLoad}
          style={{ display: 'none' }}
        />
      </div>

      {renderMainContent()}

      <StatusBar />

      {/* Help Panel */}
      <HelpPanel isOpen={showHelpPanel} onClose={() => setShowHelpPanel(false)} />

      {/* Project Settings */}
      {showProjectSettings && <ProjectSettings />}

      {/* Toast notifications */}
      <Toast messages={messages} onRemove={removeToast} />

      {/* Global modal dialogs */}
      <Modal />
    </div>
  );
};

export default App;
