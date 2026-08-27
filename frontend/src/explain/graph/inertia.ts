/** 拖拽松手初速度:取末尾 ~120ms 的指针位移估算速度,换算为 d3 的 px/tick。
 * 注意:d3-force 在 fx/fy 固定期间每 tick 会把 vx/vy 清零,
 * 所以松手速度只能来自指针采样(本模块),读模拟速度恒为 0。
 * 慢停时窗口内位移近零 → 自然无滑动(减速效果由 velocityDecay 0.35 完成)。 */

export interface DragSample {
  x: number;
  y: number;
  t: number; // performance.now() ms
}

const WINDOW_MS = 120; // 只用末尾 120ms 估算"松手瞬间"速度
const TICK_MS = 1000 / 60; // d3 每 tick ≈ 16.7ms
const THROW = 0.4; // 甩出增益(0.3-0.5 手感区间)
const MIN_WINDOW_MS = 40; // 窗口太短不可信
const MIN_SPEED = 1.5; // px/tick;低于此视为"停住后松手",不滑动
const MAX_SPEED = 30; // px/tick;封顶防穿模(collide 追不上单 tick 超过半径的位移)

export function computeThrowVelocity(samples: DragSample[]): { vx: number; vy: number } {
  if (samples.length < 2) return { vx: 0, vy: 0 };
  const last = samples[samples.length - 1];
  // 从尾部向前找最早一个仍在窗口内的样本
  let first = samples[0];
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t > WINDOW_MS) break;
    first = samples[i];
  }
  const dt = last.t - first.t;
  if (dt < MIN_WINDOW_MS) return { vx: 0, vy: 0 };
  let vx = ((last.x - first.x) / dt) * TICK_MS * THROW;
  let vy = ((last.y - first.y) / dt) * TICK_MS * THROW;
  const speed = Math.hypot(vx, vy);
  if (speed < MIN_SPEED) return { vx: 0, vy: 0 };
  if (speed > MAX_SPEED) {
    const s = MAX_SPEED / speed;
    vx *= s;
    vy *= s;
  }
  return { vx, vy };
}
