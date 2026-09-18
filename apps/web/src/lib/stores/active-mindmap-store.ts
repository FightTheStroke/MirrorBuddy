'use client';
import { create } from 'zustand';
import type { createMapEditor } from '@/lib/mindmap/editor-session';
import type { VoiceToolCallResult } from '@/lib/voice/voice-tool-commands/types';

export type MapEditor = ReturnType<typeof createMapEditor>;
interface ActiveMap {
  lease: symbol;
  editor: MapEditor;
  focus: (nodeId: string) => void;
}
interface State {
  active: ActiveMap | null;
  views: Array<{ lease: symbol; value: ActiveMap | null }>;
  reserve: (lease: symbol) => void;
  activate: (lease: symbol) => void;
  claim: (value: ActiveMap) => void;
  release: (lease: symbol) => void;
}
/** Only a mounted visible map may handle voice; no newest-map inference. */
export const useActiveMindmapStore = create<State>((set) => ({
  active: null,
  views: [],
  activate: (lease) =>
    set((state) => {
      const selected = state.views.find((view) => view.lease === lease);
      if (!selected || state.views.at(-1) === selected) return state;
      return {
        views: [...state.views.filter((view) => view !== selected), selected],
        active: selected.value,
      };
    }),
  reserve: (lease) =>
    set((state) => ({
      views: [...state.views.filter((view) => view.lease !== lease), { lease, value: null }],
      active: null,
    })),
  claim: (value) =>
    set((state) => {
      const views = state.views.map((view) =>
        view.lease === value.lease ? { ...view, value } : view,
      );
      return { views, active: views.at(-1)?.value ?? null };
    }),
  release: (lease) =>
    set((state) => {
      const views = state.views.filter((view) => view.lease !== lease);
      return { views, active: views.at(-1)?.value ?? null };
    }),
}));
export async function executeActiveMapCommand(
  name: string,
  args: Record<string, unknown>,
  operationId: string,
): Promise<VoiceToolCallResult> {
  const active = useActiveMindmapStore.getState().active;
  if (!active) return { success: false, error: 'active_mindmap_required' };
  const result = await active.editor.command(name, args, operationId);
  if (result.focus && useActiveMindmapStore.getState().active === active)
    active.focus(result.focus.nodeId);
  return result;
}
