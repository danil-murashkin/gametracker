import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useResourceStore } from '../../resources';
import { editorStateToJson } from './editorStateToJson';
import CodePreview from '../CodePreview';
import { useLogicEditorStore } from '../LogicEditor';
import { usePreviewLogic } from '../Preview/usePreviewLogic';
import './WasmPreview.css';

type Status = 'loading' | 'ready' | 'error';

const WasmPreview: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const layoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [showCode, setShowCode] = useState(false);
  const [logicRunning, setLogicRunning] = useState(false);

  const pages = useEditorStore((s) => s.pages);
  const currentPageId = useEditorStore((s) => s.currentPageId);
  const canvas = useEditorStore((s) => s.canvas);
  const images = useResourceStore((s) => s.images);
  const logicGraphs = useLogicEditorStore((s) => s.graphs ?? []);
  const { logicState, simulatedTimerCount, resetLogic } = usePreviewLogic(logicGraphs, logicRunning);
  const hasAutoStartTimers = simulatedTimerCount > 0;

  const buildImageAssetMap = useCallback(() => {
    const page = pages.find((p) => p.id === currentPageId);
    if (!page) return {};

    const usedSrc = new Set<string>();
    const walk = (components: import('../../types').LvglComponent[]) => {
      for (const comp of components) {
        if (comp.type === 'img' && comp.props?.src) {
          usedSrc.add(String(comp.props.src));
        }
        if (comp.children?.length) walk(comp.children);
      }
    };
    walk(page.components);

    const map: Record<string, string> = {};
    for (const src of usedSrc) {
      const res = images.find((img) => img.id === src || img.name === src || img.cArrayName === src);
      if (!res?.data) continue;
      map[src] = res.data;
      map[res.id] = res.data;
      map[res.name] = res.data;
      map[res.cArrayName] = res.data;
    }

    return map;
  }, [pages, currentPageId, images]);

  const postToIframe = useCallback(
    (message: Record<string, unknown>) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow || status !== 'ready') return;
      iframe.contentWindow.postMessage(message, '*');
    },
    [status],
  );

  const sendAssets = useCallback(() => {
    postToIframe({ type: 'load-assets', assets: { images: buildImageAssetMap() } });
  }, [postToIframe, buildImageAssetMap]);

  const sendLvglBuild = useCallback(
    (logic?: typeof logicState) => {
      const json = editorStateToJson(pages, currentPageId, canvas, logic ?? logicState);
      sendAssets();
      postToIframe({ type: 'load-ui', json, applyLvgl: true });
    },
    [pages, currentPageId, canvas, logicState, sendAssets, postToIframe],
  );

  const sendOverlayUpdate = useCallback(() => {
    const json = editorStateToJson(pages, currentPageId, canvas, logicState);
    postToIframe({ type: 'update-overlays', json });
  }, [pages, currentPageId, canvas, logicState, postToIframe]);

  // Listen for lvgl-ready from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'lvgl-ready') {
        setStatus('ready');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Push assets as soon as iframe is ready (before overlay ticks)
  useEffect(() => {
    if (status !== 'ready') return;
    sendAssets();
  }, [status, sendAssets, images, currentPageId, pages]);

  // Full LVGL rebuild when layout/resources change (debounced)
  useEffect(() => {
    if (status !== 'ready') return;
    if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
    layoutTimerRef.current = setTimeout(() => {
      sendLvglBuild();
    }, 200);
    return () => {
      if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
    };
  }, [pages, currentPageId, canvas, images, status, sendLvglBuild]);

  // Logic ticks: update overlays only — never rebuild LVGL scene
  useEffect(() => {
    if (status !== 'ready') return;
    sendOverlayUpdate();
  }, [logicState, logicRunning, status, sendOverlayUpdate]);

  // Timeout for loading — mark error after 15s
  useEffect(() => {
    if (status !== 'loading') return;
    const t = setTimeout(() => {
      setStatus((prev) => (prev === 'loading' ? 'error' : prev));
    }, 15000);
    return () => clearTimeout(t);
  }, [status]);

  const handleRefresh = () => {
    setStatus('loading');
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.src = '/wasm/lvgl_wasm.html';
    }
  };

  const statusLabel =
    status === 'ready'
      ? '✅ Ready'
      : status === 'loading'
        ? '⏳ Loading LVGL runtime...'
        : '❌ Load failed';

  return (
    <div className="wasm-preview">
      <div className="wasm-preview-toolbar">
        <span className={`wasm-preview-status wasm-preview-status--${status}`}>
          {statusLabel}
          {status === 'ready' && (
            <span style={{ marginLeft: 10, color: hasAutoStartTimers ? '#4ec9b0' : '#888' }}>
              {hasAutoStartTimers
                ? `Logic: ${logicRunning ? 'running' : 'paused'} (${simulatedTimerCount} timer${simulatedTimerCount === 1 ? '' : 's'})`
                : 'Logic: no auto-start timers'}
            </span>
          )}
        </span>
        <div className="wasm-preview-toolbar-actions">
          <button
            className="wasm-preview-refresh"
            onClick={() => setLogicRunning((v) => !v)}
            title="Toggle auto-start logic timers"
            disabled={!hasAutoStartTimers}
          >
            {logicRunning ? '⏸ Pause logic' : '▶ Run logic'}
          </button>
          <button
            className="wasm-preview-refresh"
            onClick={() => {
              resetLogic();
              sendLvglBuild();
            }}
            title="Reset logic state"
          >
            ⟲ Reset logic
          </button>
          <button
            className="wasm-preview-refresh"
            onClick={() => setShowCode((v) => !v)}
            title="Toggle generated UI code (ESP32/firmware-oriented)"
          >
            {showCode ? '📄 Hide code' : '📄 Show code'}
          </button>
          <button className="wasm-preview-refresh" onClick={handleRefresh}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="wasm-preview-body">
        <div
          className="wasm-preview-iframe-wrapper"
          style={{ width: canvas.width, height: canvas.height }}
        >
          {status === 'loading' && (
            <div className="wasm-preview-overlay">LVGL Loading runtime...</div>
          )}
          {status === 'error' && (
            <div className="wasm-preview-overlay wasm-preview-overlay--error">
              WASM load failed, click Refresh to retry
            </div>
          )}
          <iframe
            ref={iframeRef}
            className="wasm-preview-iframe"
            src="/wasm/lvgl_wasm.html"
            title="LVGL WASM Preview"
            width={canvas.width}
            height={canvas.height}
          />
        </div>
      </div>

      {showCode && (
        <div className="wasm-preview-code">
          <CodePreview />
        </div>
      )}
    </div>
  );
};

export default WasmPreview;
