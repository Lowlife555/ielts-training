# Claude Code 操作手册 — IELTS 训练网站 v4.0 开发流程

> 本手册指导你如何最高效地使用 Claude Code 完成 v4.0 开发。
> 配套文件：CLAUDE.md（项目记忆，自动加载）、PROMPTS.md（5 条任务提示词）、server/db/ielts_list_map.json（词库映射）。

---

## 〇、三个文件怎么用

| 文件 | 作用 | 你需要做什么 |
|------|------|--------------|
| `CLAUDE.md` | 项目记忆。Claude 每次会话**自动加载**，无需手动引用 | 什么都不用做，放对位置即可 |
| `PROMPTS.md` | 任务清单。5 条任务（P0-1 词库 → P0-2 流程 → P0-3 欠债 → P1-4 抽查 → P1-5 释义） | 执行时让 Claude 自己读，**不要整篇粘贴** |
| `server/db/ielts_list_map.json` | 词库映射（word → list_no），P0-1 的数据基础 | Claude 会自动读取 |

**核心原则**：永远让 Claude 读文件，而不是把内容贴进对话。省 token、不遗漏、上下文干净。

---

## 一、准备工作（一次性）

### 1.1 环境确认
```powershell
# Windows PowerShell 或 CMD
cd D:\ielts-training
git status          # 应为干净状态
npm --version       # 确认 Node 可用
```

### 1.2 启动 Claude（带词库目录授权）
```powershell
cd D:\ielts-training
claude --add-dir "C:\Users\15782\Downloads\雅思训练词库"
```
- `--add-dir` 让 Claude 能读取项目外的词库源文件（否则 P0-1 解析 PDF 会被权限拦截）。
- 首次进入某目录会问"是否信任此文件夹"，回车确认（默认 Yes）。
- 建议用**交互式模式**（不带 -p），因为开发过程需要确认与迭代。

### 1.3 验证 Claude 已就绪
启动后输入这句话，确认上下文正确：
```
请用一句话确认：你已加载 CLAUDE.md 吗？词库源文件路径是什么？PROMPTS.md 里有几个任务？
```
预期回答：已加载；C:\Users\15782\Downloads\雅思训练词库；5 个任务（P0-1 到 P1-5）。

---

## 二、任务执行模板（每个任务都照这个套路）

### 2.1 标准任务指令（复制即用）

```
请阅读 PROMPTS.md 中的【P0-1】，完整执行该任务。

执行要求：
1. 开始前，先用 3-5 条简要列出你的执行计划，等我确认后再动手；
2. 执行中每完成一个关键步骤，简报进度（做了什么、结果如何）；
3. 完成后，逐条对照 PROMPTS.md 里的验收标准自检，并给出验证证据（统计输出 / curl 结果 / 截图）；
4. 如遇权限拦截、依赖缺失、API 失败，先停下来告诉我，不要自行绕过；
5. 全部通过后，更新 CONVERSATION-HISTORY.md，追加 v4.0 的本次任务记录；
6. 最后执行 git 提交，commit message 用：v4.0-P0-1: 词库整理与导入
```

把【P0-1】换成【P0-2】/【P0-3】/【P1-4】/【P1-5】即可复用。

### 2.2 为什么这样设计（理解后你会用得更好）

| 要求 | 目的 |
|------|------|
| 先列计划等你确认 | 防止 Claude 方向跑偏，你确认后它执行更坚决；省掉返工 |
| 每步简报进度 | 大任务卡住时你能及时发现，而不是最后才发现全错 |
| 对照验收标准自检 | PROMPTS.md 每条都有硬指标，让 Claude 自己证明做完了 |
| 遇阻停下报告 | 权限/API 问题你比它清楚上下文，硬闯会浪费时间 |
| 更新 CONVERSATION-HISTORY.md | 保留决策记录，未来会话 /compact 后还能追溯 |
| 每个任务一次 git 提交 | 出问题可精确回滚（git reset / revert 到上一个任务） |

---

## 三、高效开发模式（进阶）

### 3.1 权限模式建议
- **默认（Normal）**：文件写入会询问，适合需要监督的阶段。
- **Shift+Tab 切到 acceptEdits**：自动接受文件编辑、仍询问危险命令——**推荐开发期使用**，减少打断又保留安全网。
- 不要用 `--dangerously-skip-permissions`（跳过所有确认），本地项目虽风险低，但一旦误删数据（如数据库重置）无法撤销。

### 3.2 上下文管理（省 token、防跑偏）
- 每个任务**建议新开会话**：`Ctrl+D` 退出后重新 `claude`。任务间上下文不污染，Claude 每次以 CLAUDE.md 为准，行为更可预测。
- 任务中途上下文过大时，让 Claude 执行 `/compact focus on P0-1 remaining steps`，压缩历史但保留任务焦点。
- 随时可用 `/cost` 查看消耗，`/context` 查看上下文占用（>70% 就该 compact）。

### 3.3 模型与速度
- 默认模型（sonnet）对这类全栈开发足够；P0-1 词库解析量大，可在启动时 `claude --model sonnet`（默认）。
- 简单验证类提问（"这个 bug 在哪"）可临时 `/model haiku` 省成本，改代码前切回。
- 需要深度推理时在提示词里加 `ultrathink` 关键词（触发最高推理强度）。

### 3.4 git 工作流
```
任务完成 → git log 看提交记录 → 每任务一 commit，信息带任务号（v4.0-P0-1: ...）
出问题 → git log 找到上一个任务提交 → git reset --hard <上一个commit> 回滚
```
- 建议让 Claude 自己提交（见 2.1 第 6 条），你只负责抽查 `git log --oneline`。
- **关键节点（P0-1 完成后）手动确认一次**：`git show --stat HEAD` 看改了哪些文件，确认数据库迁移脚本在列。

### 3.5 验证循环（每个任务标配）
1. 后端 API：`curl http://localhost:3001/api/health` + 任务相关端点（P0-3 的 5 个场景、P1-4 的抽查模拟）。
2. 前端页面：浏览器开 `http://localhost:5174` 手动走流程。
3. 数据库：`sqlite3 server/db/ielts.db "SELECT list_no, COUNT(*) FROM words GROUP BY list_no"`（Windows 无 sqlite3 就让 Claude 用 node 查）。
4. 回归：确认旧功能（写作模块、快捷键、语音）没被改坏——**P0-1 改数据库后务必跑一次现有页面**。

---

## 四、常见问题速查

| 现象 | 原因 | 处理 |
|------|------|------|
| Claude 读不到 C:\Users\15782\Downloads 的文件 | 项目外路径未授权 | 启动时加 `--add-dir "C:\Users\15782\Downloads\雅思训练词库"` |
| P0-1 解析 PDF 乱码/空文本 | PDF 是 CID hex 编码字体 | 提示 Claude 用带 ToUnicode 的解析器（pymupdf），CLAUDE.md 已注明此坑 |
| DeepSeek API 超时/失败 | 网络或限流 | 让 Claude 分批（20-50 词/批）+ 重试 + 断点续跑（PROMPTS.md P1-5 已写） |
| `npm run setup` 重建后 list_no 丢失 | 迁移脚本未接入 setup | P0-1 验收标准第 5 条就是查这个，让 Claude 补上 |
| 上下文 >70% 回答开始变笨 | 上下文过载 | `/compact focus on <当前任务>` |
| 一个任务做完发现改坏了旧功能 | 回归没做 | git 回滚到该任务前，重做并补回归验证 |

---

## 五、全程路线图（照这个顺序推进）

```
[启动]  claude --add-dir "C:\...\雅思训练词库"
   │
   ├─ P0-1 词库整理与导入 ──→ 验证: 每List词数/IELTS≥2325/setup可重建 ──→ git commit
   │        ↑ 数据基础，必须第一个做
   ├─ P0-2 今日简报+每日流程 ──→ 验证: 浏览器走全流程 ──→ git commit
   ├─ P0-3 时间盒与欠债 ──→ 验证: curl 5个场景 ──→ git commit
   ├─ P1-4 抽查机制 ──→ 验证: 模拟抽查 ──→ git commit
   └─ P1-5 释义深度扩充 ──→ 验证: 抽验20词 ──→ git commit
                 │
                 └─ 收尾: 更新 README / TEST-REPORT，全部完成
```

**时间预估**（参考）：P0-1 最大（词库解析+迁移，可能 1-2 小时含验证）；P0-2/P0-3 各 1 小时左右；P1-4/P1-5 各 30-60 分钟。**每个任务之间休息一下、自己跑一遍页面**，比一口气跑完更稳。

---

## 六、黄金法则

1. **让 Claude 读文件，不要粘贴内容** —— 省 token、不遗漏。
2. **每个任务先确认计划再动手** —— 30 秒的确认省 30 分钟的返工。
3. **每任务一提交** —— 可回滚就是安全感。
4. **验收标准是硬指标** —— PROMPTS.md 里的验收必须逐条看到证据，不要听 Claude 说"应该没问题"。
5. **遇阻停下问人** —— 权限、API、网络问题，你比 Claude 更了解上下文。
