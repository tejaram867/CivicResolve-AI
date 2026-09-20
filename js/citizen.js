(function () {
  const CR = CivicResolve;
  if (window.CivicAPI) {
    CivicAPI.requireRole('citizen');
    CivicAPI.bindLogout();
  }

  let boostedCount = 7;

  /* ── Timeline step icons & colours ── */
  const STEP_META = {
    'Reported':            { icon: '📝', color: 'var(--blue-500)',   label: 'Reported by Citizen' },
    'AI Analyzed':         { icon: '🤖', color: 'var(--blue-600)',   label: 'AI Analysis Complete' },
    'Assigned':            { icon: '👤', color: '#7c3aed',           label: 'Officer Assigned' },
    'Inspection':          { icon: '🔍', color: '#0891b2',           label: 'Field Inspection Done' },
    'In Progress':         { icon: '⚙️', color: 'var(--warning)',    label: 'Work In Progress' },
    'Completed':           { icon: '🏁', color: '#059669',           label: 'Work Completed' },
    'Admin Verified':      { icon: '✅', color: 'var(--success)',    label: 'Admin Verified' },
    'Citizen Verification':{ icon: '👁️', color: '#d97706',           label: 'Awaiting Citizen Sign-off' },
    'Resolved':            { icon: '🎉', color: 'var(--success)',    label: 'Fully Resolved' },
  };

  const myIssues = [
    {
      id: 'CR-1018',
      title: 'Pothole near Main Road',
      category: 'Road',
      location: 'Main Road, Ward 12',
      date: '12 Mar 2026',
      status: 'Citizen Verification',
      priority: 'P1',
      img: 'road',
      desc: 'Large pothole causing vehicle damage near school zone. Multiple vehicles have reported tyre damage. The pothole measures approximately 2ft × 1.5ft.',
      officerId: 'OFF-042',
      officerName: 'Rajan Kumar',
      ward: 'Ward 12',
      reportedBy: 'Priya Sharma',
      timeline: [
        { step: 'Reported',             date: '12 Mar 2026', time: '09:14 AM', actor: 'Priya Sharma',   role: 'Citizen',        note: 'Photo & GPS submitted via app.' },
        { step: 'AI Analyzed',          date: '12 Mar 2026', time: '09:14 AM', actor: 'CivicResolve AI', role: 'System',        note: 'Category: Road · Severity: P1 · No duplicate found.' },
        { step: 'Assigned',             date: '12 Mar 2026', time: '11:30 AM', actor: 'Admin — Preethi', role: 'Admin',         note: 'Assigned to Officer Rajan Kumar (OFF-042), PWD Dept.' },
        { step: 'Inspection',           date: '13 Mar 2026', time: '10:05 AM', actor: 'Rajan Kumar',    role: 'OFF-042',        note: 'Pothole confirmed — 2ft × 1.5ft. Road surface cracked.' },
        { step: 'In Progress',          date: '14 Mar 2026', time: '08:50 AM', actor: 'Rajan Kumar',    role: 'OFF-042',        note: 'Repair crew deployed. Bitumen patching commenced.' },
        { step: 'Completed',            date: '15 Mar 2026', time: '04:20 PM', actor: 'Rajan Kumar',    role: 'OFF-042',        note: 'Patching complete. Area cleaned. Work photo uploaded.' },
        { step: 'Admin Verified',       date: '15 Mar 2026', time: '05:45 PM', actor: 'Admin — Preethi', role: 'Admin',         note: 'Work quality reviewed and approved.' },
        { step: 'Citizen Verification', date: '16 Mar 2026', time: '—',        actor: 'Priya Sharma',   role: 'Citizen',        note: 'Awaiting citizen confirmation of fix.' },
      ]
    },
    {
      id: 'CR-1024',
      title: 'Drainage blockage — 2nd Cross',
      category: 'Drainage',
      location: '2nd Cross St, Ward 12',
      date: '14 Mar 2026',
      status: 'In Progress',
      priority: 'P2',
      img: 'drain',
      desc: 'Stagnant water after rains; foul smell reported by multiple residents. Drainage pipe visibly blocked with debris.',
      officerId: 'OFF-017',
      officerName: 'Meena Selvam',
      ward: 'Ward 12',
      reportedBy: 'Priya Sharma',
      timeline: [
        { step: 'Reported',    date: '14 Mar 2026', time: '07:30 AM', actor: 'Priya Sharma',    role: 'Citizen',  note: 'Reported with 2 photos of waterlogging.' },
        { step: 'AI Analyzed', date: '14 Mar 2026', time: '07:30 AM', actor: 'CivicResolve AI', role: 'System',   note: 'Category: Drainage · Severity: P2 · 1 similar issue nearby.' },
        { step: 'Assigned',    date: '14 Mar 2026', time: '10:15 AM', actor: 'Admin — Preethi', role: 'Admin',    note: 'Assigned to Officer Meena Selvam (OFF-017), Sanitation Dept.' },
        { step: 'Inspection',  date: '15 Mar 2026', time: '09:40 AM', actor: 'Meena Selvam',    role: 'OFF-017',  note: 'Drain blocked by construction debris. Depth ~1m.' },
        { step: 'In Progress', date: '16 Mar 2026', time: '08:00 AM', actor: 'Meena Selvam',    role: 'OFF-017',  note: 'Drain cleaning crew on site. Partial clearance done.' },
      ]
    },
    {
      id: 'CR-1031',
      title: 'Streetlight not working',
      category: 'Streetlight',
      location: 'Park Avenue',
      date: '16 Mar 2026',
      status: 'Assigned',
      priority: 'P3',
      img: 'light',
      desc: 'Pole #44 on Park Avenue has been dark since Monday evening. Street becomes unsafe for pedestrians after 7 PM.',
      officerId: 'OFF-031',
      officerName: 'Arjun Nair',
      ward: 'Ward 12',
      reportedBy: 'Priya Sharma',
      timeline: [
        { step: 'Reported',    date: '16 Mar 2026', time: '08:22 AM', actor: 'Priya Sharma',    role: 'Citizen', note: 'Pole #44 — reported with location pin.' },
        { step: 'AI Analyzed', date: '16 Mar 2026', time: '08:22 AM', actor: 'CivicResolve AI', role: 'System',  note: 'Category: Streetlight · Severity: P3 · Unique complaint.' },
        { step: 'Assigned',    date: '16 Mar 2026', time: '02:10 PM', actor: 'Admin — Preethi', role: 'Admin',   note: 'Assigned to Officer Arjun Nair (OFF-031), Electricity Dept.' },
      ]
    },
    {
      id: 'CR-1005',
      title: 'Overflowing garbage bin',
      category: 'Garbage',
      location: 'Market Road',
      date: '8 Mar 2026',
      status: 'Resolved',
      priority: 'P3',
      img: 'garbage',
      desc: 'Community bin at Market Road junction overflowing for 3 days. Health hazard — stray dogs scattered waste on road.',
      officerId: 'OFF-009',
      officerName: 'Divya Raj',
      ward: 'Ward 12',
      reportedBy: 'Priya Sharma',
      timeline: [
        { step: 'Reported',             date: '8 Mar 2026',  time: '06:55 AM', actor: 'Priya Sharma',    role: 'Citizen',  note: 'Photo of overflowing bin submitted.' },
        { step: 'AI Analyzed',          date: '8 Mar 2026',  time: '06:55 AM', actor: 'CivicResolve AI', role: 'System',   note: 'Category: Garbage · Severity: P3 · No duplicate.' },
        { step: 'Assigned',             date: '8 Mar 2026',  time: '09:00 AM', actor: 'Admin — Preethi', role: 'Admin',    note: 'Assigned to Officer Divya Raj (OFF-009), Sanitation Dept.' },
        { step: 'Inspection',           date: '8 Mar 2026',  time: '11:30 AM', actor: 'Divya Raj',       role: 'OFF-009',  note: 'Bin confirmed overflowing. Emergency pickup scheduled.' },
        { step: 'In Progress',          date: '9 Mar 2026',  time: '07:15 AM', actor: 'Divya Raj',       role: 'OFF-009',  note: 'Garbage collected. Area sanitised with disinfectant.' },
        { step: 'Completed',            date: '9 Mar 2026',  time: '10:00 AM', actor: 'Divya Raj',       role: 'OFF-009',  note: 'New bin placed. Area cleared and photographed.' },
        { step: 'Admin Verified',       date: '9 Mar 2026',  time: '12:30 PM', actor: 'Admin — Preethi', role: 'Admin',    note: 'Verified on-site. Satisfactory resolution.' },
        { step: 'Citizen Verification', date: '9 Mar 2026',  time: '03:10 PM', actor: 'Priya Sharma',    role: 'Citizen',  note: 'Citizen confirmed the fix was effective.' },
        { step: 'Resolved',             date: '10 Mar 2026', time: '09:00 AM', actor: 'System',          role: 'System',   note: 'Issue closed after citizen confirmation. Case archived.' },
      ]
    }
  ];

  let nearby = [
    { id: 'CR-104', backendId: '104', title: 'Garbage overflow — Market Road', category: 'Garbage', distance: '0.5 km', location: 'Market Road', support: 4, priority: 'P2', status: 'Reported', boosted: false, lat: 13.0864, lng: 80.2692 },
    { id: 'CR-102', backendId: '102', title: 'Drainage blockage — School Lane', category: 'Drainage', distance: '0.8 km', location: 'School Lane', support: 12, priority: 'P1', status: 'AI Analyzed', boosted: false, lat: 13.0801, lng: 80.2684 },
    { id: 'CR-103', backendId: '103', title: 'Streetlight outage — Park Avenue', category: 'Streetlight', distance: '1.1 km', location: 'Park Avenue', support: 3, priority: 'P3', status: 'Reported', boosted: false, lat: 13.0788, lng: 80.2755 },
    { id: 'CR-101', backendId: '101', title: 'Main Road Pothole', category: 'Road', distance: '0.4 km', location: 'Main Road', support: 18, priority: 'P1', status: 'Assigned', boosted: false, lat: 13.0852, lng: 80.2731 }
  ];

  const resolved = [
    { title: 'Street flooding cleared', location: 'Anna Nagar', date: '10 Mar 2026' },
    { title: 'Park lights restored', location: 'Central Park', date: '9 Mar 2026' },
    { title: 'Road patch completed', location: 'Ring Road', date: '7 Mar 2026' }
  ];

  const notifications = [
    { text: 'Your pothole complaint has been assigned.', time: '2 hours ago', read: false },
    { text: 'Inspection completed for your drainage complaint.', time: 'Yesterday', read: false },
    { text: 'A nearby issue you boosted is now in progress.', time: 'Yesterday', read: false },
    { text: 'Your issue has been marked as resolved. Please verify.', time: 'Just now', read: false }
  ];

  const t = (k, v) => (CR.t ? CR.t(k, v) : k);
  function aiReply(key) {
    const map = { report: 'ai_a_report', boost: 'ai_a_boost', verify: 'ai_a_verify', pending: 'ai_a_pending' };
    return t(map[key] || 'ai_fallback');
  }
  function updateWelcome() {
    const el = document.getElementById('welcomeTitle');
    if (el) el.textContent = `${CR.greeting()}, ${t('citizen_name')} 👋`;
  }

  function priorityBadge(p) {
    const c = ({ P1: 'badge-p1', P2: 'badge-p2', P3: 'badge-p3', P4: 'badge-p4' })[p] || 'badge-neutral';
    return `<span class="badge ${c}">${p}</span>`;
  }

  function statusBadge(s) {
    if (s.includes('Verification') || s === 'Completed') return `<span class="badge badge-warning">${s}</span>`;
    if (s === 'Resolved') return `<span class="badge badge-success">${s}</span>`;
    if (s === 'In Progress' || s === 'Assigned') return `<span class="badge badge-info">${s}</span>`;
    return `<span class="badge badge-neutral">${s}</span>`;
  }

  function progressBars(status) {
    const steps = ['Reported', 'AI Analyzed', 'Assigned', 'Inspection', 'In Progress', 'Completed', 'Verified'];
    let done = 0;
    if (status === 'Reported') done = 1;
    else if (status === 'AI Analyzed') done = 2;
    else if (status === 'Assigned') done = 3;
    else if (status === 'Inspection') done = 4;
    else if (status === 'In Progress') done = 5;
    else if (status === 'Completed' || status === 'Admin Verified' || status === 'Citizen Verification') done = 6;
    else if (status === 'Resolved') done = 7;
    return `<div class="progress-track">${steps.map((_, i) => `<div class="step ${i < done ? 'done' : i === done ? 'current' : ''}"></div>`).join('')}</div>`;
  }

  function renderStats() {
    const inProg = myIssues.filter(i => ['Assigned', 'Inspection', 'In Progress', 'AI Analyzed'].includes(i.status)).length;
    const needs = myIssues.filter(i => i.status === 'Citizen Verification').length;
    const reported = myIssues.length;
    const stats = [
      { icon: '📋', value: reported, label: t('stat_reported'), trend: t('trend_week') },
      { icon: '🔄', value: inProg, label: t('stat_in_progress'), trend: t('trend_active') },
      { icon: '✅', value: needs, label: t('stat_needs'), trend: needs ? t('trend_action') : t('trend_clear') },
      { icon: '🚧', value: boostedCount, label: t('stat_boosted'), trend: t('trend_community'), id: 'boostStat' }
    ];
    document.getElementById('statsGrid').innerHTML = stats.map((s, i) => `
      <div class="stat-card" style="animation-delay:${i * 0.05}s" ${s.id ? `id="${s.id}"` : ''}>
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-trend">${s.trend}</div>
      </div>
    `).join('');
  }

  function renderNeedsAction() {
    const items = myIssues.filter(i => i.status === 'Citizen Verification');
    const el = document.getElementById('needsActionList');
    if (!items.length) {
      el.innerHTML = `<div class="card">${t('needs_empty')}</div>`;
      return;
    }
    el.innerHTML = items.map(i => `
      <div class="action-card" data-id="${i.id}">
        <h3>${i.title}</h3>
        <div class="status-line">${t('status_line')} · ${i.id}</div>
        <div class="action-btns">
          <button class="btn btn-success btn-sm" data-action="resolved">${t('btn_resolved')}</button>
          <button class="btn btn-danger btn-sm" data-action="not">${t('btn_not_resolved')}</button>
          <button class="btn btn-warning btn-sm" data-action="reverify">${t('btn_reverify')}</button>
        </div>
      </div>
    `).join('');

    el.querySelectorAll('.action-card').forEach(card => {
      card.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = card.dataset.id;
          const issue = myIssues.find(x => x.id === id);
          const a = btn.dataset.action;
          if (a === 'resolved') {
            issue.status = 'Resolved';
            issue.timeline.push({ step: 'Resolved', date: CR.formatDate(), time: new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}), actor: 'Priya Sharma', role: 'Citizen', note: 'Citizen confirmed the issue is resolved.' });
            CR.toast(t('toast_resolved'), 'success');
          } else if (a === 'not') {
            issue.status = 'In Progress';
            CR.toast(t('toast_reopened'), 'warning');
          } else {
            CR.toast(t('toast_reverify'), 'success');
          }
          renderAll();
        });
      });
    });
  }

  function renderMyIssues() {
    document.getElementById('myIssuesList').innerHTML = myIssues.map(i => `
      <article class="issue-card" data-id="${i.id}">
        <div class="issue-img ${i.img}">${i.category}</div>
        <div class="issue-body">
          <h3>${i.title}</h3>
          <div class="issue-meta">${priorityBadge(i.priority)} ${statusBadge(i.status)}</div>
          <div class="meta-line">📍 ${i.location}</div>
          <div class="meta-line">📅 ${i.date} · ${i.id}</div>
          ${progressBars(i.status)}
        </div>
      </article>
    `).join('');

    document.querySelectorAll('#myIssuesList .issue-card').forEach(card => {
      card.addEventListener('click', () => openIssueDetail(card.dataset.id));
    });
  }

  function openIssueDetail(id) {
    const i = myIssues.find(x => x.id === id) || nearby.find(x => x.id === id);
    if (!i) return;

    /* Modal header title */
    document.getElementById('detailTitle').innerHTML =
      `<span style="color:var(--slate-500);font-size:0.85rem;font-weight:600;">${i.id}</span>
       <span style="margin:0 0.4rem;color:var(--slate-300);">—</span>${i.title}`;

    /* Build timeline rows */
    const tlSteps = i.timeline || [{ step: 'Reported', date: i.date, time: '—', actor: i.reportedBy || 'Citizen', role: 'Citizen', note: '' }];
    const isObj   = typeof tlSteps[0] === 'object';

    const timelineHTML = tlSteps.map((entry, idx) => {
      const step    = isObj ? entry.step  : entry;
      const date    = isObj ? entry.date  : '';
      const time    = isObj ? entry.time  : '';
      const actor   = isObj ? entry.actor : '';
      const role    = isObj ? entry.role  : '';
      const note    = isObj ? entry.note  : (idx < tlSteps.length - 1 ? 'Completed' : 'Current stage');
      const isLast  = idx === tlSteps.length - 1;
      const isDone  = !isLast;
      const meta    = STEP_META[step] || { icon: '📌', color: 'var(--slate-400)', label: step };

      /* Role chip colour */
      const roleChip = role.startsWith('OFF')
        ? `<span class="tl-role-chip tl-role-officer">${role}</span>`
        : role === 'Admin'
          ? `<span class="tl-role-chip tl-role-admin">${role}</span>`
          : role === 'System'
            ? `<span class="tl-role-chip tl-role-system">${role}</span>`
            : `<span class="tl-role-chip tl-role-citizen">${role}</span>`;

      return `
        <div class="dtl-tl-row ${isDone ? 'done' : 'current'}">
          <!-- left: icon + line -->
          <div class="dtl-tl-left">
            <div class="dtl-tl-dot" style="--step-color:${meta.color}">${meta.icon}</div>
            ${!isLast ? '<div class="dtl-tl-line"></div>' : ''}
          </div>
          <!-- right: content -->
          <div class="dtl-tl-content">
            <div class="dtl-tl-header">
              <strong class="dtl-tl-step">${step}</strong>
              ${isDone
                ? `<span class="dtl-tl-done-tag">✓ Done</span>`
                : `<span class="dtl-tl-current-tag">● Current</span>`}
            </div>
            <div class="dtl-tl-meta-row">
              ${date ? `<span class="dtl-tl-datetime">📅 ${date}${time && time !== '—' ? ` · ⏰ ${time}` : ''}</span>` : ''}
              ${actor ? `<span class="dtl-tl-actor">👤 ${actor}</span>` : ''}
              ${roleChip}
            </div>
            ${note ? `<p class="dtl-tl-note">${note}</p>` : ''}
          </div>
        </div>`;
    }).join('');

    /* Info grid chips */
    const infoChips = [
      { icon: '📍', label: 'Location',   value: i.location || '—' },
      { icon: '📅', label: 'Reported',   value: i.date     || '—' },
      { icon: '🏘️', label: 'Ward',       value: i.ward     || 'Ward 12' },
      { icon: '👤', label: 'Reported by',value: i.reportedBy || 'Citizen' },
      { icon: '🪪', label: 'Officer ID', value: i.officerId   || '—' },
      { icon: '👷', label: 'Officer',    value: i.officerName || '—' },
    ].map(c => `
      <div class="dtl-info-chip">
        <span class="dtl-info-icon">${c.icon}</span>
        <div class="dtl-info-text">
          <span class="dtl-info-label">${c.label}</span>
          <span class="dtl-info-value">${c.value}</span>
        </div>
      </div>`).join('');

    /* Progress bar */
    const ALL_STEPS = ['Reported','AI Analyzed','Assigned','Inspection','In Progress','Completed','Admin Verified','Citizen Verification','Resolved'];
    const doneCount = tlSteps.length;
    const pct       = Math.round((doneCount / ALL_STEPS.length) * 100);

    document.getElementById('issueDetailBody').innerHTML = `
      <!-- ── Header banner ── -->
      <div class="dtl-banner dtl-banner-${(i.img || 'road')}">
        <div class="dtl-banner-inner">
          <div class="dtl-banner-badges">
            ${priorityBadge(i.priority || 'P3')}
            ${statusBadge(i.status)}
            <span class="badge badge-neutral">${i.category}</span>
          </div>
          <p class="dtl-banner-desc">${i.desc || 'Community-reported civic issue.'}</p>
        </div>
      </div>

      <!-- ── Info grid ── -->
      <div class="dtl-info-grid">${infoChips}</div>

      <!-- ── Progress bar ── -->
      <div class="dtl-progress-wrap">
        <div class="dtl-progress-label">
          <span>Resolution Progress</span>
          <strong>${pct}%</strong>
        </div>
        <div class="dtl-progress-track">
          <div class="dtl-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="dtl-progress-steps">
          ${ALL_STEPS.map((s, idx) => {
            const done    = idx < doneCount;
            const current = idx === doneCount - 1;
            return `<span class="dtl-ps ${done ? 'dtl-ps-done' : ''} ${current ? 'dtl-ps-current' : ''}" title="${s}">${(STEP_META[s] || {}).icon || '•'}</span>`;
          }).join('')}
        </div>
      </div>

      <!-- ── Timeline ── -->
      <div class="dtl-section-title">📋 Lifecycle Timeline</div>
      <div class="dtl-timeline">${timelineHTML}</div>
    `;

    CR.openModal('issueDetailModal');
  }

  function renderNearby() {
    const you = CivicMaps?.CHENNAI || { lat: 13.0827, lng: 80.2707 };
    if (window.CivicMaps) {
      const map = CivicMaps.createMap('citizenMap', { center: [you.lat, you.lng], zoom: 13 });
      CivicMaps.plotMarkers(map, nearby.map((n) => ({
        ...n,
        lat: n.lat,
        lng: n.lng,
        onClick: (item) => openIssueDetail(item.id),
      })), {
        youAreHere: you,
        fit: true,
      });
    }

    document.getElementById('nearbyList').innerHTML = nearby.map(n => `
      <div class="nearby-item" data-id="${n.id}">
        <h4>${n.title}</h4>
        <div class="issue-meta">${priorityBadge(n.priority)} ${statusBadge(n.status)} <span class="badge badge-neutral">${n.category}</span></div>
        <div class="meta-line">📍 ${n.location} · ${n.distance || ''}</div>
        <div class="meta-line">🌐 ${Number(n.lat).toFixed(4)}, ${Number(n.lng).toFixed(4)}</div>
        <div class="meta-line">👥 ${t('support')}: <strong class="support-count">${n.support}</strong></div>
        <p class="boost-note">${t('ai_a_boost')}</p>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm map-focus-btn">${t('btn_show_map')}</button>
          <button class="btn ${n.boosted ? 'btn-success' : 'btn-primary'} btn-sm boost-btn" ${n.boosted ? 'disabled' : ''}>
            ${n.boosted ? t('boosted') : t('btn_boost_issue')}
          </button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('#nearbyList .nearby-item').forEach(item => {
      const n = nearby.find(x => x.id === item.dataset.id);
      item.querySelector('.map-focus-btn')?.addEventListener('click', () => {
        const el = document.getElementById('citizenMap');
        if (el && el._crMap && n) {
          el._crMap.focus(n.lat, n.lng, 16);
          CR.toast(t('toast_map_focus', { title: n.title }), 'success');
        }
      });
      const btn = item.querySelector('.boost-btn');
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (n.boosted) return;
        if (window.CivicAPI && n.backendId) {
          try {
            if (await CivicAPI.ping()) {
              await CivicAPI.supportProblem(n.backendId, {
                explanation: 'This issue affects me',
                latitude: you.lat,
                longitude: you.lng,
                user_id: CivicAPI.getSession().userId
              });
            }
          } catch (_) { /* continue local boost */ }
        }
        n.boosted = true;
        n.support += 1;
        boostedCount += 1;
        btn.classList.add('btn-success');
        btn.classList.remove('btn-primary');
        btn.textContent = t('boosted');
        btn.disabled = true;
        item.querySelector('.support-count').textContent = n.support;
        item.querySelector('.support-count').style.animation = 'countPop 0.4s ease';
        renderStats();
        CR.toast(t('toast_boosted'), 'success');
      });
    });
  }

  function renderResolved() {
    document.getElementById('resolvedList').innerHTML = resolved.map(r => `
      <div class="resolved-card">
        <div class="before-after">
          <div class="before">BEFORE</div>
          <div class="after">AFTER</div>
        </div>
        <div class="body">
          <h3 style="font-size:1rem;margin-bottom:0.35rem;">${r.title}</h3>
          <div class="meta-line">📍 ${r.location}</div>
          <div class="meta-line">✅ Resolved · ${r.date}</div>
          <span class="badge badge-success" style="margin-top:0.5rem;">Resolved</span>
        </div>
      </div>
    `).join('');
  }

  function renderAll() {
    renderStats();
    renderNeedsAction();
    renderMyIssues();
    renderNearby();
    renderResolved();
  }

  /* Report flow */
  function openReport(voice) {
    CR.openModal('reportModal');
    if (voice) {
      setTimeout(() => document.getElementById('voiceInputBtn').click(), 300);
    }
  }

  document.getElementById('reportIssueBtn').addEventListener('click', () => openReport(false));
  document.getElementById('reportVoiceBtn').addEventListener('click', () => openReport(true));

  document.getElementById('useGpsBtn').addEventListener('click', () => {
    document.getElementById('reportLocation').value = 'GPS: 13.0827° N, 80.2707° E · Near Main Road, Ward 12';
    CR.toast(t('toast_gps'), 'success');
  });

  document.getElementById('aiDetectBtn').addEventListener('click', async () => {
    const desc = document.getElementById('reportDesc').value.trim();
    const file = document.getElementById('reportMedia').files[0];
    if (window.CivicAPI && file) {
      try {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('model', 'clip');
        fd.append('text', desc);
        const data = await CivicAPI.predictCategory(fd);
        const label = (data.top_label || data.label || data.prediction || '').toLowerCase();
        let cat = 'Road';
        if (label.includes('garbage') || label.includes('waste')) cat = 'Garbage';
        else if (label.includes('flood') || label.includes('drain') || label.includes('water')) cat = 'Drainage';
        else if (label.includes('streetlight') || label.includes('light')) cat = 'Streetlight';
        else if (label.includes('leak')) cat = 'Water Supply';
        else if (label.includes('pothole') || label.includes('road') || label.includes('damage')) cat = 'Road';
        document.getElementById('reportCategory').value = cat;
        CR.toast(t('toast_ai_cat', { cat }), 'success');
        return;
      } catch (_) { /* fallback below */ }
    }
    const d = desc.toLowerCase();
    let cat = 'Road';
    if (d.includes('drain') || d.includes('water') || d.includes('flood')) cat = 'Drainage';
    else if (d.includes('light') || d.includes('lamp')) cat = 'Streetlight';
    else if (d.includes('garbage') || d.includes('waste')) cat = 'Garbage';
    else if (d.includes('pipe') || d.includes('supply')) cat = 'Water Supply';
    document.getElementById('reportCategory').value = cat;
    CR.toast(t('toast_ai_cat', { cat }), 'success');
  });

  document.getElementById('reportMedia').addEventListener('change', (e) => {
    const f = e.target.files[0];
    const prev = document.getElementById('mediaPreview');
    if (f) {
      prev.classList.remove('hidden');
      prev.textContent = `Attached: ${f.name} (${Math.round(f.size / 1024)} KB)`;
    }
  });

  document.getElementById('voiceInputBtn').addEventListener('click', () => {
    const ta = document.getElementById('reportDesc');
    const rec = CR.speechToText(ta, () => {
      ta.value = 'There is a large pothole on Main Road near the school. Vehicles are swerving and it is unsafe for pedestrians.';
      CR.toast(t('toast_voice_demo'), 'warning');
    });
    if (rec) {
      CR.toast(t('toast_listening'), 'success');
      rec.start();
    }
  });

  document.getElementById('submitIssueBtn').addEventListener('click', async () => {
    const desc = document.getElementById('reportDesc').value.trim();
    const loc = document.getElementById('reportLocation').value.trim();
    const cat = document.getElementById('reportCategory').value;
    if (!desc) {
      CR.toast(t('toast_need_desc'), 'danger');
      return;
    }

    if (window.CivicAPI) {
      try {
        const online = await CivicAPI.ping();
        if (online) {
          const fd = new FormData();
          fd.append('title', desc.slice(0, 80));
          fd.append('description', desc);
          fd.append('category', cat.toLowerCase().replace(/\s+/g, '_'));
          fd.append('latitude', '13.0827');
          fd.append('longitude', '80.2707');
          fd.append('force_create', 'true');
          const file = document.getElementById('reportMedia').files[0];
          if (file) fd.append('image', file);
          const data = await CivicAPI.createProblem(fd);
          const p = data.problem || {};
          const id = p.id ? `CR-${p.id}` : ('CR-' + Date.now());
          myIssues.unshift({
            id,
            title: p.title || desc.slice(0, 42),
            category: cat,
            location: loc,
            date: CR.formatDate(),
            status: p.status || 'Reported',
            priority: mapPriority(p.priority_analysis?.priority_level),
            img: cat === 'Drainage' ? 'drain' : cat === 'Streetlight' ? 'light' : cat === 'Garbage' ? 'garbage' : 'road',
            desc,
            timeline: [
              { step: 'Reported',    date: CR.formatDate(), time: new Date().toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}), actor: 'Priya Sharma', role: 'Citizen', note: desc },
              { step: 'AI Analyzed', date: CR.formatDate(), time: new Date().toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}), actor: 'CivicResolve AI', role: 'System', note: `Category detected: ${cat}` }
            ],
            backendId: p.id
          });
          CR.closeModal('reportModal');
          document.getElementById('reportDesc').value = '';
          CR.toast(t('toast_backend_ok', { id, status: p.status || 'Reported' }), 'success');
          renderAll();
          if (window.showCitizenPanel) showCitizenPanel('myIssues');
          return;
        }
      } catch (err) {
        CR.toast(t('toast_backend_err', { msg: err.message || 'failed' }), 'warning');
      }
    }

    const id = 'CR-' + (1050 + Math.floor(Math.random() * 40));
    myIssues.unshift({
      id,
      title: desc.slice(0, 42) + (desc.length > 42 ? '…' : ''),
      category: cat,
      location: loc,
      date: CR.formatDate(),
      status: 'Reported',
      priority: 'P3',
      img: cat === 'Drainage' ? 'drain' : cat === 'Streetlight' ? 'light' : cat === 'Garbage' ? 'garbage' : 'road',
      desc,
      timeline: [{ step: 'Reported', date: CR.formatDate(), time: new Date().toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}), actor: 'Priya Sharma', role: 'Citizen', note: desc }]
    });
    CR.closeModal('reportModal');
    document.getElementById('reportDesc').value = '';
    CR.toast(t('toast_submitted', { id }), 'success');
    renderAll();
    if (window.showCitizenPanel) showCitizenPanel('myIssues');
  });

  function mapPriority(level) {
    const m = { CRITICAL: 'P1', HIGH: 'P1', MEDIUM: 'P2', LOW: 'P3' };
    return m[String(level || '').toUpperCase()] || 'P3';
  }

  function mapPublicStatus(s) {
    const u = String(s || '').toUpperCase();
    if (u.includes('RESOLVED') || u.includes('ADMIN_CLOSED')) return 'Resolved';
    if (u.includes('COMPLETED') || u.includes('OFFICER_VERIFIED') || u.includes('VERIFIED')) return 'Citizen Verification';
    if (u.includes('PROGRESS') || u.includes('WORK')) return 'In Progress';
    if (u.includes('ASSIGN')) return 'Assigned';
    if (u.includes('INSPECT')) return 'Inspection';
    if (u.includes('AI')) return 'AI Analyzed';
    if (u.includes('REVIEW') || u.includes('REPORT')) return 'Reported';
    return s || 'Reported';
  }

  async function syncFromBackend() {
    if (!window.CivicAPI) return;
    const online = await CivicAPI.ping();
    if (!online) {
      CR.toast(t('toast_offline'), 'warning');
      return;
    }
    try {
      const [reports, all] = await Promise.all([
        CivicAPI.myReports().catch(() => CivicAPI.listProblems()),
        CivicAPI.listProblems()
      ]);
      const mine = reports.problems || [];
      if (mine.length) {
        myIssues.length = 0;
        mine.forEach((p) => {
          myIssues.push({
            id: 'CR-' + p.id,
            backendId: p.id,
            title: p.title,
            category: p.category || 'Road',
            location: `${p.latitude}, ${p.longitude}`,
            date: p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : CR.formatDate(),
            status: mapPublicStatus(p.status || p.internal_status),
            priority: mapPriority(p.priority_analysis?.priority_level),
            img: 'road',
            desc: p.description || '',
            timeline: [
              { step: 'Reported',   date: p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : CR.formatDate(), time: '—', actor: 'Citizen', role: 'Citizen', note: p.description || '' },
              { step: 'AI Analyzed',date: p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : CR.formatDate(), time: '—', actor: 'CivicResolve AI', role: 'System', note: 'Auto-classified by AI engine.' },
              { step: mapPublicStatus(p.status), date: '—', time: '—', actor: '—', role: '—', note: '' }
            ]
          });
        });
      }
      const others = (all.problems || []).filter((p) => !mine.find((m) => String(m.backendId) === String(p.id)));
      if (others.length || mine.length) {
        const pool = (all.problems || []).slice(0, 8);
        nearby.length = 0;
        const you = { lat: 13.0827, lng: 80.2707 };
        pool.forEach((p) => {
          const lat = Number(p.latitude) || you.lat;
          const lng = Number(p.longitude) || you.lng;
          const km = window.CivicMaps
            ? CivicMaps.haversineKm(you, { lat, lng }).toFixed(1)
            : '0.5';
          nearby.push({
            id: 'CR-' + p.id,
            backendId: p.id,
            title: p.title,
            category: p.category || 'Road',
            distance: km + ' km',
            location: p.category ? String(p.category) : 'Chennai',
            support: Array.isArray(p.supports) ? p.supports.length : 0,
            priority: mapPriority(p.priority_analysis?.priority_level),
            status: mapPublicStatus(p.status || p.internal_status),
            boosted: false,
            lat,
            lng
          });
        });
      }
      CR.toast(t('toast_synced'), 'success');
      renderAll();
    } catch (e) {
      CR.toast(t('toast_sync_fail', { msg: e.message }), 'warning');
    }
  }

  /* AI */
  function askAI(q) {
    const box = document.getElementById('aiMessages');
    const display = q;
    box.innerHTML += `<div class="ai-bubble user">${display}</div>`;
    const key = ['report', 'boost', 'verify', 'pending'].includes(q) ? q : '';
    const reply = key ? aiReply(key) : t('ai_fallback');
    setTimeout(() => {
      box.innerHTML += `<div class="ai-bubble bot">${reply}</div>`;
      box.scrollTop = box.scrollHeight;
    }, 400);
  }

  document.getElementById('openAiBtn').addEventListener('click', () => CR.openModal('aiModal'));
  document.getElementById('aiQuick').querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => askAI(b.dataset.q));
  });
  document.getElementById('aiSend').addEventListener('click', () => {
    const inp = document.getElementById('aiInput');
    if (!inp.value.trim()) return;
    askAI(inp.value.trim());
    inp.value = '';
  });

  updateWelcome();

  document.getElementById('profileBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('profilePanel').classList.toggle('open');
    document.getElementById('notifPanel')?.classList.remove('open');
  });
  document.addEventListener('click', (e) => {
    const p = document.getElementById('profilePanel');
    if (p && !p.contains(e.target) && e.target !== document.getElementById('profileBtn')) {
      p.classList.remove('open');
    }
  });

  window.addEventListener('civic:langchange', () => {
    updateWelcome();
    renderAll();
    const hello = document.querySelector('#aiMessages .ai-bubble.bot');
    if (hello && document.getElementById('aiMessages').children.length === 1) {
      hello.textContent = t('ai_hello');
    }
  });

  CR.initNotifications(notifications);

  // Bell button: toggle dropdown open/close
  (function initBellDropdown() {
    const btn   = document.getElementById('notifBtn');
    const panel = document.getElementById('notifPanel');
    const dot   = document.getElementById('notifDot');
    const pill  = document.getElementById('notifCountPill');

    function updateBadge() {
      const unread = notifications.filter(n => !n.read).length;
      const label  = unread > 9 ? '9+' : String(unread);
      if (dot) {
        dot.textContent = label;
        dot.classList.toggle('visible', unread > 0);
      }
      if (pill) {
        pill.textContent = label;
        pill.classList.toggle('visible', unread > 0);
      }
      if (btn) btn.setAttribute('aria-expanded', panel?.classList.contains('open') ? 'true' : 'false');
    }

    if (btn && panel) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('open');
        btn.setAttribute('aria-expanded', panel.classList.contains('open') ? 'true' : 'false');
      });
      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== btn) {
          panel.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Re-sync badge after any item click or mark-all
    document.getElementById('notifList')?.addEventListener('click',    () => setTimeout(updateBadge, 0));
    document.getElementById('markAllRead')?.addEventListener('click',  () => setTimeout(updateBadge, 0));

    updateBadge();
  })();
  renderAll();
  syncFromBackend();
})();
