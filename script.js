/* ============================================================
   CIVICRESOLVE AI — script.js
   Handles: sticky nav, mobile menu, smooth scroll, scroll-reveal,
   progress bar animation, stat counter, active nav link tracking
   ============================================================ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
     1. DOM REFERENCES
  ───────────────────────────────────────── */
  const navbar      = document.getElementById('navbar');
  const hamburger   = document.getElementById('hamburger');
  const mobileMenu  = document.getElementById('mobileMenu');
  const progressFill = document.getElementById('progressFill');
  const allNavLinks  = document.querySelectorAll('.nav-links a, .nav-mobile a');
  const sections     = document.querySelectorAll('section[id], div[id]');

  /* ─────────────────────────────────────────
     2. STICKY NAVBAR — scroll shadow
  ───────────────────────────────────────── */
  function handleNavScroll() {
    if (window.scrollY > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll(); // run once on load

  /* ─────────────────────────────────────────
     3. MOBILE MENU TOGGLE
  ───────────────────────────────────────── */
  function toggleMobileMenu() {
    const isOpen = mobileMenu.classList.contains('open');
    if (isOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  function openMobileMenu() {
    mobileMenu.classList.add('open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', toggleMobileMenu);

  /* Close mobile menu when a link is clicked */
  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMobileMenu);
  });

  /* Close on outside click */
  document.addEventListener('click', function (e) {
    if (
      mobileMenu.classList.contains('open') &&
      !mobileMenu.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      closeMobileMenu();
    }
  });

  /* Close on Escape */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMobileMenu();
  });

  /* ─────────────────────────────────────────
     4. SMOOTH SCROLL — all anchor links
  ───────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').slice(1);
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (!target) return;
      e.preventDefault();
      const navHeight = navbar.offsetHeight;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 8;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  /* ─────────────────────────────────────────
     5. ACTIVE NAV LINK — on scroll
  ───────────────────────────────────────── */
  function updateActiveLink() {
    const scrollPos = window.scrollY + navbar.offsetHeight + 40;
    let current = '';

    sections.forEach(function (section) {
      if (section.offsetTop <= scrollPos) {
        current = section.getAttribute('id');
      }
    });

    document.querySelectorAll('.nav-links a').forEach(function (link) {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === '#' + current) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();

  /* ─────────────────────────────────────────
     6. SCROLL REVEAL — IntersectionObserver
  ───────────────────────────────────────── */
  const revealObserverOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.12
  };

  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target); // animate once
      }
    });
  }, revealObserverOptions);

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ─────────────────────────────────────────
     7. PROGRESS BAR ANIMATION (Hero dashboard)
  ───────────────────────────────────────── */
  if (progressFill) {
    /* Animate when hero is in view — fires quickly on load */
    const progressObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        setTimeout(function () {
          progressFill.style.width = '65%';
        }, 600);
        progressObserver.disconnect();
      }
    }, { threshold: 0.3 });

    progressObserver.observe(progressFill);
  }

  /* ─────────────────────────────────────────
     8. STAT COUNTER — About section
  ───────────────────────────────────────── */
  function animateCounter(el, target, duration) {
    const start    = 0;
    const startTime = performance.now();
    const suffix   = el.querySelector('sup') ? el.querySelector('sup').outerHTML : '';
    const numNode  = el.childNodes[0]; // first text node

    function update(currentTime) {
      const elapsed  = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const ease     = 1 - Math.pow(1 - progress, 4);
      const value    = Math.round(start + (target - start) * ease);

      /* Format large numbers with comma */
      const formatted = value >= 1000
        ? value.toLocaleString('en-IN')
        : String(value);

      numNode.textContent = formatted;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  const statObserver = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) {
      document.querySelectorAll('[data-count]').forEach(function (el) {
        const target = parseInt(el.getAttribute('data-count'), 10);
        animateCounter(el, target, 1800);
      });
      statObserver.disconnect();
    }
  }, { threshold: 0.4 });

  const statsContainer = document.querySelector('.lc-stats');
  if (statsContainer) {
    statObserver.observe(statsContainer);
  }

  /* ─────────────────────────────────────────
     9. LIFECYCLE STEP — hover highlight
  ───────────────────────────────────────── */
  document.querySelectorAll('.lc-step').forEach(function (step) {
    step.addEventListener('mouseenter', function () {
      this.style.paddingLeft = '6px';
      this.style.transition  = 'padding 0.2s ease';
    });
    step.addEventListener('mouseleave', function () {
      this.style.paddingLeft = '0';
    });
  });

  /* ─────────────────────────────────────────
     10. BUTTON RIPPLE EFFECT
  ───────────────────────────────────────── */
  document.querySelectorAll('.btn-primary, .btn-nav-report').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      const rect   = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size   = Math.max(rect.width, rect.height) * 2;
      const x      = e.clientX - rect.left - size / 2;
      const y      = e.clientY - rect.top  - size / 2;

      ripple.style.cssText = [
        'position:absolute',
        'width:'  + size + 'px',
        'height:' + size + 'px',
        'left:'   + x + 'px',
        'top:'    + y + 'px',
        'border-radius:50%',
        'background:rgba(255,255,255,0.3)',
        'transform:scale(0)',
        'animation:rippleAnim 0.55s linear',
        'pointer-events:none'
      ].join(';');

      /* Ensure button has relative positioning */
      if (getComputedStyle(btn).position === 'static') {
        btn.style.position = 'relative';
      }
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);

      ripple.addEventListener('animationend', function () {
        ripple.remove();
      });
    });
  });

  /* Inject ripple keyframe once */
  if (!document.getElementById('rippleStyle')) {
    const style = document.createElement('style');
    style.id = 'rippleStyle';
    style.textContent = '@keyframes rippleAnim{to{transform:scale(1);opacity:0}}';
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────
     11. HIGHLIGHT CHIP — staggered entrance
         (chips are already in viewport on load)
  ───────────────────────────────────────── */
  document.querySelectorAll('.highlight-chip').forEach(function (chip, i) {
    chip.style.opacity    = '0';
    chip.style.transform  = 'translateY(14px)';
    chip.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
    chip.style.transitionDelay = (0.5 + i * 0.1) + 's';

    setTimeout(function () {
      chip.style.opacity   = '1';
      chip.style.transform = 'translateY(0)';
    }, 50);
  });

  /* ─────────────────────────────────────────
     12. DASHBOARD — live update ticker
         Simulates small real-time changes
  ───────────────────────────────────────── */
  const supportCountEl = document.querySelector('.tag-community');
  if (supportCountEl) {
    let count = 32;
    setInterval(function () {
      /* Occasionally bump support count by 1 */
      if (Math.random() < 0.3) {
        count += 1;
        supportCountEl.textContent = '👥 ' + count + ' Supports';

        /* Tiny flash animation */
        supportCountEl.style.transition = 'background 0.25s';
        supportCountEl.style.background = 'rgba(0,180,216,0.22)';
        setTimeout(function () {
          supportCountEl.style.background = '';
        }, 400);
      }
    }, 4500);
  }

  /* ─────────────────────────────────────────
     13. ABOUT POINT CARDS — staggered reveal
         (extra polish on top of CSS reveal)
  ───────────────────────────────────────── */
  const aboutObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.about-point').forEach(function (pt, i) {
          setTimeout(function () {
            pt.classList.add('visible');
          }, i * 100);
        });
        aboutObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  const aboutLeft = document.querySelector('.about-left');
  if (aboutLeft) aboutObserver.observe(aboutLeft);

  /* ─────────────────────────────────────────
     14. WINDOW RESIZE — close mobile menu
  ───────────────────────────────────────── */
  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) {
      closeMobileMenu();
    }
  });

  /* ─────────────────────────────────────────
     INIT LOG
  ───────────────────────────────────────── */
  console.log(
    '%cCivicResolve AI 🏙️',
    'color:#1976D2;font-size:18px;font-weight:800;'
  );
  console.log(
    '%cTurning Civic Problems Into Resolved Actions.',
    'color:#4A6280;font-size:13px;'
  );

})();

/* ============================================================
   PART 2 — How It Works · Features · Categories
   ============================================================ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
     HOW IT WORKS — animated connector line
     Triggers once the timeline scrolls into view
  ───────────────────────────────────────── */
  const hiwTimeline = document.getElementById('hiwTimeline');

  if (hiwTimeline) {
    const lineObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        /* Small delay so the steps reveal first */
        setTimeout(function () {
          hiwTimeline.classList.add('line-animated');
        }, 400);
        lineObserver.disconnect();
      }
    }, { threshold: 0.25 });

    lineObserver.observe(hiwTimeline);
  }

  /* ─────────────────────────────────────────
     HOW IT WORKS — step hover: scale icon ring
  ───────────────────────────────────────── */
  document.querySelectorAll('.hiw-step').forEach(function (step) {
    const num = step.querySelector('.hiw-step-num');
    step.addEventListener('mouseenter', function () {
      if (num) {
        num.style.background = 'linear-gradient(135deg,#EEF4FF,#E0EEFF)';
        num.style.borderColor = 'rgba(21,101,192,0.25)';
      }
    });
    step.addEventListener('mouseleave', function () {
      if (num) {
        num.style.background = '';
        num.style.borderColor = '';
      }
    });
  });

  /* ─────────────────────────────────────────
     FEATURES — card tilt on mouse-move
     Subtle 3-D perspective tilt for desktop
  ───────────────────────────────────────── */
  function addTilt(card) {
    card.addEventListener('mousemove', function (e) {
      const rect   = card.getBoundingClientRect();
      const x      = e.clientX - rect.left;
      const y      = e.clientY - rect.top;
      const cx     = rect.width  / 2;
      const cy     = rect.height / 2;
      const rotateX = ((y - cy) / cy) * -5;   /* max ±5deg */
      const rotateY = ((x - cx) / cx) *  5;
      card.style.transform = 'translateY(-6px) perspective(800px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
    });
    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    });
  }

  /* Only apply tilt on non-touch devices */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.feat-card').forEach(addTilt);
  }

  /* ─────────────────────────────────────────
     FEATURES — staggered reveal per row
     Re-observe feat-grid children individually
     so each row staggers as it enters viewport
  ───────────────────────────────────────── */
  const featGrid = document.querySelector('.feat-grid');
  if (featGrid) {
    const featObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          /* find index among siblings */
          const cards   = Array.from(featGrid.querySelectorAll('.feat-card'));
          const idx     = cards.indexOf(entry.target);
          const col     = idx % 4;  /* 0-3, used for delay */
          entry.target.style.transitionDelay = (col * 0.08) + 's';
          entry.target.classList.add('visible');
          featObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    featGrid.querySelectorAll('.feat-card').forEach(function (card) {
      featObserver.observe(card);
    });
  }

  /* ─────────────────────────────────────────
     CATEGORIES — staggered reveal per card
  ───────────────────────────────────────── */
  const catGrid = document.querySelector('.cat-grid');
  if (catGrid) {
    const catObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const cards = Array.from(catGrid.querySelectorAll('.cat-card'));
          const idx   = cards.indexOf(entry.target);
          entry.target.style.transitionDelay = (idx * 0.07) + 's';
          entry.target.classList.add('visible');
          catObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    catGrid.querySelectorAll('.cat-card').forEach(function (card) {
      /* Make cards behave like reveal elements */
      card.classList.add('reveal');
      catObserver.observe(card);
    });
  }

  /* ─────────────────────────────────────────
     CATEGORIES — live issue count ticker
     Occasionally bumps one random category
     count to simulate real-time activity
  ───────────────────────────────────────── */
  const countEls = document.querySelectorAll('.cat-card-count');
  if (countEls.length) {
    setInterval(function () {
      if (Math.random() < 0.4) {
        const el  = countEls[Math.floor(Math.random() * countEls.length)];
        const txt = el.textContent;
        const num = parseInt(txt.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num)) {
          el.textContent = (num + 1).toLocaleString('en-IN') + ' issues tracked';
          /* flash highlight */
          el.style.transition = 'background 0.3s';
          el.style.background = 'rgba(21,101,192,0.14)';
          setTimeout(function () { el.style.background = ''; }, 500);
        }
      }
    }, 3800);
  }

  /* ─────────────────────────────────────────
     CATEGORIES — card click ripple + report CTA
  ───────────────────────────────────────── */
  document.querySelectorAll('.cat-card').forEach(function (card) {
    card.addEventListener('click', function (e) {
      /* Ripple */
      const rect   = card.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size   = Math.max(rect.width, rect.height) * 1.8;
      ripple.style.cssText = [
        'position:absolute',
        'width:'  + size + 'px',
        'height:' + size + 'px',
        'left:'   + (e.clientX - rect.left  - size / 2) + 'px',
        'top:'    + (e.clientY - rect.top   - size / 2) + 'px',
        'border-radius:50%',
        'background:rgba(21,101,192,0.08)',
        'transform:scale(0)',
        'animation:rippleAnim 0.55s linear',
        'pointer-events:none'
      ].join(';');
      card.appendChild(ripple);
      ripple.addEventListener('animationend', function () { ripple.remove(); });
    });
  });

  /* ─────────────────────────────────────────
     HOW IT WORKS — mobile vertical step
     Add .hiw-step-body wrapper if not present
     (HTML already wraps, this is a safety pass)
  ───────────────────────────────────────── */
  document.querySelectorAll('.hiw-step').forEach(function (step) {
    if (!step.querySelector('.hiw-step-body')) {
      const body = document.createElement('div');
      body.className = 'hiw-step-body';
      while (step.children.length > 1) {
        body.appendChild(step.children[1]);
      }
      step.appendChild(body);
    }
  });

  /* ─────────────────────────────────────────
     SECTION ENTRANCE — re-register new reveal
     elements that weren't in the DOM at init
     (the main revealObserver in part-1 misses
      elements added after DOMContentLoaded,
      so we create a second observer here)
  ───────────────────────────────────────── */
  const revealObs2 = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObs2.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

  /* Observe every reveal element that hasn't already been made visible */
  document.querySelectorAll(
    '#how-it-works .reveal, #how-it-works .reveal-left, #how-it-works .reveal-right,' +
    '#features .reveal, #features .reveal-left, #features .reveal-right,' +
    '#categories .reveal, #categories .reveal-left, #categories .reveal-right'
  ).forEach(function (el) {
    if (!el.classList.contains('visible')) {
      revealObs2.observe(el);
    }
  });

})();

/* ============================================================
   PART 3 — Q&A · CTA · Footer · Back-to-Top · Global Polish
   ============================================================ */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
     Q&A ACCORDION
  ───────────────────────────────────────── */
  const accordion = document.getElementById('qaAccordion');

  if (accordion) {
    accordion.querySelectorAll('.qa-item').forEach(function (item) {
      const btn    = item.querySelector('.qa-question');
      const answer = item.querySelector('.qa-answer');
      const inner  = item.querySelector('.qa-answer-inner');

      /* Measure natural height so we can animate to it */
      function openItem() {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = inner.scrollHeight + 40 + 'px';
      }

      function closeItem() {
        item.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        answer.style.maxHeight = '0';
      }

      btn.addEventListener('click', function () {
        const isOpen = item.classList.contains('open');

        /* Close all others first */
        accordion.querySelectorAll('.qa-item.open').forEach(function (openItem) {
          if (openItem !== item) {
            openItem.classList.remove('open');
            openItem.querySelector('.qa-question').setAttribute('aria-expanded', 'false');
            openItem.querySelector('.qa-answer').style.maxHeight = '0';
          }
        });

        if (isOpen) {
          closeItem();
        } else {
          openItem();
        }
      });

      /* Keyboard: space / enter already fire click; add arrow nav */
      btn.addEventListener('keydown', function (e) {
        const items   = Array.from(accordion.querySelectorAll('.qa-question'));
        const idx     = items.indexOf(btn);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (items[idx + 1]) items[idx + 1].focus();
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (items[idx - 1]) items[idx - 1].focus();
        }
        if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
        if (e.key === 'End')  { e.preventDefault(); items[items.length - 1].focus(); }
      });
    });

    /* First item is pre-opened in HTML — set correct maxHeight on load */
    const firstItem = accordion.querySelector('.qa-item.open');
    if (firstItem) {
      const inner = firstItem.querySelector('.qa-answer-inner');
      firstItem.querySelector('.qa-answer').style.maxHeight =
        inner.scrollHeight + 40 + 'px';
    }

    /* Scroll-reveal for accordion items — stagger per item */
    const qaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const items = Array.from(accordion.querySelectorAll('.qa-item'));
          const idx   = items.indexOf(entry.target);
          setTimeout(function () {
            entry.target.style.opacity   = '1';
            entry.target.style.transform = 'translateY(0)';
          }, idx * 60);
          qaObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    accordion.querySelectorAll('.qa-item').forEach(function (item) {
      item.style.opacity   = '0';
      item.style.transform = 'translateY(18px)';
      item.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
      qaObserver.observe(item);
    });
  }


  /* ─────────────────────────────────────────
     CTA SECTION — entrance animations
  ───────────────────────────────────────── */
  const ctaSection = document.getElementById('cta-final');

  if (ctaSection) {
    const ctaObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        /* Stagger inner elements */
        const els = ctaSection.querySelectorAll(
          '.cta-eyebrow, .cta-headline, .cta-subtext, .cta-actions, .cta-trust'
        );
        els.forEach(function (el, i) {
          el.style.opacity   = '0';
          el.style.transform = 'translateY(24px)';
          el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
          setTimeout(function () {
            el.style.opacity   = '1';
            el.style.transform = 'translateY(0)';
          }, 120 + i * 110);
        });

        /* Trust badges — slight delay + scale-in */
        ctaSection.querySelectorAll('.cta-trust-item').forEach(function (ti, i) {
          ti.style.opacity   = '0';
          ti.style.transform = 'scale(0.88)';
          ti.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
          setTimeout(function () {
            ti.style.opacity   = '1';
            ti.style.transform = 'scale(1)';
          }, 700 + i * 80);
        });

        ctaObserver.disconnect();
      }
    }, { threshold: 0.2 });

    ctaObserver.observe(ctaSection);

    /* Button click ripple */
    ctaSection.querySelectorAll('.btn-cta-primary, .btn-cta-secondary').forEach(function (btn) {
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.addEventListener('click', function (e) {
        const rect   = btn.getBoundingClientRect();
        const size   = Math.max(rect.width, rect.height) * 2;
        const ripple = document.createElement('span');
        ripple.style.cssText = [
          'position:absolute',
          'width:'  + size + 'px',
          'height:' + size + 'px',
          'left:'   + (e.clientX - rect.left  - size / 2) + 'px',
          'top:'    + (e.clientY - rect.top   - size / 2) + 'px',
          'border-radius:50%',
          'background:rgba(255,255,255,0.18)',
          'transform:scale(0)',
          'animation:rippleAnim 0.55s linear',
          'pointer-events:none'
        ].join(';');
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', function () { ripple.remove(); });
      });
    });
  }


  /* ─────────────────────────────────────────
     FOOTER — link hover micro-animation
     (dot indicator slides in smoothly)
  ───────────────────────────────────────── */
  document.querySelectorAll('.footer-col ul li a').forEach(function (link) {
    link.addEventListener('mouseenter', function () {
      this.style.paddingLeft = '10px';
      this.style.transition  = 'color 0.18s ease, padding-left 0.2s ease';
    });
    link.addEventListener('mouseleave', function () {
      this.style.paddingLeft = '0';
    });
  });

  /* Newsletter form — prevent default, show toast */
  const emailForm = document.querySelector('.footer-email-form');
  if (emailForm) {
    emailForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const input = emailForm.querySelector('input');
      const btn   = emailForm.querySelector('button');
      if (!input.value.trim()) return;
      btn.textContent = '✓ Subscribed!';
      btn.style.background = 'var(--success)';
      input.value = '';
      setTimeout(function () {
        btn.textContent = 'Subscribe';
        btn.style.background = '';
      }, 3000);
    });
  }


  /* ─────────────────────────────────────────
     BACK TO TOP
  ───────────────────────────────────────── */
  const bttBtn = document.getElementById('backToTop');

  if (bttBtn) {
    /* Show after scrolling 400px */
    window.addEventListener('scroll', function () {
      if (window.scrollY > 400) {
        bttBtn.classList.add('visible');
      } else {
        bttBtn.classList.remove('visible');
      }
    }, { passive: true });

    bttBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }


  /* ─────────────────────────────────────────
     GLOBAL POLISH — re-register any leftover
     reveal elements across ALL sections
  ───────────────────────────────────────── */
  const finalRevealObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        finalRevealObs.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -50px 0px', threshold: 0.08 });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(function (el) {
    if (!el.classList.contains('visible')) {
      finalRevealObs.observe(el);
    }
  });


  /* ─────────────────────────────────────────
     GLOBAL POLISH — active nav on all sections
     (re-run after all sections are in DOM)
  ───────────────────────────────────────── */
  const allSectionIds = ['home','about','how-it-works','features','categories','qa'];

  function updateNav() {
    const scrollY   = window.scrollY;
    const navHeight = (document.getElementById('navbar') || {}).offsetHeight || 68;
    let current = 'home';

    allSectionIds.forEach(function (id) {
      const sec = document.getElementById(id);
      if (sec && sec.offsetTop <= scrollY + navHeight + 60) {
        current = id;
      }
    });

    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();


  /* ─────────────────────────────────────────
     GLOBAL POLISH — smooth page load fade-in
  ───────────────────────────────────────── */
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.4s ease';
  window.addEventListener('load', function () {
    document.body.style.opacity = '1';
  });

  /* Fallback if load already fired */
  if (document.readyState === 'complete') {
    document.body.style.opacity = '1';
  }

})();

/* ============================================================
   HERO TIMELINE — sequential animated fill
   Line sweeps left→right, dots pop with tick one by one.
   Loops every 5 s so it keeps playing automatically.
   ============================================================ */
(function () {
  'use strict';

  var timeline = document.getElementById('heroTimeline');
  if (!timeline) return;

  var steps = Array.from(timeline.querySelectorAll('.t-step'));

  /* Per-step timing (ms): how long after the PREVIOUS step fires */
  var stepDelay  = 700;   /* gap between each step activating  */
  var lineTime   = 550;   /* CSS transition duration for line   */
  var dotPopTime = 180;   /* how long the pop class stays on    */
  var loopPause  = 2200;  /* pause at end before restarting     */

  var timers = [];

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function resetAll() {
    steps.forEach(function (s) {
      s.classList.remove('done', 'current', 'dot-pop');
    });
  }

  function activateStep(index) {
    var step  = steps[index];
    var state = step.getAttribute('data-state');

    if (state === 'done') {
      /* 1. Pop the dot */
      step.classList.add('dot-pop');
      /* 2. Add 'done' — triggers line sweep via CSS */
      step.classList.add('done');
      /* 3. Remove pop class after bounce settles */
      timers.push(setTimeout(function () {
        step.classList.remove('dot-pop');
      }, dotPopTime + 300));

    } else if (state === 'current') {
      step.classList.add('current');
    }
    /* pending: do nothing — stays grey */
  }

  function runSequence(startDelay) {
    /* Fire each step one after the other */
    steps.forEach(function (step, i) {
      var t = setTimeout(function () {
        activateStep(i);
      }, startDelay + i * stepDelay);
      timers.push(t);
    });
  }

  function startLoop() {
    clearTimers();
    resetAll();

    /* First run: small initial delay so card is visible first */
    var totalSequenceTime = steps.length * stepDelay + lineTime + 400;

    runSequence(400);

    /* Schedule next loop */
    var loopTimer = setTimeout(function () {
      startLoop();
    }, 400 + totalSequenceTime + loopPause);
    timers.push(loopTimer);
  }

  /* Start when the dashboard card scrolls into view */
  var dashCard = document.querySelector('.dashboard-card');
  if (!dashCard) { startLoop(); return; }

  var started = false;
  var visObs = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !started) {
      started = true;
      startLoop();
    }
    /* If card leaves viewport, pause; resume on re-entry */
    if (!entries[0].isIntersecting && started) {
      clearTimers();
      started = false;
    }
  }, { threshold: 0.4 });

  visObs.observe(dashCard);

})();

/* ============================================================
   NAV SLIDING CURSOR — framer-motion style pill
   Mirrors the React NavHeader sliding cursor behaviour
   purely in vanilla JS + CSS transitions.
   ============================================================ */
(function () {
  'use strict';

  var navLinks = document.getElementById('navLinks');
  var cursor   = document.getElementById('navCursor');
  if (!navLinks || !cursor) return;

  /* All anchor links inside the nav (exclude the cursor li itself) */
  var links = Array.from(navLinks.querySelectorAll('a'));

  /* ── Move cursor to a given link element ── */
  function moveTo(linkEl) {
    /* offsetLeft is relative to the ul because nav-links is position:relative */
    cursor.style.left    = linkEl.parentElement.offsetLeft + 'px';
    cursor.style.width   = linkEl.parentElement.offsetWidth + 'px';
    cursor.style.opacity = '1';
  }

  /* ── Hide cursor ── */
  function hide() {
    cursor.style.opacity = '0';
  }

  /* Hover: slide to hovered link */
  links.forEach(function (a) {
    a.parentElement.addEventListener('mouseenter', function () {
      moveTo(a);
    });
  });

  /* Mouse leaves the whole nav-links list → return to active link */
  navLinks.addEventListener('mouseleave', function () {
    var active = navLinks.querySelector('a.active');
    if (active) {
      moveTo(active);
    } else {
      hide();
    }
  });

  /* On scroll / click: snap cursor to the new active link */
  function syncToActive() {
    var active = navLinks.querySelector('a.active');
    if (active) {
      /* Temporarily disable transition for instant snap on active-link change */
      cursor.style.transition = 'none';
      moveTo(active);
      /* Re-enable smooth transition on next frame */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          cursor.style.transition = '';
        });
      });
    }
  }

  /* Watch for active class changes via MutationObserver */
  var mo = new MutationObserver(syncToActive);
  links.forEach(function (a) {
    mo.observe(a, { attributes: true, attributeFilter: ['class'] });
  });

  /* Initial position after fonts/layout are ready */
  window.addEventListener('load', function () {
    syncToActive();
    cursor.style.opacity = '1';
  });

  /* Also sync on scroll (active link changes) */
  window.addEventListener('scroll', function () {
    syncToActive();
  }, { passive: true });

})();

/* ============================================================
   DARK / LIGHT MODE TOGGLE
   Persists preference in localStorage.
   Respects OS prefers-color-scheme on first visit.
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'civicresolve-theme';
  var btn         = document.getElementById('themeToggle');
  var html        = document.documentElement;

  /* ── Determine initial theme ── */
  function getInitialTheme() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    /* Fall back to OS preference */
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }

  /* ── Apply theme to <html data-theme="..."> ── */
  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    if (btn) btn.setAttribute('aria-label',
      theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  /* ── Toggle ── */
  function toggleTheme() {
    var current = html.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  /* Init */
  applyTheme(getInitialTheme());
  if (btn) btn.addEventListener('click', toggleTheme);

  /* Listen for OS preference changes */
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', function (e) {
      /* Only auto-switch if user hasn't manually set a preference */
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });

})();
