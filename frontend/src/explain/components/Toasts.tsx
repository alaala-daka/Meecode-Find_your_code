/** 全局 toast(底部居中,自动消失)。 */
import { useUiStore } from "../store/uiStore";

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return (
    <div className="toasts" role="alert">
      {toasts.map((t) => (
        <button key={t.id} className="toast" onClick={() => dismiss(t.id)}>
          {t.message}
        </button>
      ))}
    </div>
  );
}
