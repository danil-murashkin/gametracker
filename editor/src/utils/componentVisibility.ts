import type { LvglComponent } from '../types';

/** LVGL HIDDEN flag — component must not be drawn in preview or on canvas. */
export function isLvglHidden(component: LvglComponent): boolean {
  return component.flags?.hidden === true;
}
