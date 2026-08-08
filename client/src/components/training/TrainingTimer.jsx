import { useEffect } from 'react';
import { Clock, LogOut } from 'lucide-react';
import { formatDuration } from '../../hooks/useTimer';

const CAP_SECONDS = 2 * 3600;

/**
 * 训练计时与 2 小时上限提示条
 * 达 7200 秒时弹 Toast 提示欠债已结清，可收工
 */
export default function TrainingTimer({ elapsed, targetMinutes, onAbandon, onReachedCap }) {
  const reachedCap = elapsed >= CAP_SECONDS;

  useEffect(() => {
    if (reachedCap && onReachedCap) onReachedCap();
  }, [reachedCap, onReachedCap]);

  return (
    <span className="flex items-center gap-3">
      <span className="text-sm text-gray-400 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5" />
        {formatDuration(elapsed)}
        <span className="text-gray-300">/</span>
        {targetMinutes} 分
        {reachedCap && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">已达上限 2h · 欠债已结清</span>
        )}
      </span>
      <button onClick={onAbandon} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="收工 (Esc)">
        <LogOut className="w-5 h-5" />
      </button>
    </span>
  );
}
