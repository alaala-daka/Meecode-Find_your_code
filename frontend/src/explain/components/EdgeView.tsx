/** 白色双向箭头边 + 宽点击热区(F6)。 */
import type { GEdge, GNode } from "../store/graphStore";

interface Props {
  edge: GEdge;
  nodes: Record<string, GNode>;
  selected: boolean;
  onClick: (edgeId: string) => void;
}

export function EdgeView({ edge, nodes, selected, onClick }: Props) {
  const s = nodes[edge.from];
  const t = nodes[edge.to];
  if (!s || !t) return null;

  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;

  // 端点收进节点圆边缘
  const x1 = s.x + ux * (s.rShow + 2);
  const y1 = s.y + uy * (s.rShow + 2);
  const x2 = t.x - ux * (t.rShow + 4);
  const y2 = t.y - uy * (t.rShow + 4);

  // 轻微弧度,让双向箭头与兄弟边更易分辨
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const curve = Math.min(18, len * 0.1);
  const cx = mx - uy * curve;
  const cy = my + ux * curve;

  const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="var(--edge-white)"
        strokeWidth={selected ? 4 : 2.5}
        strokeLinecap="round"
        markerStart="url(#cs-arrow-start)"
        markerEnd="url(#cs-arrow-end)"
        style={{
          filter: "drop-shadow(0 1px 3px rgba(74,63,51,0.28))",
          transition: "stroke-width 150ms ease",
        }}
        pointerEvents="none"
      />
      {/* 隐形宽热区 */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: "pointer", pointerEvents: "stroke" }}
        onClick={(e) => {
          e.stopPropagation();
          onClick(edge.id);
        }}
      />
    </g>
  );
}

/** 供 GraphCanvas 放入 <defs> 的箭头标记(双向)。 */
export function EdgeMarkerDefs() {
  return (
    <defs>
      <marker
        id="cs-arrow-end"
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto"
      >
        <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </marker>
      <marker
        id="cs-arrow-start"
        viewBox="0 0 10 10"
        refX="2"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto-start-reverse"
      >
        <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </marker>
    </defs>
  );
}
