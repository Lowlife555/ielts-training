import { useEffect, useCallback } from 'react';

/**
 * Custom hook for keyboard shortcuts.
 * @param {Object} handlers - Map of key to handler function
 * @param {boolean} enabled - Whether keyboard shortcuts are enabled
 * @param {Array} deps - Additional dependencies
 */
export function useKeyboard(handlers, enabled = true, deps = []) {
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input/textarea (except for specific overrides)
    const tag = e.target.tagName.toLowerCase();

    // Allow specific handlers to work even in inputs
    const key = e.key;

    // Build the key combination string
    let combo = '';
    if (e.ctrlKey && key !== 'Control') combo += 'Ctrl+';
    if (e.altKey && key !== 'Alt') combo += 'Alt+';
    if (e.shiftKey && key !== 'Shift') combo += 'Shift+';
    combo += key;

    // Check for specific handlers
    if (handlers[combo]) {
      e.preventDefault();
      handlers[combo](e);
      return;
    }

    // For single-key shortcuts, don't fire in input fields
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      // Only allow Escape and specific combos in input fields
      if (key === 'Escape' && handlers['Escape']) {
        e.preventDefault();
        handlers['Escape'](e);
      }
      return;
    }

    if (handlers[key]) {
      e.preventDefault();
      handlers[key](e);
    }
  }, [handlers, enabled, ...deps]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}
