/** 子节点初始布局:绕父节点分配角度,避开已有兄弟方向与近旁旧节点的遮挡扇区。 */
import type { GNode } from "../store/graphStore";

interface Block {
  theta: number;
  phi: number; // 遮挡半角
}

/**
 * 为新子节点分配绕父节点的初始角度。
 * 策略:收集父节点已有子节点 + 320px 内近邻节点的方向(点方向用于划分空隙,
 * 扇区用于否决候选),把新节点依次放入「不被遮挡的最大角度空隙」中央,
 * 首个节点偏好父节点"背向"其自身父节点的方向(向外生长,减少回折交叉)。
 */
export function allocateAngles(parent: GNode, nodes: Record<string, GNode>, count: number): number[] {
  if (count <= 0) return [];

  const occupied: number[] = []; // 点方向:兄弟 + 近邻中心
  const blocks: Block[] = []; // 扇区:候选中点不得落入
  for (const m of Object.values(nodes)) {
    if (m.id === parent.id) continue;
    const dx = m.x - parent.x;
    const dy = m.y - parent.y;
    const dist = Math.hypot(dx, dy);
    if (!Number.isFinite(dist) || dist < 30) continue; // 退化:几乎同心
    const isSibling = m.parentId === parent.id;
    if (!isSibling && dist > 320) continue; // 远处节点由力场自行消化
    const theta = Math.atan2(dy, dx);
    occupied.push(theta);
    blocks.push({ theta, phi: Math.asin(Math.min(0.95, (m.rShow + 60) / dist)) });
  }

  // 首个子节点的首选方向:父节点相对其父节点的 outward 方向;父是根则取 -90°(向上)
  const grand = parent.parentId ? nodes[parent.parentId] : undefined;
  const base =
    grand && (parent.x !== grand.x || parent.y !== grand.y)
      ? Math.atan2(parent.y - grand.y, parent.x - grand.x)
      : -Math.PI / 2;

  const isBlocked = (angle: number) =>
    blocks.some((b) => Math.abs(normalize(angle - b.theta)) < b.phi);

  const angles: number[] = [];
  for (let i = 0; i < count; i++) {
    const taken = [...occupied, ...angles].sort((a, b) => a - b);
    // 候选 = 各空隙中点;taken 为空时整圆视为一个空隙,首选 base、对径兜底
    const candidates: { score: number; mid: number }[] = [];
    if (taken.length === 0) {
      candidates.push({ score: 1, mid: base });
      candidates.push({ score: 0.5, mid: normalize(base + Math.PI) });
    } else {
      for (let k = 0; k < taken.length; k++) {
        const a = taken[k];
        const b = taken[(k + 1) % taken.length] + (k === taken.length - 1 ? Math.PI * 2 : 0);
        const gap = b - a;
        const mid = a + gap / 2;
        // 空隙打分:越大越好,同时偏好靠近 outward 方向
        const norm = normalize(mid - base);
        candidates.push({ score: gap - Math.abs(norm) * 0.35, mid: normalize(mid) });
      }
    }
    candidates.sort((x, y) => y.score - x.score);
    // 取不被遮挡的最高分候选;全被挡时退回最高分(力场再消化)
    const pick = candidates.find((c) => !isBlocked(c.mid)) ?? candidates[0];
    angles.push(pick.mid);
  }
  return angles;
}

/** 出生落位时节点间的最小空隙(在视觉半径之外额外保留) */
export const SPAWN_COLLISION_MARGIN = 18;

export interface SpawnChildSpec {
  id: string;
  relevance: number;
  rShow: number;
}

/**
 * 为一批新子节点计算出生坐标。
 * 先沿用 allocateAngles 的角度偏好,再逐个做笛卡尔碰撞检测;
 * 若默认距离/角度与已存在节点或已落位兄弟冲突,则小幅偏移角度、
 * 向外扩展距离,直到找到无碰撞位置。避免“刚生成时重叠,点击其他节点后才恢复”。
 */
export function spawnChildPositions(
  parent: GNode,
  nodes: Record<string, GNode>,
  children: SpawnChildSpec[],
): { x: number; y: number }[] {
  if (children.length === 0) return [];

  const angles = allocateAngles(parent, nodes, children.length);
  const newIds = new Set(children.map((c) => c.id));
  const placed: { x: number; y: number; rShow: number }[] = [];
  const positions: { x: number; y: number }[] = [];

  const ANGLE_OFFSETS = [0, 0.12, -0.12, 0.24, -0.24, 0.4, -0.4, 0.6, -0.6, 0.85, -0.85, 1.15, -1.15, 1.5, -1.5];
  const RADIUS_STEP = 12;
  const MAX_RADIUS_STEPS = 8;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const baseDist = linkDistance(parent.rShow, child.rShow, child.relevance);
    let picked: { x: number; y: number } | null = null;

    outer: for (let step = 0; step <= MAX_RADIUS_STEPS; step++) {
      const dist = baseDist + step * RADIUS_STEP;
      for (const offset of ANGLE_OFFSETS) {
        const angle = angles[i] + offset;
        const x = parent.x + Math.cos(angle) * dist;
        const y = parent.y + Math.sin(angle) * dist;
        if (!collidesWithNodes(x, y, child.rShow, parent, nodes, newIds, placed)) {
          picked = { x, y };
          break outer;
        }
      }
    }

    if (!picked) {
      // 极端密集时退回基础位置,交给物理引擎继续消化
      const angle = angles[i];
      picked = {
        x: parent.x + Math.cos(angle) * baseDist,
        y: parent.y + Math.sin(angle) * baseDist,
      };
    }

    positions.push(picked);
    placed.push({ x: picked.x, y: picked.y, rShow: child.rShow });
  }

  return positions;
}

function collidesWithNodes(
  x: number,
  y: number,
  r: number,
  parent: GNode,
  nodes: Record<string, GNode>,
  newIds: Set<string>,
  placed: { x: number; y: number; rShow: number }[],
): boolean {
  const minDist = (otherR: number) => r + otherR + SPAWN_COLLISION_MARGIN;

  // 与父节点不重叠
  if (Math.hypot(x - parent.x, y - parent.y) < minDist(parent.rShow)) return true;

  for (const m of Object.values(nodes)) {
    if (m.id === parent.id || newIds.has(m.id)) continue;
    if (Math.hypot(x - m.x, y - m.y) < minDist(m.rShow)) return true;
  }

  for (const p of placed) {
    if (Math.hypot(x - p.x, y - p.y) < minDist(p.rShow)) return true;
  }

  return false;
}

/** 父子间目标距离:两半径之和 + 随相关度收窄的间隙(相关度高更靠近父节点,4.2)。 */
export function linkDistance(parentR: number, childR: number, relevance: number): number {
  const gap = 46 - relevance * 22; // 46px(低相关) → 24px(高相关)
  return parentR + childR + gap;
}

function normalize(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
