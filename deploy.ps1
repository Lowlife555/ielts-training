# =============================================================
# IELTS Training 部署脚本 — 本地开发机执行
# 每次开发完成(commit+push 之后)运行: powershell -File deploy.ps1
# 目标: 腾讯云轻量应用服务器 43.135.22.140 (Ubuntu 24.04, root)
# 部署目录: /var/www/ielts-training (git clone)
# 进程: pm2 (ielts-server) + nginx (client/dist)
# =============================================================
$ErrorActionPreference = "Stop"

$SERVER = "root@43.135.22.140"
$DEPLOY_DIR = "/var/www/ielts-training"
$LOCAL_BRANCH = (git branch --show-current)

Write-Host "=== [1/5] 本地 git push ($LOCAL_BRANCH) ===" -ForegroundColor Cyan
git add -A
git commit -m "chore: deploy checkpoint" --allow-empty | Out-Null
git push origin $LOCAL_BRANCH
if ($LASTEXITCODE -ne 0) { throw "git push failed" }

Write-Host "=== [2/5] 服务器 git pull ===" -ForegroundColor Cyan
ssh -o ConnectTimeout=10 $SERVER "cd $DEPLOY_DIR && git pull --ff-only origin $LOCAL_BRANCH"
if ($LASTEXITCODE -ne 0) { throw "server git pull failed" }

Write-Host "=== [3/5] 服务器依赖安装 ===" -ForegroundColor Cyan
ssh $SERVER "cd $DEPLOY_DIR/server && npm install --omit=dev 2>&1 | tail -2"
ssh $SERVER "cd $DEPLOY_DIR/client && npm install 2>&1 | tail -2"
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

Write-Host "=== [4/6] 服务器数据库迁移 ===" -ForegroundColor Cyan
ssh $SERVER "cd $DEPLOY_DIR/server && npm run migrate:all 2>&1 | tail -8"
if ($LASTEXITCODE -ne 0) { throw "server migrate failed" }

Write-Host "=== [5/6] 服务器构建前端 ===" -ForegroundColor Cyan
ssh $SERVER "cd $DEPLOY_DIR/client && npm run build 2>&1 | tail -4"
if ($LASTEXITCODE -ne 0) { throw "server build failed" }

Write-Host "=== [6/6] 重启 pm2 + 健康检查 ===" -ForegroundColor Cyan
ssh $SERVER "pm2 restart ielts-server --update-env"
Start-Sleep -Seconds 2
$health = ssh $SERVER "curl -s http://127.0.0.1:3001/api/health"
$front = ssh $SERVER "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1/"
Write-Host "API health: $health" -ForegroundColor Green
Write-Host "前端 HTTP: $front" -ForegroundColor Green
if ($front -ne "200") { throw "前端未就绪" }

Write-Host "=== 部署完成 ===" -ForegroundColor Green
