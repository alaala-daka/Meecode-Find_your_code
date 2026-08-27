/** 概念图画布:SVG + d3-force 宿主 + 缩放平移 + 气泡/节点卡浮层。 */
import { useEffect, useMemo, useRef, useState } from "react";
import { select } from "d3-selection";
import { zoom, zoomIdentity, zoomTransform, type ZoomBehavior } from "d3-zoom";
import { useGraphStore } from "../store/graphStore";
import { useSessionStore } from "../store/sessionStore";
import { useUiStore } from "../store/uiStore";
import { useReaderStore, readerWidth } from "../store/readerStore";
import { animateZoomTo, ensureVisibleTransform, fitTransform, graphBBox } from "../graph/zoomFit";
import { GraphSimulation } from "../graph/simulation";
import { handleNodeClick, handleNodeDoubleClick, isVisibleInPractice } from "../graph/controller";
import { EdgeMarkerDefs, EdgeView } from "./EdgeView";
import { NodeView } from "./NodeView";
import { EdgeBubble } from "./EdgeBubble";
import { NodeCard } from "./NodeCard";

interface Transform {
  x: number;
  y: number;
  k: number;
}

export function GraphCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<GraphSimulation | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [tf, setTf] = useState<Transform>({ x: 0, y: 0, k: 1 });
    const prevNodeIdsRef = useRef<Set<string> | null>(null);
    const ensureTimerRef = useRef<number | undefined>(undefined);
    const ensureCancelRef = useRef<(() => void) | null>(null);

  // 订阅两个计数器:tick(每帧位置)/ structureVersion(结构)
  const tick = useGraphStore((s) => s.tick);
  const structureVersion = useGraphStore((s) => s.structureVersion);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const rootId = useGraphStore((s) => s.rootId);

  const mode = useSessionStore((s) => s.mode);
  const practiceExpanded = useSessionStore((s) => s.practiceExpanded);
  const practiceRevealed = useSessionStore((s) => s.practiceRevealed);

  const selectedEdgeId = useUiStore((s) => s.selectedEdgeId);
  const selectEdge = useUiStore((s) => s.selectEdge);
  const cardNodeId = useUiStore((s) => s.cardNodeId);
  const setCardNode = useUiStore((s) => s.setCardNode);

  // 模拟生命周期
  useEffect(() => {
    simRef.current = new GraphSimulation(() => useGraphStore.getState().bumpTick());
    return () => simRef.current?.stop();
  }, []);

  // 缩放平移(初始居中)
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const initial = { x: rect.width / 2, y: rect.height / 2, k: 1 };
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 2.5])
      .filter((event) => {
        if (event.type === "wheel") return true;
        const target = event.target as Element;
        return target === svgRef.current || target.classList?.contains("zoom-bg");
      })
      .on("zoom", (event) => {
        setTf({ x: event.transform.x, y: event.transform.y, k: event.transform.k });
      });
    zoomRef.current = z;
    select(svgRef.current).call(z).call(z.transform, zoomIdentity.translate(initial.x, initial.y));
  }, []);

  // 阅读器开合/开着时结构变化 → 图内容 zoom-fit 进剩余可视区(节点不被遮挡)
  const readerOpen = useReaderStore((s) => s.open);
  useEffect(() => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (!svg || !z) return;
    let cancel: (() => void) | null = null;
    let timer: number | undefined;

    const fit = () => {
      const bbox = graphBBox(Object.values(useGraphStore.getState().nodes));
      if (!bbox) return;
      const rw = readerOpen ? readerWidth() : 0;
      cancel?.(); // 取消上一段未完成的动画
      cancel = animateZoomTo(svg, z, fitTransform(bbox, window.innerWidth - rw, window.innerHeight, 80));
    };

    if (readerOpen) {
      fit();
      // 开着期间结构变化(新展开)也重排,防抖 400ms 等力场稍稳
      let last = useGraphStore.getState().structureVersion;
      const unsub = useGraphStore.subscribe((s) => {
        if (s.structureVersion === last) return;
        last = s.structureVersion;
        window.clearTimeout(timer);
        timer = window.setTimeout(fit, 400);
      });
      return () => {
        unsub();
        window.clearTimeout(timer);
        cancel?.();
      };
    }
    fit(); // 关闭 → 全幅重排
    return () => cancel?.();
  }, [readerOpen]);

    // 阅读器关闭时,新展开的子节点若落到视口外,自动平移/缩放带回来
    useEffect(() => {
      const currentIds = new Set(Object.keys(useGraphStore.getState().nodes));
      const prev = prevNodeIdsRef.current;
      const newIds = prev ? [...currentIds].filter((id) => !prev.has(id)) : [];
      prevNodeIdsRef.current = currentIds;
      if (newIds.length === 0 || readerOpen) return;

      const svg = svgRef.current;
      const z = zoomRef.current;
      if (!svg || !z) return;

      window.clearTimeout(ensureTimerRef.current);
      ensureTimerRef.current = window.setTimeout(() => {
        const allNodes = useGraphStore.getState().nodes;
        const bboxNodes: { x: number; y: number; rShow: number }[] = [];
        for (const id of newIds) {
          const n = allNodes[id];
          if (n) bboxNodes.push(n);
        }
        if (bboxNodes.length === 0) return;
        const bbox = graphBBox(bboxNodes);
        if (!bbox) return;
        const rw = readerOpen ? readerWidth() : 0;
        const current = zoomTransform(svg);
        const target = ensureVisibleTransform(
          bbox,
          window.innerWidth - rw,
          window.innerHeight,
          current,
          120,
        );
        ensureCancelRef.current?.();
        ensureCancelRef.current = animateZoomTo(svg, z, target, 340);
      }, 180);

      return () => {
        window.clearTimeout(ensureTimerRef.current);
        ensureCancelRef.current?.();
      };
    }, [structureVersion, readerOpen]);


  // 可见集合(练习模式按重现进度裁剪)
  const visibleNodes = useMemo(() => {
    const all = Object.values(nodes);
    if (mode !== "practice") return all;
    return all.filter((n) => isVisibleInPractice(n.id, rootId, practiceExpanded, nodes));
  }, [nodes, mode, rootId, practiceExpanded, tick]);

  const visibleEdges = useMemo(() => {
    const visible = new Set(visibleNodes.map((n) => n.id));
    return Object.values(edges).filter((e) => visible.has(e.from) && visible.has(e.to));
  }, [edges, visibleNodes]);

  // 结构同步进物理模拟
  useEffect(() => {
    simRef.current?.setGraph(visibleNodes, visibleEdges);
  }, [structureVersion, mode, practiceExpanded]);

  const sim = simRef.current;
  const toScreen = (gx: number, gy: number) => ({ x: tf.x + gx * tf.k, y: tf.y + gy * tf.k });

  const selectedEdge = selectedEdgeId ? edges[selectedEdgeId] : null;
  const cardNode = cardNodeId ? nodes[cardNodeId] : null;

  return (
    <div ref={containerRef} className="graph-canvas">
      <svg ref={svgRef} width="100%" height="100%">
        <EdgeMarkerDefs />
        <g transform={`translate(${tf.x},${tf.y}) scale(${tf.k})`}>
          {/* 平移热区背景 */}
          <rect
            className="zoom-bg"
            x={-6000}
            y={-6000}
            width={12000}
            height={12000}
            fill="transparent"
            onClick={() => selectEdge(null)}
          />
          {visibleEdges.map((e) => (
            <EdgeView
              key={e.id}
              edge={e}
              nodes={nodes}
              selected={e.id === selectedEdgeId}
              onClick={(id) => {
                selectEdge(id);
                setCardNode(null);
              }}
            />
          ))}
          {sim &&
            visibleNodes.map((n) => (
              <NodeView
                key={n.id}
                node={n}
                sim={sim}
                masked={mode === "practice" && !practiceRevealed.includes(n.id)}
                onClick={handleNodeClick}
                onDoubleClick={handleNodeDoubleClick}
              />
            ))}
        </g>
      </svg>

      {/* 关系气泡(F6) */}
      {selectedEdge && nodes[selectedEdge.from] && nodes[selectedEdge.to] && (
        <EdgeBubble
          edge={selectedEdge}
          anchor={toScreen(
            (nodes[selectedEdge.from].x + nodes[selectedEdge.to].x) / 2,
            (nodes[selectedEdge.from].y + nodes[selectedEdge.to].y) / 2,
          )}
          parentTitle={nodes[selectedEdge.from].title}
          childTitle={nodes[selectedEdge.to].title}
          masked={mode === "practice" && !practiceRevealed.includes(selectedEdge.to)}
        />
      )}

      {/* 焦点节点内容卡 */}
      {cardNode && (
        <NodeCard
          node={cardNode}
          anchor={toScreen(cardNode.x, cardNode.y)}
          masked={mode === "practice" && !practiceRevealed.includes(cardNode.id)}
        />
      )}
    </div>
  );
}
