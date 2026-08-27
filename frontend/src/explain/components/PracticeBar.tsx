/** 练习模式顶条:进度 + 退出(F8)。 */
import { useGraphStore } from "../store/graphStore";
import { useSessionStore } from "../store/sessionStore";

export function PracticeBar() {
  const nodes = useGraphStore((s) => s.nodes);
  const revealed = useSessionStore((s) => s.practiceRevealed);
  const exitPractice = useSessionStore((s) => s.exitPractice);

  const total = Object.keys(nodes).length;

  return (
    <div className="practice-bar" role="status">
      <span className="practice-badge">练习模式</span>
      <span className="practice-progress">
        已揭晓 {revealed.length} / {total} 个节点 · 凭记忆复述,点击节点揭晓
      </span>
      <button className="practice-exit" onClick={exitPractice}>
        退出练习
      </button>
    </div>
  );
}
