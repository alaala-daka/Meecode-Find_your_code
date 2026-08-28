import { describe, expect, it } from "vitest";
import { clampWorldToViewport, ensureVisibleTransform, fitTransform, graphBBox, isBBoxVisible } from "./zoomFit";

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

describe("clampWorldToViewport 拖拽边界夹取", () => {
  const t = { x: 500, y: 300, k: 1 }; // 世界原点映射到屏幕 (500,300)

  it("视口内的点保持不变", () => {
    expect(clampWorldToViewport(0, 0, 30, t, 1000, 600, 20)).toEqual({ x: 0, y: 0 });
  });

  it("越界点被夹回边界(计节点屏幕半径与边距)", () => {
    const c = clampWorldToViewport(900, 0, 30, t, 1000, 600, 20);
    // 屏幕 x 夹到 1000-20-30=950 → 世界 x = 950-500 = 450
    expect(c.x).toBeCloseTo(450, 5);
    expect(c.y).toBeCloseTo(0, 5);
  });

  it("四边均被夹取,屏幕圆完整留在可视区内", () => {
    const c = clampWorldToViewport(-2000, 2000, 40, t, 1000, 600, 20);
    const sx = t.x + c.x * t.k;
    const sy = t.y + c.y * t.k;
    expect(sx).toBeCloseTo(20 + 40, 5); // 左边界 pad + r
    expect(sy).toBeCloseTo(600 - 20 - 40, 5); // 下边界 viewH - pad - r
  });

  it("缩放系数参与屏幕↔世界换算", () => {
    const t2 = { x: 0, y: 0, k: 0.5 };
    const c = clampWorldToViewport(3000, 0, 40, t2, 1000, 600, 20);
    // 屏幕半径 = 40*0.5 = 20;屏幕 x = 1500 > 1000-20-20=960 → 夹到 960 → 世界 960/0.5 = 1920
    expect(c.x).toBeCloseTo(1920, 5);
  });

  it("视口装不下节点(半径过大)时退回视口中心", () => {
    const c = clampWorldToViewport(0, 0, 500, t, 200, 200, 20);
    expect(c.x).toBeCloseTo((100 - 500) / 1, 5); // 屏幕中心 x=100 → 世界 (100-500)
    expect(c.y).toBeCloseTo((100 - 300) / 1, 5); // 屏幕中心 y=100 → 世界 (100-300)
  });
});

