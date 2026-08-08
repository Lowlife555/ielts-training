import { useApp } from '../../context/AppContext';
import { Keyboard, X } from 'lucide-react';

export default function FirstVisitHint() {
  const { state, dispatch } = useApp();

  if (!state.firstVisit) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-4 max-w-xs">
        <div className="flex items-start gap-3">
          <Keyboard className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-1">💡 键盘快捷键提示</p>
            <p className="text-xs text-gray-400 mb-3">
              试试按 <kbd className="px-1.5 py-0.5 bg-gray-700 border border-gray-600 rounded text-xs text-white">?</kbd> 查看所有快捷键
            </p>
            <button
              onClick={() => dispatch({ type: 'MARK_FIRST_VISIT' })}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              知道了
            </button>
          </div>
          <button
            onClick={() => dispatch({ type: 'MARK_FIRST_VISIT' })}
            className="text-gray-500 hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
