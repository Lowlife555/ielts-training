import { useLocation } from 'react-router-dom';
import { Monitor, HelpCircle } from 'lucide-react';
import { useTouch } from '../../context/TouchContext';
import { useApp } from '../../context/AppContext';

/**
 * 触屏模式右上角浮动操作按钮：
 * - Monitor：切回桌面模式（触屏模式下 Navbar 隐藏，这是唯一顶部入口）
 * - HelpCircle：打开操作帮助（触屏设备无 ? 键）
 * 训练流程页隐藏，避免遮挡计时器/收工按钮。
 */
export default function FloatingActions() {
  const { setMode } = useTouch();
  const { showToast, dispatch } = useApp();
  const location = useLocation();

  if (location.pathname.startsWith('/daily/') || location.pathname === '/daily') return null;

  return (
    <div className="fixed top-3 right-3 z-40 flex items-center gap-2">
      <button
        onClick={() => dispatch({ type: 'TOGGLE_KEYBOARD_HELP' })}
        aria-label="操作帮助"
        title="操作帮助"
        className="w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 active:scale-95 transition-transform"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
      <button
        onClick={() => { setMode('desktop'); showToast('已切换为桌面模式', 'info'); }}
        aria-label="切换到桌面模式"
        title="切换到桌面模式"
        className="w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-indigo-600 active:scale-95 transition-transform"
      >
        <Monitor className="w-5 h-5" />
      </button>
    </div>
  );
}
