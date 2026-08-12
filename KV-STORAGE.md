# 用户记忆 KV 存储系统

> 版本：v14.0 | 日期：2026-08-12

## 一、设计目标

**一句话：以后新增任何用户数据字段都不需要再写数据库迁移脚本。**

用户设置、偏好、UI 状态等非高频非关系型数据统一走 `user_kv` 表存储，通过 REST API 读写。新增字段只需在前端调用 `set('newFeature.enabled', true)`，后端零改动。

## 二、架构概览

```
前端 useUserKV() hook
  ├── 内存缓存（React state，读写 O(1)）
  ├── localStorage 缓存（跨会话加速启动）
  └── 服务端 user_kv 表（持久化，SQLite）
       ├── PUT /api/user-kv   → 批量 upsert
       ├── GET /api/user-kv   → 读取（支持 keys 过滤）
       └── DELETE /api/user-kv/:key → 删除
```

## 三、数据库设计

### user_kv 表

```sql
CREATE TABLE user_kv (
  user_id   INTEGER NOT NULL,          -- 用户 ID
  key       TEXT    NOT NULL,          -- 键名（命名空间.camelCase）
  value     TEXT    NOT NULL DEFAULT '""', -- JSON 值
  updated_at TEXT   NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, key),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_user_kv_user ON user_kv (user_id);
```

### Key 命名规范

| 命名空间 | 示例 | 说明 |
|----------|------|------|
| `settings.*` | `settings.voiceSource` | 用户偏好设置 |
| `ui.*` | `ui.sidebarCollapsed` | UI 状态 |
| `training.*` | `training.lastListNo` | 训练进度标记 |
| `writing.*` | `writing.autoSaveEnabled` | 写作模块偏好 |
| `review.*` | `review.intervalModifier` | 复习算法参数 |

**规则**：`namespace.camelCaseKey`，用 `.` 分隔，全部小写开头。

### 已迁移的数据

| 旧列 (user_settings) | KV Key | 类型 | 默认值 |
|----------------------|--------|------|--------|
| `voice_source` | `settings.voiceSource` | string | `"local"` |
| `voice_accent` | `settings.voiceAccent` | string | `"us"` |
| `show_phonetic` | `settings.showPhonetic` | boolean | `true` |
| `rest_minutes` | `settings.restMinutes` | number | `5` |
| `base_target_minutes` | `settings.baseTargetMinutes` | number | `60` |

> **注意**：`user_settings` 表保留不删（兼容运行），但新代码应优先使用 KV API。

## 四、API 文档

### GET /api/user-kv

获取当前用户全部 KV。

**查询参数**：
- `?keys=k1,k2,k3` — 仅返回指定 key（逗号分隔）

**响应**：
```json
{
  "settings.voiceSource": "local",
  "settings.voiceAccent": "us",
  "settings.showPhonetic": true
}
```

### GET /api/user-kv/:key

获取单个 key。不存在返回 404。

### PUT /api/user-kv

批量写入/更新。Body 为 `{ "key": value }` 对象，value 可以是任意 JSON 值。

**请求**：
```json
{
  "settings.voiceSource": "youdao",
  "ui.darkMode": true,
  "training.lastListNo": 5
}
```

**响应**：返回写入后的完整对象（同上）。

### DELETE /api/user-kv/:key

删除单个 key。幂等（不存在的 key 也返回 200）。

## 五、前端用法

### useUserKV() Hook

```jsx
import { useUserKV } from '../context/UserKVContext';

function MyComponent() {
  const { get, set, remove, getAll, loading, refresh } = useUserKV();

  // 读（同步，从缓存读取）
  const voiceSource = get('settings.voiceSource') || 'local';

  // 写（乐观更新，异步同步服务端）
  const changeVoice = async (source) => {
    try {
      await set('settings.voiceSource', source);
    } catch (err) {
      console.warn('保存失败', err);
    }
  };

  // 删
  const resetKey = async () => {
    await remove('ui.someTemporaryFlag');
  };

  // 批量读
  const all = getAll();
  console.log('当前所有 KV:', all);

  // 强制刷新
  await refresh();
}
```

### 同步策略

| 层 | 行为 |
|----|------|
| 内存缓存 | `set()` 立即更新 React state，组件即时重渲染 |
| localStorage | 每次 set/remove 后同步写入 `ielts_kv_{userId}` |
| 服务端 | `set()` 异步 PUT 到 `/api/user-kv`，失败则回滚内存 + localStorage |

**冲突处理**：最后写入者胜出（Last-Write-Wins）。因为这是单用户本地应用，不存在多设备并发写入场景。

## 六、迁移脚本

```bash
cd server && node db/migrate_v14.js
```

- **幂等**：可重复执行，INSERT OR IGNORE 保证不重复
- **行为**：创建 user_kv 表 → 读取 user_settings → 写入 KV → 保留旧表
- **验证**：执行后检查 `SELECT COUNT(*) FROM user_kv` 应为 `用户数 × 5`

## 七、适用性评估

### ✅ 适合用 KV 存储的数据

| 特征 | 示例 |
|------|------|
| 以用户为维度，按 key 精确读写 | 设置项、偏好、开关 |
| 写入频率低（分钟级） | UI 状态、主题选择 |
| 结构简单、独立 | 单个配置值 |
| 未来可能新增字段 | 新功能的用户偏好 |

### ❌ 不适合用 KV 存储的数据

| 特征 | 表名 | 原因 |
|------|------|------|
| **高频读写**（每次答题都更新） | `user_word_progress` | 每个词 ~4000 行/用户，需按 `next_review_date` 范围查询、按 `mastered` 过滤——KV 需全量加载到内存再 JS 过滤，性能极差 |
| **需要聚合/统计查询** | `daily_sessions` | 需 SUM(duration_seconds)、AVG(accuracy)、GROUP BY date——SQL 聚合是 KV 做不到的 |
| **关系型数据**（JOIN） | `daily_session_words` | session ↔ word 关联，需连表查询 |
| **复合条件查询** | `user_word_progress` | SM-2 算法需要 `WHERE user_id=? AND next_review_date <= date() AND mastered=0 ORDER BY next_review_date` |

### 结论

**"全部用户数据改 KV"不现实，也不正确。** KV 适合**配置/偏好/状态标记**类数据（`user_settings` 已迁移），不适合**高频结构化训练数据**（`user_word_progress` 等）。正确做法是：

- 配置/偏好 → **KV**（本文档方案）
- 训练记录 → 保留**结构化表**（列明确、可建索引、可 SQL 查询）
- 未来新增配置字段 → 直接 `set('namespace.newField', value)`，零迁移

## 八、未来扩展

### 新增一个设置项（示例：深色模式）

只需在前端调用，**无需任何后端改动**：

```jsx
// 存储
await set('ui.darkMode', true);

// 读取
const dark = get('ui.darkMode');
```

### 新增一个命名空间

同样零迁移，直接使用新前缀即可：

```jsx
await set('writing.fontSize', 16);
await set('writing.autoSaveInterval', 30);
```

### 性能考虑

- 当前单用户场景：KV 表数百行，全量加载 < 10ms
- 如果未来多用户且每用户数千 KV：GET 接口已支持 `?keys=` 过滤，按需加载
- value 列当前无大小限制，但建议单值 < 10KB（超出考虑单独文件/表）

## 九、改动的文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/db/migrate_v14.js` | 新增 | 创建 user_kv 表 + 迁移 user_settings |
| `server/routes/userKv.js` | 新增 | REST API（GET/PUT/DELETE） |
| `server/index.js` | 修改 | 挂载 `/api/user-kv` 路由 |
| `client/src/utils/api.js` | 修改 | 新增 getUserKV/setUserKV/deleteUserKV |
| `client/src/context/UserKVContext.jsx` | 新增 | useUserKV() hook + Provider |
| `client/src/App.jsx` | 修改 | 挂载 UserKVProvider |
| `KV-STORAGE.md` | 新增 | 本文档 |
