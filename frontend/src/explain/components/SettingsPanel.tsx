/** 设置区(3.3):单次最多展开数 + 最高发散层数,修改即时生效。 */
import { useSessionStore } from "../store/sessionStore";
import { useUiStore } from "../store/uiStore";

const DEPTH_OPTIONS: { label: string; value: number | null }[] = [
  { label: "不限", value: null },
  ...Array.from({ length: 8 }, (_, i) => ({ label: `${i + 1} 层`, value: i + 1 })),
];

export function SettingsPanel() {
  const settings = useSessionStore((s) => s.settings);
  const setSettings = useSessionStore((s) => s.setSettings);
  const open = useUiStore((s) => s.settingsOpen);
  const setOpen = useUiStore((s) => s.setSettingsOpen);

  if (!open) return null;

  return (
    <div className="settings-panel" role="dialog" aria-label="设置区">
      <header>
        <h3>设置</h3>
        <button className="bubble-close" onClick={() => setOpen(false)} aria-label="关闭设置">
          ×
        </button>
      </header>

      <div className="settings-row">
        <label id="label-max-children">单次最多展开</label>
        <div className="stepper" role="group" aria-labelledby="label-max-children">
          <button
            onClick={() => setSettings({ maxChildren: Math.max(2, settings.maxChildren - 1) })}
            disabled={settings.maxChildren <= 2}
            aria-label="减少"
          >
            −
          </button>
          <span>{settings.maxChildren}</span>
          <button
            onClick={() => setSettings({ maxChildren: Math.min(6, settings.maxChildren + 1) })}
            disabled={settings.maxChildren >= 6}
            aria-label="增加"
          >
            +
          </button>
        </div>
      </div>

      <div className="settings-row">
        <label htmlFor="max-depth-select">最高发散层数</label>
        <select
          id="max-depth-select"
          value={settings.maxDepth === null ? "null" : String(settings.maxDepth)}
          onChange={(e) =>
            setSettings({ maxDepth: e.target.value === "null" ? null : Number(e.target.value) })
          }
        >
          {DEPTH_OPTIONS.map((o) => (
            <option key={o.label} value={o.value === null ? "null" : String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <p className="settings-note">修改即时生效，作用于后续展开。</p>
    </div>
  );
}
