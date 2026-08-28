/** 阅读器状态:精读历史(会话内)+ 伴读问答流式追加。
 * entries 就地更新 + version 计数器驱动重渲染(与 graphStore 同模式)。 */
import { create } from "zustand";
import { api, ApiError, type ChatEvent } from "../../explain/api/client";
import { useSessionStore } from "./sessionStore";
import { toLLMOverride, useSettingsStore } from "./settingsStore";
import { useUiStore } from "./uiStore";

export interface ReaderMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ReaderEntry {
  nodeId: string;
  title: string;
  path: string[];
  detail: string;
  messages: ReaderMessage[];
  updatedAt: number;
}

export interface ReaderNodeMeta {
  nodeId: string;
  title: string;
  path: string[];
}

interface ReaderState {
  open: boolean;
  entries: ReaderEntry[];
  activeNodeId: string | null;
  sending: boolean;
  searchQuery: string | null;
  version: number;
  openWith: (meta: ReaderNodeMeta, detail: string) => void;
  upsertDetail: (meta: ReaderNodeMeta, detail: string) => void;
  activate: (nodeId: string) => void;
    openLatest: () => void;
  close: () => void;
  reset: () => void;
  sendQuestion: (text: string) => Promise<void>;
}

/** 阅读器占位宽度:与 explain.css 的 .reader-panel width: min(420px, 38vw) 对应;
 * 窄屏(≤720px)媒体查询下面板全宽。 */
export function readerWidth(): number {
  if (window.innerWidth <= 720) return window.innerWidth;
  return Math.min(420, window.innerWidth * 0.38);
}

export const useReaderStore = create<ReaderState>((set, get) => {
  /** 新建或更新条目;返回条目引用 */
  const upsert = (meta: ReaderNodeMeta, detail: string): ReaderEntry => {
    const s = get();
    let entry = s.entries.find((e) => e.nodeId === meta.nodeId);
    if (entry) {
      entry.detail = detail; // 重新详细展开 → 更新内容
      entry.updatedAt = Date.now();
    } else {
      entry = { ...meta, detail, messages: [], updatedAt: Date.now() };
      s.entries.push(entry);
    }
    return entry;
  };

  return {
    open: false,
    entries: [],
    activeNodeId: null,
    sending: false,
    searchQuery: null,
    version: 0,

    openWith: (meta, detail) => {
      upsert(meta, detail);
      set((st) => ({ open: true, activeNodeId: meta.nodeId, version: st.version + 1 }));
    },

    upsertDetail: (meta, detail) => {
      upsert(meta, detail);
      // 面板已打开则切换激活;关闭时仅记录历史,不擅自打开
      if (get().open) set((st) => ({ activeNodeId: meta.nodeId, version: st.version + 1 }));
      else set((st) => ({ version: st.version + 1 }));
    },

    activate: (nodeId) => set({ activeNodeId: nodeId }),

      openLatest: () => {
        const s = get();
        if (s.entries.length === 0) return;
        const latest = [...s.entries].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        set({ open: true, activeNodeId: latest.nodeId, version: s.version + 1 });
      },


    close: () => set({ open: false }),

    reset: () =>
      set({ open: false, entries: [], activeNodeId: null, sending: false, searchQuery: null, version: 0 }),

    sendQuestion: async (text) => {
      const s = get();
      const question = text.trim();
      const entry = s.entries.find((e) => e.nodeId === s.activeNodeId);
      if (!question || !entry || s.sending) return;

      entry.messages.push({ role: "user", content: question });
      entry.updatedAt = Date.now();
      set({ sending: true, searchQuery: null, version: s.version + 1 });

      const settings = useSettingsStore.getState();
      const sessionId = useSessionStore.getState().sessionId;
      const finish = () => set((st) => ({ sending: false, searchQuery: null, version: st.version + 1 }));

      const onEvent = (e: ChatEvent) => {
        if (e.type === "status") {
          set((st) => ({ searchQuery: e.query, version: st.version + 1 }));
        } else if (e.type === "delta") {
          const last = entry.messages[entry.messages.length - 1];
          if (last && last.role === "assistant") {
            last.content += e.text; // 就地追加,version 驱动渲染
          } else {
            entry.messages.push({ role: "assistant", content: e.text });
          }
          set((st) => ({ version: st.version + 1 }));
        } else if (e.type === "error") {
          throw new ApiError(0, e.message); // 转为 catch 分支
        }
      };

      try {
        if (!sessionId) throw new ApiError(0, "会话尚未建立");
        await api.chatStream(
          sessionId,
          {
            node_id: entry.nodeId,
            node_title: entry.title,
            path: entry.path,
            detail: entry.detail,
            messages: entry.messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
            llm: toLLMOverride(settings.agent),
            tavily_api_key: settings.tavilyKey?.trim() || undefined,
          },
          onEvent,
        );
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "回答失败,请重试";
        useUiStore.getState().pushToast(msg);
      } finally {
        finish();
      }
    },
  };
});
