/** UI 状态:关系气泡、设置面板、toast。 */
import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
}

interface UiState {
  selectedEdgeId: string | null;
  /** 焦点节点内容卡(展示节点正文;练习模式下揭晓后才有内容) */
  cardNodeId: string | null;
  settingsOpen: boolean;
  toasts: Toast[];

  selectEdge: (id: string | null) => void;
  setCardNode: (id: string | null) => void;
  toggleSettings: () => void;
  setSettingsOpen: (v: boolean) => void;
  pushToast: (message: string) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 0;

export const useUiStore = create<UiState>((set) => ({
  selectedEdgeId: null,
  cardNodeId: null,
  settingsOpen: false,
  toasts: [],

  selectEdge: (id) => set({ selectedEdgeId: id }),
  setCardNode: (id) => set({ cardNodeId: id }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  setSettingsOpen: (v) => set({ settingsOpen: v }),

  pushToast: (message) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3600);
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
