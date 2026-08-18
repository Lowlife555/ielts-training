import { useEffect, useRef } from 'react';

/**
 * Custom hook for keyboard shortcuts.
 * @param {Object} handlers - Map of key to handler function
 * @param {boolean} enabled - Whether keyboard shortcuts are enabled
 * @param {Array} deps - 兼容旧签名，已不再需要（handlers 通过 ref 始终取最新值）
 *
 * 用 ref 保存最新 handlers，监听器仅在 enabled 变化时重建，
 * 避免调用方内联 handlers 导致每次渲染都 removeEventListener/addEventListener。
 */
export function useKeyboard(handlers, enabled = true, deps = []) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers; // 渲染期间同步最新 handlers，不触发 effect

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const current = handlersRef.current;
      if (!enabledRef.current) return;

      const tag = e.target.tagName.toLowerCase();
      const key = e.key;

      // 组合键（Ctrl+Enter 等）
      let combo = '';
      if (e.ctrlKey && key !== 'Control') combo += 'Ctrl+';
      if (e.altKey && key !== 'Alt') combo += 'Alt+';
      if (e.shiftKey && key !== 'Shift') combo += 'Shift+';
      combo += key;

      if (current[combo]) {
        e.preventDefault();
        current[combo](e);
        return;
      }

      // 输入框内只允许 Escape（及已被组合键拦截的）
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        if (key === 'Escape' && current['Escape']) {
          e.preventDefault();
          current['Escape'](e);
        }
        return;
      }

      if (current[key]) {
        e.preventDefault();
        current[key](e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
