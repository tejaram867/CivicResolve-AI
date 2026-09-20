/**
 * CivicResolve AI — Frontend API client
 * Talks to Node backend on :3001 (falls back gracefully if offline).
 */
(function (global) {
  const DEFAULT_BASE = 'http://localhost:3001';

  const ROLE_MAP = {
    citizen: { role: 'CITIZEN', id: 'citizen-101', page: 'citizen-dashboard.html' },
    admin: { role: 'ADMIN', id: 'admin-1', page: 'admin-dashboard.html' },
    officer: { role: 'CIVIC_OFFICER', id: 'OFF-001', page: 'officer-dashboard.html' },
  };

  function getSession() {
    try {
      return {
        roleKey: localStorage.getItem('cr_role') || localStorage.getItem('civicRole') || 'citizen',
        role: localStorage.getItem('cr_api_role') || 'CITIZEN',
        userId: localStorage.getItem('cr_user_id') || 'citizen-101',
        email: localStorage.getItem('civicUser') || localStorage.getItem('cr_user') || '',
      };
    } catch (_) {
      return { roleKey: 'citizen', role: 'CITIZEN', userId: 'citizen-101', email: '' };
    }
  }

  function setSession(roleKey, email, userObj) {
    const meta = Object.assign({}, ROLE_MAP[roleKey] || ROLE_MAP.citizen);
    if (userObj && userObj.id) meta.id = userObj.id;
    if (userObj && userObj.role) meta.role = userObj.role;
    try {
      localStorage.setItem('cr_role', roleKey);
      localStorage.setItem('civicRole', roleKey);
      localStorage.setItem('cr_api_role', meta.role);
      localStorage.setItem('cr_user_id', meta.id);
      localStorage.setItem('civicUser', email || meta.id + '@civicresolve.ai');
      localStorage.setItem('cr_user', (userObj && userObj.name) || email || meta.id);
    } catch (_) {}
    return meta;
  }

  function clearSession() {
    try {
      ['cr_role', 'civicRole', 'cr_api_role', 'cr_user_id', 'civicUser', 'cr_user'].forEach((k) =>
        localStorage.removeItem(k)
      );
    } catch (_) {}
  }

  function baseUrl() {
    if (typeof location !== 'undefined' && /^https?:/i.test(location.protocol) && location.port === '3001') {
      return '';
    }
    try {
      return localStorage.getItem('cr_api_base') || DEFAULT_BASE;
    } catch (_) {
      return DEFAULT_BASE;
    }
  }

  async function request(path, options = {}) {
    const session = getSession();
    const headers = Object.assign(
      {
        'x-user-role': session.role,
        'x-user-id': session.userId,
        Authorization: `Bearer ${session.role}:${session.userId}`,
      },
      options.headers || {}
    );

    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const url = `${baseUrl()}${path}`;
    const res = await fetch(url, { ...options, headers });
    let data = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = { raw: text };
    }
    if (!res.ok) {
      const err = new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  const CivicAPI = {
    ROLE_MAP,
    getSession,
    setSession,
    clearSession,
    baseUrl,
    request,
    online: false,

    async ping() {
      try {
        await request('/api/health');
        this.online = true;
        return true;
      } catch (_) {
        this.online = false;
        return false;
      }
    },

    health: () => request('/api/health'),
    aiHealth: () => request('/api/ai-health'),

    login: (roleKey, email, password) =>
      request('/api/auth/login', {
        method: 'POST',
        body: { role: roleKey, email, password },
      }),

    signup: (name, email, password, role = 'CITIZEN') =>
      request('/api/auth/signup', {
        method: 'POST',
        body: { name, email, password, role },
      }),

    me: () => request('/api/auth/me'),

    /** Ensure dashboard matches logged-in role; otherwise redirect to login */
    requireRole(expectedKey) {
      const session = getSession();
      const meta = ROLE_MAP[expectedKey];
      if (!session.role || !meta) {
        window.location.href = 'login.html';
        return false;
      }
      if (session.role !== meta.role) {
        const correct = Object.keys(ROLE_MAP).find((k) => ROLE_MAP[k].role === session.role);
        if (correct && ROLE_MAP[correct].page) {
          window.location.href = ROLE_MAP[correct].page;
          return false;
        }
        window.location.href = 'login.html';
        return false;
      }
      return true;
    },

    bindLogout() {
      document.querySelectorAll('a[href="login.html"]').forEach((a) => {
        if ((a.textContent || '').toLowerCase().includes('logout')) {
          a.addEventListener('click', (e) => {
            e.preventDefault();
            clearSession();
            window.location.href = 'login.html';
          });
        }
      });
    },

    /* Citizen */
    listProblems: () => request('/api/problems'),
    getProblem: (id) => request(`/api/problems/${id}`),
    myReports: () => request('/api/citizen/my-reports'),
    mySupports: () => request('/api/citizen/my-supports'),
    createProblem: (formData) =>
      request('/api/problems', { method: 'POST', body: formData, headers: {} }),
    checkDuplicate: (formData) =>
      request('/api/problems/check-duplicate', { method: 'POST', body: formData, headers: {} }),
    supportProblem: (id, body) =>
      request(`/api/problems/${id}/support`, { method: 'POST', body }),
    resolutionFeedback: (id, formData) =>
      request(`/api/problems/${id}/resolution-feedback`, { method: 'POST', body: formData, headers: {} }),

    /* Admin */
    adminDashboard: () => request('/api/admin/dashboard'),
    priorityQueue: () => request('/api/admin/problems/priority'),
    assignOfficer: (id, body) =>
      request(`/api/admin/problems/${id}/assign`, { method: 'POST', body }),
    approveWork: (id, body) =>
      request(`/api/admin/problems/${id}/approve-work`, { method: 'POST', body }),
    closeProblem: (id, body) =>
      request(`/api/admin/problems/${id}/close`, { method: 'POST', body }),
    adminSla: () => request('/api/admin/sla'),
    auditTrail: (id) => request(`/api/admin/problems/${id}/audit`),

    /* Officer */
    officerProblems: () => request('/api/officer/problems'),
    officerProblem: (id) => request(`/api/officer/problems/${id}`),
    submitInspection: (id, body) =>
      request(`/api/officer/problems/${id}/inspection`, { method: 'POST', body }),
    submitWorkReport: (id, body) =>
      request(`/api/officer/problems/${id}/work-report`, { method: 'POST', body }),
    completionVerification: (id, body) =>
      request(`/api/officer/problems/${id}/completion-verification`, { method: 'POST', body }),

    /* Notifications + AI */
    notifications: (unread) =>
      request(`/api/notifications${unread ? '?unread=true' : ''}`),
    markNotificationRead: (id) =>
      request(`/api/notifications/${id}/read`, { method: 'POST', body: {} }),
    predictCategory: (formData) =>
      request('/api/predict', { method: 'POST', body: formData, headers: {} }),
    evaluateEvidence: (formData) =>
      request('/api/evidence', { method: 'POST', body: formData, headers: {} }),
  };

  global.CivicAPI = CivicAPI;
})(typeof window !== 'undefined' ? window : globalThis);
