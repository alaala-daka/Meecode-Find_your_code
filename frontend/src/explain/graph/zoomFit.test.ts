import { describe, expect, it } from "vitest";
import { ensureVisibleTransform, fitTransform, graphBBox, isBBoxVisible } from "./zoomFit";

describe("fitTransform", () => {
  const bbox = { x0: -100, y0: -50, x1: 300, y1: 150 }; // 400×200,中心 (100,50)

  it("图内容中心映射到可视区中心(阅读器打开后可视区收窄)", () => {
    const t = fitTransform(bbox, 1024 - 420, 768, 80);
    // 映射后 bbox 中心应在可视区中心
    expect(t.x + 100 * t.k).toBeCloseTo((1024 - 420) / 2, 5);
    expect(t.y + 50 * t.k).toBeCloseTo(768 / 2, 5);
  });

  it("k 夹取在 [0.4, 1.15]", () => {
    expect(fitTransform({ x0: -5000, y0: -5000, x1: 5000, y1: 5000 }, 604, 768, 80).k).toBe(0.4);
    expect(fitTransform({ x0: -1, y0: -1, x1: 1, y1: 1 }, 604, 768, 80).k).toBe(1.15);
  });

  it("graphBBox:空图 → null;含半径余量", () => {
    expect(graphBBox([])).toBeNull();
    const b = graphBBox([{ x: 10, y: 20, rShow: 30 }])!;
    expect(b).toEqual({ x0: -20, y0: -10, x1: 40, y1: 50 });
  });
});

describe("ensureVisibleTransform", () => {
  const bbox = { x0: 100, y0: 100, x1: 140, y1: 140 };
  const view = { w: 1024, h: 768 };

  it("已可见时保持当前 transform", () => {
    const current = { x: 0, y: 0, k: 1 };
    expect(ensureVisibleTransform(bbox, view.w, view.h, current, 80)).toBe(current);
  });

  it("视口外时优先平移并保留缩放", () => {
    const current = { x: -200, y: -200, k: 1 };
    const t = ensureVisibleTransform(bbox, view.w, view.h, current, 80);
    expect(t.k).toBe(current.k);
    // bbox 中心 (120,120) 应移动到视口中心附近
    expect(t.x + 120 * t.k).toBeCloseTo(view.w / 2, 1);
    expect(t.y + 120 * t.k).toBeCloseTo(view.h / 2, 1);
  });

  it("当前缩放装不下时回退 fitTransform", () => {
    const current = { x: 0, y: 0, k: 1 };
    
    const t = ensureVisibleTransform(bbox, view.w, view.h, current, 80);
    expect(t.k).toBeLessThan(5);
  });

  it("isBBoxVisible 能判断节点是否在视口内", () => {
    const inside = { x: 0, y: 0, k: 1 };
    expect(isBBoxVisible(bbox, view.w, view.h, inside, 80)).toBe(true);
    const outside = { x: -1000, y: -1000, k: 1 };
    expect(isBBoxVisible(bbox, view.w, view.h, outside, 80)).toBe(false);
  });
});

