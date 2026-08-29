# 觅码 · 服务器一次性初始化与回滚 Runbook

前置：云服务器（Linux，已装 Nginx）、域名已 A 记录到服务器 IP、80/443/22 在安全组放行。
按顺序执行；`<你的域名>`、`<服务器IP>` 替换为实际值。

## 1. 系统用户与依赖（root）

```bash
adduser --disabled-password --gecos "" deploy
apt update && apt install -y python3-venv git rsync certbot
mkdir -p /opt/meecode /var/www/meecode
chown deploy:deploy /opt/meecode /var/www/meecode
```

## 2. 拉代码与后端环境（deploy）

```bash
sudo -iu deploy
git clone https://github.com/alaala-daka/Meecode-Find_your_code.git /opt/meecode
cd /opt/meecode/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## 3. 写 .env（deploy，密钥不进 git）

```bash
cp .env.example .env && chmod 600 .env
vi .env   # 填入 LLM_API_KEY、TAVILY_API_KEY、GITHUB_TOKEN 等（从本地 backend/.env 迁移）
```

## 4. 部署专用 SSH 密钥（deploy）

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N "" -C "github-actions-deploy"
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/deploy_key   # 私钥全文（含 BEGIN/END 行）→ GitHub Secret SSH_PRIVATE_KEY
```

## 5. systemd + 免密重启授权（root）

```bash
cat > /etc/sudoers.d/deploy-meecode <<'SUD'
deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart meecode-backend, /usr/bin/systemctl status meecode-backend
SUD
chmod 440 /etc/sudoers.d/deploy-meecode
cp /opt/meecode/deploy/meecode-backend.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now meecode-backend
curl -fsS http://127.0.0.1:8100/api/health   # 期望 {"ok": true, ...}
```

## 6. Nginx 最小配置（签证书前）

`/etc/nginx/sites-available/meecode`：

```nginx
server {
    listen 80;
    server_name <你的域名>;
    root /var/www/meecode;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
```

```bash
ln -sf /etc/nginx/sites-available/meecode /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## 7. 签发证书并切换最终配置

```bash
certbot certonly --webroot -w /var/www/meecode -d <你的域名>
# 用仓库模板替换，替换 <你的域名> 后：
cp /opt/meecode/deploy/nginx-meecode.conf /etc/nginx/sites-available/meecode
vi /etc/nginx/sites-available/meecode   # <你的域名> → 实际域名
nginx -t && systemctl reload nginx
certbot renew --dry-run   # 续期演练；certbot 装好即有自动续期 timer
```

## 8. GitHub Secrets（仓库 Settings → Secrets and variables → Actions）

| Secret | 值 |
|---|---|
| `SSH_HOST` | `deploy@<服务器IP>` |
| `SSH_PRIVATE_KEY` | 第 4 步 `deploy_key` 私钥全文 |
| `DEPLOY_DOMAIN` | `<你的域名>` |

## 9. 首次部署验证

```bash
# 本机推送后，GitHub → Actions 观察 deploy 工作流全绿
git push origin feat/frontend-ui
# 服务器侧确认：
systemctl status meecode-backend
journalctl -u meecode-backend -n 50 --no-pager
```

浏览器验证：打开 `https://<你的域名>` 首页 200 → 仓库详情 → 仓库解读 tab 自动建图 → 双击节点阅读器出真实长文 → 伴读追问流式回答 → 深链接刷新不 404。

## 10. 回滚

```bash
# 后端：回到指定 commit 并重启（服务器上）
cd /opt/meecode && git fetch origin && git checkout <旧commit-sha>
backend/.venv/bin/pip install -r backend/requirements.txt
sudo systemctl restart meecode-backend
# 前端：本地 checkout 旧 commit 构建，rsync 覆盖
$env:VITE_USE_MOCK='false'; npm run build   # 本机 frontend/
rsync -az --delete -e "ssh -i <部署私钥>" frontend/dist/ deploy@<服务器IP>:/var/www/meecode/
```

## 11. 排障速查

- 后端起不来：`journalctl -u meecode-backend -n 100`；先查 `/opt/meecode/backend/.env` 是否存在且密钥有效。
- 解读接口 502：`systemctl is-active meecode-backend`；`ss -tlnp | grep 8100` 确认监听。
- 证书续期失败：`certbot renew --dry-run` 输出；确认 80 端口未被改动、DNS 仍指向本机。
- 部署后页面仍是旧版：浏览器强刷（dist 文件名带 hash，正常不会缓存错版本）。
