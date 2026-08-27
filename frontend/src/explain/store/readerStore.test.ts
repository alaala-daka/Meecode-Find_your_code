import { beforeEach, describe, expect, it, vi } from "vitest";

// vitest 默认 node 环境无 localStorage/window,提供最小 polyfill 以验证 zustand persist。
// 使用动态 import 确保 polyfill 在 store 模块初始化前生效。
const storage: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  get length() { return Object.keys(storage).length; },
  key: (index: number) => {
    const keys = Object.keys(storage);
    return keys[index] ?? null;
  },
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    for (const key of Object.keys(storage)) {
      delete storage[key];
    }
  },
};
(globalThis as unknown as { window: unknown }).window = globalThis;

vi.mock("../api/client", () => ({
  api: {
    chatStream: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

const { api } = await import("../api/client");
const { useReaderStore } = await import("./readerStore");
const { useSessionStore } = await import("./sessionStore");

const META = { nodeId: "n1", title: "历史背景", path: ["相对论的概念", "历史背景"] };
const META2 = { nodeId: "n2", title: "关键要素", path: ["相对论的概念", "关键要素"] };

describe("readerStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useReaderStore.getState().reset();
    useSessionStore.setState({ sessionId: "sid-1" });
  });

  it("openWith 新建条目并打开;同节点再次详细展开会更新 detail", () => {
    useReaderStore.getState().openWith(META, "第一版阐述");
    expect(useReaderStore.getState().open).toBe(true);
    expect(useReaderStore.getState().entries).toHaveLength(1);
    useReaderStore.getState().openWith(META, "第二版阐述");
    const st = useReaderStore.getState();
    expect(st.entries).toHaveLength(1);
    expect(st.entries[0].detail).toBe("第二版阐述");
    expect(st.activeNodeId).toBe("n1");
  });

  it("upsertDetail:面板关闭时仅入历史,不擅自打开;打开时则切换激活", () => {
    useReaderStore.getState().upsertDetail(META, "d1");
    let st = useReaderStore.getState();
    expect(st.open).toBe(false);
    expect(st.entries).toHaveLength(1);
    useReaderStore.setState({ open: true });
    useReaderStore.getState().upsertDetail(META2, "d2");
    st = useReaderStore.getState();
    expect(st.entries).toHaveLength(2);
    expect(st.activeNodeId).toBe("n2");
  });

  it("activate 切换历史条目", () => {
    const s = useReaderStore.getState();
    s.openWith(META, "d1");
    s.openWith(META2, "d2");
    useReaderStore.getState().activate("n1");
    expect(useReaderStore.getState().activeNodeId).toBe("n1");
  });

  it("sendQuestion:流式追加 assistant 消息,status 置搜索词,done 收尾", async () => {
    useReaderStore.getState().openWith(META, "阐述");
    (api.chatStream as ReturnType<typeof vi.fn>).mockImplementation(
      async (_sid: string, _p: unknown, onEvent: (e: never) => void) => {
        onEvent({ type: "status", stage: "searching", query: "以太 实验" } as never);
        onEvent({ type: "delta", text: "回答" } as never);
        onEvent({ type: "delta", text: "片段" } as never);
        onEvent({ type: "done" } as never);
      },
    );
    await useReaderStore.getState().sendQuestion("它和以太理论什么关系?");
    const st = useReaderStore.getState();
    const entry = st.entries[0];
    expect(entry.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(entry.messages[1].content).toBe("回答片段");
    expect(st.sending).toBe(false);
    expect(st.searchQuery).toBeNull();
  });

  it("中断/失败 → toast 且不残留 sending", async () => {
    useReaderStore.getState().openWith(META, "阐述");
    (api.chatStream as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("回答中断,请重试"));
    await useReaderStore.getState().sendQuestion("?");
    const st = useReaderStore.getState();
    expect(st.sending).toBe(false);
    expect(st.entries[0].messages).toHaveLength(1); // 只有 user 消息
  });

  it("reset 清空全部状态", () => {
    useReaderStore.getState().openWith(META, "d1");
    useReaderStore.getState().reset();
    const st = useReaderStore.getState();
    expect(st.open).toBe(false);
    expect(st.entries).toHaveLength(0);
    expect(st.activeNodeId).toBeNull();
  });
});
