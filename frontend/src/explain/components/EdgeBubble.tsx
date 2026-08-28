/** 关系气泡:点击边后展示双向描述(F6)。
 * forward 父→子(重点叙述子节点)/ backward 子→父(重点叙述父节点)。
 */
import { useEffect, useRef } from "react";
import type { GEdge } from "../store/graphStore";
import { useUiStore } from "../store/uiStore";
import { useReaderStore, readerWidth } from "../store/readerStore";

interface Props {
  edge: GEdge;
  anchor: { x: number; y: number }; // 屏幕坐标
  parentTitle: string;
  childTitle: string;
  masked: boolean; // 练习模式且子节点未揭晓
  /** 画布容器尺寸(浮层 clamp 基准);缺省退回窗口尺寸 */
  bounds?: { width: number; height: number };
}

export function EdgeBubble({ edge, anchor, parentTitle, childTitle, masked, bounds }: Props) {
  const selectEdge = useUiStore((s) => s.selectEdge);
  const readerOpen = useReaderStore((s) => s.open);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") selectEdge(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectEdge]);

  const bw = bounds?.width ?? window.innerWidth;
  const bh = bounds?.height ?? window.innerHeight;

  // 防止气泡飞出视口;阅读器打开时让出右侧空间
  const style: React.CSSProperties = {
    left: Math.max(170, Math.min(anchor.x, bw - (readerOpen ? readerWidth() : 0) - 170)),
    top: Math.max(130, Math.min(anchor.y, bh - 130)),
  };

  return (
    <div ref={ref} className="edge-bubble" style={style} role="dialog" aria-label="概念关系">
      <button className="bubble-close" onClick={() => selectEdge(null)} aria-label="关闭">
        ×
      </button>
      {masked ? (
        <p className="bubble-masked">先回忆并揭晓「{childTitle}」,再来看这段关系。</p>
      ) : (
        <>
          <section>
            <header>
              <span className="bubble-dir">{parentTitle}</span>
              <span className="bubble-arrow">→</span>
              <span className="bubble-dir">{childTitle}</span>
            </header>
            <p>{edge.forward || "…"}</p>
          </section>
          <div className="bubble-divider" />
          <section>
            <header>
              <span className="bubble-dir">{childTitle}</span>
              <span className="bubble-arrow">→</span>
              <span className="bubble-dir">{parentTitle}</span>
            </header>
            <p>{edge.backward || "…"}</p>
          </section>
        </>
      )}
    </div>
  );
}
