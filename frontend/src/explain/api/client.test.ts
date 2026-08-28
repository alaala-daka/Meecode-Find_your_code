import { afterEach, describe, expect, it, vi } from "vitest";
import { api, realApi, type ChatEvent } from "./client";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("api 调度(VITE_USE_MOCK)", () => {
  it("默认(mock 开)→ 走本地 mock,不触真实客户端", async () => {
    const spy = vi.spyOn(realApi, "createSession").mockResolvedValue({ session_id: "real" });
    const { session_id } = await api.createSession();
    expect(session_id).toMatch(/^mock-session/);
    expect(spy).not.toHaveBeenCalled();
  });

  it("VITE_USE_MOCK=false → 走真实客户端", async () => {
    vi.stubEnv("VITE_USE_MOCK", "false");
    const spy = vi.spyOn(realApi, "createSession").mockResolvedValue({ session_id: "real-1" });
    await expect(api.createSession()).resolves.toEqual({ session_id: "real-1" });
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe("解读 mock 客户端(镜像后端 mock 语义)", () => {
  it("repoRoot:根主题 + 首层 3 子节点 + 边", async () => {
    const { session_id } = await api.createSession();
    const r = await api.repoRoot(session_id, { full_name: "alice/mini-agent" });
    expect(r.node.title).toBe("alice/mini-agent 仓库的解读");
    expect(r.children).toHaveLength(3);
    expect(r.edges).toHaveLength(3);
    expect(r.edges.every((e) => e.parent_id === r.node.id)).toBe(true);
    expect(r.children.map((c) => c.title)).toEqual([
      "alice/mini-agent 仓库的解读的核心定义",
      "alice/mini-agent 仓库的解读的历史背景",
      "alice/mini-agent 仓库的解读的关键要素",
    ]);
  });

  it("expand:按 max_children 生成;depth 达 max_depth → refused=max_depth", async () => {
    const { session_id } = await api.createSession();
    const ok = await api.expand(session_id, {
      node_id: "n1", node_title: "X的核心定义", path: ["根", "X的核心定义"], depth: 1,
      settings: { max_children: 2, max_depth: null },
    });
    expect(ok.refused).toBeNull();
    expect(ok.children).toHaveLength(2);
    expect(ok.edges.every((e) => e.parent_id === "n1")).toBe(true);

    const refused = await api.expand(session_id, {
      node_id: "n1", node_title: "X", path: [], depth: 2,
      settings: { max_children: 3, max_depth: 2 },
    });
    expect(refused.refused).toBe("max_depth");
    expect(refused.children).toHaveLength(0);
  });

  it("chatStream:delta 分块流入,done 正常收尾", async () => {
    const { session_id } = await api.createSession();
    const events: ChatEvent[] = [];
    await api.chatStream(
      session_id,
      { node_id: "n", node_title: "主题", path: [], detail: "", messages: [{ role: "user", content: "这是什么?" }] },
      (e) => events.push(e),
    );
    expect(events[0].type).toBe("delta");
    expect(events[events.length - 1]).toEqual({ type: "done" });
    expect(events.some((e) => e.type === "error")).toBe(false);
  });

  it("会话不存在 → 拒绝并提示重新开始", async () => {
    await expect(
      api.expand("nope", { node_id: "n", node_title: "X", path: [], depth: 0, settings: { max_children: 3, max_depth: null } }),
    ).rejects.toThrow("会话不存在或已过期");
  });
});
