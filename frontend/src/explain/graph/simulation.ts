/** d3-force 定制模拟:弹性跟随 / 碰撞体积 / 拖拽惯性 / 层级布局。 */
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
} from "d3-force";
import type { GEdge, GNode } from "../store/graphStore";
import { linkDistance } from "./layout";

type SimNode = GNode; // GNode 自带 x/y/vx/y,d3 直接改写
type SimLink = SimulationLinkDatum<SimNode> & { id: string };

/** 节点间最小碰撞余量:防止穿透,同时避免把连线撑得过长 */
export const NODE_COLLISION_PADDING = 12;

export class GraphSimulation {
  private sim: Simulation<SimNode, SimLink>;
  private nodes: SimNode[] = [];
  private links: SimLink[] = [];

  constructor(private onTick: () => void) {
    this.sim = forceSimulation<SimNode, SimLink>([])
      .alphaDecay(0.02)
      .velocityDecay(0.35) // 惯性:拖拽释放后滑行
      .force(
        "link",
        forceLink<SimNode, SimLink>([])
          .id((n) => n.id)
          // 目标距离 = 两半径 + 相关度间隙 → 相关度高更靠近父节点(4.2)
          .distance((l) => {
            const s = l.source as SimNode;
            const t = l.target as SimNode;
            return linkDistance(s.rShow, t.rShow, t.relevance);
          })
          .strength(0.9), // 弹性跟随:拖动时相连节点经弹簧加速跟随(A6)
      )
      .force("charge", forceManyBody().strength(-28).distanceMax(320))
      // 碰撞体积:拖动与自动布局均不穿透(A6)
      .force("collide", forceCollide<SimNode>((n) => n.rShow + NODE_COLLISION_PADDING).strength(0.9).iterations(3))
      .force("x", forceX(0).strength(0.03))
      .force("y", forceY(0).strength(0.03))
      .on("tick", () => this.onTick());
  }

  /** 同步图结构(仅纳入可见节点)。 */
  setGraph(nodes: GNode[], edges: GEdge[]) {
    const visible = new Map(nodes.map((n) => [n.id, n]));
    this.nodes = nodes;
    this.links = edges
      .filter((e) => visible.has(e.from) && visible.has(e.to))
      .map((e) => ({ id: e.id, source: e.from, target: e.to }));
    this.sim.nodes(this.nodes);
    this.sim.force("link", forceLink<SimNode, SimLink>(this.links)
      .id((n) => n.id)
      .distance((l) => {
        const s = l.source as SimNode;
        const t = l.target as SimNode;
        return linkDistance(s.rShow, t.rShow, t.relevance);
      })
      .strength(0.9));
    this.reheat(0.5);
  }

  reheat(alpha = 0.3) {
    this.sim.alpha(alpha).restart();
  }

  /** 拖拽期间持续保持模拟热度,跟随才有"加速度过程"。 */
  holdWarm() {
    this.sim.alphaTarget(0.3);
  }

  releaseWarm() {
    this.sim.alphaTarget(0);
  }

  stop() {
    this.sim.stop();
  }
}
