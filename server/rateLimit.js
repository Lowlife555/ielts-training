/**
 * 轻量内存限流中间件（无外部依赖）
 * 用于登录/注册/作文批改等敏感接口，防暴力破解与 API 刷量。
 *
 * 用法：
 *   const limiter = createRateLimiter({ windowMs: 60000, max: 10, message: '...' });
 *   app.use('/api/auth/login', limiter);
 */
function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map(); // ip -> { count, resetAt }

  // 清理过期条目，避免 Map 无限增长
  function prune(now) {
    if (hits.size < 5000) return;
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }

  return function rateLimit(req, res, next) {
    const now = Date.now();
    prune(now);

    // nginx 反代后优先取 X-Forwarded-For 首个 IP，否则回退 req.ip
    const xff = req.headers['x-forwarded-for'];
    const ip = (typeof xff === 'string' ? xff.split(',')[0].trim() : '')
      || req.ip
      || (req.socket && req.socket.remoteAddress)
      || 'unknown';

    let entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      return res.status(429).json({ error: message || '请求过于频繁，请稍后再试' });
    }
    next();
  };
}

module.exports = { createRateLimiter };
