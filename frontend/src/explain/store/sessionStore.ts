/** 会话状态:设置区配置、探索轨迹(F7)、练习模式(F8)。 */
import { create } from "zustand";
import { api } from "../api/client";

export interface UserSettings {
  maxChildren: number; // 单次最多展开数(默认 3,范围 2-6)
  maxDepth: number | null; // 最高发散层数(null=不限)
}

export type Mode = "explore" | "practice";

interface SessionState {
  sessionId: string | null;
  settings: UserSettings;
  /** 探索轨迹:按实际展开顺序记录被展开节点 id(练习模式重现依据,F7) */
  path: string[];
  mode: Mode;
  /** 练习模式:已在练习中"展开重现"的节点 id */
  practiceExpanded: string[];
  /** 练习模式:已揭晓内容的节点 id */
  practiceRevealed: string[];

  ensureSession: () => Promise<string>;
  setSettings: (patch: Partial<UserSettings>) => void;
  pushPath: (nodeId: string) => void;
  enterPractice: () => void;
  exitPractice: () => void;
  practiceOpen: (nodeId: string) => void; // 练习中展开(重现其子结构)
  practiceReveal: (nodeId: string) => void; // 练习中揭晓内容
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  settings: { maxChildren: 3, maxDepth: null },
  path: [],
  mode: "explore",
  practiceExpanded: [],
  practiceRevealed: [],

  ensureSession: async () => {
    const existing = get().sessionId;
    if (existing) return existing;
    const { session_id } = await api.createSession();
    set({ sessionId: session_id });
    return session_id;
  },

  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  pushPath: (nodeId) => set((s) => ({ path: [...s.path, nodeId] })),

  enterPractice: () =>
    set({
      mode: "practice",
      practiceExpanded: [],
      practiceRevealed: [],
    }),

  exitPractice: () => set({ mode: "explore", practiceExpanded: [], practiceRevealed: [] }),

  practiceOpen: (nodeId) =>
    set((s) =>
      s.practiceExpanded.includes(nodeId)
        ? s
        : { practiceExpanded: [...s.practiceExpanded, nodeId] },
    ),

  practiceReveal: (nodeId) =>
    set((s) =>
      s.practiceRevealed.includes(nodeId)
        ? s
        : { practiceRevealed: [...s.practiceRevealed, nodeId] },
    ),

  resetSession: () =>
    set({
      sessionId: null,
      path: [],
      mode: "explore",
      practiceExpanded: [],
      practiceRevealed: [],
    }),
}));
