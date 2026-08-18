import { useState, useEffect, useCallback } from 'react';

/**
 * 通用数据加载 hook，消除各页面重复的 loading 样板。
 *
 * 用法：
 *   const { data: topics, loading, reload } = useFetch(() => api.getTopics(), []);
 *   if (loading) return <Loading text="加载中..." />;
 *   <button onClick={reload}>刷新</button>
 *
 * @param {() => Promise} fetcher 数据获取函数
 * @param {Array} deps fetcher 依赖（变化时重新加载）
 * @returns {{ data, setData, loading, error, reload }}
 */
export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    Promise.resolve()
      .then(fetcher)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => reload(), [reload]);

  return { data, setData, loading, error, reload };
}
