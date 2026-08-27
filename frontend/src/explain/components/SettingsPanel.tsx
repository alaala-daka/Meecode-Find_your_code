/** 设置区(3.3):单次最多展开数 + 最高发散层数 + 自定义模型 + Tavily 密钥,修改即时生效。 */
import { useSessionStore } from "../store/sessionStore";
import { useSettingsStore, type ModelConfig } from "../store/settingsStore";
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
  const { gen, agent, tavilyKey, setGen, setAgent, setTavilyKey } = useSettingsStore();

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

      <div className="settings-divider" aria-hidden="true" />
      <p className="settings-section-title">自定义模型</p>
      <p className="settings-note">留空则使用服务器默认配置；填写后随每次请求生效。</p>
      {/* 安全备忘:密钥存于 localStorage 属 XSS 可读范围,且每次请求发往我们自己的后端——永远不要打进日志或 toast。 */}

      <ModelFields legend="节点生成模型" cfg={gen} onChange={setGen} idPrefix="gen" />
      <ModelFields legend="阅读器伴读模型" cfg={agent} onChange={setAgent} idPrefix="agent" />

      <div className="settings-row vertical">
        <label htmlFor="tavily-key">Tavily 搜索密钥(伴读联网用)</label>
        <input
          id="tavily-key"
          type="password"
          autoComplete="off"
          placeholder="tvly-…"
          value={tavilyKey}
          onChange={(e) => setTavilyKey(e.target.value)}
        />
      </div>

      <p className="settings-note">修改即时生效，作用于后续展开。</p>
    </div>
  );
}

function ModelFields({
  legend,
  cfg,
  onChange,
  idPrefix,
}: {
  legend: string;
  cfg: ModelConfig;
  onChange: (p: Partial<ModelConfig>) => void;
  idPrefix: string;
}) {
  return (
    <fieldset className="settings-fieldset">
      <legend>{legend}</legend>
      <div className="settings-row vertical">
        <label htmlFor={`${idPrefix}-base-url`}>Base URL</label>
        <input
          id={`${idPrefix}-base-url`}
          placeholder="https://api.deepseek.com"
          value={cfg.baseUrl}
          onChange={(e) => onChange({ baseUrl: e.target.value })}
        />
      </div>
      <div className="settings-row vertical">
        <label htmlFor={`${idPrefix}-api-key`}>API Key</label>
        <input
          id={`${idPrefix}-api-key`}
          type="password"
          autoComplete="off"
          placeholder="sk-…"
          value={cfg.apiKey}
          onChange={(e) => onChange({ apiKey: e.target.value })}
        />
      </div>
      <div className="settings-row vertical">
        <label htmlFor={`${idPrefix}-model`}>模型名</label>
        <input
          id={`${idPrefix}-model`}
          placeholder="deepseek-chat"
          value={cfg.model}
          onChange={(e) => onChange({ model: e.target.value })}
        />
      </div>
    </fieldset>
  );
}
