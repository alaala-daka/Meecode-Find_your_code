# 觅码 · Runbook 逐行解读

本文是 `docs/deploy-runbook.md` 的配套讲解：每一行命令是干什么的、为什么需要它。章节编号与 runbook 一一对应。执行时请回到 runbook 照抄命令；看不懂某行时来这里查。

背景架构（10 秒版）：

```
浏览器 ──HTTPS──▶ Nginx(80/443)
                   ├── 静态页面文件（/var/www/meecode，CI 构建后 rsync 上来）
                   └── /explain-api/ ──转发──▶ 127.0.0.1:8100（uvicorn 后端，systemd 常驻）
GitHub Actions ──SSH(deploy@服务器)──▶ git pull + pip install + systemctl restart
```

三个主角：
- **root**：服务器最高权限账户，装软件、改系统配置用
- **deploy**：runbook 为觅码专建的普通用户，应用属于它，GitHub Actions 也用它登录
- **你（本机）**：只负责推送代码、配 GitHub 网页、（回滚时）本地构建

---

## 前置条件（runbook 头部）

| 条件 | 为什么 |
|---|---|
| Linux 服务器已装 Nginx | 觅码占用 80/443，Nginx 是入口；已装可省一步 |
| 域名 A 记录到服务器 IP | HTTPS 证书按域名签发（§7），DNS 不对签不出来 |
| 安全组放行 80/443/22 | 80/443 是网站流量，22 是你 SSH 管理用；其余端口不必开 |
| 部署分支已推送 GitHub | §2 clone 的是 GitHub 上的代码——`deploy/` 模板还没推上去的话，clone 不到，§5/§7 会失败 |

---

## 1. 系统用户与依赖（root，服务器）

```bash
adduser --disabled-password --gecos "" deploy
```
创建名为 `deploy` 的普通用户。`--disabled-password`：不设密码（只通过 `sudo -iu` 切换，禁止密码登录，缩小攻击面）；`--gecos ""`：跳过姓名电话等交互式提问。这就是前文说的"低权限用户"的诞生时刻。

```bash
apt update && apt install -y python3-venv git rsync certbot
```
`apt update` 刷新软件源索引；然后装 4 样东西：`python3-venv`（创建 Python 虚拟环境的能力）、`git`（服务器拉代码）、`rsync`（接收 CI 传来的前端产物——rsync 两端都要装）、`certbot`（§7 签 HTTPS 证书）。`-y` 自动确认，不逐个问。

```bash
mkdir -p /opt/meecode /var/www/meecode
```
建两个目录：`/opt/meecode` 放代码仓库；`/var/www/meecode` 放前端静态文件（Nginx 的网站根目录）。`-p`：目录不存在则创建，存在也不报错。

```bash
chown deploy:deploy /opt/meecode /var/www/meecode
```
把两个目录的所有者改为 deploy 用户（`用户:组`）。不改的话 deploy 没有写权限，后面 `git clone`（写入 /opt/meecode）和 CI 的 rsync（写入 /var/www/meecode）都会被拒。

---

## 2. 拉代码与后端环境（deploy，服务器）

```bash
sudo -iu deploy
```
从 root 切换成 deploy 用户（`-i` = 模拟该用户完整登录环境）。提示符会变成 deploy@…。之后所有文件都归属 deploy，不会出现 root 建的文件 deploy 改不了的尴尬。

```bash
git clone https://github.com/alaala-daka/Meecode-Find_your_code.git /opt/meecode
```
把 GitHub 仓库克隆到 /opt/meecode。仓库是 public 的，所以 HTTPS 方式不需要任何凭证——这就是为什么不需要给服务器配 GitHub 密钥。

```bash
cd /opt/meecode/backend
python3 -m venv .venv
```
进入后端目录，创建名为 `.venv` 的 Python 虚拟环境。虚拟环境 = 一个独立的包安装空间，这个项目装的 FastAPI 等不污染系统 Python，删掉重来也只删目录。

```bash
.venv/bin/pip install -r requirements.txt
```
在虚拟环境里安装后端依赖清单（fastapi、uvicorn、langgraph、openai 等）。注意用的是 `.venv/bin/pip`（虚拟环境内的 pip），不是系统的。

---

## 3. 写 .env（deploy，服务器）——密钥唯一一次人肉搬运

```bash
cp .env.example .env && chmod 600 .env
```
从模板复制出真实配置文件；`chmod 600` = 只有 deploy 本人能读写，其他任何用户（包括同机其他账户）都读不了——密钥文件的标准权限。

```bash
vi .env   # 填入 LLM_API_KEY、TAVILY_API_KEY、GITHUB_TOKEN 等
```
编辑填入真实密钥（从你本机 `backend/.env` 抄）。`.env` 在 `.gitignore` 里，git 永远不会把它传上传下，所以它只存在于服务器磁盘上。**注意把 `LLM_MOCK` 设为 `false`**（模板里默认 true，mock 模式不会调用真实 LLM）。vi 基本操作：`i` 进入编辑，`Esc` 后 `:wq` 保存退出。

为什么只搬这一个文件？因为其他"被 git 忽略的东西"都有替代来源：`node_modules` 由 CI 现装、`frontend/dist` 由 CI 直接 rsync 上来、`.venv` 在服务器本地建。详见设计文档 §4。

---

## 4. 部署专用 SSH 密钥（deploy，服务器）

这一节生成"GitHub Actions 登录服务器用的钥匙"。

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
```
确保 `.ssh` 目录存在且权限为 700（只有本人可进）。`--disabled-password` 建的用户没有这个目录；SSH 对权限检查极其严格，权限不对会直接拒绝登录。

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N "" -C "github-actions-deploy"
```
生成一对加密钥匙：`-t ed25519` 现代椭圆曲线算法；`-f` 指定文件名（产出 `deploy_key` 私钥 + `deploy_key.pub` 公钥）；`-N ""` 私钥不设密码——CI 是无人值守的，没人输密码；`-C` 只是备注。私钥给 GitHub，公钥给服务器，两边对上才放行。

```bash
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```
把公钥追加进 `authorized_keys`（SSH 的"允许登录名单"）。权限 600 同样是 SSH 的硬性要求。

```bash
cat ~/.ssh/deploy_key   # 私钥全文 → GitHub Secret SSH_PRIVATE_KEY
```
打印私钥全文，复制去 GitHub Secrets（§8）。私钥离开服务器后只存在 GitHub 的加密 Secrets 里，不要存别处。

---

## 5. systemd + 免密重启授权（root，服务器）

```bash
cat > /etc/sudoers.d/deploy-meecode <<'SUD'
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart meecode-backend, /usr/bin/systemctl status meecode-backend
SUD
```
写一条 sudo 规则：允许 deploy 用户**免密码**执行且仅限两条命令——重启/查看 `meecode-backend` 服务。为什么需要：CI 每次 deploy 后要重启后端，但总不能把 root 密码给 CI。`<<'SUD'…SUD` 是 heredoc 写文件语法（引号防变量展开）。

```bash
chmod 440 /etc/sudoers.d/deploy-meecode
```
sudoers 文件必须是 440（root 和组可读、不可写），否则 sudo 会因"权限过宽"拒绝生效。

```bash
cp /opt/meecode/deploy/meecode-backend.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now meecode-backend
```
把仓库里的服务单元模板安装到 systemd 目录；`daemon-reload` 让 systemd 重新读取单元定义；`enable --now` = 设为开机自启 + 立刻启动。此后后端进程由 systemd 照管：崩溃 3 秒自动拉起（`Restart=always`）、服务器重启后自动恢复。

```bash
curl -fsS http://127.0.0.1:8100/api/health   # 期望 {"ok": true, ...}
```
在服务器本机验证后端活了。`-f` = HTTP 错误码时命令失败；`-S` = 出错时打印。返回 `{"ok": true}` 说明 FastAPI 正常监听 8100。

---

## 6. Nginx 最小配置（root，服务器）——先 HTTP，为了签证书

这一节故意只配 80 端口：因为 443 的配置要引用证书文件，而证书 §7 才能签——先装 443 配置的话 `nginx -t` 直接报错。

`/etc/nginx/sites-available/meecode` 的 server 块：
- `listen 80;` 监听 HTTP
- `server_name <你的域名>;` 只响应你的域名
- `root /var/www/meecode; index index.html;` 网站文件在哪、首页叫什么
- `location / { try_files $uri $uri/ /index.html; }` 先找真实文件，找不到就返回 `index.html`——这是 SPA（单页应用）路由的关键：用户直接访问/刷新 `xxx/yyy` 这类前端路由时，文件系统里并没有这个文件，兜底给 index.html 让前端路由器接管

```bash
ln -sf /etc/nginx/sites-available/meecode /etc/nginx/sites-enabled/
```
Ubuntu 的惯例：配置写在 `sites-available`（候选区），软链到 `sites-enabled`（生效区）。`-sf` = 覆盖已有软链。

```bash
rm -f /etc/nginx/sites-enabled/default
```
删除 Nginx 自带的默认站点，避免它抢占 80 端口、把你的域名请求劫走到欢迎页。（替换旧站的时刻——如需保留旧站，先备份这份 default 和旧站目录。）

```bash
nginx -t && systemctl reload nginx
```
`nginx -t` 语法体检，通过才 reload（改错配置就 reload 会把整个 Nginx 搞挂）。`reload` vs `restart`：reload 不断开现有连接，用户无感知。

---

## 7. 签发证书并切换最终配置（root，服务器）

```bash
certbot certonly --webroot -w /var/www/meecode -d <你的域名>
```
向 Let's Encrypt（免费 CA）申请证书。`--webroot` 验证方式：CA 访问 `http://你的域名/.well-known/...`，certbot 把验证文件写进 `/var/www/meecode`，Nginx（§6 已配好 80）能把文件送出去 → CA 确认"域名确实指向这台服务器" → 发证书。`certonly` 只领证书、不动 Nginx 配置（我们要用自己那份）。

```bash
cp /opt/meecode/deploy/nginx-meecode.conf /etc/nginx/sites-available/meecode
vi /etc/nginx/sites-available/meecode   # <你的域名> → 实际域名
```
换成仓库里的最终版配置（80 跳转 443 + 证书路径 + `/explain-api/` 反代），把占位符替换成真域名。

最终版配置里最关键的三行（解释见设计文档 §5）：
- `proxy_pass http://127.0.0.1:8100/api/;` —— `/explain-api/xxx` 转发给后端时改写成 `/api/xxx`（尾斜杠决定前缀替换行为）
- `proxy_buffering off;` —— 聊天回答是逐字流式（NDJSON）到达的，禁止 Nginx 攒一波再发
- `proxy_read_timeout 300s;` —— LLM 生成慢，把"后端多久没说话就掐线"从默认 60s 放宽到 5 分钟

```bash
nginx -t && systemctl reload nginx
certbot renew --dry-run   # 续期演练
```
再次体检并生效；`--dry-run` 用测试环境完整走一遍续期流程（证书 90 天有效，certbot 装好自带自动续期定时器，演练通过=以后不用管）。

---

## 8. GitHub Secrets（GitHub 网页，非终端）

| Secret | 值 | 作用 |
|---|---|---|
| `SSH_HOST` | `deploy@<服务器IP>` | CI 以 deploy 身份连服务器 |
| `SSH_PRIVATE_KEY` | §4 的私钥全文 | 连接凭证（对应服务器上的公钥） |
| `DEPLOY_DOMAIN` | `<你的域名>` | 部署完做健康检查的目标地址 |

你在网页上已配好 ✅。Secrets 加密存储、日志里自动打码，workflow 用 `${{ secrets.名字 }}` 引用。

---

## 9. 首次部署验证（本机 + 服务器）

```bash
git push origin feat/frontend-ui    # 本机执行
```
推送触发 deploy 工作流（`.github/workflows/deploy.yml`）：构建前端 → rsync 到 /var/www/meecode → SSH 拉 code、装依赖、重启服务 → 访问 `https://域名/explain-api/health` 自检。GitHub → Actions 页看它全绿。

```bash
systemctl status meecode-backend    # 服务器：服务活着吗
journalctl -u meecode-backend -n 50 --no-pager   # 服务器：最近 50 行日志
```
`journalctl -u <服务>` 只看某个服务的日志，排查后端问题第一入口。

浏览器侧按 runbook 的清单过一遍：首页 → 仓库解读 tab 自动建图 → 双击节点出真实长文 → 伴读流式回答 → 刷新深链接不 404。

---

## 10. 回滚（线上坏了想退回旧版本）

```bash
cd /opt/meecode && git fetch origin && git checkout <旧commit-sha>
```
`fetch` 拉取远端最新历史；`checkout <sha>` 让工作区退回指定提交（此时仓库处于"detached HEAD"游离状态，只是临时看旧代码）。

```bash
backend/.venv/bin/pip install -r backend/requirements.txt
sudo systemctl restart meecode-backend
```
旧版本依赖可能不同 → 重装依赖；重启 → 旧代码上线。

```bash
git checkout feat/frontend-ui && git reset --hard origin/feat/frontend-ui
```
恢复到正常跟踪分支并对齐远端。没有这两行，下次 CI 的 `git pull --ff-only` 会在游离状态下报错（终审揪出的坑）。`reset --hard` 会丢弃本地差异——回滚场景下这是想要的。

```powershell
$env:VITE_USE_MOCK='false'; npm run build   # 本机 frontend/
rsync -az --delete -e "ssh -i <部署私钥>" frontend/dist/ deploy@<服务器IP>:/var/www/meecode/
```
前端回滚只能重推旧产物：本机切旧提交、构建，rsync 覆盖。`-a` 保权限时间戳、`-z` 压缩传输、`--delete` 让目标目录与本地完全一致（多删少补）、`-e` 指定 SSH 及私钥。

---

## 11. 排障速查（服务器）

| 症状 | 命令 | 在找什么 |
|---|---|---|
| 后端起不来 | `journalctl -u meecode-backend -n 100` | 崩溃堆栈；多半是 `.env` 缺失/密钥无效 |
| 解读接口 502 | `systemctl is-active meecode-backend` + `ss -tlnp \| grep 8100` | 服务是否活着、8100 是否在监听（502 = Nginx 找不到后端） |
| 证书续期失败 | `certbot renew --dry-run` | 验证流程卡点：通常 80 端口被改或 DNS 漂移 |
| 页面仍是旧版 | 浏览器强刷 | 构建产物文件名带内容 hash，正常不会缓存错版本 |

---

## 一页速记

1. §1 建人（deploy）装家伙（venv/git/rsync/certbot）
2. §2 拉代码、建 Python 环境
3. §3 手工放密钥（唯一不走 git 的文件）
4. §4 造 CI 登录钥匙（私→GitHub，公→服务器）
5. §5 装服务 + 授权 CI 只能重启这一个服务
6. §6 Nginx 先开 80（SPA 回退）
7. §7 签证书、上 443 最终配置
8. §8 网页配三个 Secret
9. §9 push 看绿灯，浏览器过清单
10. §10 出事回滚（记得恢复分支）
11. §11 坏了按表查
