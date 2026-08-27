"""应用配置:LLM 服务走 OpenAI 兼容接口,全部经环境变量覆盖。"""
from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.deepseek.com")
LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
LLM_MODEL: str = os.getenv("LLM_MODEL", "deepseek-chat")
LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.7"))

# 模拟模式:不调用真实 LLM,返回确定性演示数据(离线开发/联调前端用)
LLM_MOCK: bool = os.getenv("LLM_MOCK", "").lower() in ("1", "true", "yes")

TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")


def llm_configured() -> bool:
    return LLM_MOCK or (bool(LLM_API_KEY) and "在这里填入" not in LLM_API_KEY)
