import { describe, expect, it } from "vitest";
import { computeThrowVelocity } from "./inertia";

describe("computeThrowVelocity", () => {
  it("快速甩动 → 非零初速度(方向与位移一致)", () => {
    const s = [
      { x: 0, y: 0, t: 0 },
      { x: 30, y: -40, t: 50 },
      { x: 60, y: -80, t: 100 }, // 100ms 内 (60,-80) → 0.6,-0.8 px/ms
    ];
    const v = computeThrowVelocity(s);
    expect(v.vx).toBeGreaterThan(0);
    expect(v.vy).toBeLessThan(0);
    expect(Math.hypot(v.vx, v.vy)).toBeGreaterThan(1); // px/tick
  });

  it("慢停(末段近静止)→ 近零速度,无猛然弹出", () => {
    const s = [
      { x: 0, y: 0, t: 0 },
      { x: 100, y: 0, t: 200 },
      { x: 100.5, y: 0, t: 290 },
      { x: 101, y: 0, t: 380 },
    ];
    const v = computeThrowVelocity(s);
    expect(Math.hypot(v.vx, v.vy)).toBeLessThan(0.5);
  });

  it("样本不足 → 零向量", () => {
    expect(computeThrowVelocity([])).toEqual({ vx: 0, vy: 0 });
    expect(computeThrowVelocity([{ x: 1, y: 2, t: 3 }])).toEqual({ vx: 0, vy: 0 });
  });

  it("疯狂甩动 → 封顶 30px/tick(防穿模)", () => {
    const s = [
      { x: 0, y: 0, t: 0 },
      { x: 5000, y: 0, t: 100 },
    ];
    const v = computeThrowVelocity(s);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(30, 5);
  });
});
