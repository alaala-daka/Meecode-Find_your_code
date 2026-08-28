/** 单个概念节点:圆形 + 标题 + 类型徽标 + 拖拽/惯性跟随 + 出生动画。 */
import { useEffect, useRef, useState } from "react";
import { drag } from "d3-drag";
import { select } from "d3-selection";
import type { GNode } from "../store/graphStore";
import { useGraphStore } from "../store/graphStore";
import type { GraphSimulation } from "../graph/simulation";
import { computeThrowVelocity, type DragSample } from "../graph/inertia";

/** 节点填充按深度沿暖色梯度由深至浅 */
const NODE_FILLS = ["#D08159", "#DE9C72", "#E7B88A", "#E3C77F", "#EACFA0", "#F0DDBE"];

export function nodeFill(depth: number): string {
  return NODE_FILLS[Math.min(depth, NODE_FILLS.length - 1)];
}

interface Props {
  node: GNode;
  sim: GraphSimulation;
  masked: boolean; // 练习模式:内容未揭晓(标题仍显示)
  onClick: (id: string) => void;
  onDoubleClick: (id: string) => void;
  /** 拖拽中的世界坐标夹取:防止节点被拖出可视区 */
  constrain?: (x: number, y: number, r: number) => { x: number; y: number };
  /** 松手后回调:画布检查整图,越界节点自动收回 */
  onDragEnd?: () => void;
}

export function NodeView({ node, sim, masked, onClick, onDoubleClick, constrain, onDragEnd }: Props) {
  const gRef = useRef<SVGGElement>(null);
  const focusId = useGraphStore((s) => s.focusId);
  const [mounted, setMounted] = useState(false);

  // 出生动画:从 0 弹到目标半径,同批交错
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // 拖拽:d3-drag 改写 fx/fy;松手按末段指针速度赋予初速度,模拟惯性甩出
  useEffect(() => {
    if (!gRef.current) return;
    const samples: DragSample[] = [];
    const behavior = drag<SVGGElement, unknown>()
      .on("start", () => {
        sim.holdWarm();
        node.fx = node.x;
        node.fy = node.y;
        node.vx = 0;
        node.vy = 0;
        samples.length = 0;
      })
      .on("drag", (event) => {
        const p = constrain ? constrain(event.x, event.y, node.rShow) : { x: event.x, y: event.y };
        node.fx = p.x;
        node.fy = p.y;
        // 采样夹取后的位置:顶住边界时该方向速度自然归零,松手不会甩出界
        samples.push({ x: p.x, y: p.y, t: performance.now() });
        if (samples.length > 12) samples.shift();
      })
      .on("end", () => {
        const v = computeThrowVelocity(samples);
        node.fx = null;
        node.fy = null;
        node.vx = v.vx;
        node.vy = v.vy;
        sim.releaseWarm();
        if (v.vx !== 0 || v.vy !== 0) sim.reheat(0.25); // 让速度被积分,随 velocityDecay 减速
        onDragEnd?.(); // 画布整图检查:相邻节点被挤出边界时自动收回
      });
    select(gRef.current).call(behavior);
    return () => {
      select(gRef.current!).on(".drag", null);
    };
  }, [node, sim, constrain, onDragEnd]);

  const isFocus = node.id === focusId;
  const r = mounted ? node.rShow : 0.01;
  const fontSize = Math.max(11, Math.min(17, r / 3.4));
  const lines = wrapTitle(node.title, Math.max(2, Math.floor((r * 1.2) / fontSize)));
  const lineHeight = fontSize * 1.3;
  const transitionDelay = mounted ? "0ms" : `${node.spawnIndex * 60}ms`;

  return (
    <g
      ref={gRef}
      transform={`translate(${node.x}, ${node.y})`}
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        if (e.defaultPrevented) return; // 拖拽后的 click 被 d3-drag 抑制/标记
        onClick(node.id);
      }}
      onDoubleClick={(e) => {
        if (e.defaultPrevented) return;
        onDoubleClick(node.id);
      }}
      role="button"
      aria-label={`概念节点:${node.title}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(node.id);
        }
      }}
    >
      {/* 展开/详细展开请求中的脉动光环 */}
      {(node.expanding || node.detailing) && <circle className="node-pulse" r={node.rShow + 8} />}

      {/* 焦点外圈 */}
      {isFocus && (
        <circle
          r={r + 7}
          fill="none"
          stroke="var(--terracotta)"
          strokeWidth={2}
          opacity={0.85}
          style={{ transition: "r var(--dur-radius) var(--ease-soft)", transitionDelay }}
        />
      )}

      <circle
        className="node-body"
        r={r}
        fill={nodeFill(node.depth)}
        stroke="rgba(74,63,51,0.18)"
        strokeWidth={1.5}
        style={{
          transition: "r var(--dur-node-spawn) var(--ease-spring)",
          transitionDelay,
          filter: "drop-shadow(0 4px 10px rgba(74,63,51,0.18))",
        }}
      />

      {/* 已展开标识环 */}
      {node.expanded && (
        <circle
          r={Math.max(0, r - 4)}
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth={1.5}
          strokeDasharray="3 5"
          style={{ transition: "r var(--dur-radius) var(--ease-soft)" }}
          pointerEvents="none"
        />
      )}

      {/* 标题(r 过小时隐藏文字,避免糊成一团) */}
      {r > 22 && (
        <text
          textAnchor="middle"
          fill="#fff"
          fontFamily="var(--font-display)"
          fontSize={fontSize}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {lines.map((line, i) => (
            <tspan key={i} x={0} y={(i - (lines.length - 1) / 2) * lineHeight + fontSize * 0.36}>
              {line}
            </tspan>
          ))}
        </text>
      )}

      {/* 类型徽标(F4):concept 不标,category 三叉 / dimension 标尺 */}
      {node.type !== "concept" && r > 18 && (
        <g transform={`translate(${r * 0.62}, ${-r * 0.62})`} pointerEvents="none">
          <circle r={9} fill="#fff" stroke="rgba(74,63,51,0.25)" strokeWidth={1} />
          {node.type === "category" ? (
            <path
              d="M0,3.5 L0,-0.5 M0,-0.5 L-3.5,-3.5 M0,-0.5 L3.5,-3.5 M0,-0.5 L0,-4"
              stroke="var(--bush-deep)"
              strokeWidth={1.4}
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <path
              d="M-3.5,3 L3.5,3 M-3.5,3 L-3.5,0.5 M-1.2,3 L-1.2,-1 M1.2,3 L1.2,0.5 M3.5,3 L3.5,-1 M-3.5,-1.5 L3.5,-1.5"
              stroke="var(--terracotta-deep)"
              strokeWidth={1.2}
              strokeLinecap="round"
              fill="none"
            />
          )}
        </g>
      )}

      {/* 练习模式未揭晓标记 */}
      {masked && r > 18 && (
        <g transform={`translate(${-r * 0.62}, ${-r * 0.62})`} pointerEvents="none">
          <circle r={8} fill="var(--sand)" stroke="rgba(74,63,51,0.25)" strokeWidth={1} />
          <text textAnchor="middle" y={3.2} fontSize={10} fill="var(--ink-soft)" fontFamily="var(--font-ui)">
            ?
          </text>
        </g>
      )}
    </g>
  );
}

/** 中文标题按可用宽度折行,最多 3 行,超出省略号。 */
function wrapTitle(title: string, charsPerLine: number): string[] {
  const clean = title.trim();
  if (clean.length <= charsPerLine) return [clean];
  const lines: string[] = [];
  for (let i = 0; i < clean.length && lines.length < 3; i += charsPerLine) {
    lines.push(clean.slice(i, i + charsPerLine));
  }
  if (lines.length === 3 && clean.length > charsPerLine * 3) {
    lines[2] = lines[2].slice(0, Math.max(1, charsPerLine - 1)) + "…";
  }
  return lines;
}
