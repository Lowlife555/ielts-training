import { useState, useCallback, useRef } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

/**
 * 用 React 对话框替代 window.confirm，返回 Promise<boolean>。
 *
 * 用法：
 *   const { confirm, dialog } = useConfirm();
 *   const ok = await confirm('确定要收工吗？', { danger: true, confirmText: '收工' });
 *   if (!ok) return;
 *   // ... 页面末尾渲染 {dialog}
 */
export function useConfirm() {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ message, ...options });
    });
  }, []);

  const close = useCallback((result) => {
    if (resolverRef.current) resolverRef.current(result);
    resolverRef.current = null;
    setState(null);
  }, []);

  const dialog = state ? (
    <ConfirmDialog
      open={!!state}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      danger={state.danger}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null;

  return { confirm, dialog };
}
