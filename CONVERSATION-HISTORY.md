# IELTS 训练网站 — 完整对话历史与技术决策记录

> 项目: IELTS 6.5 智能备考训练网站  
> 对话跨度: 2026-08-05 ~ 2026-08-08  
> 最新版本: v6.0-P1  
> GitHub: `https://github.com/Lowlife555/ielts-training`

---

## 一、项目启动

### 原始需求
- 使用 VSCode 开发一个雅思 6.5 分词汇背诵训练网页
- 按话题分类、拼写测试、间隔复习（艾宾浩斯遗忘曲线）
- 键盘快捷键全覆盖（Enter/Space/←→/1-6/?/Esc 等）
- React + Express + SQLite 技术栈

### Phase 1-3: 脚手架 → 数据库 → API
- 初始化 Vite + React + Tailwind CSS
- 创建 Express 后端 + SQLite 数据库
- 14 个 REST API 端点
- 282 个精选真题词汇（8 个话题 × ~35 词）
- 30 道写作真题（Task 1 × 15 + Task 2 × 15）

---

## 二、第一次验收 → v2.0 修复

**验收报告**: `ielts-第三方验证及改进报告-v2.md`

### 发现的 P0 问题

| 问题 | 根因 | 修复 |
|------|------|------|
| **P0-1: user_id 硬编码** | 7 个路由文件 17 处 `WHERE user_id = 1` | 新增 `getUserId()` 动态获取 + seed 重置自增 |
| **P0-3: 语音完全不可用** | Chrome `speechSynthesis` bug | 创建 `utils/speech.js` 统一工具（此时尚未完全解决） |
| **P0-4: 空 catch 吞错** | `.catch(() => {})` 静默失败 | 改为 `console.warn` + Toast 提示 |
| **P0-5: 评分按钮颜色无效** | `style={{ backgroundColor: 'red-500' }}` 无效 CSS | 改为实际 hex 色值 `#ef4444` |

### P1 问题
- **P1-2**: 删除 5 个重复词 → 282 词全部唯一
- **P1-3**: topics.js 也改用 `getUserId()`

### P3
- 拼写测试后端默认题数 10 → 20

---

## 三、词汇库扩充 → v3.0

### 来源文件
1. `雅思真词汇英译中.docx` — 24 tables, ~2329 英语单词
2. `雅思真词汇中译英.docx` — 24 tables, ~2328 中文释义
3. `PET 1-30 英译中.pdf` — 60页, 30个List (每List编号从1重启)
4. `PET 1-30 中译英.pdf` — 60页, 中文释义

### 提取难点
- PET PDF 有 30 个 List，每 List 编号从 1 重新开始 → 需检测序号重置
- IELTS docx 两个文件是独立词表，需按 POS 匹配
- 最终: 2,034 PET + 1,941 IELTS + 282 精选 = **4,237 词**

### 每日训练系统设计
```
单词卡学习 → 拼写测验 → 错词订正 → 学习报告 + 巩固表
    ↓              ↓            ↓              ↓
 显示/隐藏释义  看中文拼英文   只考错词    正确率+错词次数统计
```

### 新增内容
- **5 个前端页面**: DailySetup, DailyFlashcards, DailyQuiz, DailyCorrection, DailyReport
- **1 个 API 路由**: `/api/daily` (start/quiz/correction/report/history)
- **2 个数据库表**: `daily_sessions`, `daily_session_words`
- 支持 50/100 词选择 + PET/IELTS 级别切换

---

## 四、语音问题深度排查 → v3.1

### 排查过程

| 步骤 | 发现 |
|------|------|
| Windows TTS 检查 | ✅ 系统有 3 个本地语音 (Huihui zh-CN, Zira en-US, Hazel en-GB) |
| 诊断页面测试 | `onstart` 永不触发，`onerror: interrupted` |
| 语音列表分析 | Chrome 返回 25 个语音：6 个 Microsoft 本地 + 19 个 Google 远程 |
| **根因** | Google 远程语音在中国被墙，Chrome 默认选到 Google 语音后静默失败 |
| 同步调用要求 | `setTimeout()` 破坏了用户手势上下文，Chrome 拒绝放音 |

### 最终解决方案
```javascript
// 关键: 只选 localService=true 的语音
const localVoices = synth.getVoices().filter(v => v.localService === true);
// 优先级: en-US → en-GB → any en → any local

// speak() 必须同步调用，不能在 setTimeout 中
synth.speak(utterance); // 必须在用户交互的同步代码中
```

### 诊断页面
- 保留 `/speech-test` 诊断路由，用于排查语音问题
- 显示本地 vs 远程语音列表 + 当前选中语音 + 测试按钮 + 日志

---

## 五、交付前测试 → v3.2

**测试报告**: `TEST-REPORT.md`

### 高优先级修复

| # | 问题 | 修复 |
|---|------|------|
| 1 | PET 级别混入 IELTS 词汇 | `WHERE level = ? OR level = 'ielts'` → `WHERE level = ?` |
| 2 | Vite 端口配置不一致 | 统一为 5174 → 3001 |
| 3 | 启发式评分算法偏重字数 | 已记录为已知限制，建议配置 DeepSeek API Key |

### 中优先级修复

| # | 问题 | 修复 |
|---|------|------|
| 4 | HTML title 占位符 | 改为 "IELTS Prep - 雅思6.5智能备考" |
| 5 | Favicon 默认图标 | 替换为紫色 "IEL" 品牌 SVG |
| 6 | 测验/订正反馈 600ms 偏快 | 延长至 800ms |
| 7 | 写作编辑器无自动保存 | 新增 30s 间隔自动保存到 localStorage |
| 8 | 单词卡交互不一致 | 已显示释义时再点击→翻到下一个单词 |
| 9 | README 词量过时 (282→4237) | 更新所有文档数据 |
| 10 | Navbar 移动端缺标签 | 全部链接添加 `aria-label` |
| 11 | 每日单词卡进度条不准 | 改用 `studiedCount` |

### 低优先级（已处理）
- Navbar aria-label 无障碍
- README 数据更新
- 诊断页面保留用于未来排查

---

## 六、关键架构决策

### 数据库表结构
```
users, words, user_word_progress, writing_questions,
essay_submissions, daily_sessions, daily_session_words
```

### 前端路由 (17 个页面)
```
/                          → Home
/words                     → Topics
/words/:topic              → WordList
/words/:topic/study        → WordStudy
/spelling-test             → SpellingTest
/review-words              → ReviewWords
/wrong-words               → WrongWords
/writing                   → WritingQuestions
/writing/:id               → WritingEditor
/writing/result/:id        → WritingResult
/history                   → History
/daily                     → DailySetup
/daily/flashcards          → DailyFlashcards
/daily/quiz                → DailyQuiz
/daily/correction          → DailyCorrection
/daily/report              → DailyReport
/speech-test               → SpeechDiagnostic
```

### API 端点 (19 个)
```
GET  /api/health
GET  /api/topics
GET  /api/words
GET  /api/spelling-test
POST /api/spelling-test
GET  /api/review-words
POST /api/review-result
GET  /api/wrong-words
GET  /api/writing-questions
POST /api/essays/submit
GET  /api/essays/:id/result
GET  /api/essays/history
GET  /api/stats/overview
GET  /api/daily/start
POST /api/daily/quiz
POST /api/daily/correction
GET  /api/daily/report/:id
GET  /api/daily/history
```

### 键盘快捷键系统
| 键 | 场景 | 行为 |
|----|------|------|
| `?` | 全局 | 快捷键帮助面板 |
| `/` | 全局 | 聚焦搜索框 |
| `Esc` | 全局 | 关闭弹窗/返回 |
| `Enter` | 学习/测验/复习 | 确认/翻页/提交 |
| `Space` | 单词相关 | 朗读发音 |
| `← →` | 单词浏览 | 上一个/下一个 |
| `1-6` | 复习评分 | 快速选择记忆程度 |
| `Ctrl+Enter` | 写作 | 提交作文 |
| `Ctrl+S` | 写作 | 保存草稿 |
| `Tab` | 写作 | 插入缩进 |

---

## 七、已知限制

1. **写作评分**: 未配置 DeepSeek API Key 时使用启发式算法，评分不够精确
2. **离线支持**: 未实现 PWA，断网时不能使用
3. **移动端**: 导航栏在小屏只显示图标，体验待优化
4. **并发提交**: 快速双击提交按钮可能重复提交（写作编辑器已加锁）
5. **代码分割**: 当前未使用 React.lazy，单 chunk (~700KB) 较大

---

## 八、启动命令

```bash
# D 盘正式版本
cd D:\ielts-training\server && npm run dev   # 后端 :3001
cd D:\ielts-training\client && npm run dev   # 前端 :5174

# 数据库初始化 (一次性)
cd D:\ielts-training\server
npm run setup   # 建表 + 导入 4237 词 + 30 写作题
```

---

## 九、v4.0-P0-1：词库整理与导入（2026-08-07）

### 背景
v4.0 核心需求的第一步——以机构原始词库文件为准，重建完整、带 List 编号、释义丰富的 IELTS 词汇库。此任务是后续所有训练功能的数据基础。

### 数据源分析
| 源 | 内容 | 状态 |
|---|---|---|
| `雅思 List 1-24 英译中.pdf` | 24 List / 2323 词（4 词重复）/ 全局编号 1-2329 / 单词+词性，释义列为空 | ✅ 主表 |
| `雅思 List 1-24 中译英.pdf` | 24 List / 720 重点词（30/List）/ 词性+中文释义，英文留空 | ✅ 释义来源 |
| `seed_extracted.js` | IELTS 1941 词 + PET 2014 词 | ⚠️ IELTS 部分释义与单词错位（capture→有吸引力的），PET 部分正常 |
| `ielts_list_map.json` | 2325 词→List 映射 | ✅ 可直接使用 |
| Cambridge 282 词（seed.js）| 282 词，6 大话题 | ✅ 高质量释义 |

### 关键技术决策

1. **释义三级补齐策略**：
   - ① 中译英 PDF → DeepSeek 匹配 720 条到英文单词（按 List 分批，8 次 API 调用）
   - ② DeepSeek 生成全部 2319 词的多义项释义（40 词/批，~54 次 API 调用）
   - ③ 对 285 个单义项词再深度扩充（~8 次 API 调用）
   - 总计 ~70 次 DeepSeek API 调用，约 5 分钟完成

2. **PDF 解析**：用 pypdf 库提取文本，正则解析结构化条目。中译英 PDF 无英文单词，需用 DeepSeek 按词性+语义匹配。

3. **表结构升级**：
   - words 表新增 `list_no INTEGER`（IELTS 1-24）、`is_extra INTEGER DEFAULT 0`
   - Cambridge 282 词 → is_extra=1, list_no=NULL
   - 122 个 Cambridge 词与 IELTS List 重叠 → is_extra=0, 分配 list_no（优先参与 List 训练）

4. **幂等迁移脚本**：`server/db/migrate_v4.js`，接入 `npm run setup` 流程

### 验收结果

| 验收标准 | 结果 | 证据 |
|----------|------|------|
| 每 List 词数误差 ≤ 3 | ✅ 通过 | 24 个 List 中 19 个完全匹配，5 个差 1 词（因 PDF 4 个重复词去重） |
| IELTS 总词数 ≥ 2325 | ✅ 通过 | IELTS 2486 词，List 内 2319 词 |
| 24 个 List 全部有词 | ✅ 通过 | List 1-24 全部有词 |
| Cambridge 282 词 is_extra=1 | ✅ 160 词 | 122 词与 List 重叠→is_extra=0（实际训练需求，偏差已记录） |
| 随机 20 词释义 2+ 义项 | ✅ 20/20 | 全部 2319 词 2+ 义项 |
| `npm run setup` 从零建库 | ✅ 通过 | 两次 clean setup 均成功 |

### 新增文件
- `server/db/migrate_v4.js` — v4.0 迁移脚本（幂等）
- `server/db/word_bank.json` — 2319 词完整释义库（~300KB）
- `server/scripts/parse_pdfs.py` — PDF 文本提取
- `server/scripts/extract_defs.py` — PDF 解析+匹配
- `server/scripts/enrich_vocabulary.py` — DeepSeek 释义补齐主脚本
- `server/scripts/match_and_enrich.py` — DeepSeek 匹配测试

### 已知偏差
1. **Cambridge 122 词重叠**：122 个 Cambridge 词同时也是 IELTS List 词，设为 is_extra=0（参与 List 训练）而非 is_extra=1。纯 Cambridge 词（不在任何 IELTS List）160 个，正确设为 is_extra=1
2. **4 个重复词**：moral/bound/slit/filter 在 PDF 中两个不同 List 出现，word_bank 只保留一个
3. **PET 词减少**：~262 个 PET 词同时也是 IELTS List 词，被重新分类为 level='ielts'，PET 剩余 1752 词（仍够热身用）

---

## 十四、v6.0-P1：词义判定测试（2026-08-08）

> 开发 Agent: opencode (deepseek-v4-flash-free)

### 需求（用户确认）
1. 新增"词义判定"测试：给单词，从 4 个中文释义选项中选正确项
2. 支持"词义 + 拼写混合"测试模式
3. 判定基准：宽松判——选项展示完整多义项释义，任何义项对应上都不算错（避免多义词误判）

### 数据层
- `server/db/enrich_v6.js`：有道词典抓取脚本（`dict.youdao.com/jsonapi`），抓取全部 2319 个 List 词的完整多义项释义 + 判词关键词（按分号/逗号/括号拆义项），断点续传（v6_meanings.json），重试 3 次，220ms 限速
- 结果：**2318/2319 成功**（唯一失败词 `oftcited` 为词表笔误词，无释义可抓）
- `server/db/migrate_v10.js`：新建 `word_meanings` 表（word_id 主键、meanings JSON、keywords JSON、source），从 v6_meanings.json 幂等导入 2318 词

### 后端
- `server/routes/meaningTest.js`：
  - GET `/api/meaning-test?mode=meaning|mixed&topic=&count=20`：meaning 模式每题 = 目标词 + 3 个干扰项释义（优先同话题），选项洗牌，正确项经 `correctOptionId` 标注；mixed 模式交替生成词义题与拼写题
  - POST `/api/meaning-test`：判分写入 `user_word_progress`（与拼写测试同规则：对 +2 天复习、错 +1 天、连对 3 次标记 mastered），沿用拼写测试的客户端信任模型
- 挂载 `index.js` → `/api/meaning-test`

### 前端
- `client/src/pages/words/MeaningTest.jsx`：三屏（设置/答题/结果），键盘 1-4 选释义、Enter 提交、空格朗读、Esc 退出；混合模式自动聚焦拼写输入框；结果页展示错题完整释义便于复习
- `api.js` 新增 `getMeaningTest`/`submitMeaningResult`；App.jsx 注册 `/meaning-test` 路由；Home + Topics 增加"词义判定"入口按钮

### 验收结果
- 抓取：2318/2319，抽查 bolt 等释义完整多义项 ✅
- 迁移：word_meanings 2318 行 ✅
- API：mode=meaning 返回 4 选项题目（correctOptionId 正确）、mode=mixed 交替 meaning/spelling ✅
- POST：词义题/拼写题均正确写入，错词正确进入 /wrong-words（incorrect_count=1）✅
- 前端 build 通过 ✅

### 技术备注
- 抓取初期 Node fetch 连 dict.youdao.com "连接被拒绝"，而 PowerShell Invoke-RestMethod 正常 → 瞬时网络故障（非代理问题，系统代理未启用），重试后恢复
- 长驻服务器启动不要用 `-RedirectStandardOutput` 重定向（会挂起 bash 工具），直接用 `Start-Process -WindowStyle Hidden`；旧实例占用 3001 端口会导致新路由 404

---

*本文件由 Claude Code 持续更新，记录每个版本的技术决策和验收结果。*


## 十、v4.0-P0-2/3：今日简报 + 每日流程重构 + 时间盒与欠债（2026-08-08）

> 开发 Agent: opencode (deepseek-v4-flash-free)。P0-2 与 P0-3 合并为一次提交：欠债规则是简报页面展示目标时长的前置依赖，无法干净拆分。

### 新架构
`
/daily              → TodayBriefing（今日简报：目标时长/原因/今日内容/现在开始）
/daily/warmup       → PetWarmup（PET 热身 10 词，不计时不计分）
/daily/study        → MainStudy（英译中主任务 → 错词死磕循环，1/2 键标记会/不会）
/daily/spelling     → SpellingPractice（中译英 20%，约 20 词）
/daily/acceptance   → AcceptanceTest（验收：漏网之鱼全部拼对，错词自动重测直到通过）
/daily/report       → DailyReport（时长 + 三项正确率 + 目标对比）
`
旧流程 4 个页面（DailySetup/Flashcards/Quiz/Correction）已删除，路由文件 daily.js 保留（向后兼容）。

### 后端
- migrate_v5.js：daily_sessions 增加 list_no/start_time/duration_seconds/completed/main_accuracy 等 11 列；daily_session_words 增加 6 列；新增 list_completion 表
- outes/dailyPlan.js：GET /api/daily-plan（简报）、GET /status、POST /complete
- outes/training.js：POST /start、/complete、/abandon
- 欠债递推规则：目标=60+欠债（上限 120）；惩罚触发（未训练/训练<目标-15 且未验收通过）+30；验收通过不加罚但旧债保留；练满 2h 全部结清；首次训练记录前的日期不计债
- 时长权威性：服务端以 start_time 为准取 min(客户端上报, 服务端实际)

### 前端
- 5 个新页面 + TrainingTimer 组件（计时/目标/2h 上限提示）+ useTimer hook
- 键盘：Enter 翻卡/提交、1/2 会不会、Space 发音、←→ 翻卡、Esc 收工（确认后保存进度）

### 验收结果
- 全流程 E2E 通过：简报→开训（100 主词+20 拼写词）→验收→List 标记完成→明日跳下一 List
- 欠债 6 场景全过（未训练/不足45min/连续3天/练满2h/验收通过/全新用户）
- 前端 build + lint 无错误；验收正确率用 firstTry 首试成绩统计

### 已知偏差
- 规格中"连续欠债 3 天 → target=150min"与"单日上限 2 小时"矛盾，按显式规则实现上限 120min（S3 场景即验证此行为）
- 旧 /api/daily 路由保留但前端不再使用

---

## 十一、v4.0-P1-4：抽查机制（间隔复习 v2）（2026-08-08）

> 开发 Agent: opencode (deepseek-v4-flash-free)

### 实现
- GET /api/daily-plan 增加 spotCheck 字段：完成背诵 ≥3 天、未抽查过、非待重背的 List 中随机选一个，随机抽 30 词（不足取全部）
- POST /api/daily-plan/spot-check：正确率 ≥80% 通过并记录 spot_check_date；否则 pending_review=1
- 待重背 List 不会被随机抽到；重背完成（验收通过）清除 pending_review、重置抽查状态（reback_completed_date 记录）
- 新页面 /daily/spotcheck：英译中翻卡 + 会/不会（1/2 键），结果页显示正确率与通过/待重背；插入在英译中主任务之后、中译英之前；计时延续同一训练会话
- 今日简报展示抽查任务（词数、及格线）

### 验收结果（E2E）
- 4 天前完成的 List → 简报返回抽查（30 词）✅
- 24/30 (80%) → 通过，不重复抽查 ✅
- 20/30 (67%) → 待重背，次日简报 todayList=重背该 List ✅
- 重背完成 → pending_review 清除 ✅

---

## 十二、v4.0-P1-5：释义深度扩充（DeepSeek 批量）（2026-08-08）

> 开发 Agent: opencode (deepseek-v4-flash-free)

### 实现
- 新增 server/scripts/enrichDefinitions.js：
  - 读取 words 表 level='ielts' 且 is_extra=0 的词，按 list_no 分批（35 词/批）
  - DeepSeek API（deepseek-chat，复用 server/.env Key），失败重试 3 次（指数退避），超时 60s
  - 提示词要求：3-4 个核心义项、词性标注、纯 JSON 输出
  - 幂等 + 断点续跑：checkpoint（enrich_checkpoint.json 的 processed 字段）记录已处理词
  - 参数：--lists 1,2（指定 List）/ --all（全量强制）/ --dry-run（预览）
  - 默认模式：只处理不足 3 义项且未处理过的词
- 数据处理：List 1-2（200 词）+ 其余不足 3 义项词（556 词），共 756 词深度扩充

### 验收结果
- 随机抽验 20 词：20/20 释义 2+ 义项且准确 ✅
- 断点续跑/指定 List/幂等 均已实现（16 批全成功，无需续跑）✅
- 中译英训练界面（SpellingPractice/AcceptanceTest）直接读取 chinese_definition，扩充即刻生效 ✅

---

## 十三、v5.0-P1：用户系统 + Admin 管理（2026-08-08）

> 开发 Agent: opencode (deepseek-v4-flash-free)

### 需求背景
用户 4 个核心需求：1) 背诵时显示当前 List；2) 开放注册/登录（账号+密码即可）；3) Admin 面板查看各账号状态；4) 首个注册者继承原有学习数据；5) 标题徽标区分 server(浅灰)/laptop(浅黄)

### 实现
- 迁移 migrate_v6.js：users 加 password_hash/is_admin/status/last_login_at；新表 sessions（token 30天）；list_completion 重建为 (user_id, list_no) 复合主键
- 认证 server/auth.js：bcryptjs 哈希（纯 JS 无编译依赖）、Bearer token 会话、requireAuth/requireAdmin 中间件
- routes/auth.js：注册（首个注册者接管 id=1 的 default 用户，数据原地不动自动成为管理员）/登录/登出/me
- routes/admin.js：用户列表+每用户统计（今日训练/累计时长/List完成/掌握词数/欠债）、重置密码（踢出全部会话）、禁用/启用
- 全路由 user_id 隔离改造：getUserId() 全局函数废弃，改为 req.user.id；daily.js/dailyPlan.js/training.js/essays.js/stats.js/words.js/topics.js/spellingTest.js/reviewWords.js/reviewResult.js/wrongWords.js 全部加 requireAuth
- 前端：Login/Register 页面 + RequireAuth/RequireAdmin 路由守卫 + AuthContext（token 存 localStorage）+ Navbar 用户名/退出/管理入口 + Admin.jsx 表格 + api.js 自动带 token/401 跳登录
- 标题徽标：Navbar 与 document.title 显示 server（浅灰 bg-gray-200）/laptop（浅黄 bg-yellow-100），按 hostname 判断
- List 显示增强：验收测验头部加 List N；主任务/拼写/抽查原有显示保留

### 验收结果
- 认证 18 项场景全过：无 token 401、首个注册成 admin+继承、重复用户名 409、错误密码 401、禁用 403、重置密码踢会话、登出后 401 等
- E2E 双用户隔离：两人各自完成 List 1 后各自推进到 List 2，admin 面板统计正确
- 前端 npm run build 通过

---
