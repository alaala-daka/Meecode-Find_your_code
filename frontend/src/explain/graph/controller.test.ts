import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api/client", () => ({
  api: {
    detail: vi.fn(async () => ({ node_id: "n1", detail: "## 详细\n更丰富的阐述" })),
    expand: vi.fn(async () => ({ children: [], edges: [], refused: null })),
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
const { handleNodeDoubleClick, openNodeInReader, openReaderFromTopbar } = await import("./controller");
const { useGraphStore } = await import("../store/graphStore");
const { useReaderStore } = await import("../store/readerStore");
const { useSessionStore } = await import("../store/sessionStore");
const { useUiStore } = await import("../store/uiStore");

function seedExpandedNode() {
  const g = useGraphStore.getState();
  g.setRoot({ id: "n1", title: "测试概念", content: "简介", node_type: "concept", relevance: 1 });
  useGraphStore.getState().nodes.n1.expanded = true;
  useSessionStore.setState({ sessionId: "sid", mode: "explore" });
}

describe("详细展开(双击已展开节点)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGraphStore.getState().reset();
    useReaderStore.getState().reset();
    seedExpandedNode();
  });

  it("双击已展开节点 → 调 detail 接口,结果写回节点;不产生新子节点", async () => {
    await handleNodeDoubleClick("n1");
    expect(api.detail).toHaveBeenCalledOnce();
    const n = useGraphStore.getState().nodes.n1;
    expect(n.detail).toContain("更丰富的阐述");
    expect(n.detailing).toBe(false);
    expect(n.childIds).toHaveLength(0); // 不拆新子节点
  });

  it("概念展开 → 白框自动关闭,阅读器打开展示(原本关闭也打开)", async () => {
    useUiStore.getState().setCardNode("n1"); // 白框原本开着
    await handleNodeDoubleClick("n1");
    let st = useReaderStore.getState();
    expect(st.open).toBe(true);
    expect(st.activeNodeId).toBe("n1");
    expect(st.entries).toHaveLength(1);
    expect(useUiStore.getState().cardNodeId).toBeNull(); // 白框已让位

    // 再次双击(已有 detail):白框同样关闭,阅读器切换激活,不重复调 LLM
    useUiStore.getState().setCardNode("n1");
    await handleNodeDoubleClick("n1");
    st = useReaderStore.getState();
    expect(st.open).toBe(true);
    expect(st.activeNodeId).toBe("n1");
    expect(useUiStore.getState().cardNodeId).toBeNull();
    expect(api.detail).toHaveBeenCalledOnce();
  });

  it("已有 detail 的节点再次双击 → 直接打开阅读器,不重复调 LLM", async () => {
    await handleNodeDoubleClick("n1"); // 生成
    expect(api.detail).toHaveBeenCalledOnce();
    await handleNodeDoubleClick("n1"); // 再次双击
    expect(api.detail).toHaveBeenCalledOnce(); // 未重复调用
    expect(useReaderStore.getState().open).toBe(true);
    expect(useReaderStore.getState().activeNodeId).toBe("n1");
  });

  it("未展开节点的双击不触发 detail(交给单击展开流程)", async () => {
    useGraphStore.getState().nodes.n1.expanded = false;
    await handleNodeDoubleClick("n1");
    expect(api.detail).not.toHaveBeenCalled();
  });

  it("练习模式整体屏蔽详细展开", async () => {
    useSessionStore.setState({ mode: "practice", practiceRevealed: ["n1"] });
    await handleNodeDoubleClick("n1");
    expect(api.detail).not.toHaveBeenCalled();
  });

  it("openNodeInReader 在练习模式屏蔽,即使已有 detail", async () => {
    useGraphStore.getState().setDetail("n1", "已有详细内容");
    useSessionStore.setState({ mode: "practice", practiceRevealed: ["n1"] });
    await openNodeInReader("n1");
    expect(useReaderStore.getState().open).toBe(false);
    expect(api.detail).not.toHaveBeenCalled();
  });

  it("openNodeInReader 在探索模式直接打开已有 detail,白框自动关闭", async () => {
    useGraphStore.getState().setDetail("n1", "已有详细内容");
    useUiStore.getState().setCardNode("n1");
    await openNodeInReader("n1");
    const st = useReaderStore.getState();
    expect(st.open).toBe(true);
    expect(st.activeNodeId).toBe("n1");
    expect(api.detail).not.toHaveBeenCalled();
    expect(useUiStore.getState().cardNodeId).toBeNull();
  });
});

describe("顶栏阅读器按钮", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGraphStore.getState().reset();
    useReaderStore.getState().reset();
    seedExpandedNode();
  });

  it("无阅读记录时,为当前焦点节点生成精读并打开", async () => {
    await openReaderFromTopbar();
    const st = useReaderStore.getState();
    expect(st.open).toBe(true);
    expect(st.activeNodeId).toBe("n1");
    expect(api.detail).toHaveBeenCalledOnce();
  });

  it("已有阅读记录时打开最近一条", async () => {
    useReaderStore.getState().openWith(
      { nodeId: "n1", title: "测试概念", path: ["测试概念"] },
      "已有内容",
    );
    useReaderStore.getState().close();
    await openReaderFromTopbar();
    const st = useReaderStore.getState();
    expect(st.open).toBe(true);
    expect(st.activeNodeId).toBe("n1");
    expect(api.detail).not.toHaveBeenCalled();
  });

  it("阅读器已打开时再次点击收起", async () => {
    useReaderStore.getState().openWith(
      { nodeId: "n1", title: "测试概念", path: ["测试概念"] },
      "已有内容",
    );
    await openReaderFromTopbar();
    expect(useReaderStore.getState().open).toBe(false);
  });

  it("练习模式不打开阅读器", async () => {
    useSessionStore.setState({ mode: "practice" });
    await openReaderFromTopbar();
    expect(useReaderStore.getState().open).toBe(false);
    expect(api.detail).not.toHaveBeenCalled();
  });
});

