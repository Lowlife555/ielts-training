# 📚 IELTS 6.5 智能备考训练网站

基于 React + Express + SQLite 的雅思（IELTS）6.5 分目标备考平台，包含**单词背诵**和**写作训练**两大核心模块。

## 🚀 快速启动

```bash
# 1. 安装依赖
cd client && npm install
cd ../server && npm install

# 2. 初始化数据库（建表 + 导入 282 个核心词汇 + 30 道写作真题）
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
│   │   │   └── History.jsx         # 历史记录（趋势图）
│   │   ├── context/AppContext.jsx   # 全局状态
│   │   ├── hooks/useKeyboard.js    # 键盘快捷键 Hook
│   │   └── utils/api.js            # API 调用封装
│   └── vite.config.js         # Vite 配置（含代理）
│
├── server/                    # Express 后端
│   ├── db/
│   │   ├── database.js             # 数据库连接
│   │   ├── migrate.js              # 建表迁移脚本
│   │   └── seed.js                 # 种子数据（282词 + 30题）
│   ├── routes/                # API 路由
│   │   ├── topics.js               # GET /api/topics
│   │   ├── words.js                # GET /api/words
│   │   ├── spellingTest.js         # GET/POST /api/spelling-test
│   │   ├── reviewWords.js          # GET /api/review-words
│   │   ├── reviewResult.js         # POST /api/review-result
│   │   ├── wrongWords.js           # GET /api/wrong-words
│   │   ├── writingQuestions.js     # GET /api/writing-questions
│   │   ├── essays.js               # POST /api/essays/submit
│   │   └── stats.js                # GET /api/stats/overview
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

## 📊 数据规模

- **词汇库**：282 个核心高频词汇（8 个话题 × 约 35 词）
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
