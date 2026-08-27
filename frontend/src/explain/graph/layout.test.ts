import { describe, expect, it } from "vitest";
import { allocateAngles, spawnChildPositions } from "./layout";
import type { GNode } from "../store/graphStore";

function node(id: string, over: Partial<GNode>): GNode {
  return {
    id, title: id, content: "", type: "concept", relevance: 1,
    depth: 0, createdAtMaxDepth: 0, parentId: null, childIds: [],
    expanded: false, expanding: false,
    x: 0, y: 0, vx: 0, vy: 0, rBase: 40, rShow: 40, spawnIndex: 0,
    ...over,
  };
}

describe("allocateAngles 近邻避让", () => {
  it("首个子节点不再朝向被近旁旧节点占据的方向", () => {
    // 父节点 p 是根(root 时首选方向为正上方 -π/2);
    // 在 p 的正上方 130px 处放一个旧节点 blocker
    const p = node("p", { x: 0, y: 0 });
    const blocker = node("blocker", { x: 0, y: -130 });
    const nodes = { p, blocker };
    const [angle] = allocateAngles(p, nodes, 1);
    const blocked = -Math.PI / 2;
    const diff = Math.abs(Math.atan2(Math.sin(angle - blocked), Math.cos(angle - blocked)));
    // blocker 角宽 φ ≈ asin((40+60)/130) ≈ 0.88 rad;出生角必须避开该扇区
    expect(diff).toBeGreaterThan(0.8);
  });

  it("无近邻时保持原行为:根的首子向正上方", () => {
    const p = node("p", { x: 0, y: 0 });
    const [angle] = allocateAngles(p, { p }, 1);
    expect(angle).toBeCloseTo(-Math.PI / 2, 5);
  });

  it("兄弟方向仍被避让(回归)", () => {
    const p = node("p", { x: 0, y: 0, childIds: ["s1"] });
    const s1 = node("s1", { x: 0, y: -140, parentId: "p" }); // 兄弟在正上方
    const nodes = { p, s1 };
    const [angle] = allocateAngles(p, nodes, 1);
    const diff = Math.abs(Math.atan2(Math.sin(angle + Math.PI / 2), Math.cos(angle + Math.PI / 2)));
    expect(diff).toBeGreaterThan(0.5);
  });
});

describe("spawnChildPositions 碰撞感知识别", () => {
  it("新出生节点不与近旁旧节点重叠", () => {
    const p = node("p", { x: 0, y: 0, rShow: 56, parentId: null });
    const blocker = node("blocker", { x: 0, y: -110, rShow: 30 });
    const [pos] = spawnChildPositions(p, { p, blocker }, [{ id: "c1", relevance: 0.8, rShow: 30 }]);
    const dist = Math.hypot(pos.x - blocker.x, pos.y - blocker.y);
    expect(dist).toBeGreaterThanOrEqual(30 + 30 + 18 - 0.001);
    // 也不能与父节点重叠
    const distP = Math.hypot(pos.x - p.x, pos.y - p.y);
    expect(distP).toBeGreaterThanOrEqual(56 + 30 + 18 - 0.001);
  });

  it("同批多个新节点互相不重叠", () => {
    const p = node("p", { x: 0, y: 0, rShow: 56, parentId: null });
    const positions = spawnChildPositions(
      p,
      { p },
      [
        { id: "c1", relevance: 0.9, rShow: 30 },
        { id: "c2", relevance: 0.7, rShow: 28 },
        { id: "c3", relevance: 0.5, rShow: 26 },
      ],
    );
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dist = Math.hypot(
          positions[i].x - positions[j].x,
          positions[i].y - positions[j].y,
        );
        const a = [30, 28, 26][i];
        const b = [30, 28, 26][j];
        expect(dist).toBeGreaterThanOrEqual(a + b + 18 - 0.001);
      }
    }
  });
});

