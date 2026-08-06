const API_BASE = '/api';

async function request(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const response = await fetch(`${API_BASE}${url}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
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
};
