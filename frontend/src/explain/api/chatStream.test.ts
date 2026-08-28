import { describe, expect, it, vi } from "vitest";
import { realApi, ApiError, type ChatEvent } from "./client";

/** 把若干 NDJSON 行按指定切分点拆成 chunk 流(模拟跨包断行) */
function ndjsonResponse(lines: object[], splitAt: number): Response {
  const text = lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
  const chunks = [text.slice(0, splitAt), text.slice(splitAt)];
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

const PAYLOAD = { node_id: "n", node_title: "t", path: [], detail: "", messages: [] };

describe("api.chatStream", () => {
  it("逐行解析 NDJSON 事件(含跨 chunk 断行)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ndjsonResponse(
          [
            { type: "status", stage: "searching", query: "以太 实验" },
            { type: "delta", text: "你好," },
            { type: "delta", text: "世界" },
            { type: "done" },
          ],
          30, // 第二行中间断开
        ),
      ),
    );
    const events: ChatEvent[] = [];
    await realApi.chatStream("sid", PAYLOAD, (e) => events.push(e));
    expect(events.map((e) => e.type)).toEqual(["status", "delta", "delta", "done"]);
    expect(events[0]).toEqual({ type: "status", stage: "searching", query: "以太 实验" });
  });

  it("HTTP 错误 → 抛 ApiError 并带 detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ detail: "会话不存在或已过期,请重新开始" }), { status: 404 })),
    );
    await expect(realApi.chatStream("bad", PAYLOAD, () => {})).rejects.toThrow("会话不存在或已过期,请重新开始");
  });

  it("流结束未见 done/error 终态 → 抛「回答中断」", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ndjsonResponse([{ type: "delta", text: "半句话" }], 5)),
    );
    await expect(realApi.chatStream("sid", PAYLOAD, () => {})).rejects.toThrow("回答中断");
  });

  it("回调抛出的错误不应被当作坏行吞掉", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ndjsonResponse([{ type: "error", message: "后端异常" }], 3)),
    );
    await expect(
      realApi.chatStream("sid", PAYLOAD, (e) => {
        if (e.type === "error") throw new ApiError(0, e.message);
      }),
    ).rejects.toThrow("后端异常");
  });
});
