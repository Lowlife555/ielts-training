import { createPortal } from 'react-dom';

/**
 * 通用确认对话框（替代 window.confirm，避免触屏/WebView/iframe 下原生对话框静默失败）
 * 用 createPortal 渲染到 body，避免被父容器 overflow/z-index 裁剪。
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 animate-fade-in p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          {title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>}
          <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white font-medium transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
