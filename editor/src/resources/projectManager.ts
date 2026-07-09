// Project Manager - Save/Load project files

import type { ProjectFile, ImageResource, FontResource } from './types';
import type { LogicGraph } from '../components/LogicEditor/types';
import type { CanvasState, Page } from '../types';

const PROJECT_VERSION = '1.0.0';

/**
 * Create a new project file structure
 */
export function createProjectFile(
  name: string,
  pages: Page[],
  canvas: CanvasState,
  images: ImageResource[],
  fonts: FontResource[],
  logicGraphs: LogicGraph[] = []
): ProjectFile {
  return {
    version: PROJECT_VERSION,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    canvasSize: {
      width: canvas.width,
      height: canvas.height,
    },
    pages: pages.map(page => ({
      id: page.id,
      name: page.name,
      components: page.components,
    })),
    resources: {
      images,
      fonts,
    },
    variables: [],
    logicGraphs,
    codeGenOptions: {
      outputFormat: 'single-file',
      includeComments: true,
      useStaticAllocation: true,
      prefix: 'ui',
      indentSize: 4,
      indentStyle: 'spaces',
    },
  };
}

/**
 * Serialize project to JSON string
 */
export function serializeProject(project: ProjectFile): string {
  return JSON.stringify(project, null, 2);
}

/**
 * Parse project from JSON string
 */
export function parseProject(jsonString: string): ProjectFile {
  const project = JSON.parse(jsonString) as ProjectFile;
  
  // Version compatibility check
  if (!project.version) {
    throw new Error('Invalid project file: missing version');
  }
  
  // Migrate old versions if needed
  const migrated = migrateProject(project);
  
  return migrated;
}

/**
 * Migrate project from older versions
 */
function migrateProject(project: ProjectFile): ProjectFile {
  const [major] = project.version.split('.').map(Number);
  
  // Currently only version 1.x.x is supported
  if (major !== 1) {
    console.warn(`Project version ${project.version} may not be fully compatible`);
  }
  
  // Ensure all required fields exist
  return {
    ...project,
    resources: project.resources || { images: [], fonts: [] },
    variables: project.variables || [],
    logicGraphs: project.logicGraphs || [],
    codeGenOptions: project.codeGenOptions || {
      outputFormat: 'single-file',
      includeComments: true,
      useStaticAllocation: true,
      prefix: 'ui',
      indentSize: 4,
      indentStyle: 'spaces',
    },
  };
}

export type SaveProjectResult = 'saved' | 'cancelled' | 'unsupported';

type ProjectFilePickerHandle = FileSystemFileHandle & {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
  queryPermission?: (descriptor: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: 'readwrite' }) => Promise<PermissionState>;
};

function projectFileName(project: ProjectFile): string {
  return `${project.name || 'project'}.lvgl.json`;
}

function downloadProjectFallback(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function ensureWritePermission(handle: ProjectFilePickerHandle): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) {
    return true;
  }
  const current = await handle.queryPermission({ mode: 'readwrite' });
  if (current === 'granted') return true;
  const requested = await handle.requestPermission({ mode: 'readwrite' });
  return requested === 'granted';
}

async function writeProjectBlob(
  handle: ProjectFilePickerHandle,
  blob: Blob,
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * Save project JSON to disk. Reuses an existing file handle when provided;
 * otherwise opens the native Save dialog.
 */
export async function saveProjectToFile(
  project: ProjectFile,
  options: {
    existingHandle?: FileSystemFileHandle | null;
    forcePicker?: boolean;
  } = {},
): Promise<{ result: SaveProjectResult; handle?: FileSystemFileHandle }> {
  const json = serializeProject(project);
  const blob = new Blob([json], { type: 'application/json' });
  const fileName = projectFileName(project);

  const w = window as Window & {
    showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>;
  };

  try {
    let handle = options.existingHandle ?? null;

    if (!options.forcePicker && handle) {
      const allowed = await ensureWritePermission(handle as ProjectFilePickerHandle);
      if (!allowed) {
        handle = null;
      }
    }

    if (options.forcePicker || !handle) {
      if (typeof w.showSaveFilePicker !== 'function') {
        downloadProjectFallback(blob, fileName);
        return { result: 'unsupported' };
      }
      handle = await w.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'LVGL Editor Project',
            accept: { 'application/json': ['.lvgl.json', '.json'] },
          },
        ],
      });
    }

    await writeProjectBlob(handle as ProjectFilePickerHandle, blob);
    return { result: 'saved', handle };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { result: 'cancelled' };
    }
    console.warn('Save picker failed, falling back to download:', e);
    downloadProjectFallback(blob, fileName);
    return { result: 'unsupported' };
  }
}

/**
 * Export project as JSON file (always prompts for destination).
 */
export async function downloadProject(project: ProjectFile): Promise<SaveProjectResult> {
  const { result } = await saveProjectToFile(project, { forcePicker: true });
  return result;
}

/**
 * Load project from file input
 */
export function loadProjectFromFile(file: File): Promise<ProjectFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const json = reader.result as string;
        const project = parseProject(json);
        resolve(project);
      } catch (error) {
        reject(new Error(`Failed to parse project file: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read project file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Save project to localStorage (auto-save)
 */
export function autoSaveProject(project: ProjectFile): void {
  try {
    const json = serializeProject(project);
    localStorage.setItem('lvgl-editor-autosave', json);
    localStorage.setItem('lvgl-editor-autosave-time', Date.now().toString());
  } catch (error) {
    console.error('Auto-save failed:', error);
  }
}

/**
 * Load auto-saved project from localStorage
 */
export function loadAutoSavedProject(): ProjectFile | null {
  try {
    const json = localStorage.getItem('lvgl-editor-autosave');
    if (!json) return null;
    
    return parseProject(json);
  } catch (error) {
    console.error('Failed to load auto-saved project:', error);
    return null;
  }
}

/**
 * Get auto-save timestamp
 */
export function getAutoSaveTime(): Date | null {
  const timestamp = localStorage.getItem('lvgl-editor-autosave-time');
  if (!timestamp) return null;
  return new Date(parseInt(timestamp, 10));
}

/**
 * Clear auto-saved project
 */
export function clearAutoSave(): void {
  localStorage.removeItem('lvgl-editor-autosave');
  localStorage.removeItem('lvgl-editor-autosave-time');
}

/**
 * Validate project structure
 */
export function validateProject(project: unknown): project is ProjectFile {
  if (!project || typeof project !== 'object') return false;
  
  const p = project as Record<string, unknown>;
  
  if (typeof p.version !== 'string') return false;
  if (typeof p.name !== 'string') return false;
  if (!p.canvasSize || typeof p.canvasSize !== 'object') return false;
  if (!Array.isArray(p.pages)) return false;
  
  return true;
}

/**
 * Calculate project file size (approximate)
 */
export function calculateProjectSize(project: ProjectFile): number {
  const json = serializeProject(project);
  return new Blob([json]).size;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
