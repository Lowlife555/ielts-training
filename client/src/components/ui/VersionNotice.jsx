import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * 新版本公告：登录后拉取未读公告，弹窗展示（每个版本每人仅首次显示）。
 */
export default function VersionNotice() {
  const { user } = useAuth();
  const [unread, setUnread] = useState([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch('/api/announcements')
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setUnread(data.announcements || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const dismiss = useCallback(async () => {
    await Promise.all(unread.map((a) =>
      fetch(`/api/announcements/${a.id}/seen`, { method: 'POST' }).catch(() => {})
    ));
    setUnread([]);
  }, [unread]);

  if (!unread.length) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 animate-fade-in p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-indigo-600 text-white">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="w-5 h-5" />
            {unread[0].title}
          </div>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{unread[0].version}</span>
        </div>
        <div className="px-5 py-4">
          {unread.map((a) => (
            <ul key={a.id} className="space-y-2.5 mb-1">
              {a.content.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ))}
          <button
            onClick={dismiss}
            className="w-full mt-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            知道了，开始使用
          </button>
        </div>
        <button
          onClick={dismiss}
          aria-label="关闭"
          className="absolute top-3 right-3 text-white/80 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
