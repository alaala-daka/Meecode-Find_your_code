/** 觅码仓库解读设置:自定义模型配置 persist 到 localStorage,随请求覆盖后端默认。
 * 三组配置:节点生成 / 阅读器伴读 Agent(各自独立)+ Tavily 搜索密钥。 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LLMOverrideDto } from "../api/client";

export interface ModelConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const EMPTY: ModelConfig = { baseUrl: "", apiKey: "", model: "" };

interface ModelSettingsState {
  gen: ModelConfig; // 节点生成(改写/展开/详细阐述)
  agent: ModelConfig; // 阅读器伴读 Agent
  tavilyKey: string; // Tavily 搜索密钥
  setGen: (p: Partial<ModelConfig>) => void;
  setAgent: (p: Partial<ModelConfig>) => void;
  setTavilyKey: (k: string) => void;
}

export const useSettingsStore = create<ModelSettingsState>()(
  persist(
    (set) => ({
      gen: EMPTY,
      agent: EMPTY,
      tavilyKey: "",
      setGen: (p) => set((s) => ({ gen: { ...s.gen, ...p } })),
      setAgent: (p) => set((s) => ({ agent: { ...s.agent, ...p } })),
      setTavilyKey: (k) => set({ tavilyKey: k }),
    }),
    {
      name: "meecode-explain-model-settings", // 觅码仓库解读设置
      version: 1, // 结构变更时便于迁移
      partialize: (s) => ({ gen: s.gen, agent: s.agent, tavilyKey: s.tavilyKey }), // 只持久化数据,不落函数
    },
  ),
);

/** 全空 → undefined(后端用 env 默认);部分填写 → 只带非空字段 */
export function toLLMOverride(cfg: ModelConfig): LLMOverrideDto | undefined {
  const out: LLMOverrideDto = {};
  if (cfg.baseUrl.trim()) out.base_url = cfg.baseUrl.trim();
  if (cfg.apiKey.trim()) out.api_key = cfg.apiKey.trim();
  if (cfg.model.trim()) out.model = cfg.model.trim();
  return Object.keys(out).length ? out : undefined;
}
