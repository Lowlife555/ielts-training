import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';
import { setSpeechConfig } from '../utils/speech';
import { useAuth } from './AuthContext';
import { useUserKV } from './UserKVContext';

const DEFAULT_SETTINGS = {
  voiceSource: 'local',
  voiceAccent: 'us',
  showPhonetic: true,
  restMinutes: 5,
  baseTargetMinutes: 60,
};

const SettingsContext = createContext(null);

// KV key 命名空间（与 KV-STORAGE.md 规范一致）
const KV_PREFIX = 'settings.';

/**
 * v7.2.2: 设置数据迁移到 user_kv 存储（兼容后续迭代，无需再迁移表结构）。
 * 旧 user_settings 表仅作回退读取（老数据无缝迁移），写入一律走 KV。
 */
export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const kv = useUserKV();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  const kvToSettings = useCallback((kvData) => {
    const s = { ...DEFAULT_SETTINGS };
    for (const [k, v] of Object.entries(kvData || {})) {
      if (k.startsWith(KV_PREFIX) && s[k.slice(KV_PREFIX.length)] !== undefined) {
        s[k.slice(KV_PREFIX.length)] = v;
      }
    }
    return s;
  }, []);

  // 登录后加载：优先 KV，KV 无数据时回退旧 user_settings 表（一次性迁移）
  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setSpeechConfig({ source: 'local', accent: 'us' });
      return;
    }
    let cancelled = false;
    setLoading(true);

    // 1) KV 数据
    const kvData = kv.getAll();
    const kvSettings = kvToSettings(kvData);
    const hasKV = Object.keys(kvData).some(k => k.startsWith(KV_PREFIX));

    const apply = (s) => {
      if (cancelled) return;
      setSettings(s);
      setSpeechConfig({ source: s.voiceSource, accent: s.voiceAccent });
    };

    if (hasKV) {
      apply(kvSettings);
      setLoading(false);
      return;
    }

    // 2) 回退旧表 + 一次性写入 KV（数据迁移）
    api.getSettings()
      .then((old) => {
        if (cancelled) return;
        const merged = { ...DEFAULT_SETTINGS, ...old };
        apply(merged);
        // 迁移到 KV
        const toKV = {};
        for (const [k, v] of Object.entries(merged)) toKV[KV_PREFIX + k] = v;
        kv.set && Promise.all(Object.entries(toKV).map(([k, v]) => kv.set(k, v))).catch(() => {});
      })
      .catch(() => { if (!cancelled) apply(DEFAULT_SETTINGS); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, kv.loading]);

  const update = useCallback(async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next); // 乐观更新
    setSpeechConfig({ source: next.voiceSource, accent: next.voiceAccent });
    try {
      // 写入 KV（新存储）；旧表同步更新保持兼容
      const toKV = {};
      for (const [k, v] of Object.entries(patch)) toKV[KV_PREFIX + k] = v;
      await Promise.all(Object.entries(toKV).map(([k, v]) => kv.set(k, v)));
      api.updateSettings(patch).catch(() => { /* 旧表更新失败不影响 KV */ });
      return next;
    } catch (err) {
      // 回滚
      setSettings(settings);
      setSpeechConfig({ source: settings.voiceSource, accent: settings.voiceAccent });
      throw err;
    }
  }, [settings, kv]);

  return (
    <SettingsContext.Provider value={{ settings, loading, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
