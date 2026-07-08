import type { Page, CanvasState, LvglComponent } from '../../types';
import type { PreviewLogicState } from '../Preview/previewLogicRunner';

interface WasmUIJson {
  screen: {
    width: number;
    height: number;
    bgColor: string;
  };
  components: WasmComponent[];
}

interface WasmComponent {
  type: string;
  id: string;
  name?: string;
  parent: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  widthMode?: string;
  heightMode?: string;
  align?: string;
  alignOffsetX?: number;
  alignOffsetY?: number;
  flags?: Record<string, boolean>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>;
  styles: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pressed?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    focused?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disabled?: Record<string, any>;
  };
}

/** Label text for HTML overlay (LVGL label text kept empty to avoid double render). */
const OVERLAY_TEXT_PROP = '__overlayText';
/** Image visibility for HTML overlay (LVGL img widgets always hidden). */
const OVERLAY_HIDDEN_PROP = '__overlayHidden';

function flattenTree(
  components: LvglComponent[],
  parentId: string | null,
  parentComp?: LvglComponent,
  logicState?: PreviewLogicState,
): WasmComponent[] {
  const result: WasmComponent[] = [];

  let childToVirtualParent: Record<string, string> = {};
  if (parentComp?.type === 'tabview' && parentComp.props?.tabs) {
    const tabChildMap: Record<string, string[]> = parentComp.props.tabChildMap || {};
    const defaultTab = String(parentComp.props.activeTab || 0);
    for (const [tabIndex, childIds] of Object.entries(tabChildMap)) {
      if (Array.isArray(childIds)) {
        for (const childId of childIds) {
          childToVirtualParent[childId] = `${parentComp.id}__tab__${tabIndex}`;
        }
      }
    }
    for (const comp of components) {
      if (!childToVirtualParent[comp.id]) {
        childToVirtualParent[comp.id] = `${parentComp.id}__tab__${defaultTab}`;
      }
    }
  } else if (parentComp?.type === 'tileview' && parentComp.props?.rows !== undefined) {
    const tileChildMap: Record<string, string[]> = parentComp.props.tileChildMap || {};
    const defaultTile = `${parentComp.props.currentRow || 0}-${parentComp.props.currentCol || 0}`;
    for (const [tileKey, childIds] of Object.entries(tileChildMap)) {
      if (Array.isArray(childIds)) {
        for (const childId of childIds) {
          childToVirtualParent[childId] = `${parentComp.id}__tile__${tileKey}`;
        }
      }
    }
    for (const comp of components) {
      if (!childToVirtualParent[comp.id]) {
        childToVirtualParent[comp.id] = `${parentComp.id}__tile__${defaultTile}`;
      }
    }
  } else if (parentComp?.type === 'win') {
    for (const comp of components) {
      childToVirtualParent[comp.id] = `${parentComp.id}__win_content`;
    }
  }

  for (const comp of components) {
    const effectiveParent = childToVirtualParent[comp.id] || parentId;

    const wc: WasmComponent = {
      type: comp.type,
      id: comp.id,
      name: comp.name,
      parent: effectiveParent,
      x: comp.x,
      y: comp.y,
      width: comp.width,
      height: comp.height,
      props: { ...comp.props },
      styles: {
        default: { ...comp.styles.default },
      },
    };

    // Design-time flags first
    if (comp.flags) {
      const flags: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(comp.flags)) {
        if (v !== undefined) flags[k] = v;
      }
      if (Object.keys(flags).length > 0) wc.flags = flags;
    }

    // Logic overrides design flags (show/hide alive/dead etc.)
    if (logicState && comp.name) {
      const hidden = logicState.hiddenByName[comp.name];
      if (hidden !== undefined) {
        wc.flags = { ...(wc.flags || {}), hidden };
      }

      if (comp.type === 'label') {
        const text = logicState.labelTextByName[comp.name];
        if (text !== undefined) {
          wc.props.text = text;
        }
      }

      if (comp.type === 'bar') {
        const value = logicState.barValueByName[comp.name];
        if (value !== undefined) {
          wc.props.value = value;
        }
      }
    }

    // Labels: render text via overlay (Montserrat), keep LVGL label empty
    if (comp.type === 'label') {
      wc.props[OVERLAY_TEXT_PROP] = String(wc.props.text ?? '');
      wc.props.text = '';
    }

    // Images: WASM can't decode assets — overlay renders them; LVGL img stays hidden
    if (comp.type === 'img') {
      const overlayHidden = wc.flags?.hidden ?? false;
      wc.props[OVERLAY_HIDDEN_PROP] = overlayHidden;
      wc.flags = { ...(wc.flags || {}), hidden: true };
    }

    // Bars: overlay renders track + fill (LVGL default indicator is blue → artifact)
    if (comp.type === 'bar') {
      const overlayHidden = wc.flags?.hidden ?? false;
      wc.props[OVERLAY_HIDDEN_PROP] = overlayHidden;
      wc.flags = { ...(wc.flags || {}), hidden: true };
    }

    if (comp.widthMode) wc.widthMode = comp.widthMode;
    if (comp.heightMode) wc.heightMode = comp.heightMode;
    if (comp.align && comp.align !== 'default') {
      wc.align = comp.align;
      if (comp.alignOffsetX) wc.alignOffsetX = comp.alignOffsetX;
      if (comp.alignOffsetY) wc.alignOffsetY = comp.alignOffsetY;
    }

    if (comp.styles.pressed) wc.styles.pressed = { ...comp.styles.pressed };
    if (comp.styles.focused) wc.styles.focused = { ...comp.styles.focused };
    if (comp.styles.disabled) wc.styles.disabled = { ...comp.styles.disabled };

    result.push(wc);

    if (comp.children.length > 0) {
      result.push(...flattenTree(comp.children, comp.id, comp, logicState));
    }
  }

  return result;
}

export function editorStateToJson(
  pages: Page[],
  currentPageId: string,
  canvas: CanvasState,
  logicState?: PreviewLogicState,
): string {
  const page = pages.find((p) => p.id === currentPageId);

  const json: WasmUIJson = {
    screen: {
      width: canvas.width,
      height: canvas.height,
      bgColor: page?.backgroundColor || '#ffffff',
    },
    components: page ? flattenTree(page.components, null, undefined, logicState) : [],
  };

  return JSON.stringify(json);
}
