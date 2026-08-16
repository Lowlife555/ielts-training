# AGENTS.md — IELTS Training 开发规范

给 AI 助手和开发者的持续开发指南。每次改动前先读本节。

## 1. 常用命令

- 前端构建: `npm run build` (client/ 下,改完必跑,必须通过)
- 前端开发服务器: `npm run dev`
- 服务端: 见 `server/` 目录下的启动脚本 (Node 后端 + SQLite)
- **部署(每次开发完成必须执行)**: `powershell -ExecutionPolicy Bypass -File deploy.ps1`
- **禁止**: 无测试框架,不写单测;以 `npm run build` + 人工点检为验证手段

## 2. 部署环境 (2026-08-08 配置)

- 服务器: 腾讯云轻量应用服务器 `43.135.22.140` (Ubuntu 24.04 LTS, root, SSH 密钥免密)
- 部署目录: `/var/www/ielts-training` (git clone 自 GitHub origin/master)
- 进程: pm2 `ielts-server` (server/index.js) + nginx (root=/var/www/ielts-training/client/dist, proxy → 127.0.0.1:3001)
- 部署流程由 `deploy.ps1` 完成: 本地 push → 服务器 pull → npm install → **数据库迁移 (`npm run migrate:all`)** → client build → pm2 restart → 健康检查(API /api/health + 前端 HTTP 200)
- ⚠️ 服务器配置(密码/密钥)不入库;公开信息仅限上面这些
- ⚠️ 服务器数据库 SQLite 在服务器本地生成/增长,`git pull` 不影响用户数据(数据文件不入库);server 代码改动照常 pull 覆盖
- **发新版本时**: 新增 `server/db/migrate_vN.js` 并在其中 `INSERT OR IGNORE` 一条公告(版本号/标题/特性列表 JSON),再把它加进 `server/package.json` 的 `migrate:all` 链;用户首次进入自动弹窗(v5.4 起,公告表 announcements + user_announcements)

## 3. 架构约定 (2026-08 重组后)

```
client/src/
├── App.jsx              # 路由唯一入口(页面 import 只能出现在这里)
├── main.jsx / index.css
├── components/
│   ├── layout/          # Navbar, MobileTabBar
│   ├── ui/              # Loading, Toast, ErrorBoundary, KeyboardHelp
│   └── training/        # TrainingTimer, FirstVisitHint
├── context/             # App / Auth / Theme / Touch
├── hooks/               # useKeyboard, useSwipe, useTimer, useElapsed
├── pages/
│   ├── words/           # Topics, WordList, WordStudy, SpellingTest, ReviewWords, WrongWords
│   ├── daily/           # TodayBriefing, PetWarmup, MainStudy, SpellingPractice, AcceptanceTest, SpotCheck, DailyReport
│   ├── writing/         # WritingQuestions, WritingEditor, WritingResult, History
│   ├── user/            # Login, Register, Me, Admin
│   └── misc/            # Home, SpeechDiagnostic
└── utils/               # api.js, speech.js
```

规则:
- 新增页面先按功能域放入对应 `pages/<域>/`,再在 App.jsx 注册路由
- 新增组件按类型放入 `components/<layout|ui|training>/`
- 相对路径引用:`../`(同级)或 `../../`(跨一层),不允许跨层 `../../..`

## 3. 触屏适配规范 (触屏模式 = 一等公民)

任何含交互的新页面必须三件套,缺一不可:

1. `useTouch()` → 得到 `isTouch`(布局/尺寸差异)
2. 词卡类交互 → `useSwipe({ enabled: isTouch, onLeft/onRight/onTap })` + 卡片 `no-select` 类
3. 键盘快捷键提示 → 每个 `kbd` 提示必须配 `kbd-hint`(桌面) + `touch-hint`(触屏) 双标签:
   ```jsx
   <span className="kbd-hint"><kbd>Enter</kbd> 显示释义</span>
   <span className="touch-hint hidden">点卡片 显示释义</span>
   ```

键盘功能的触屏等价物(检查清单):
| 键盘功能 | 触屏等价物 |
|---|---|
| Enter 显示释义 | 点卡片(只翻面) |
| Space 发音 | 🔊 按钮(必带 stopPropagation) |
| ← → 切换 | 左右滑动 或 明确按钮 |
| 1/2 会/不会 | 滑动手势 + 会/不会按钮 |
| Esc 收工/返回 | 页面上可见的收工/返回按钮 |
| ? 帮助面板 | Navbar 帮助按钮(HelpCircle 图标) |

## 4. 交互红线 (不可违反)

1. **按钮/卡片行为必须与显示文案一致**。文案写"显示释义"就只能显示释义。
   - **动态文案按钮(同一按钮随状态换文案)必须让 handler 同步切换**,禁止固定 handler。
   - 曾发生:PET 热身底部按钮文案"显示释义"时 onClick 却执行 next() 跳下一个(v5.4.1 修复)。
2. **点卡片 = 只翻面**:未显示 → 显示;已显示 → 点击无操作。
   跳下一个/上一个必须用明确的「下一个」按钮或左右滑动,禁止"点卡片翻面后再点跳题"。
3. 触屏设备上禁止依赖:键盘、hover、右键、拖拽、双击。
4. 提示文字与实际行为不符 = 严重 bug(曾发生:提示"点卡片查看答案"但卡片无点击绑定)。

## 5. 开发流程

1. 改动前确认目标页面归属域(§2)
2. 实现(遵守 §3、§4)
3. `cd client && npm run build` 必须通过
4. 人工点检:桌面模式键盘 + 触屏模式(DevTools 设备模拟)各过一遍主流程
5. commit 格式:`VX.Y.Z: 一句话描述` (三段式,如 V7.3.3;历史格式: v5.0-P1、v5.1、v5.2 ...)
6. 打版本 tag:`git tag VX.Y.Z <commit>` 并 `git push origin VX.Y.Z`(与历史 V2.0.0~V7.3.2 的 tag 惯例一致)
7. push 到 `master` 分支

## 6. 环境

- 开发: localhost (Navbar 黄色 laptop 徽标)
- 生产: 服务器部署 (灰色 server 徽标),由 `window.location.hostname` 自动判定
- 测试账号: `admin_test` (免惩罚 + 测试面板任意跳转)
