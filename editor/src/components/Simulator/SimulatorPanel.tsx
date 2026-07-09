import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useResourceStore } from '../../resources';
import { useLogicEditorStore } from '../LogicEditor';
import { useAppStore } from '../../store/appStore';
import { useProjectStore } from '../../store/projectStore';
import { generateCode } from '../../codegen';
import type { CodeGenOptions } from '../../codegen/types';
import { compileCode, type CompileStatus, type WasmRuntime } from '../CompilePreview/compilerService';
import CodePreview from '../CodePreview';
import {
  buildCompileUserFiles,
  buildFontRequests,
  HW_BUTTON_KEYS,
  isHardwareButtonKey,
  LV_KEY_MAP,
  renderFramebuffer,
} from './simulatorShared';
import './SimulatorPanel.css';

const MIN_DISPLAY_SCALE = 0.5;
const MAX_DISPLAY_SCALE = 2;
const DISPLAY_SCALE_STEP = 0.25;
const DEFAULT_DISPLAY_SCALE = 1;
const REBUILD_DEBOUNCE_MS = 600;

const SimulatorPanel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<WasmRuntime | null>(null);
  const rafIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const mousePressedRef = useRef(false);
  const rebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compileSeqRef = useRef(0);
  const simPausedRef = useRef(true);

  const [status, setStatus] = useState<CompileStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('Ready — press Play to run');
  const [compileOutput, setCompileOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [running, setRunning] = useState(false);
  const [simPaused, setSimPaused] = useState(true);
  const [value1, setValue1] = useState(false);
  const [value2, setValue2] = useState(false);
  const [displayScale, setDisplayScale] = useState(DEFAULT_DISPLAY_SCALE);
  const [codeGenOptions, setCodeGenOptions] = useState<Partial<CodeGenOptions>>({});

  const pages = useEditorStore((s) => s.pages);
  const canvas = useEditorStore((s) => s.canvas);
  const logicGraphs = useLogicEditorStore((s) => s.graphs);
  const { images: imageResources, fonts: fontResources } = useResourceStore();
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const getProjectConfig = useProjectStore((s) => s.getProjectConfig);

  const [projectDefaultFont, setProjectDefaultFont] = useState<string | undefined>();
  const [projectDefaultFontSize, setProjectDefaultFontSize] = useState<number | undefined>();
  const [projectUseBuiltinSymbols, setProjectUseBuiltinSymbols] = useState<boolean>(true);
  const [projectSymbolFont, setProjectSymbolFont] = useState<string | undefined>();

  useEffect(() => {
    if (!currentProjectId) return;
    getProjectConfig(currentProjectId).then((cfg) => {
      if (!cfg) return;
      setCodeGenOptions(cfg.codeGenOptions ?? {});
      setProjectDefaultFont(cfg.lvglConfig.defaultFont);
      setProjectDefaultFontSize(cfg.lvglConfig.defaultFontSize);
      setProjectUseBuiltinSymbols(cfg.lvglConfig.useBuiltinSymbols !== false);
      setProjectSymbolFont(cfg.lvglConfig.symbolFont);
    });
  }, [currentProjectId, getProjectConfig]);

  useEffect(() => {
    simPausedRef.current = simPaused;
  }, [simPaused]);

  const generateCCode = useCallback(() => {
    return generateCode(
      pages,
      codeGenOptions,
      logicGraphs,
      undefined,
      imageResources,
      fontResources,
      projectDefaultFont,
      projectDefaultFontSize,
      projectUseBuiltinSymbols,
      projectSymbolFont,
    );
  }, [
    pages,
    codeGenOptions,
    logicGraphs,
    imageResources,
    fontResources,
    projectDefaultFont,
    projectDefaultFontSize,
    projectUseBuiltinSymbols,
    projectSymbolFont,
  ]);

  const pauseEventLoop = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
  }, []);

  const renderRuntimeFrame = useCallback((runtime: WasmRuntime) => {
    const fb = runtime.getFramebuffer();
    const cvs = canvasRef.current;
    if (fb && cvs) {
      renderFramebuffer(cvs, fb, runtime.getWidth(), runtime.getHeight());
    }
  }, []);

  const primeRuntime = useCallback((runtime: WasmRuntime) => {
    for (let i = 0; i < 10; i++) {
      runtime.tick(33);
    }
    renderRuntimeFrame(runtime);
  }, [renderRuntimeFrame]);

  const stopRuntime = useCallback(() => {
    pauseEventLoop();
    if (runtimeRef.current) {
      runtimeRef.current.destroy();
      runtimeRef.current = null;
    }
    setRunning(false);
    setValue1(false);
    setValue2(false);
  }, [pauseEventLoop]);

  const startEventLoop = useCallback((runtime: WasmRuntime) => {
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      runtime.tick(Math.min(delta, 100));

      const fb = runtime.getFramebuffer();
      const cvs = canvasRef.current;
      if (fb && cvs) {
        renderFramebuffer(cvs, fb, runtime.getWidth(), runtime.getHeight());
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }, []);

  const runSimulator = useCallback(async (options?: { startLoop?: boolean }) => {
    const startLoop = options?.startLoop === true;
    const seq = ++compileSeqRef.current;
    pauseEventLoop();
    if (runtimeRef.current) {
      runtimeRef.current.destroy();
      runtimeRef.current = null;
    }
    setRunning(false);
    setValue1(false);
    setValue2(false);
    setCompileOutput('');
    setShowOutput(false);

    const code = generateCCode();
    const userFiles = await buildCompileUserFiles(
      Object.fromEntries(Object.entries(code)),
      pages,
      imageResources,
    );
    const fontRequests = buildFontRequests(
      pages,
      fontResources,
      projectDefaultFont,
      projectDefaultFontSize,
    );

    const result = await compileCode(
      userFiles,
      canvas.width,
      canvas.height,
      (newStatus, message) => {
        if (seq !== compileSeqRef.current) return;
        setStatus(newStatus);
        setStatusMessage(message);
      },
      fontRequests.length > 0 ? fontRequests : undefined,
    );

    if (seq !== compileSeqRef.current) return;

    setCompileOutput(result.output);

    if (result.success && result.runtime) {
      runtimeRef.current = result.runtime;
      setRunning(true);
      setStatus('done');
      setStatusMessage(startLoop ? 'Running' : 'Ready — press Play to run');

      primeRuntime(result.runtime);

      if (startLoop) {
        setSimPaused(false);
        startEventLoop(result.runtime);
        canvasRef.current?.focus();
      } else {
        setSimPaused(true);
      }
    } else if (!result.success) {
      setShowOutput(true);
      setStatus('error');
      setStatusMessage('Build failed');
    }
  }, [
    pauseEventLoop,
    generateCCode,
    pages,
    imageResources,
    fontResources,
    projectDefaultFont,
    projectDefaultFontSize,
    canvas.width,
    canvas.height,
    startEventLoop,
    primeRuntime,
  ]);

  const playSimulation = useCallback(() => {
    if (['compiling', 'loading', 'running'].includes(status)) return;
    const rt = runtimeRef.current;
    if (rt && simPaused) {
      setSimPaused(false);
      setStatusMessage('Running');
      startEventLoop(rt);
      canvasRef.current?.focus();
      return;
    }
    if (!rt) {
      void runSimulator({ startLoop: true });
    }
  }, [status, simPaused, startEventLoop, runSimulator]);

  const pauseSimulation = useCallback(() => {
    if (!runtimeRef.current || simPaused) return;
    pauseEventLoop();
    setSimPaused(true);
    setStatusMessage('Paused');
  }, [simPaused, pauseEventLoop]);

  const stopSimulation = useCallback(() => {
    if (['compiling', 'loading'].includes(status)) return;
    setSimPaused(true);
    void runSimulator({ startLoop: false });
  }, [status, runSimulator]);

  const scheduleRebuild = useCallback(() => {
    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    rebuildTimerRef.current = setTimeout(() => {
      void runSimulator({ startLoop: false });
    }, REBUILD_DEBOUNCE_MS);
  }, [runSimulator]);

  useEffect(() => {
    scheduleRebuild();
    return () => {
      if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current);
    };
  }, [
    pages,
    logicGraphs,
    canvas.width,
    canvas.height,
    imageResources,
    fontResources,
    projectDefaultFont,
    projectDefaultFontSize,
    projectUseBuiltinSymbols,
    projectSymbolFont,
    codeGenOptions,
    scheduleRebuild,
  ]);

  useEffect(() => {
    return () => {
      stopRuntime();
    };
  }, [stopRuntime]);

  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs) return { x: 0, y: 0 };
    const rect = cvs.getBoundingClientRect();
    const scaleX = cvs.width / rect.width;
    const scaleY = cvs.height / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rt = runtimeRef.current;
      if (!rt) return;
      const { x, y } = getCanvasPos(e);
      rt.mouseEvent(x, y, mousePressedRef.current);
    },
    [getCanvasPos],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rt = runtimeRef.current;
      if (!rt) return;
      mousePressedRef.current = true;
      const { x, y } = getCanvasPos(e);
      rt.mouseEvent(x, y, true);
      canvasRef.current?.focus();
    },
    [getCanvasPos],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rt = runtimeRef.current;
      if (!rt) return;
      mousePressedRef.current = false;
      const { x, y } = getCanvasPos(e);
      rt.mouseEvent(x, y, false);
    },
    [getCanvasPos],
  );

  const handleMouseLeave = useCallback(() => {
    mousePressedRef.current = false;
  }, []);

  const setHardwareButton = useCallback((button: 1 | 2, pressed: boolean) => {
    const rt = runtimeRef.current;
    if (!rt) return;
    rt.buttonEvent(button, pressed);
    if (button === 1) setValue1(pressed);
    if (button === 2) setValue2(pressed);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      const rt = runtimeRef.current;
      if (!rt) return;
      e.preventDefault();

      if (isHardwareButtonKey(e.key)) {
        setHardwareButton(HW_BUTTON_KEYS[e.key], true);
        return;
      }

      const key = e.key;
      const lvKey = LV_KEY_MAP[key];
      if (lvKey !== undefined) {
        rt.keyEvent(lvKey, true);
      } else if (key.length === 1) {
        rt.keyEvent(key.charCodeAt(0), true);
      }
    },
    [setHardwareButton],
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      const rt = runtimeRef.current;
      if (!rt) return;
      e.preventDefault();

      if (isHardwareButtonKey(e.key)) {
        setHardwareButton(HW_BUTTON_KEYS[e.key], false);
        return;
      }

      const key = e.key;
      const lvKey = LV_KEY_MAP[key];
      if (lvKey !== undefined) {
        rt.keyEvent(lvKey, false);
      } else if (key.length === 1) {
        rt.keyEvent(key.charCodeAt(0), false);
      }
    },
    [setHardwareButton],
  );

  const statusIcon = useMemo(
    () =>
      ({
        idle: '⚡',
        compiling: '🔨',
        loading: '📦',
        running: '▶️',
        done: running ? '🟢' : '✅',
        error: '❌',
      })[status],
    [status, running],
  );

  const isWorking = ['compiling', 'loading', 'running'].includes(status);

  return (
    <div className="simulator-panel">
      <div className="simulator-panel-toolbar">
        <span className={`simulator-panel-status simulator-panel-status--${status}`}>
          {statusIcon} {statusMessage}
        </span>

        <div className="simulator-panel-toolbar-actions">
          <div className="simulator-panel-playback">
            {!running || simPaused ? (
              <button
                type="button"
                className="simulator-panel-play-btn"
                onClick={playSimulation}
                disabled={isWorking}
                title="Play"
              >
                ▶
              </button>
            ) : (
              <button
                type="button"
                className="simulator-panel-play-btn"
                onClick={pauseSimulation}
                title="Pause"
              >
                ⏸
              </button>
            )}
            <button
              type="button"
              className="simulator-panel-play-btn"
              onClick={stopSimulation}
              disabled={!running || isWorking}
              title="Stop"
            >
              ⏹
            </button>
          </div>
          <span className="simulator-panel-zoom-divider" />
          <div className="simulator-panel-zoom" title="Display zoom">
            <button
              type="button"
              className="simulator-panel-zoom-btn"
              onClick={() => setDisplayScale((s) => Math.max(MIN_DISPLAY_SCALE, s - DISPLAY_SCALE_STEP))}
            >
              −
            </button>
            <span className="simulator-panel-zoom-label">{Math.round(displayScale * 100)}%</span>
            <button
              type="button"
              className="simulator-panel-zoom-btn"
              onClick={() => setDisplayScale((s) => Math.min(MAX_DISPLAY_SCALE, s + DISPLAY_SCALE_STEP))}
            >
              +
            </button>
          </div>
          <button
            className="simulator-panel-btn"
            onClick={() => void runSimulator({ startLoop: false })}
            disabled={isWorking}
            title="Rebuild from generated C code (same as firmware export)"
          >
            🔄 Rebuild
          </button>
          <button
            className="simulator-panel-btn"
            onClick={() => setShowCode((v) => !v)}
            title="Show generated C code"
          >
            {showCode ? '📄 Hide code' : '📄 Show code'}
          </button>
          <button
            className={`simulator-panel-btn ${showOutput ? 'active' : ''}`}
            onClick={() => setShowOutput((v) => !v)}
          >
            📋 {showOutput ? 'Hide log' : 'Build log'}
          </button>
        </div>
      </div>

      <div className="simulator-panel-gpio">
        <div className="simulator-panel-gpio-state">
          GPIO: value_1 {value1 ? '●' : '○'} · value_2 {value2 ? '●' : '○'}
        </div>
        <div className="simulator-panel-gpio-hint">
          GPIO buttons: ↑/+ = value_1, ↓/− = value_2
        </div>
      </div>

      <div className="simulator-panel-body">
        <div
          className="simulator-panel-screen"
          style={{
            width: canvas.width * displayScale,
            height: canvas.height * displayScale,
          }}
        >
          {isWorking && (
            <div className="simulator-panel-overlay">
              <div className="simulator-panel-spinner" />
              <div>{statusMessage}</div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`simulator-panel-canvas ${running ? 'interactive' : ''}`}
            width={canvas.width}
            height={canvas.height}
            style={{ width: '100%', height: '100%' }}
            tabIndex={running ? 0 : -1}
            onMouseMove={running ? handleMouseMove : undefined}
            onMouseDown={running ? handleMouseDown : undefined}
            onMouseUp={running ? handleMouseUp : undefined}
            onMouseLeave={running ? handleMouseLeave : undefined}
            onKeyDown={running ? handleKeyDown : undefined}
            onKeyUp={running ? handleKeyUp : undefined}
          />
        </div>
      </div>

      {showOutput && (
        <div className="simulator-panel-log">
          <div className="simulator-panel-log-header">
            <span>Build log</span>
            <button type="button" onClick={() => setCompileOutput('')}>
              Clear
            </button>
          </div>
          <pre>{compileOutput || '(no output yet)'}</pre>
        </div>
      )}

      {showCode && (
        <div className="simulator-panel-code">
          <CodePreview />
        </div>
      )}
    </div>
  );
};

export default SimulatorPanel;
