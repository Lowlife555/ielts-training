/**
 * UserKVContext — 用户记忆 KV 存储前端封装
 *
 * 提供 useUserKV() hook，API：
 *   get(key)           — 从缓存同步读取（若缓存未命中返回 undefined）
 *   set(key, value)    — 乐观更新（立即写缓存 + 异步同步服务端）
 *   remove(key)        — 乐观删除
 *   getAll()           — 返回全部缓存对象
 *   loading            — 是否正在首次加载
 *   refresh()          — 强制从服务端重新拉取全部 KV
 *
 * 缓存层：内存（React state）+ localStorage（跨会话加速启动）
 * 同步策略：乐观更新 → 服务端 upsert → 失败回滚
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

const UserKVContext = createContext(null);

function getCacheKey(userId) {
  return `ielts_kv_${userId}`;
}

function loadLocalCache(userId) {
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalCache(userId, data) {
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(data));
  } catch { /* quota exceeded — silently ignore */ }
}

function clearLocalCache(userId) {
  try {
    localStorage.removeItem(getCacheKey(userId));
  } catch { /* ignore */ }
}

export function UserKVProvider({ children }) {
  const { user } = useAuth();
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  // 用 ref 追踪最新 cache，避免 set() 闭包过时
  const cacheRef = useRef({});
  const mountedRef = useRef(true);

  // 登录后从服务端拉取全部 KV；未登录清空
  useEffect(() => {
    mountedRef.current = true;
    if (!user) {
      setCache({});
      cacheRef.current = {};
      return;
    }

    // 先加载 localStorage 缓存提速
    const local = loadLocalCache(user.id);
    if (Object.keys(local).length > 0) {
      setCache(local);
      cacheRef.current = local;
    }

    // 再从服务端拉取最新数据
    let cancelled = false;
    setLoading(true);
    api.getUserKV()
      .then((serverData) => {
        if (cancelled) return;
        setCache(serverData);
        cacheRef.current = serverData;
        saveLocalCache(user.id, serverData);
      })
      .catch(() => { /* 网络错误 — 保持 localStorage 缓存 */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [user]);

  const get = useCallback((key) => {
    return cacheRef.current[key];
  }, []);

  const getAll = useCallback(() => {
    return { ...cacheRef.current };
  }, []);

  const set = useCallback(async (key, value) => {
    const prev = { ...cacheRef.current };
    const next = { ...prev, [key]: value };

    // 乐观更新
    cacheRef.current = next;
    setCache(next);
    if (user) saveLocalCache(user.id, next);

    // 异步同步服务端
    try {
      await api.setUserKV({ [key]: value });
    } catch (err) {
      // 回滚
      cacheRef.current = prev;
      setCache(prev);
      if (user) saveLocalCache(user.id, prev);
      throw err;
    }
  }, [user]);

  const remove = useCallback(async (key) => {
    const prev = { ...cacheRef.current };
    const next = { ...prev };
    delete next[key];

    // 乐观删除
    cacheRef.current = next;
    setCache(next);
    if (user) saveLocalCache(user.id, next);

    // 异步同步服务端
    try {
      await api.deleteUserKV(key);
    } catch (err) {
      cacheRef.current = prev;
      setCache(prev);
      if (user) saveLocalCache(user.id, prev);
      throw err;
    }
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const serverData = await api.getUserKV();
      setCache(serverData);
      cacheRef.current = serverData;
      saveLocalCache(user.id, serverData);
    } catch { /* ignore */ }
  }, [user]);

  return (
    <UserKVContext.Provider value={{ get, set, remove, getAll, loading, refresh }}>
      {children}
    </UserKVContext.Provider>
  );
}

export function useUserKV() {
  return useContext(UserKVContext);
}
