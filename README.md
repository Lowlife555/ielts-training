# 📚 IELTS 6.5 智能备考训练网站

基于 React + Express + SQLite 的雅思（IELTS）6.5 分目标备考平台，包含**单词背诵**和**写作训练**两大核心模块。

## 📅 版本记录

> 版本号采用 **V 主.次.补丁**（SemVer）语义：主版本=重大改版，次版本=新功能，补丁=修复。
> 历史提交对应 git 提交（无独立 tag），可随时回滚。

| 版本 | 日期 | 开发 Agent | 核心内容 |
|------|------|-----------|---------|
| V1.0.0 | 2026-08-05 | Claude Code + DeepSeek V4 | 初始版本：脚手架 + 数据库 + 14 API + 282 真题词 + 30 写作题 |
| V2.0.0 | 2026-08-06 | Claude Code + DeepSeek V4 | 验收后修复：user_id 动态化、语音、空 catch 吞错、评分按钮颜色 |
| V3.0.0 | 2026-08-06 | Claude Code + DeepSeek V4 | 每日单词训练系统（设置→单词卡→测验→订正→报告）+ 4237 词词库 |
| V3.0.1 | 2026-08-06 | Claude Code + DeepSeek V4 | 修复语音发音：改用本地 Microsoft 离线语音（Google 远程被墙） |
| V3.0.2 | 2026-08-06 | Claude Code + DeepSeek V4 | 交付前修复：PET/IELTS 词汇隔离、端口统一、反馈延时、自动保存等 |
| V4.0.0 | 2026-08-07 | Claude Code + DeepSeek V4 | 词库整理与导入：List 1-24 编号、释义三级补齐、list_no/is_extra 字段 |
| V4.1.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 今日简报 + 每日训练流程重构（热身→英译中→错词死磕→中译英→验收）+ 时间盒与欠债系统 |
| V4.2.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 抽查机制：背完 3-4 天后随机抽查 30 词，≥80% 通过，不达标标记待重背次日优先 |
| V4.3.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 释义深度扩充：DeepSeek 批量处理 756 词，全部 IELTS 词 2+ 义项，脚本支持断点续跑 |
| V5.0.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 用户系统：开放注册/登录（首个注册自动成为管理员并继承旧数据）、全路由数据隔离、Admin 管理面板（查看状态/重置密码/禁用账号）、标题 server(灰)/laptop(黄) 徽标 |
| V5.1.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 测试账号 admin_test（免惩罚+测试面板任意跳转）+ 暗黑模式（太阳/月亮切换） |
| V5.2.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 学习模式选择：顺序/自定义 List（插队不丢进度，已完成可复习，设置长期保存） |
| V5.3.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 触屏适配：滑动翻卡/底部标签栏/我的页面/键盘提示触屏化 |
| V5.3.1 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 触屏交互修复（点卡片只翻面不跳题/帮助面板触屏化）+ 前端目录按功能域重组 |
| V5.4.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 触屏模式右上角切回桌面入口 + 新版本公告系统 |
| V6.0.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 词义判定测试（给单词选释义，宽松判）+ 词义/拼写混合模式 + 有道全量释义抓取(2318词) |
| V7.0.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | List 背诵（整 List 完整释义+显隐开关）+ 中文默写测试（关键词判分+错词重测），移除旧单词卡入口 |
| V7.1.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 番茄钟分批背诵（单词表→中文默写→休息）+ 间隔抽查→拼写抽查（随机30词≥80%过）+ 词数现选 + batch_size 迁移 |
| V7.2.0 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 翻卡背诵（3D翻转/隐藏释义）+ 热身中译英输入判分 + 多音源（本地/有道/百度）+ 设置页 + 宽松判分 + 重测剔除已通过词 |
| V7.2.1 | 2026-08-08 | opencode (deepseek-v4-flash-free) | 修复热身两个 bug：提交后自动跳词/无法进入下一环节（去自动跳转、Enter 防双触发）+ 版本公告 |
| V7.2.2 | 2026-08-12 | opencode (deepseek-v4-flash-free) | 修复热身反馈停留/单卡翻卡（全部翻转 bug）+ 设置齿轮顶部入口 + KV 用户记忆存储系统（user_kv 表/API/前端 hook/数据迁移） |
| V7.2.3 | 2026-08-12 | opencode (deepseek-v4-flash-free) | 修复翻卡背面滚动条（grid 同格堆叠，卡片高度自适应，滚轮可正常滚动列表）+ 翻卡正反两面均支持读音 |

## 🚀 快速启动

```bash
# 1. 安装依赖
cd client && npm install
cd ../server && npm install

# 2. 初始化数据库（建表 + 导入 4237 个词汇 + 30 道写作真题）
cd server && npm run setup

# 3. 启动后端 (端口 3001)
cd server && npm run dev

# 4. 启动前端 (端口 5173)
cd client && npm run dev
```

浏览器打开 `http://localhost:5173`

## 📁 项目结构

```
ielts-training/
├── client/                    # React 前端 (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/        # 通用组件
│   │   │   ├── Navbar.jsx          # 导航栏（含搜索、/ 键聚焦）
│   │   │   ├── Toast.jsx           # Toast 通知
│   │   │   ├── KeyboardHelp.jsx    # ? 键快捷键帮助面板
│   │   │   ├── FirstVisitHint.jsx  # 首次访问提示
│   │   │   ├── Loading.jsx         # 加载中
│   │   │   └── ErrorBoundary.jsx   # 错误边界
│   │   ├── pages/             # 页面组件
│   │   │   ├── Home.jsx            # 首页（学习概览）
│   │   │   ├── Topics.jsx          # 话题浏览（8大话题卡片）
│   │   │   ├── WordList.jsx        # 单词列表（分页、搜索）
│   │   │   ├── WordStudy.jsx       # 单词学习（发音、翻页）
│   │   │   ├── SpellingTest.jsx    # 拼写测试（20题、即时判定）
│   │   │   ├── ReviewWords.jsx     # 间隔复习（SM-2算法）
│   │   │   ├── WrongWords.jsx      # 错词本
│   │   │   ├── WritingQuestions.jsx # 写作选题（Task1/2筛选）
│   │   │   ├── WritingEditor.jsx   # 写作编辑器
│   │   │   ├── WritingResult.jsx   # 批改结果（雷达图）
│   │   │   ├── History.jsx         # 历史记录（趋势图）
│   │   │   ├── TodayBriefing.jsx   # 今日简报（目标时长/欠债/今日内容）
│   │   │   ├── PetWarmup.jsx       # PET 热身（10词，不计时不计分）
│   │   │   ├── MainStudy.jsx       # 英译中主任务（会/不会 + 错词死磕）
│   │   │   ├── SpotCheck.jsx       # 抽查（≥80%通过，不达标标记待重背）
│   │   │   ├── SpellingPractice.jsx# 中译英拼写（20%权重）
│   │   │   ├── AcceptanceTest.jsx  # 验收（漏网之鱼全对才算完成）
│   │   │   └── DailyReport.jsx     # 训练报告（三项正确率）
│   │   ├── context/AppContext.jsx   # 全局状态
│   │   ├── hooks/useKeyboard.js    # 键盘快捷键 Hook
│   │   ├── hooks/useTimer.js       # 训练计时 Hook
│   │   └── utils/api.js            # API 调用封装
│   └── vite.config.js         # Vite 配置（含代理）
│
├── server/                    # Express 后端
│   ├── db/
│   │   ├── database.js             # 数据库连接
│   │   ├── migrate.js              # 建表迁移脚本
│   │   ├── migrate_v4.js           # v4.0 词库迁移（list_no/is_extra）
│   │   ├── migrate_v5.js           # v4.0 训练流程迁移（计时/完成/抽查表）
│   │   └── seed.js                 # 种子数据（4237词 + 30题）
│   ├── routes/                # API 路由
│   │   ├── topics.js               # GET /api/topics
│   │   ├── words.js                # GET /api/words
│   │   ├── spellingTest.js         # GET/POST /api/spelling-test
│   │   ├── reviewWords.js          # GET /api/review-words
│   │   ├── reviewResult.js         # POST /api/review-result
│   │   ├── wrongWords.js           # GET /api/wrong-words
│   │   ├── writingQuestions.js     # GET /api/writing-questions
│   │   ├── essays.js               # POST /api/essays/submit
│   │   ├── stats.js                # GET /api/stats/overview
│   │   ├── daily.js                # 旧版每日训练（保留兼容）
│   │   ├── dailyPlan.js            # 今日简报/欠债/抽查 (v4.0)
│   │   └── training.js             # 训练会话 开始/完成/收工 (v4.0)
│   ├── scripts/
│   │   └── enrichDefinitions.js    # 释义深度扩充脚本（DeepSeek 批量）
│   ├── .env                   # 环境变量（DeepSeek API Key）
│   └── index.js               # 入口
│
└── package.json               # Monorepo 根配置
```

## ⌨️ 键盘快捷键

### 全局快捷键
| 按键 | 行为 |
|------|------|
| `?` | 显示/隐藏快捷键帮助面板 |
| `/` | 聚焦顶部搜索框 |
| `Esc` | 关闭弹窗 / 返回上一级 |

### 单词背诵
| 按键 | 场景 | 行为 |
|------|------|------|
| `Enter` | 拼写测试 | 提交答案 → 自动下一题 |
| `Enter` | 学习模式 | 显示释义 / 翻到下一个单词 |
| `Enter` | 复习模式 | 显示答案 |
| `Space` | 单词页 | 朗读当前单词 |
| `← →` | 单词学习/错词本 | 上一个/下一个单词 |
| `1-6` | 复习评分 | 快速选择记忆程度 |

### 写作模块
| 按键 | 场景 | 行为 |
|------|------|------|
| `Ctrl+Enter` | 写作编辑器 | 提交作文（二次确认） |
| `Tab` | 写作编辑器 | 插入 2 空格缩进 |
| `Ctrl+S` | 写作编辑器 | 保存草稿到 localStorage |

## 🧠 间隔复习算法 (SM-2)

采用简化的 SM-2 算法：
- 每次复习后根据用户评分（0-5）调整单词的复习间隔
- `quality ≥ 3`（记得）：增加间隔 `interval × ease_factor`
- `quality < 3`（不记得）：重置间隔为 1 天
- 简易因子范围：1.3 - 2.5+
- 连续正确 5 次 → 标记为"已掌握"

## 🤖 DeepSeek AI 批改

写作批改基于 **DeepSeek API**，严格按雅思四项标准评分：

1. **Task Achievement / Task Response**（任务完成度/任务回应）
2. **Coherence and Cohesion**（连贯与衔接）
3. **Lexical Resource**（词汇资源）
4. **Grammatical Range and Accuracy**（语法范围与准确性）

配置 API Key：
```bash
# 编辑 server/.env
DEEPSEEK_API_KEY=sk-your-api-key-here
```

> 💡 未配置 API Key 时，系统会使用本地启发式评分作为备选方案，确保功能可用。

## 📅 v4.0 每日训练流程

```
今日简报 (目标时长=60+欠债min, 上限120min)
  └─ PET 热身 (10词, 不计时不计分)
  └─ 英译中主任务 (List 未完成词 + 待重背词, 错词死磕)
  └─ 抽查 (完成List ≥3天未抽查 → 随机抽30词, ≥80%通过)
  └─ 中译英拼写 (随机15词, 20%权重)
  └─ 验收 (漏网之鱼全对才完成今日, 完成则欠债清零)
```

- 欠债规则：目标时长未达标 → 记入欠债，次日目标增加；连续欠债最多累计 120min
- 待重背：抽查/拼写/验收不达标的词次日优先复习，重背完成后自动清除
- 时间盒：所有训练受计时器约束，超时自动收工，避免刷时长

## 📊 数据规模

- **词汇库**：4,237 个词汇（PET基础 2,014 + IELTS进阶 1,941 + 真题精选 282）
- **写作题**：30 道剑桥真题（Task 1 × 15, Task 2 × 15）
- **来源**：Cambridge IELTS 1-21 真题

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18, Vite, Tailwind CSS 3, React Router v6, Recharts, Lucide React |
| 后端 | Node.js, Express.js |
| 数据库 | SQLite (better-sqlite3) |
| AI | DeepSeek API (deepseek-chat) |
| 状态 | React Context + useReducer |

## 📝 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/topics` | 话题列表及统计 |
| GET | `/api/words?topic=&page=&limit=&search=` | 分页获取单词 |
| GET | `/api/spelling-test?topic=&count=` | 获取拼写测试题目 |
| POST | `/api/spelling-test` | 提交拼写结果 |
| GET | `/api/review-words` | 今日待复习单词 |
| POST | `/api/review-result` | 提交复习结果 |
| GET | `/api/wrong-words` | 错词本 |
| GET | `/api/writing-questions?task_type=` | 写作题目 |
| GET | `/api/writing-questions/:id` | 单题详情 |
| POST | `/api/essays/submit` | 提交作文+批改 |
| GET | `/api/essays/:id/result` | 批改结果 |
| GET | `/api/essays/history` | 历史记录 |
| GET | `/api/stats/overview` | 学习概览 |
| GET | `/api/daily-plan` | 今日简报（目标时长/欠债/今日内容/待重背/抽查任务） |
| POST | `/api/daily-plan/spot-check` | 提交抽查结果（≥80% 通过，否则标记待重背） |
| POST | `/api/training/start` | 开始训练会话（PET热身/英译中/拼写/验收） |
| POST | `/api/training/complete` | 完成训练会话（记录时长+正确率） |
| POST | `/api/training/abandon` | 中止训练会话 |
