import { describe, expect, it } from "vitest";
import {
  computeDisplayRadii,
  FOCUS_NEIGHBOR_MIN,
  FOCUS_NEIGHBOR_SPAN,
  R_SOURCE,
} from "./sizing";
import type { GNode } from "../store/graphStore";

function node(id: string, over: Partial<GNode>): GNode {
  return {
    id, title: id, content: "", type: "concept", relevance: 1,
    depth: 0, createdAtMaxDepth: 0, parentId: null, childIds: [],
    expanded: false, expanding: false,
    x: 0, y: 0, vx: 0, vy: 0, rBase: 30, rShow: 30, spawnIndex: 0,
    ...over,
  };
}

const boost = (rel: number) => R_SOURCE * (FOCUS_NEIGHBOR_MIN + FOCUS_NEIGHBOR_SPAN * rel);

describe("焦点邻接保底尺寸", () => {
  it("焦点=56;焦点子节点按相关度保底且保持大小排序(A2)", () => {
    // root(焦点) → hi(rel 0.95) / lo(rel 0.4),均未展开
    const root = node("root", { rBase: R_SOURCE, childIds: ["hi", "lo"], expanded: true });
    const hi = node("hi", { parentId: "root", depth: 1, relevance: 0.95, rBase: 40 });
    const lo = node("lo", { parentId: "root", depth: 1, relevance: 0.4, rBase: 28 });
    const ctx = { nodes: { root, hi, lo }, rootId: "root", focusId: "root", maxExpandedDepth: 1 };
    computeDisplayRadii(ctx as never);
    expect(root.rShow).toBe(R_SOURCE);
    expect(hi.rShow).toBeCloseTo(boost(0.95), 5); // 44.8
    expect(lo.rShow).toBeCloseTo(boost(0.4), 5); // 37.4
    expect(hi.rShow).toBeGreaterThan(lo.rShow); // 相关度排序不丢
    expect(lo.rShow).toBeGreaterThan(22); // 高于文字显示阈值
  });

  it("深层焦点:父与子都保底,更远的祖先不保底,根永不保底", () => {
    // root → a → b(焦点) → c
    const root = node("root", { rBase: R_SOURCE, childIds: ["a"], expanded: true });
    const a = node("a", { parentId: "root", childIds: ["b"], expanded: true, depth: 1, rBase: 40, relevance: 0.8 });
    const b = node("b", { parentId: "a", childIds: ["c"], expanded: true, depth: 2, rBase: 34, relevance: 0.9 });
    const c = node("c", { parentId: "b", depth: 3, createdAtMaxDepth: 2, rBase: 22, relevance: 0.6 });
    const ctx = { nodes: { root, a, b, c }, rootId: "root", focusId: "b", maxExpandedDepth: 3 };
    computeDisplayRadii(ctx as never);
    expect(b.rShow).toBe(R_SOURCE); // 焦点
    expect(a.rShow).toBeCloseTo(boost(0.8), 5); // 父被保底
    expect(c.rShow).toBeCloseTo(boost(0.6), 5); // 子被保底
    expect(root.rShow).toBeLessThan(boost(1)); // 根豁免(走原衰减规则:rBase×0.9^3=40.9)
  });

  it("焦点移开后,邻接节点回落常规规则", () => {
    const root = node("root", { rBase: R_SOURCE, childIds: ["a", "c"], expanded: true });
    const a = node("a", { parentId: "root", childIds: ["b"], expanded: true, depth: 1, rBase: 40 });
    const b = node("b", { parentId: "a", depth: 2, createdAtMaxDepth: 1, rBase: 24 });
    const c = node("c", { parentId: "root", depth: 1, createdAtMaxDepth: 0, rBase: 40 });
    const ctx = { nodes: { root, a, b, c }, rootId: "root", focusId: "c", maxExpandedDepth: 2 };
    computeDisplayRadii(ctx as never);
    expect(b.rShow).toBeCloseTo(24 * 0.9, 5); // 回到衰减规则,无保底
  });
});
