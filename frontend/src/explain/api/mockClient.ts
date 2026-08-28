/** 解读 mock 客户端:VITE_USE_MOCK 开启(默认)时替代真实后端,线下调试用。
 * 语义镜像 backend/app/agent/mock.py:确定性演示数据、相关度递减、类型轮换、max_depth 停机。 */
import type {
  ChatMessageDto,
  EdgePayload,
  ExpandResult,
  ExplainApi,
  NodePayload,
  SettingsDto,
} from "./client";

const ASPECTS = ["核心定义", "历史背景", "关键要素", "运行机制", "应用场景", "常见误区", "相关领域", "度量方法"];
const TYPES: NodePayload["node_type"][] = ["concept", "category", "dimension"];

let seq = 0;
function nid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq.toString(36)}`;
}

const sessions = new Set<string>();

function requireSession(sessionId: string): void {
  if (!sessions.has(sessionId)) throw new Error("会话不存在或已过期,请重新开始");
}

function mockRewrite(raw: string): string {
  const t = raw.trim().replace(/[?？]+$/, "").trim();
  if (t.endsWith("是什么")) return `${t.slice(0, -3)}的概念`;
  if (t.startsWith("什么是")) return `${t.slice(3)}的概念`;
  if (t.startsWith("如何") || t.startsWith("怎么")) return `${t.slice(2)}的方法`;
  if (t.startsWith("为什么")) return `${t.slice(3)}的原因`;
  return t.length <= 10 ? t : t.slice(0, 10);
}

function mockDecompose(parentTitle: string, maxChildren: number): NodePayload[] {
  const n = Math.max(1, maxChildren);
  const children: NodePayload[] = [];
  for (let i = 0; i < n; i++) {
    const aspect = ASPECTS[i % ASPECTS.length];
    const title = `${parentTitle}的${aspect}`;
    children.push({
      id: nid("n"),
      title,
      content: `${title}:这是「${parentTitle}」语境下关于${aspect}的要点概述(模拟数据)。`,
      node_type: TYPES[i % TYPES.length],
      relevance: Math.round((0.95 - i * 0.12) * 100) / 100,
    });
  }
  return children;
}

function mockEdges(parentId: string, parentTitle: string, children: NodePayload[]): EdgePayload[] {
  return children.map((c) => ({
    id: nid("e"),
    parent_id: parentId,
    child_id: c.id,
    forward: `${c.title}是${parentTitle}向该方向延伸出的子主题,侧重它在${parentTitle}框架内的定位(模拟数据)。`,
    backward: `${parentTitle}借由${c.title}被进一步拆解,二者是整体与部分的关系(模拟数据)。`,
  }));
}

function mockElaborate(nodeTitle: string, path: string[]): string {
  const crumb = path.length > 0 ? path.join(" → ") : nodeTitle;
  return (
    `${nodeTitle}是这一探索分支上的关键概念。在「${crumb}」的语境下,它承担着承上启下的作用。\n\n` +
    `## 核心阐释\n\n` +
    `这是关于「${nodeTitle}」的模拟详细阐述:真实模式下,这里会由大模型生成 300-500 字的深入讲解,` +
    `包含机制剖析、背景脉络与易混点辨析。\n\n` +
    `## 一个具体例子\n\n` +
    `- 示例要点一:帮助建立直觉\n` +
    `- 示例要点二:连接已有知识\n\n` +
    `## 与路径的关系\n\n` +
    `沿着「${crumb}」继续深入,下一个节点将在此基础上展开。(模拟数据)`
  );
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createMockClient(): ExplainApi {
  return {
    async createSession() {
      const session_id = nid("mock-session");
      sessions.add(session_id);
      return { session_id };
    },

    async createRoot(sessionId, rawInput) {
      requireSession(sessionId);
      const topic = mockRewrite(rawInput);
      return { node: { id: nid("n"), title: topic, content: topic, node_type: "concept", relevance: 1 } };
    },

    async repoRoot(sessionId, payload) {
      requireSession(sessionId);
      const fullName = payload.full_name.trim().replace(/^\/+|\/+$/g, "");
      const topic = `${fullName} 仓库的解读`;
      const node: NodePayload = { id: nid("n"), title: topic, content: topic, node_type: "concept", relevance: 1 };
      const children = mockDecompose(topic, 3); // 后端建根用 Settings() 默认值:单次 3 个
      return { node, children, edges: mockEdges(node.id, topic, children) };
    },

    async expand(sessionId, payload): Promise<ExpandResult> {
      requireSession(sessionId);
      const { node_id, node_title, depth, settings }: { node_id: string; node_title: string; depth: number; settings: SettingsDto } = payload;
      if (settings.max_depth !== null && depth >= settings.max_depth) {
        return { children: [], edges: [], refused: "max_depth" };
      }
      const children = mockDecompose(node_title, settings.max_children);
      return { children, edges: mockEdges(node_id, node_title, children), refused: null };
    },

    async detail(sessionId, payload) {
      requireSession(sessionId);
      return { node_id: payload.node_id, detail: mockElaborate(payload.node_title, payload.path) };
    },

    async chatStream(sessionId, payload, onEvent): Promise<void> {
      requireSession(sessionId);
      const question = [...payload.messages].reverse().find((m: ChatMessageDto) => m.role === "user")?.content ?? "";
      const answer =
        `关于「${payload.node_title}」,你问的是“${question.slice(0, 24)}”。这是伴读助手的模拟回答:` +
        `真实模式下,我会结合该节点的精读内容简洁作答,必要时联网搜索资料补充。`;
      for (let i = 0; i < answer.length; i += 12) {
        await delay(16);
        onEvent({ type: "delta", text: answer.slice(i, i + 12) });
      }
      onEvent({ type: "done" });
    },
  };
}
