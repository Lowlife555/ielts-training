# IELTS 训练网站 — 完整对话历史与技术决策记录

> 项目: IELTS 6.5 智能备考训练网站  
> 对话跨度: 2026-08-05 ~ 2026-08-07  
> 最终版本: v3.2  
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

*本文件由 Claude Code 于会话结束时生成，记录了完整的技术决策、问题排查和修复历程。*
