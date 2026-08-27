/** 交互控制器:输入提交、节点展开、练习模式点击路由。 */
import { api, ApiError } from "../api/client";
import { pathTitles, useGraphStore } from "../store/graphStore";
import { useReaderStore } from "../store/readerStore";
import { useSessionStore } from "../store/sessionStore";
import { toLLMOverride, useSettingsStore } from "../store/settingsStore";
import { useUiStore } from "../store/uiStore";

/** mock 模式防双击竞态:展开请求发出 800ms 内的 dblclick 视为"想展开"而非"详细展开" */
const expandStartAt = new Map<string, number>();

/** 提交概念输入 → 创建/复用会话 → 改写生成根节点。 */
export async function submitConcept(rawInput: string): Promise<boolean> {
  const raw = rawInput.trim();
  const { pushToast } = useUiStore.getState();
  if (!raw) return false;

  const session = useSessionStore.getState();
  const graph = useGraphStore.getState();
  try {
    const sessionId = await session.ensureSession();
    const { node } = await api.createRoot(sessionId, raw, toLLMOverride(useSettingsStore.getState().gen));
    graph.reset();
    graph.setRoot(node);
    return true;
  } catch (err) {
    pushToast(err instanceof ApiError ? err.message : "创建失败,请重试");
    return false;
  }
}

/** 探索模式下点击节点:未展开 → 请求后端展开;始终设为焦点。 */
export async function handleNodeClick(nodeId: string): Promise<void> {
  const session = useSessionStore.getState();
  if (session.mode === "practice") {
    handlePracticeClick(nodeId);
    return;
  }

  const graph = useGraphStore.getState();
  const node = graph.nodes[nodeId];
  if (!node) return;

  const ui = useUiStore.getState();
  ui.selectEdge(null);
  if (node.expanded || node.expanding) {
    graph.setFocus(nodeId);
    ui.setCardNode(nodeId);
    return;
  }

  expandStartAt.set(nodeId, Date.now());
  graph.setExpanding(nodeId, true);
  const { pushToast } = ui;
  try {
    const sessionId = await session.ensureSession();
    const result = await api.expand(sessionId, {
      node_id: node.id,
      node_title: node.title,
      path: pathTitles(graph.nodes, node.id),
      depth: node.depth,
      settings: {
        max_children: session.settings.maxChildren,
        max_depth: session.settings.maxDepth,
      },
      llm: toLLMOverride(useSettingsStore.getState().gen),
    });

    if (result.refused === "max_depth") {
      graph.setExpanding(nodeId, false);
      pushToast("已达设置的最高发散层数,可在设置区调整");
      return;
    }
    if (result.children.length === 0) {
      graph.setExpanding(nodeId, false);
      pushToast("这个概念没有拆解出更多内容");
      return;
    }

    graph.addChildren(nodeId, result.children, result.edges);
    session.pushPath(nodeId); // 记录探索轨迹(F7)
    useUiStore.getState().setCardNode(nodeId);
  } catch (err) {
    graph.setExpanding(nodeId, false);
    if (err instanceof ApiError && err.status === 404) {
      pushToast("会话已过期,请重新开始");
    } else {
      pushToast(err instanceof ApiError ? err.message : "展开失败,点击重试");
    }
  }
}

/**
 * 练习模式点击(F8):
 * - 节点结构已重现但未揭晓 → 揭晓内容;若它在轨迹中有子节点,顺带重现子结构;
 * - 逻辑:一次点击 = "回忆完毕,揭晓并继续深入"。
 */
function handlePracticeClick(nodeId: string): void {
  const session = useSessionStore.getState();
  const graph = useGraphStore.getState();

  if (!session.practiceRevealed.includes(nodeId)) {
    session.practiceReveal(nodeId);
  }
  if (!session.practiceExpanded.includes(nodeId)) {
    const node = graph.nodes[nodeId];
    if (node && node.childIds.length > 0) {
      session.practiceOpen(nodeId);
    }
  }
  graph.setFocus(nodeId);
  useUiStore.getState().setCardNode(nodeId);
}

/** 练习模式下某节点是否应在画布上重现(可见) */
export function isVisibleInPractice(
  nodeId: string,
  rootId: string | null,
  practiceExpanded: string[],
  nodes: Record<string, { parentId: string | null }>,
): boolean {
  if (nodeId === rootId) return true;
  let cur = nodes[nodeId];
  while (cur && cur.parentId) {
    if (!practiceExpanded.includes(cur.parentId)) return false;
    cur = nodes[cur.parentId];
  }
  return true;
}

/** 双击已展开节点 = 详细展开:重新生成更丰富的阐述(不产生新子节点)。
 * 已有 detail → 直接打开阅读器;否则生成后入历史(面板开着则切换激活)。 */
export async function handleNodeDoubleClick(nodeId: string): Promise<void> {
  const session = useSessionStore.getState();
  if (session.mode === "practice") return;

  const graph = useGraphStore.getState();
  const node = graph.nodes[nodeId];
  if (!node || !node.expanded || node.expanding || node.detailing) return;
  if (Date.now() - (expandStartAt.get(nodeId) ?? 0) < 800) return;
  expandStartAt.delete(nodeId); // 窗口已过,清理避免 map 无限增长

  const meta = { nodeId: node.id, title: node.title, path: pathTitles(graph.nodes, node.id) };
  if (node.detail) {
    useReaderStore.getState().openWith(meta, node.detail);
    return;
  }
  await requestDetail(nodeId);
}

/** 详细展开请求主体;openReader=true 时完成后把内容送进阅读器(气泡卡展开图标用)。 */
export async function requestDetail(nodeId: string, openReader = false): Promise<void> {
  const graph = useGraphStore.getState();
  const node = graph.nodes[nodeId];
  if (!node || node.detailing) return;

  graph.setDetailing(nodeId, true);
  const { pushToast } = useUiStore.getState();
  try {
    const sessionId = await useSessionStore.getState().ensureSession();
    const { detail } = await api.detail(sessionId, {
      node_id: node.id,
      node_title: node.title,
      path: pathTitles(graph.nodes, node.id),
      brief: node.content,
      llm: toLLMOverride(useSettingsStore.getState().gen),
    });
    useGraphStore.getState().setDetail(nodeId, detail);
    const meta = { nodeId: node.id, title: node.title, path: pathTitles(graph.nodes, node.id) };
    if (openReader) {
      useReaderStore.getState().openWith(meta, detail);
    } else {
      useReaderStore.getState().upsertDetail(meta, detail);
    }
  } catch (err) {
    useGraphStore.getState().setDetailing(nodeId, false);
    pushToast(err instanceof ApiError ? err.message : "详细展开失败,双击重试");
  }
}

/** 气泡卡展开图标 → 阅读器;无 detail 时先详细展开再打开。
 * 练习模式整体屏蔽详细展开,也禁止通过图标进入阅读器泄露内容。 */
export async function openNodeInReader(nodeId: string): Promise<void> {
  if (useSessionStore.getState().mode === "practice") return;

  const node = useGraphStore.getState().nodes[nodeId];
  if (!node) return;
  if (node.detail) {
    useReaderStore
      .getState()
      .openWith(
        { nodeId, title: node.title, path: pathTitles(useGraphStore.getState().nodes, nodeId) },
        node.detail,
      );
  } else {
    await requestDetail(nodeId, true);
  }
}

/** 顶栏阅读器按钮:打开最近阅读,或为当前焦点节点生成并打开精读。 */
export async function openReaderFromTopbar(): Promise<void> {
  if (useSessionStore.getState().mode === "practice") return;

  const reader = useReaderStore.getState();
  if (reader.open) {
    reader.close();
    return;
  }
  if (reader.entries.length > 0) {
    reader.openLatest();
    return;
  }

  const graph = useGraphStore.getState();
  const focusId = graph.focusId;
  const node = focusId ? graph.nodes[focusId] : undefined;
  if (!node) {
    useUiStore.getState().pushToast("请先输入概念并展开节点");
    return;
  }
  await openNodeInReader(node.id);
}

