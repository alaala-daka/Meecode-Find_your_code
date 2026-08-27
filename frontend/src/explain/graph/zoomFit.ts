/** 画布让位:阅读器开合时,把图内容 zoom-fit 到剩余可视区(rAF 插值,不引 d3-transition)。 */
import { select } from "d3-selection";
import { zoomIdentity, zoomTransform, type ZoomBehavior } from "d3-zoom";

export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Transform {
  x: number;
  y: number;
  k: number;
}

export function graphBBox(nodes: { x: number; y: number; rShow: number }[]): BBox | null {
  if (nodes.length === 0) return null;
  return {
    x0: Math.min(...nodes.map((n) => n.x - n.rShow)),
    y0: Math.min(...nodes.map((n) => n.y - n.rShow)),
    x1: Math.max(...nodes.map((n) => n.x + n.rShow)),
    y1: Math.max(...nodes.map((n) => n.y + n.rShow)),
  };
}

/** d3 zoomFit 同式:内容 bbox 居中缩放进 viewW×viewH(留 pad 内边距);k 上限防小图过放 */
export function fitTransform(bbox: BBox, viewW: number, viewH: number, pad = 80): Transform {
  const w = Math.max(1, bbox.x1 - bbox.x0);
  const h = Math.max(1, bbox.y1 - bbox.y0);
  const k = Math.max(0.4, Math.min(1.15, Math.min((viewW - pad * 2) / w, (viewH - pad * 2) / h)));
  return {
    x: viewW / 2 - ((bbox.x0 + bbox.x1) / 2) * k,
    y: viewH / 2 - ((bbox.y0 + bbox.y1) / 2) * k,
    k,
  };
}

/** 判断 bbox 是否完整落在当前视口内(含 pad 边距) */
export function isBBoxVisible(
  bbox: BBox,
  viewW: number,
  viewH: number,
  t: Transform,
  pad = 80,
): boolean {
  const x0 = t.x + bbox.x0 * t.k;
  const y0 = t.y + bbox.y0 * t.k;
  const x1 = t.x + bbox.x1 * t.k;
  const y1 = t.y + bbox.y1 * t.k;
  return x0 >= pad && y0 >= pad && x1 <= viewW - pad && y1 <= viewH - pad;
}

/**
 * 确保某个区域可见:
 * - 已可见则保持当前 transform;
 * - 当前缩放级别可容纳时只做平移,保留用户缩放;
 * - 否则回退到 fitTransform,把区域完整缩放进视口。
 */
export function ensureVisibleTransform(
  bbox: BBox,
  viewW: number,
  viewH: number,
  current: Transform,
  pad = 80,
): Transform {
  if (isBBoxVisible(bbox, viewW, viewH, current, pad)) return current;

  const w = bbox.x1 - bbox.x0;
  const h = bbox.y1 - bbox.y0;
  const maxW = viewW - pad * 2;
  const maxH = viewH - pad * 2;
  const fitsAtCurrentK = w * current.k <= maxW && h * current.k <= maxH;

  if (fitsAtCurrentK) {
    return {
      k: current.k,
      x: viewW / 2 - ((bbox.x0 + bbox.x1) / 2) * current.k,
      y: viewH / 2 - ((bbox.y0 + bbox.y1) / 2) * current.k,
    };
  }

  return fitTransform(bbox, viewW, viewH, pad);
}


/** rAF 插值动画(easeOutCubic);返回取消函数——重触发/卸载时必须取消上一段 */
export function animateZoomTo(
  svg: SVGSVGElement,
  z: ZoomBehavior<SVGSVGElement, unknown>,
  target: Transform,
  duration = 340,
): () => void {
  const sel = select(svg);
  const start = zoomTransform(svg);
  const t0 = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / duration);
    const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
    sel.call(
      z.transform,
      zoomIdentity
        .translate(start.x + (target.x - start.x) * e, start.y + (target.y - start.y) * e)
        .scale(start.k + (target.k - start.k) * e),
    );
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
