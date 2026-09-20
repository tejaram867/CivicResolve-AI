/* ============================================================
   CIVICRESOLVE AI — login.js
   Frontend-only hackathon prototype.
   Accepts ANY credentials — identifies selected role and
   redirects to the correct dashboard.
   Role is persisted in localStorage for dashboard use.
   ============================================================ */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     AUTO-REDIRECT: if a valid session already exists,
     send the user straight to their dashboard.
  ────────────────────────────────────────────────────────── */
  (function checkExistingSession() {
    try {
      var role    = localStorage.getItem('cr_api_role') || '';
      var roleKey = localStorage.getItem('cr_role')     || localStorage.getItem('civicRole') || '';
      var userId  = localStorage.getItem('cr_user_id')  || '';

      // Only redirect if we have all three pieces of a real session
      if (!role || !roleKey || !userId) return;

      var dashMap = {
        citizen:  'citizen-dashboard.html',
        admin:    'admin-dashboard.html',
        officer:  'officer-dashboard.html'
      };

      var dest = dashMap[roleKey.toLowerCase()];
      if (dest) {
        // Fade out body before redirect so it feels intentional
        document.body.style.opacity    = '0';
        document.body.style.transition = 'opacity 0.3s ease';
        window.location.replace(dest);
      }
    } catch (e) {
      // localStorage blocked or keys corrupt — fall through to normal login
    }
  }());

  /* ──────────────────────────────────────────────────────────
     ROLE CONFIG
  ────────────────────────────────────────────────────────── */
  var ROLES = {
    citizen: {
      label:     'Citizen',
      icon:      '👤',
      dashboard: 'citizen-dashboard.html',
      color:     '#1565C0',
      shadow:    'rgba(21,101,192,0.38)',
      ctxBg:     'rgba(21,101,192,0.06)',
      ctxBdr:    'rgba(21,101,192,0.18)'
    },
    admin: {
      label:     'Admin',
      icon:      '🏛️',
      dashboard: 'admin-dashboard.html',
      color:     '#7C3AED',
      shadow:    'rgba(124,58,237,0.34)',
      ctxBg:     'rgba(124,58,237,0.06)',
      ctxBdr:    'rgba(124,58,237,0.18)'
    },
    officer: {
      label:     'Civic Officer',
      icon:      '⚡',
      dashboard: 'officer-dashboard.html',
      color:     '#F59E0B',
      shadow:    'rgba(245,158,11,0.38)',
      ctxBg:     'rgba(245,158,11,0.07)',
      ctxBdr:    'rgba(245,158,11,0.28)'
    }
  };

  var selectedRole = null;

  /* ──────────────────────────────────────────────────────────
     DOM REFS
  ────────────────────────────────────────────────────────── */
  var lpParticles     = document.getElementById('lpParticles');
  var lpRolesEl       = document.getElementById('lpRoles');
  var lpFormWrapper   = document.getElementById('lpFormWrapper');
  var lpForm          = document.getElementById('lpForm');
  var lpSubmit        = document.getElementById('lpSubmit');
  var lpPwToggle      = document.getElementById('lpPwToggle');
  var lpForgot        = document.getElementById('lpForgot');
  var lpContextIcon   = document.getElementById('lpContextIcon');
  var lpContextRole   = document.getElementById('lpContextRole');
  var lpContextChange = document.getElementById('lpContextChange');
  var lpEmailInput    = document.getElementById('lpEmail');
  var lpPasswordInput = document.getElementById('lpPassword');
  var lpToast         = document.getElementById('lpToast');
  var lpFormContext    = document.getElementById('lpFormContext');
  var lpNameGroup     = document.getElementById('lpNameGroup');
  var lpNameInput     = document.getElementById('lpName');
  var lpToggleMode    = document.getElementById('lpToggleMode');
  var lpToggleLink    = document.getElementById('lpToggleLink');
  var lpTogglePrompt  = document.getElementById('lpTogglePrompt');
  var lpSubmitText    = document.getElementById('lpSubmitText');
  var lpRememberRow   = document.getElementById('lpRememberRow');
  var isSignupMode    = false;

  var roleCards = lpRolesEl
    ? Array.from(lpRolesEl.querySelectorAll('.lp-role-card'))
    : [];

  /* ──────────────────────────────────────────────────────────
     1. PAGE ENTRANCE FADE-IN
  ────────────────────────────────────────────────────────── */
  document.body.style.opacity    = '0';
  document.body.style.transition = 'opacity 0.42s ease';
  function revealPage() { document.body.style.opacity = '1'; }
  window.addEventListener('load', revealPage);
  if (document.readyState === 'complete') revealPage();

  /* ──────────────────────────────────────────────────────────
     2. FLOATING BACKGROUND PARTICLES
  ────────────────────────────────────────────────────────── */
  function spawnParticles() {
    if (!lpParticles) return;
    var count = window.innerWidth < 480 ? 10 : 20;
    for (var i = 0; i < count; i++) {
      (function () {
        var p = document.createElement('span');
        var sz = (Math.random() * 5 + 3) + 'px';
        p.className = 'lp-particle';
        p.style.cssText = [
          'width:'               + sz,
          'height:'              + sz,
          'left:'                + (Math.random() * 100) + '%',
          'bottom:'              + (Math.random() * 40)  + 'px',
          'animation-duration:'  + (Math.random() * 14 + 10) + 's',
          'animation-delay:'     + (Math.random() * 10) + 's',
          'animation-fill-mode:both'
        ].join(';');
        lpParticles.appendChild(p);
      }());
    }
  }
  spawnParticles();

  var resizeDebounce;
  window.addEventListener('resize', function () {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(function () {
      if (lpParticles) { lpParticles.innerHTML = ''; spawnParticles(); }
    }, 400);
  });

  /* ──────────────────────────────────────────────────────────
     3. ROLE SELECTION
  ────────────────────────────────────────────────────────── */
  function selectRole(role) {
    if (!role || !ROLES[role]) return;
    selectedRole = role;
    var meta = ROLES[role];

    roleCards.forEach(function (card) {
      var active = card.dataset.role === role;
      card.classList.toggle('active', active);
      card.setAttribute('aria-checked', active ? 'true' : 'false');
    });

    if (lpContextIcon)  lpContextIcon.textContent  = meta.icon;
    if (lpContextRole)  lpContextRole.textContent  = meta.label;
    if (lpFormContext) {
      lpFormContext.style.background  = meta.ctxBg;
      lpFormContext.style.borderColor = meta.ctxBdr;
    }
    if (lpSubmit) {
      lpSubmit.style.boxShadow =
        '0 4px 22px ' + meta.shadow + ',0 1px 0 rgba(255,255,255,0.15) inset';
    }

    if (role !== 'citizen') {
      setMode(false);
      if (lpToggleMode) lpToggleMode.style.display = 'none';
    } else {
      if (lpToggleMode) lpToggleMode.style.display = 'block';
    }

    showForm();
  }

  function showForm() {
    if (!lpFormWrapper) return;
    lpFormWrapper.classList.add('visible');
    if (window.innerWidth <= 720) {
      setTimeout(function () {
        lpFormWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 140);
    }
  }

  function hideForm() {
    if (!lpFormWrapper) return;
    lpFormWrapper.classList.remove('visible');
    selectedRole = null;
    roleCards.forEach(function (card) {
      card.classList.remove('active');
      card.setAttribute('aria-checked', 'false');
    });
    if (lpSubmit)      lpSubmit.style.boxShadow = '';
    if (lpFormContext) { lpFormContext.style.background = ''; lpFormContext.style.borderColor = ''; }
  }

  roleCards.forEach(function (card) {
    card.addEventListener('click', function () {
      selectedRole === card.dataset.role ? hideForm() : selectRole(card.dataset.role);
    });
    card.addEventListener('keydown', function (e) {
      var idx = roleCards.indexOf(card);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        var next = roleCards[(idx + 1) % roleCards.length];
        next.focus(); selectRole(next.dataset.role);
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        var prev = roleCards[(idx - 1 + roleCards.length) % roleCards.length];
        prev.focus(); selectRole(prev.dataset.role);
      }
    });
  });

  if (lpContextChange) {
    lpContextChange.addEventListener('click', function () {
      hideForm();
      if (roleCards[0]) roleCards[0].focus();
    });
  }

  /* ──────────────────────────────────────────────────────────
     4. REDIRECT HELPER
     Saves role to localStorage then navigates.
  ────────────────────────────────────────────────────────── */
  function redirectToDashboard(role) {
    if (!role || !ROLES[role]) return;
    var emailVal = lpEmailInput ? lpEmailInput.value.trim() : '';
    try {
      localStorage.setItem('cr_role', role);
      localStorage.setItem('civicRole', role);
      if (emailVal) localStorage.setItem('civicUser', emailVal);
      localStorage.setItem('cr_user', emailVal || (role + '@civicresolve.ai'));
      /* Backend auth headers (CITIZEN / ADMIN / CIVIC_OFFICER) */
      if (window.CivicAPI && CivicAPI.setSession) {
        CivicAPI.setSession(role, emailVal);
      } else {
        var roleMap = {
          citizen: { role: 'CITIZEN', id: 'citizen-101' },
          admin: { role: 'ADMIN', id: 'admin-1' },
          officer: { role: 'CIVIC_OFFICER', id: 'OFF-001' }
        };
        var m = roleMap[role] || roleMap.citizen;
        localStorage.setItem('cr_api_role', m.role);
        localStorage.setItem('cr_user_id', m.id);
      }
    } catch (e) {}
    /* Fade out then navigate */
    document.body.style.transition = 'opacity 0.38s ease';
    document.body.style.opacity    = '0';
    setTimeout(function () {
      window.location.href = ROLES[role].dashboard;
    }, 380);
  }

  /* ──────────────────────────────────────────────────────────
     5. FORM SUBMIT — accept ANY credentials
  ────────────────────────────────────────────────────────── */
  if (lpForm) {
    lpForm.addEventListener('submit', function (e) {
      e.preventDefault();

      /* Role must be selected */
      if (!selectedRole) {
        showToast('⚠️ Please select your role first.', 3000);
        if (lpRolesEl) lpRolesEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pulseRoleCards();
        return;
      }

      var emailVal = lpEmailInput    ? lpEmailInput.value.trim()    : '';
      var passVal  = lpPasswordInput ? lpPasswordInput.value        : '';
      var nameVal  = lpNameInput     ? lpNameInput.value.trim()     : '';

      if (isSignupMode && !nameVal) {
        markEmpty(lpNameInput, 'Please enter your full name.');
        return;
      }
      if (!emailVal) {
        markEmpty(lpEmailInput, 'Please enter your email or username.');
        return;
      }
      if (!passVal) {
        markEmpty(lpPasswordInput, 'Please enter your password.');
        return;
      }

      setLoading(true);

      function finishLogin() {
        setTimeout(function () {
          redirectToDashboard(selectedRole);
        }, 600);
      }

      if (isSignupMode) {
        showToast('⏳ Creating your citizen account…', 2500);
        if (window.CivicAPI && CivicAPI.signup) {
          CivicAPI.signup(nameVal, emailVal, passVal, 'CITIZEN')
            .then(function (data) {
              showToast('✅ Account created! Welcome, ' + ((data && data.user && data.user.name) || nameVal) + '!', 2500);
              if (window.CivicAPI) {
                CivicAPI.setSession('citizen', emailVal, data && data.user);
              }
              finishLogin();
            })
            .catch(function (err) {
              setLoading(false);
              showToast('❌ ' + (err.message || 'Registration failed.'), 3500);
            });
        } else {
          showToast('❌ API client not ready.', 3000);
          setLoading(false);
        }
        return;
      }

      /* Login Mode */
      showToast('✅ Signing you in as ' + ROLES[selectedRole].label + '…', 2500);

      if (window.CivicAPI && CivicAPI.login) {
        CivicAPI.login(selectedRole, emailVal, passVal)
          .then(function (data) {
            if (data && data.user) {
              CivicAPI.setSession(selectedRole, data.user.email || emailVal, data.user);
            } else {
              CivicAPI.setSession(selectedRole, emailVal);
            }
            finishLogin();
          })
          .catch(function (err) {
            setLoading(false);
            showToast('❌ ' + (err.message || 'Login failed: check your credentials.'), 3500);
          });
      } else {
        finishLogin();
      }
    });

    function setMode(signup) {
      isSignupMode = Boolean(signup);
      if (lpNameGroup) lpNameGroup.style.display = isSignupMode ? 'block' : 'none';
      if (lpRememberRow) lpRememberRow.style.display = isSignupMode ? 'none' : 'flex';
      if (lpSubmitText) {
        lpSubmitText.innerHTML = isSignupMode
          ? '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M15 9H3M10 4l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Create Citizen Account'
          : '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M15 9H3M10 4l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Login to CivicResolve AI';
      }
      if (lpTogglePrompt) {
        lpTogglePrompt.textContent = isSignupMode ? 'Already have an account?' : "Don't have a citizen account?";
      }
      if (lpToggleLink) {
        lpToggleLink.textContent = isSignupMode ? 'Sign In' : 'Sign Up';
      }
    }

    if (lpToggleLink) {
      lpToggleLink.addEventListener('click', function (e) {
        e.preventDefault();
        setMode(!isSignupMode);
      });
    }
  }

  function markEmpty(input, msg) {
    if (!input) return;
    var g = input.closest('.lp-field-group');
    if (!g) return;
    g.classList.add('error');
    g.classList.remove('valid');
    var errEl = g.querySelector('.lp-field-error');
    if (errEl) errEl.textContent = msg;
    input.focus();

    /* Clear error as soon as user types */
    input.addEventListener('input', function clearErr() {
      g.classList.remove('error');
      if (errEl) errEl.textContent = '';
      input.removeEventListener('input', clearErr);
    });
  }

  function setLoading(on) {
    if (!lpSubmit) return;
    lpSubmit.classList.toggle('loading', on);
    lpSubmit.disabled = on;
  }

  function pulseRoleCards() {
    roleCards.forEach(function (card, i) {
      setTimeout(function () {
        card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
        card.style.transform  = 'scale(1.04)';
        card.style.boxShadow  = '0 8px 28px rgba(21,101,192,0.22)';
        setTimeout(function () { card.style.transform = ''; card.style.boxShadow = ''; }, 260);
      }, i * 70);
    });
  }

  /* ──────────────────────────────────────────────────────────
     6. QUICK DEMO BUTTONS — immediate redirect, no credentials
  ────────────────────────────────────────────────────────── */
  var demoBtns = document.querySelectorAll('.lp-demo-btn');

  demoBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var role = btn.dataset.demo;
      if (!role || !ROLES[role]) return;

      addRipple(btn, e);

      /* Visual feedback */
      var labelEl  = btn.querySelector('.lp-demo-btn-label');
      var origText = labelEl ? labelEl.textContent : '';
      if (labelEl) labelEl.textContent = 'Loading…';
      btn.style.opacity = '0.72';
      btn.style.pointerEvents = 'none';

      showToast(ROLES[role].icon + '  Opening demo as ' + ROLES[role].label + '…', 2400);

      setTimeout(function () {
        redirectToDashboard(role);
      }, 700);
    });

    /* Icon micro-bounce */
    var icon = btn.querySelector('.lp-demo-btn-icon');
    btn.addEventListener('mouseenter', function () {
      if (icon) { icon.style.transition = 'transform 0.28s cubic-bezier(0.34,1.56,0.64,1)'; icon.style.transform = 'scale(1.18)'; }
    });
    btn.addEventListener('mouseleave', function () {
      if (icon) icon.style.transform = '';
    });
  });

  /* ──────────────────────────────────────────────────────────
     7. MISC INTERACTIONS
  ────────────────────────────────────────────────────────── */

  /* Password toggle */
  if (lpPwToggle && lpPasswordInput) {
    lpPwToggle.addEventListener('click', function () {
      var show = lpPasswordInput.type === 'password';
      lpPasswordInput.type = show ? 'text' : 'password';
      var eyeOpen   = lpPwToggle.querySelector('.eye-open');
      var eyeClosed = lpPwToggle.querySelector('.eye-closed');
      if (eyeOpen)   eyeOpen.style.display   = show ? 'none' : '';
      if (eyeClosed) eyeClosed.style.display = show ? ''     : 'none';
      lpPwToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      lpPasswordInput.focus();
    });
  }

  /* Forgot password */
  if (lpForgot) {
    lpForgot.addEventListener('click', function (e) {
      e.preventDefault();
      showToast('📧 Password reset will be available post-hackathon.', 3200);
    });
  }

  /* Input icon colour on focus */
  [lpEmailInput, lpPasswordInput].forEach(function (input) {
    if (!input) return;
    var wrap = input.closest('.lp-input-wrap');
    var icon = wrap ? wrap.querySelector('.lp-input-icon') : null;
    input.addEventListener('focus', function () { if (icon) icon.style.color = 'var(--blue-bright)'; });
    input.addEventListener('blur',  function () { if (icon) icon.style.color = ''; });
  });

  /* Submit button ripple */
  if (lpSubmit) {
    lpSubmit.addEventListener('click', function (e) { addRipple(lpSubmit, e); });
  }

  /* Card 3-D tilt (desktop) */
  if (window.matchMedia('(hover: hover)').matches) {
    roleCards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var rx = ((e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)) * -5;
        var ry = ((e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)) *  5;
        card.style.transform =
          'translateY(-4px) perspective(600px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = card.classList.contains('active') ? 'translateY(-5px)' : '';
      });
    });
  }

  /* Keyboard shortcuts */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (lpForm && lpFormWrapper && lpFormWrapper.classList.contains('visible')) {
        lpForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }
    if (e.key === 'Escape' && selectedRole) hideForm();
  });

  /* URL hash / query auto-select: login.html#admin or login.html?role=citizen */
  (function () {
    var hash = window.location.hash.replace('#', '').toLowerCase();
    var param = '';
    try {
      param = new URLSearchParams(window.location.search).get('role') || '';
      param = String(param).toLowerCase();
    } catch (e) {}
    var pick = (hash && ROLES[hash]) ? hash : ((param && ROLES[param]) ? param : '');
    if (pick) {
      setTimeout(function () { selectRole(pick); }, 750);
    }
  }());

  /* ──────────────────────────────────────────────────────────
     UTILITIES
  ────────────────────────────────────────────────────────── */
  var toastTimer = null;
  function showToast(msg, duration) {
    if (!lpToast) return;
    lpToast.textContent = msg;
    lpToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { lpToast.classList.remove('show'); }, duration || 2800);
  }

  function addRipple(el, e) {
    var rect   = el.getBoundingClientRect();
    var size   = Math.max(rect.width, rect.height) * 2;
    var ripple = document.createElement('span');
    ripple.className = 'lp-ripple';
    ripple.style.cssText =
      'width:'  + size + 'px;height:' + size + 'px;' +
      'left:'   + (e.clientX - rect.left - size / 2) + 'px;' +
      'top:'    + (e.clientY - rect.top  - size / 2) + 'px;';
    if (window.getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(ripple);
    ripple.addEventListener('animationend', function () { ripple.remove(); });
  }

  /* ──────────────────────────────────────────────────────────
     CONSOLE
  ────────────────────────────────────────────────────────── */
  console.log('%cCivicResolve AI 🏙️  —  Login', 'color:#1976D2;font-size:16px;font-weight:800;');
  console.log('%cFrontend prototype — any credentials accepted.', 'color:#4A6280;font-size:12px;');

}());
