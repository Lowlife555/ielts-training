import { useEffect, useRef } from 'react';
import { api } from '../utils/api';

const LS_KEY = 'ielts_progress_snapshot';

export function saveLocalSnapshot(snapshot, key = LS_KEY) {
  try { localStorage.setItem(key, JSON.stringify(snapshot)); } catch { /* ignore */ }
}

export function loadLocalSnapshot(key = LS_KEY) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

export function clearLocalSnapshot(key = LS_KEY) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

/**
 * V7.4.2 训练进度双写：
 *   - snapshot 变化时先同步写 localStorage（跨版本更新也能读到）；
 *   - 再防抖 1.5s 异步写服务器 DB（换设备/清缓存也能恢复）。
 *
 * 用法：useProgressSync(sessionId, snapshot, lsKey?)
 * snapshot 为普通对象（环节/批次/单词级/轮次/标记等），内部按 JSON 序列化比较。
 * lsKey 可选：默认每日流程共用 LS_KEY；独立测试（如 ListDictation）传单独 key 避免互相覆盖。
 */
export function useProgressSync(sessionId, snapshot, lsKey = LS_KEY) {
  const key = snapshot ? JSON.stringify(snapshot) : '';
  const timerRef = useRef(null);
  const payloadRef = useRef(null);

  useEffect(() => {
    if (!sessionId || !snapshot) return;
    // 1) 同步写 localStorage（含 sessionId，恢复时直接用；lsKey 隔离独立测试）
    saveLocalSnapshot({ sessionId, ...snapshot }, lsKey);
    // 2) 防抖写服务器
    payloadRef.current = { sessionId, snapshot };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (payloadRef.current) {
        api.saveProgress(payloadRef.current).catch(() => { /* 网络失败忽略，localStorage 兜底 */ });
      }
    }, 1500);
  }, [sessionId, key]);

  // 卸载时立即 flush 一次（收工/跳转前不丢进度）
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (payloadRef.current) {
      api.saveProgress(payloadRef.current).catch(() => {});
    }
  }, []);
}
