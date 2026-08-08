import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TouchContext = createContext();
const STORAGE_KEY = 'ielts_layout'; // 'auto' | 'touch' | 'desktop'

function detect() {
  const override = localStorage.getItem(STORAGE_KEY);
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;
  if (override === 'touch') return { isTouch: true, mode: 'touch' };
  if (override === 'desktop') return { isTouch: false, mode: 'desktop' };
  return { isTouch: coarse && narrow, mode: 'auto' };
}

export function TouchProvider({ children }) {
  const [state, setState] = useState(detect);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const onMq = () => setState(detect());
    const onResize = () => setState(detect());
    mq.addEventListener('change', onMq);
    window.addEventListener('resize', onResize);
    return () => {
      mq.removeEventListener('change', onMq);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const { isTouch, mode } = state;

  useEffect(() => {
    document.documentElement.classList.toggle('touch', isTouch);
  }, [isTouch]);

  const setMode = useCallback((next) => {
    if (next === 'auto') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
    setState(detect());
  }, []);

  return (
    <TouchContext.Provider value={{ isTouch, mode, setMode }}>
      {children}
    </TouchContext.Provider>
  );
}

export function useTouch() {
  const context = useContext(TouchContext);
  if (!context) throw new Error('useTouch must be used within TouchProvider');
  return context;
}
