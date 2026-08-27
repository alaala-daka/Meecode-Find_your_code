import { beforeEach, describe, expect, it } from "vitest";

// vitest 默认 node 环境无 localStorage/window,提供最小 polyfill 以验证 zustand persist。
// 使用动态 import 确保 polyfill 在 store 模块初始化前生效。
const storage: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  get length() { return Object.keys(storage).length; },
  key: (index: number) => {
    const keys = Object.keys(storage);
    return keys[index] ?? null;
  },
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    for (const key of Object.keys(storage)) {
      delete storage[key];
    }
  },
};
(globalThis as unknown as { window: unknown }).window = globalThis;

const { toLLMOverride, useSettingsStore } = await import("./settingsStore");

describe("settingsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      gen: { baseUrl: "", apiKey: "", model: "" },
      agent: { baseUrl: "", apiKey: "", model: "" },
      tavilyKey: "",
    });
  });

  it("toLLMOverride:全空 → undefined;部分填写 → 只带非空字段", () => {
    expect(toLLMOverride({ baseUrl: "", apiKey: "", model: "" })).toBeUndefined();
    expect(toLLMOverride({ baseUrl: "https://x.com", apiKey: "", model: "m" })).toEqual({
      base_url: "https://x.com",
      model: "m",
    });
  });

  it("setGen/setAgent/setTavilyKey 更新并持久化到 localStorage", () => {
    useSettingsStore.getState().setGen({ model: "deepseek-v4-flash" });
    useSettingsStore.getState().setAgent({ baseUrl: "https://agent.example.com" });
    useSettingsStore.getState().setTavilyKey("tvly-1");
    const raw = localStorage.getItem("meecode-explain-model-settings");
    expect(raw).toBeTruthy();
    const saved = JSON.parse(raw!).state;
    expect(saved.gen.model).toBe("deepseek-v4-flash");
    expect(saved.agent.baseUrl).toBe("https://agent.example.com");
    expect(saved.tavilyKey).toBe("tvly-1");
  });
});
