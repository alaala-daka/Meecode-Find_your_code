/** 后端 API 客户端(经 vite 代理到 :8000)。 */

export interface SettingsDto {
  max_children: number;
  max_depth: number | null;
}

export interface LLMOverrideDto {
  base_url?: string;
  api_key?: string;
  model?: string;
}

export interface NodePayload {
  id: string;
  title: string;
  content: string;
  node_type: "concept" | "category" | "dimension";
  relevance: number;
}

export interface EdgePayload {
  id: string;
  parent_id: string;
  child_id: string;
  forward: string;
  backward: string;
}

export interface ExpandResult {
  children: NodePayload[];
  edges: EdgePayload[];
  refused: string | null;
}

export type ChatEvent =
  | { type: "status"; stage: "searching"; query: string }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ChatMessageDto {
  role: "user" | "assistant";
  content: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(`/explain-api${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(0, "无法连接后端服务,请确认后端已启动");
  }
  if (!resp.ok) {
    let detail = `请求失败(${resp.status})`;
    try {
      const body = await resp.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* 保持默认信息 */
    }
    throw new ApiError(resp.status, detail);
  }
  return (await resp.json()) as T;
}

export const api = {
  createSession: () => request<{ session_id: string }>("/sessions", { method: "POST" }),

  createRoot: (sessionId: string, rawInput: string, llm?: LLMOverrideDto) =>
    request<{ node: NodePayload }>("/roots", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, raw_input: rawInput, llm }),
    }),

  repoRoot: (
    sessionId: string,
    payload: { full_name: string; default_branch?: string | null; llm?: LLMOverrideDto },
  ) =>
    request<{ node: NodePayload; children: NodePayload[]; edges: EdgePayload[] }>("/repos/root", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, ...payload }),
    }),

  expand: (
    sessionId: string,
    payload: {
      node_id: string;
      node_title: string;
      path: string[];
      depth: number;
      settings: SettingsDto;
      llm?: LLMOverrideDto;
    },
  ) =>
    request<ExpandResult>("/expand", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, ...payload }),
    }),

  detail: (
    sessionId: string,
    payload: {
      node_id: string;
      node_title: string;
      path: string[];
      brief: string;
      llm?: LLMOverrideDto;
    },
  ) =>
    request<{ node_id: string; detail: string }>("/nodes/detail", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, ...payload }),
    }),

  chatStream: async (
    sessionId: string,
    payload: {
      node_id: string;
      node_title: string;
      path: string[];
      detail: string;
      messages: ChatMessageDto[];
      llm?: LLMOverrideDto;
      tavily_api_key?: string;
    },
    onEvent: (e: ChatEvent) => void,
  ): Promise<void> => {
    let resp: Response;
    try {
      resp = await fetch("/explain-api/reader/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, ...payload }),
      });
    } catch {
      throw new ApiError(0, "无法连接后端服务,请确认后端已启动");
    }
    if (!resp.ok || !resp.body) {
      let detail = `请求失败(${resp.status})`;
      try {
        const body = await resp.json();
        if (typeof body.detail === "string") detail = body.detail;
      } catch {
        /* 保持默认信息 */
      }
      throw new ApiError(resp.status, detail);
    }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let sawTerminal = false; // done/error 才算正常收尾
    const emit = (line: string) => {
      let ev: ChatEvent;
      try {
        ev = JSON.parse(line) as ChatEvent;
      } catch {
        return; // 忽略无法解析的行(前向兼容)
      }
      if (ev.type === "done" || ev.type === "error") sawTerminal = true;
      onEvent(ev);
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true }); // 处理跨 chunk 的多字节 UTF-8
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim(); // 同时吃掉 \r 与空行
        buf = buf.slice(nl + 1);
        if (line) emit(line);
      }
    }
    buf += decoder.decode();
    if (buf.trim()) emit(buf.trim());
    if (!sawTerminal) throw new ApiError(0, "回答中断,请重试");
  },
};
