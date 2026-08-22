// Central place to talk to the Math Tutor JA backend.
// On Netlify, functions are mapped to /api/* via each function's own path config,
// so same-origin relative calls just work — no separate backend URL needed.
const API_BASE_URL = window.MTJA_API_BASE_URL || '/api';

const Auth = {
  getToken: () => localStorage.getItem('mtja_token'),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('mtja_user') || 'null'); }
    catch { return null; }
  },
  setSession: (token, user) => {
    localStorage.setItem('mtja_token', token);
    localStorage.setItem('mtja_user', JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem('mtja_token');
    localStorage.removeItem('mtja_user');
  },
  isLoggedIn: () => !!localStorage.getItem('mtja_token'),
};

async function apiFetch(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

// Redirects to login if not authenticated. Call at the top of protected pages.
function requireLogin(loginPath = 'login.html') {
  if (!Auth.isLoggedIn()) {
    window.location.href = loginPath;
    return false;
  }
  return true;
}
