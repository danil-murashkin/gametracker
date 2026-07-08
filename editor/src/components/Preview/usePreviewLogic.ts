import { useCallback, useEffect, useState } from 'react';
import type { LogicGraph } from '../LogicEditor/types';
import {
  clonePreviewLogicState,
  collectAutoStartTimers,
  createPreviewLogicState,
  executeTimerTick,
  type PreviewLogicState,
} from './previewLogicRunner';

export function usePreviewLogic(graphs: LogicGraph[], enabled: boolean) {
  const [logicState, setLogicState] = useState<PreviewLogicState>(() => createPreviewLogicState(graphs));
  const autoStartTimers = collectAutoStartTimers(graphs);

  const resetLogic = useCallback(() => {
    setLogicState(createPreviewLogicState(graphs));
  }, [graphs]);

  useEffect(() => {
    resetLogic();
  }, [graphs]);

  useEffect(() => {
    if (!enabled || autoStartTimers.length === 0) {
      return;
    }

    const intervalIds = autoStartTimers.map(({ graph, timer, durationMs }) =>
      window.setInterval(() => {
        setLogicState(prev => {
          const next = clonePreviewLogicState(prev);
          executeTimerTick(graph, timer, next);
          return next;
        });
      }, durationMs)
    );

    return () => {
      intervalIds.forEach(id => window.clearInterval(id));
    };
  }, [autoStartTimers, enabled]);

  return {
    logicState,
    hasSimulatedLogic: enabled && autoStartTimers.length > 0,
    simulatedTimerCount: autoStartTimers.length,
    resetLogic,
  };
}
