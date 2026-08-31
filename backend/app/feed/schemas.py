"""Pydantic 模型：LLM 结构化输出 + API 出入参。"""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class ScreeningResult(BaseModel):
    """LLM 精筛输出。quality 1..5，由 screening 层夹紧。"""
    is_real_project: bool
    category: str = "其他"
    tagline_zh: str = ""
    why_zh: str = ""
    quality: int = Field(default=3)


class DraftResult(BaseModel):
    """「AI 帮我写」草稿：卖点 + 介绍。"""
    tagline_zh: str = ""
    intro_zh: str = ""


class UserOut(BaseModel):
    id: int
    login: str
    avatar_url: str = ""
    bio: str = ""


class RepoCard(BaseModel):
    """卡片流单项。前端据 language/topics 渲染 SVG 封面，cover_url 非空则优先。"""
    id: int
    full_name: str
    owner_login: str
    language: str = ""
    topics: list[str] = Field(default_factory=list)
    stars: int = 0
    tagline_zh: str = ""
    category: str = "其他"
    cover_url: str = ""
    source: str
    published_at: int = 0


class RepoCardOut(BaseModel):
    """对齐前端 RepoCardData:见 spec 第 4 节映射表。"""
    id: int
    full_name: str
    title: str
    owner_login: str
    language: str | None = None
    topics: list[str] = Field(default_factory=list)
    stars: int = 0
    views: int = 0
    likes: int = 0
    source: str
    category: str = "其他"
    tagline_zh: str = ""
    published_at: str = ""     # ISO 8601
    cover_url: str | None = None


class FeedOut(BaseModel):
    cards: list[RepoCardOut]
    has_more: bool


class SearchOut(FeedOut):
    total: int


class RepoDetail(BaseModel):
    id: int
    github_id: int
    full_name: str
    owner_login: str
    language: str = ""
    topics: list[str] = Field(default_factory=list)
    stars: int = 0
    license: str = ""
    readme_md: str = ""
    tagline_zh: str = ""
    intro_zh: str = ""
    category: str = "其他"
    cover_url: str = ""
    source: str
    status: str
    default_branch: str = "main"
    published_at: int = 0
    github_url: str
    claimed: bool = False
    liked: bool = False
    favorited: bool = False
    # giscus 评论区元数据；空字符串表示仓库未启用 Discussions 或获取失败
    giscus_repo_id: str = ""
    giscus_category: str = ""
    giscus_category_id: str = ""


class TreeEntry(BaseModel):
    path: str
    type: str
    size: int = 0


class TreeOut(BaseModel):
    entries: list[TreeEntry]
    error: str = ""


class FileOut(BaseModel):
    path: str
    content: str = ""
    github_url: str
    error: str = ""


class MyRepoOut(BaseModel):
    """投稿页可勾选的自有仓库。submitted_id 非空表示已在觅码。"""
    github_id: int
    full_name: str
    language: str = ""
    stars: int = 0
    submitted_id: int | None = None
    status: str = ""


class SubmitIn(BaseModel):
    github_id: int
    tagline_zh: str = Field(max_length=60)
    intro_zh: str = ""
    category: str = "其他"
    cover_url: str = ""

    @field_validator("cover_url")
    @classmethod
    def _check_cover_url(cls, v: str) -> str:
        """封面以 <img src> 直出,不校验就是存储型 XSS/钓鱼向量。"""
        v = v.strip()
        if not v:
            return ""
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("cover_url 必须是 http(s) 链接")
        if len(v) > 500:
            raise ValueError("cover_url 过长(上限 500 字符)")
        return v


class DraftIn(BaseModel):
    github_id: int


class BioIn(BaseModel):
    bio: str = Field(max_length=200)


class InteractionIn(BaseModel):
    repo_id: int
    kind: str    # 仅 like / favorite;visit 由服务端在详情接口写入
    active: bool
