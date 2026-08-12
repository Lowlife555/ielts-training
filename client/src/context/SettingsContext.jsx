import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';
import { setSpeechConfig } from '../utils/speech';
import { useAuth } from './AuthContext';

const DEFAULT_SETTINGS = {
  voiceSource: 'local',
  voiceAccent: 'us',
  showPhonetic: true,
  restMinutes: 5,
  baseTargetMinutes: 60,
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  // 登录后拉取服务端设置；未登录用默认值
  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setSpeechConfig({ source: 'local', accent: 'us' });
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.getSettings()
      .then((data) => {
        if (cancelled) return;
        setSettings({ ...DEFAULT_SETTINGS, ...data });
        setSpeechConfig({ source: data.voiceSource, accent: data.voiceAccent });
      })
      .catch(() => { if (!cancelled) setSettings(DEFAULT_SETTINGS); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const update = useCallback(async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next); // 乐观更新
    setSpeechConfig({ source: next.voiceSource, accent: next.voiceAccent });
    try {
      const saved = await api.updateSettings(patch);
      setSettings((prev) => ({ ...prev, ...saved }));
      return saved;
    } catch (err) {
      // 回滚
      setSettings(settings);
      setSpeechConfig({ source: settings.voiceSource, accent: settings.voiceAccent });
      throw err;
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
