/* Civic Resolve AI — Shared utilities */
window.CivicResolve = {
  toast(message, type = '') {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      el.style.transition = '0.3s';
      setTimeout(() => el.remove(), 300);
    }, 3200);
  },

  openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
    // Always restore — re-check after a tick so concurrent closes settle
    setTimeout(() => {
      if (!document.querySelector('.modal-overlay.open')) {
        document.body.style.overflow = '';
      }
    }, 0);
  },

  greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  },

  formatDate(d = new Date()) {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  statusProgress(status) {
    const order = [
      'Reported', 'AI Analyzed', 'Assigned', 'Inspected', 'Inspection',
      'Work Started', 'Work In Progress', 'In Progress', 'Completed',
      'Admin Verification', 'Admin Verified', 'Citizen Verification', 'Resolved'
    ];
    const idx = order.indexOf(status);
    const n = Math.max(0, Math.min(7, Math.ceil((idx + 1) / 2)));
    return n;
  },

  initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.mobile-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => menu.classList.toggle('open'));
    }
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-close-modal');
        this.closeModal(id);
      });
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(overlay.id);
        }
      });
    });

    // Safety net: if no modals are open, always allow scroll.
    // Covers any path that removes .open without going through closeModal.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const open = document.querySelector('.modal-overlay.open');
        if (open) this.closeModal(open.id);
      }
    });
    const _restoreScroll = () => {
      if (!document.querySelector('.modal-overlay.open')) {
        document.body.style.overflow = '';
      }
    };
    document.addEventListener('click', _restoreScroll, { capture: true, passive: true });
  },

  initNotifications(items, badgeSelector = '#notifDot') {
    const list = document.getElementById('notifList');
    const panel = document.getElementById('notifPanel');
    const btn = document.getElementById('notifBtn');
    const markAll = document.getElementById('markAllRead');
    const badge = document.querySelector(badgeSelector);

    function render() {
      if (!list) return;
      const unread = items.filter(n => !n.read).length;
      if (badge) badge.style.display = unread ? 'block' : 'none';
      list.innerHTML = items.map((n, i) => `
        <div class="notif-item ${n.read ? '' : 'unread'}" data-idx="${i}">
          <div>${n.text}</div>
          <div class="time">${n.time}</div>
        </div>
      `).join('');
      list.querySelectorAll('.notif-item').forEach(el => {
        el.addEventListener('click', () => {
          items[+el.dataset.idx].read = true;
          render();
        });
      });
    }

    if (btn && panel) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('open');
        const ai = document.getElementById('aiPanel');
        if (ai) ai.classList.remove('open');
        const profile = document.getElementById('profilePanel');
        if (profile) profile.classList.remove('open');
      });
    }
    if (markAll) {
      markAll.addEventListener('click', () => {
        items.forEach(n => n.read = true);
        render();
        CivicResolve.toast(
          (CivicResolve.t && CivicResolve.t('notif_marked')) || 'All notifications marked as read',
          'success'
        );
      });
    }
    document.addEventListener('click', (e) => {
      if (panel && !panel.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
        panel.classList.remove('open');
      }
    });
    render();
    return { render, items };
  },

  speechToText(textarea, onFallback) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onFallback) onFallback();
      else {
        const demo = 'Road damage approximately three meters long. Traffic affected. Temporary barricade placed.';
        textarea.value = (textarea.value ? textarea.value + ' ' : '') + demo;
        const msg = (CivicResolve.t && CivicResolve.t('speech_unavailable')) || 'Speech recognition unavailable — demo text inserted. You can edit it.';
        CivicResolve.toast(msg, 'warning');
      }
      return null;
    }
    const rec = new SpeechRecognition();
    rec.lang = (window.CivicResolve && CivicResolve.I18n)
      ? CivicResolve.I18n.speechLocale()
      : 'en-IN';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      textarea.value = text;
    };
    rec.onerror = () => {
      const msg = (CivicResolve.t && CivicResolve.t('speech_error')) || 'Could not capture speech. You can type notes manually.';
      CivicResolve.toast(msg, 'warning');
    };
    return rec;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (typeof CivicResolve !== 'undefined') CivicResolve.initNav();
});
