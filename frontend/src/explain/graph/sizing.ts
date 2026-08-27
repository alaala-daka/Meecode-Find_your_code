/** 尺寸体系:源节点半径、相关度分级、层级衰减。常量集中可调(构思文档开放问题3)。 */
import type { GNode } from "../store/graphStore";

export const R_SOURCE = 56; // 源节点(中心节点)半径 px
export const DECAY = 0.9; // 层级衰减系数
export const CHILD_MIN = 0.58; // 子节点相对父节点的最小比例
export const CHILD_SPAN = 0.22; // 相关度分级跨度(最高相关 = MIN+SPAN = 0.80)
export const FOCUS_NEIGHBOR_MIN = 0.56; // 焦点直连节点保底下限(rel=0 → 31.4px,>22 文字阈值)
export const FOCUS_NEIGHBOR_SPAN = 0.24; // 相关度加成(rel=1 → 44.8px,仅次于焦点 56)

interface RadiusCtx {
  nodes: Record<string, GNode>;
  rootId: string | null;
  focusId: string | null;
  maxExpandedDepth: number;
}

/**
 * 子节点基础半径:相对父节点按比例缩小,同批内相关度越高越大(线性映射)。
 * rank 信息已由 relevances 提供,此处对相关性做 0-1 归一。
 */
export function childBaseRadius(
  parentRBase: number,
  relevance: number,
  siblingRelevances: number[],
  _index: number,
): number {
  const max = Math.max(...siblingRelevances);
  const min = Math.min(...siblingRelevances);
  const norm = max > min ? (relevance - min) / (max - min) : 1;
  return parentRBase * (CHILD_MIN + CHILD_SPAN * norm);
}

/**
 * 重算全部节点显示半径(就地改写 rShow,保持对象引用稳定):
 * - 焦点节点 → 源节点大小;
 * - 已展开节点 → 基础半径;
 * - 未展开节点 → 基础半径 × DECAY^(当前最深展开层 − 创建时最深展开层);
 * - clamp:未展开子节点 ≤ 父节点显示半径 × 0.92(保证 A7)。
 */
export function computeDisplayRadii(ctx: RadiusCtx): void {
  const byDepth = Object.values(ctx.nodes).sort((a, b) => a.depth - b.depth);

  for (const n of byDepth) {
    let r: number;
    if (n.id === ctx.focusId) {
      r = R_SOURCE;
    } else if (n.id === ctx.rootId) {
      // 源节点不是当前焦点时,按层级衰减回落,不再保持源节点大小
      const delta = Math.max(0, ctx.maxExpandedDepth - n.createdAtMaxDepth);
      r = n.rBase * Math.pow(DECAY, delta);
    } else if (n.expanded) {
      r = n.rBase;
    } else {
      const delta = Math.max(0, ctx.maxExpandedDepth - n.createdAtMaxDepth);
      r = n.rBase * Math.pow(DECAY, delta);
      const parent = n.parentId ? ctx.nodes[n.parentId] : undefined;
      if (parent) r = Math.min(r, parent.rShow * 0.92);
    }
    // 焦点邻接保底:与焦点直接相连(父/子)的节点,尺寸按相关度缩放、仅次于焦点;源节点豁免
    const focus = ctx.focusId ? ctx.nodes[ctx.focusId] : undefined;
    if (focus && n.id !== ctx.focusId && n.id !== ctx.rootId) {
      if (n.parentId === ctx.focusId || focus.parentId === n.id) {
        r = Math.max(r, R_SOURCE * (FOCUS_NEIGHBOR_MIN + FOCUS_NEIGHBOR_SPAN * n.relevance));
      }
    }
    n.rShow = r;
  }
}
