import { useState, useEffect } from 'react';

/**
 * 计时 Hook：从 startTimeISO 起每秒递增
 */
export function useElapsed(startTimeISO, running = true) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const startMs = startTimeISO ? new Date(startTimeISO).getTime() : Date.now();
  return Math.max(0, Math.floor((now - startMs) / 1000));
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
