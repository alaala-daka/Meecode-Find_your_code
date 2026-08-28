/** 焦点节点内容卡:展示节点正文;练习模式下未揭晓时遮罩(F8)。 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GNode } from "../store/graphStore";
import { openNodeInReader } from "../graph/controller";
import { useReaderStore, readerWidth } from "../store/readerStore";
import { useSessionStore } from "../store/sessionStore";
import { useUiStore } from "../store/uiStore";

const TYPE_LABEL: Record<GNode["type"], string> = {
  concept: "概念",
  category: "分类",
  dimension: "维度",
};

interface Props {
  node: GNode;
  anchor: { x: number; y: number }; // 屏幕坐标(节点中心)
  masked: boolean;
  /** 画布容器尺寸(浮层 clamp 基准);缺省退回窗口尺寸 */
  bounds?: { width: number; height: number };
}

export function NodeCard({ node, anchor, masked, bounds }: Props) {
  const setCardNode = useUiStore((s) => s.setCardNode);
  const readerOpen = useReaderStore((s) => s.open);
  const mode = useSessionStore((s) => s.mode);

  const bw = bounds?.width ?? window.innerWidth;
  const bh = bounds?.height ?? window.innerHeight;

  // 卡片放在节点右侧偏上,防飞出视口、防遮挡相邻节点;阅读器打开时让出右侧空间
  const style: React.CSSProperties = {
    left: Math.max(
      170,
      Math.min(
        anchor.x + node.rShow + 70,
        bw - (readerOpen ? readerWidth() : 0) - 170,
      ),
    ),
    top: Math.max(130, Math.min(anchor.y - node.rShow - 40, bh - 130)),
  };

  return (
    <div className="node-card" style={style} role="dialog" aria-label={`节点内容:${node.title}`}>
      <button className="bubble-close" onClick={() => setCardNode(null)} aria-label="关闭">
        ×
      </button>
      {!masked && node.expanded && mode !== "practice" && (
        <button
          className="bubble-close bubble-expand"
          onClick={() => void openNodeInReader(node.id)}
          aria-label="在阅读器中打开"
          title="在阅读器中打开"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      )}
      <header>
        <span className="node-card-type">{TYPE_LABEL[node.type]}</span>
        <h3>{node.title}</h3>
      </header>
      {masked ? (
        <p className="bubble-masked">内容已抹去——先凭记忆复述,点击节点后揭晓。</p>
      ) : node.detailing ? (
        <p className="node-card-content">正在生成精读…</p>
      ) : node.detail ? (
        <div className="node-card-detail">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.detail}</ReactMarkdown>
        </div>
      ) : (
        <p className="node-card-content">{node.content || node.title}</p>
      )}
    </div>
  );
}
