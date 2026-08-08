const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('ielts_token') || '';
}

async function request(url, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${url}`, config);

  if (response.status === 401 && !url.startsWith('/auth')) {
    localStorage.removeItem('ielts_token');
    localStorage.removeItem('ielts_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Admin
  getAdminUsers: () => request('/admin/users'),
  resetUserPassword: (id, newPassword) =>
    request(`/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
  toggleUserStatus: (id) =>
    request(`/admin/users/${id}/toggle-status`, { method: 'POST' }),

  // Topics
  getTopics: () => request('/topics'),

  // Words
  getWords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/words?${query}`);
  },
  getWord: (id) => request(`/words/${id}`),

  // Spelling test
  getSpellingTest: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/spelling-test?${query}`);
  },
  submitSpellingResult: (data) =>
    request('/spelling-test', { method: 'POST', body: JSON.stringify(data) }),

  // Reviews
  getReviewWords: () => request('/review-words'),
  submitReviewResult: (data) =>
    request('/review-result', { method: 'POST', body: JSON.stringify(data) }),

  // Wrong words
  getWrongWords: () => request('/wrong-words'),

  // Writing questions
  getWritingQuestions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/writing-questions?${query}`);
  },
  getWritingQuestion: (id) => request(`/writing-questions/${id}`),

  // Essays
  submitEssay: (data) =>
    request('/essays/submit', { method: 'POST', body: JSON.stringify(data) }),
  getEssayResult: (id) => request(`/essays/${id}/result`),
  getEssayHistory: () => request('/essays/history'),

  // Stats
  getOverview: () => request('/stats/overview'),

  // v4.0 Daily Plan
  getDailyPlan: () => request('/daily-plan'),
  getDailyPlanStatus: () => request('/daily-plan/status'),
  completeDailyPlan: (sessionId) =>
    request('/daily-plan/complete', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  submitSpotCheck: (data) =>
    request('/daily-plan/spot-check', { method: 'POST', body: JSON.stringify(data) }),

  // v4.0 Training
  startTraining: (data) =>
    request('/training/start', { method: 'POST', body: JSON.stringify(data) }),
  completeTraining: (data) =>
    request('/training/complete', { method: 'POST', body: JSON.stringify(data) }),
  abandonTraining: (data) =>
    request('/training/abandon', { method: 'POST', body: JSON.stringify(data) }),
};
