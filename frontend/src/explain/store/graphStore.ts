/** 图数据 + 物理量存储。
 *
 * 节点对象在 store 中保持引用稳定:d3-force 每帧直接改写 x/y/vx/vy,
 * React 侧以 tick(每帧)/ structureVersion(结构变化)两个计数器驱动重渲染。
 * 这是 d3 可变对象与 React 不可变范式共存的标准做法,避免模拟持有过期引用。
 */
import { create } from "zustand";
import type { EdgePayload, NodePayload } from "../../explain/api/client";
import { childBaseRadius, computeDisplayRadii, R_SOURCE } from "../graph/sizing";
import { spawnChildPositions } from "../graph/layout";

export type NodeType = "concept" | "category" | "dimension";

export interface GNode {
  id: string;
  title: string;
  content: string;
  type: NodeType;
  relevance: number; // 与父节点的相关度 0-1(根=1)
  depth: number; // 距根层数(根=0)
  createdAtMaxDepth: number; // 创建时全局最深展开层(层级衰减依据)
  parentId: string | null;
  childIds: string[];
  expanded: boolean; // 是否已成功展开过
  expanding: boolean; // 正在请求后端
  // d3-force 物理量(由 simulation 直接改写)
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null; // 拖拽固定
  fy?: number | null;
  // 尺寸
  rBase: number; // 基础半径(相关度决定)
  rShow: number; // 当前显示半径(衰减/焦点后,渲染与碰撞共用)
  spawnIndex: number; // 出生批次内序号(交错弹出动画)
  detail?: string; // 详细展开后的 markdown 阐述(改进点 1)
  detailing?: boolean; // 正在请求详细阐述
}

export interface GEdge {
  id: string;
  from: string; // 父
  to: string; // 子
  forward: string;
  backward: string;
}

interface GraphState {
  nodes: Record<string, GNode>;
  edges: Record<string, GEdge>;
  rootId: string | null;
  focusId: string | null;
  maxExpandedDepth: number;
  /** 每帧 +1,驱动 React 重渲染画布 */
  tick: number;
  /** 结构性变化(增删节点/边、焦点/半径变化)时 +1,驱动物理重组 */
  structureVersion: number;

  setRoot: (p: NodePayload) => void;
  addChildren: (parentId: string, children: NodePayload[], edges: EdgePayload[]) => void;
  setExpanding: (id: string, v: boolean) => void;
  setDetailing: (id: string, v: boolean) => void;
  setDetail: (id: string, text: string) => void;
  setFocus: (id: string | null) => void;
  bumpTick: () => void;
  bumpStructure: () => void;
  recalcRadii: () => void;
  reset: () => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: {},
  edges: {},
  rootId: null,
  focusId: null,
  maxExpandedDepth: 0,
  tick: 0,
  structureVersion: 0,

  setRoot: (p) =>
    set((s) => {
      const node: GNode = {
        id: p.id,
        title: p.title,
        content: p.content,
        type: p.node_type,
        relevance: 1,
        depth: 0,
        createdAtMaxDepth: 0,
        parentId: null,
        childIds: [],
        expanded: false,
        expanding: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        rBase: R_SOURCE,
        rShow: R_SOURCE,
        spawnIndex: 0,
      };
      return {
        nodes: { [node.id]: node },
        edges: {},
        rootId: node.id,
        focusId: node.id,
        maxExpandedDepth: 0,
        structureVersion: s.structureVersion + 1,
      };
    }),

  addChildren: (parentId, children, edgePayloads) => {
    const s = get();
    const parent = s.nodes[parentId];
    if (!parent) return;

    const newDepth = parent.depth + 1;
    const relevances = children.map((c) => c.relevance);
    // 出生角度:避开已有兄弟方向、沿父节点 outward 方向生长(减少边交叉)
    // 出生坐标在半径计算后统一做碰撞感知放置

    children.forEach((c, i) => {
      const rBase = childBaseRadius(parent.rBase, c.relevance, relevances, i);
      
      s.nodes[c.id] = {
        id: c.id,
        title: c.title,
        content: c.content,
        type: c.node_type,
        relevance: c.relevance,
        depth: newDepth,
        createdAtMaxDepth: s.maxExpandedDepth,
        parentId,
        childIds: [],
        expanded: false,
        expanding: false,
        x: parent.x,
        y: parent.y,
        vx: 0,
        vy: 0,
        rBase,
        rShow: 0.01,
        spawnIndex: i,
      };
    });

    edgePayloads.forEach((e) => {
      s.edges[e.id] = {
        id: e.id,
        from: e.parent_id,
        to: e.child_id,
        forward: e.forward,
        backward: e.backward,
      };
    });

    parent.expanded = true;
    parent.expanding = false;
    parent.childIds = [...parent.childIds, ...children.map((c) => c.id)];

    set({
      maxExpandedDepth: Math.max(s.maxExpandedDepth, newDepth),
      focusId: parentId, // 点击展开的节点成为当前焦点(放大至源节点大小)
    });
    get().recalcRadii();

      // 出生落位:基于最终显示半径做碰撞感知放置,避免首帧重叠
      const fresh = get();
      const childSpecs = children.map((c) => ({
        id: c.id,
        relevance: c.relevance,
        rShow: fresh.nodes[c.id]?.rShow ?? 0.01,
      }));
      const positions = spawnChildPositions(parent, fresh.nodes, childSpecs);
      positions.forEach((p, i) => {
        const n = fresh.nodes[children[i].id];
        if (n) {
          n.x = p.x;
          n.y = p.y;
          n.vx = 0;
          n.vy = 0;
        }
      });
      set((st) => ({ structureVersion: st.structureVersion + 1 }));
  },

  setExpanding: (id, v) => {
    const n = get().nodes[id];
    if (!n) return;
    n.expanding = v;
    set((s) => ({ structureVersion: s.structureVersion + 1 }));
  },

  setDetailing: (id, v) => {
    const n = get().nodes[id];
    if (!n) return;
    n.detailing = v;
    set((s) => ({ structureVersion: s.structureVersion + 1 }));
  },

  setDetail: (id, text) => {
    const n = get().nodes[id];
    if (!n) return;
    n.detail = text;
    n.detailing = false;
    set((s) => ({ structureVersion: s.structureVersion + 1 }));
  },

  setFocus: (id) => {
    set({ focusId: id });
    get().recalcRadii();
  },

  recalcRadii: () => {
    const s = get();
    computeDisplayRadii(s); // 就地改写 rShow,保持对象引用
    set({ structureVersion: s.structureVersion + 1 });
  },

  bumpTick: () => set((s) => ({ tick: s.tick + 1 })),
  bumpStructure: () => set((s) => ({ structureVersion: s.structureVersion + 1 })),

  reset: () =>
    set((s) => ({
      nodes: {},
      edges: {},
      rootId: null,
      focusId: null,
      maxExpandedDepth: 0,
      structureVersion: s.structureVersion + 1,
    })),
}));

/** 从根到某节点的标题路径(供后端"推断层"上下文) */
export function pathTitles(nodes: Record<string, GNode>, nodeId: string): string[] {
  const path: string[] = [];
  let cur: GNode | undefined = nodes[nodeId];
  while (cur) {
    path.unshift(cur.title);
    cur = cur.parentId ? nodes[cur.parentId] : undefined;
  }
  return path;
}
