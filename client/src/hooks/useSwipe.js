import { useRef, useCallback } from 'react';

/**
 * 触摸滑动/点击手势。
 * - 横向滑动超过 threshold 且水平位移大于垂直位移 → onLeft/onRight
 * - 位移很小（视为点按）→ onTap
 * 返回事件处理器，绑到卡片容器上（仅 touch 布局生效）。
 */
export function useSwipe({ onLeft, onRight, onTap, enabled = true, threshold = 48 }) {
  const startRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    if (!enabled) return;
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, [enabled]);

  const onTouchEnd = useCallback((e) => {
    if (!enabled || !startRef.current) return;
    const s = startRef.current;
    startRef.current = null;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      onTap?.();
      return;
    }
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      if (dx > 0) onRight?.();
      else onLeft?.();
    }
  }, [enabled, threshold, onLeft, onRight, onTap]);

  return { onTouchStart, onTouchEnd };
}
