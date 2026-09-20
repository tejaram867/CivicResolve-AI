(function () {
  const CR = CivicResolve;
  if (window.CivicAPI) {
    CivicAPI.requireRole('officer');
    CivicAPI.bindLogout();
  }
  let activeTaskId = null;
  let completeTaskId = null;
  let navTaskId = null;
  let recording = false;
  let recognition = null;

  const statusFlow = [
    'Assigned',
    'Inspected',
    'Work Started',
    'Work In Progress',
    'Completed',
    'Admin Verification',
    'Citizen Verification'
  ];

  let tasks = [
    {
      id: 'CR-1024',
      title: 'Main Road Pothole',
      priority: 'P1',
      category: 'Road',
      location: 'Main Road, Ward 12',
      distance: 1.2,
      lat: 13.0852,
      lng: 80.2731,
      due: 'Due Today',
      dueRank: 1,
      affected: 32,
      boosts: 14,
      evidenceFiles: 8,
      status: 'Assigned',
      critical: true,
      overdue: false,
      complaint: 'Large pothole near school zone. Vehicles swerving; children cross nearby.',
      aiSummary: 'High-traffic road damage with school-zone safety risk. Multiple citizens report depth ~20–30cm. Recommend barricade + same-day patch.',
      assignedDate: '18 Mar 2026',
      sla: 'Today 6:00 PM',
      previousReports: ['CR-0988 (similar stretch, Dec 2025)', 'CR-1012 (nearby crack)'],
      citizenEvidence: { photos: 6, videos: 2, remarks: 'Deep hole, risky at night', by: 'Multiple citizens', time: '16–18 Mar 2026' },
      inspectionEvidence: null,
      progressEvidence: null,
      completionEvidence: null
    },
    {
      id: 'CR-1042',
      title: 'Drainage blockage',
      priority: 'P1',
      category: 'Drainage',
      location: 'School Lane, Ward 12',
      distance: 0.8,
      due: 'Due in 2 hours',
      dueRank: 0,
      affected: 47,
      boosts: 22,
      evidenceFiles: 12,
      status: 'Assigned',
      critical: true,
      overdue: false,
      complaint: 'Open drain overflow after rains; foul smell and mosquito breeding.',
      aiSummary: 'Clustered drainage reports near school. Safety + health risk. Clear blockage and verify outlet flow.',
      assignedDate: '19 Mar 2026',
      sla: 'Today 2:00 PM',
      previousReports: ['CR-1001'],
      citizenEvidence: { photos: 9, videos: 3, remarks: 'Water entering compound', by: 'Citizens (cluster)', time: '18 Mar 2026' },
      inspectionEvidence: null,
      progressEvidence: null,
      completionEvidence: null
    },
    {
      id: 'CR-1021',
      title: 'Road damage — Ring Road',
      priority: 'P1',
      category: 'Road',
      location: 'Ring Road stretch',
      distance: 2.4,
      due: 'Overdue by 6 hours',
      dueRank: 3,
      affected: 28,
      boosts: 11,
      evidenceFiles: 5,
      status: 'Inspected',
      critical: true,
      overdue: true,
      complaint: 'Structural cracks expanding after heavy vehicles.',
      aiSummary: 'Overdue P1. Inspection already logged. Begin work immediately and upload progress evidence.',
      assignedDate: '17 Mar 2026',
      sla: 'Yesterday 6:00 PM',
      previousReports: [],
      citizenEvidence: { photos: 4, videos: 1, remarks: 'Crack widening', by: 'Citizens', time: '15 Mar 2026' },
      inspectionEvidence: { photos: 3, videos: 1, remarks: 'Confirmed 4m crack, high severity', by: 'Officer Arun', time: '18 Mar 2026 10:20' },
      progressEvidence: null,
      completionEvidence: null
    },
    {
      id: 'CR-1031',
      title: 'Streetlight outage',
      priority: 'P3',
      category: 'Streetlight',
      location: 'Park Avenue',
      distance: 1.6,
      due: 'Due Tomorrow',
      dueRank: 2,
      affected: 8,
      boosts: 3,
      evidenceFiles: 2,
      status: 'Work In Progress',
      critical: false,
      overdue: false,
      complaint: 'Pole #44 dark since Monday.',
      aiSummary: 'Low traffic risk but night safety concern. Replace lamp and verify illumination.',
      assignedDate: '16 Mar 2026',
      sla: '20 Mar 2026',
      previousReports: [],
      citizenEvidence: { photos: 2, videos: 0, remarks: 'Completely dark', by: 'Priya S', time: '16 Mar 2026' },
      inspectionEvidence: { photos: 1, videos: 0, remarks: 'Fixture failed', by: 'Officer Arun', time: '17 Mar 2026' },
      progressEvidence: { photos: 1, videos: 0, remarks: 'Spare lamp procured', by: 'Officer Arun', time: '18 Mar 2026' },
      completionEvidence: null
    },
    {
      id: 'CR-1038',
      title: 'Water pipe leak',
      priority: 'P2',
      category: 'Water Supply',
      location: 'Temple Street',
      distance: 1.1,
      due: 'Due Today',
      dueRank: 1,
      affected: 15,
      boosts: 6,
      evidenceFiles: 4,
      status: 'Assigned',
      critical: false,
      overdue: false,
      complaint: 'Continuous leak wasting water; slippery road.',
      aiSummary: 'Utility leak with slip hazard. Isolate valve if needed and patch joint.',
      assignedDate: '18 Mar 2026',
      sla: 'Today 8:00 PM',
      previousReports: [],
      citizenEvidence: { photos: 3, videos: 1, remarks: 'Leak since morning', by: 'Local residents', time: '18 Mar 2026' },
      inspectionEvidence: null,
      progressEvidence: null,
      completionEvidence: null
    }
  ];

  const notifications = [
    { text: 'New P1 issue assigned to you.', time: '30 min ago', read: false },
    { text: 'CR-1024 is due today.', time: '1 hour ago', read: false },
    { text: 'Admin requested additional inspection evidence.', time: '3 hours ago', read: false },
    { text: 'Your completion report was submitted for verification.', time: 'Yesterday', read: true },
    { text: 'Citizen requested re-verification of CR-1024.', time: 'Yesterday', read: false }
  ];

  const aiReplies = {
    'What information do I need to collect for this task?': 'Collect: location verification, issue existence, severity, current condition, traffic/safety impact, photos, optional video, and editable voice/text remarks. Separate citizen evidence from your inspection evidence.',
    'Summarize the citizen reports.': 'Citizens report physical damage with safety impact, multiple photos/videos, and community boosts indicating shared affected area. Treat clustered reports as one field site unless admin splits them.',
    'What was the original complaint?': 'Open the task detail to see the original citizen complaint text. For CR-1024 it describes a large Main Road pothole near a school zone with vehicle swerving risk.',
    'What evidence is still required?': 'Depends on status. Before Inspected: inspection photos + remarks. Before Completed: completion photo + remarks. Admin/citizen verification evidence is not filed by officers.',
    'Draft my inspection remarks.': 'Draft: “Location verified. Issue exists as reported. Severity assessed on site. Traffic/safety impact noted. Temporary safety measures applied where required. Photos attached. Recommend next progress update after work start.” Edit before saving.',
    'What should I update before marking this completed?': 'Ensure status progressed through inspection and work stages, upload completion photo, write completion remarks, then submit for Admin Verification. Do not mark citizen-verified.'
  };

  function pBadge(p) {
    const map = { P1: 'badge-p1', P2: 'badge-p2', P3: 'badge-p3', P4: 'badge-p4' };
    return `<span class="badge ${map[p] || 'badge-neutral'}">${p}</span>`;
  }
  function sBadge(s) {
    if (s.includes('Verification') || s === 'Completed') return `<span class="badge badge-warning">${s}</span>`;
    if (s.includes('Overdue') || s === 'Assigned') return `<span class="badge badge-danger">${s}</span>`;
    if (s.includes('Work') || s === 'Inspected') return `<span class="badge badge-info">${s}</span>`;
    return `<span class="badge badge-neutral">${s}</span>`;
  }
  function getTask(id) { return tasks.find(t => t.id === id); }

  function statusIndex(status) {
    return statusFlow.indexOf(status);
  }

  function renderStats() {
    const assigned = tasks.filter(t => t.status === 'Assigned').length;
    const today = tasks.filter(t => t.due.includes('Today') || t.due.includes('hours')).length;
    const critical = tasks.filter(t => t.critical || t.priority === 'P1').length;
    const nearby = tasks.filter(t => t.distance <= 1.5).length;
    const dueSoon = tasks.filter(t => t.due.includes('hours') || t.due === 'Due Today').length;
    const overdue = tasks.filter(t => t.overdue || t.due.includes('Overdue')).length;
    const completed = tasks.filter(t => ['Completed', 'Admin Verification', 'Citizen Verification'].includes(t.status)).length;
    const stats = [
      { icon: '📋', value: assigned, label: 'Assigned Issues' },
      { icon: '📅', value: today, label: "Today's Tasks" },
      { icon: '🔴', value: critical, label: 'Critical Tasks' },
      { icon: '📍', value: nearby, label: 'Nearby Tasks' },
      { icon: '⏰', value: dueSoon, label: 'Due Soon' },
      { icon: '⚠️', value: overdue, label: 'Overdue' },
      { icon: '✅', value: completed, label: 'Completed' }
    ];
    document.getElementById('officerStats').innerHTML = stats.map((s, i) => `
      <div class="stat-card" style="animation-delay:${i * 0.04}s">
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    `).join('');
  }

  function taskCardHTML(t) {
    const cls = [t.critical || t.priority === 'P1' ? 'critical' : '', t.overdue || t.due.includes('Overdue') ? 'overdue' : ''].filter(Boolean).join(' ');
    return `
      <article class="task-card ${cls}" data-id="${t.id}">
        <h3>${t.priority === 'P1' ? '🔴' : '🟡'} ${pBadge(t.priority)} — ${t.title}</h3>
        <div class="task-facts">
          <div>📍 ${t.distance} km away</div>
          <div>⏱️ ${t.due}</div>
          <div>👥 ${t.affected} Affected Citizens</div>
          <div>📷 ${t.evidenceFiles} Citizen Evidence Files</div>
          <div>📂 ${t.category}</div>
          <div>📌 ${sBadge(t.status)}</div>
        </div>
        <div class="task-actions">
          <button class="btn btn-primary" data-act="view">View Task</button>
          <button class="btn btn-secondary" data-act="navigate">Navigate</button>
          <button class="btn btn-secondary" data-act="inspect">Inspect</button>
        </div>
      </article>
    `;
  }

  function bindTaskActions(root) {
    root.querySelectorAll('.task-card, .nearby-task, .sla-alert, .progress-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelectorAll('[data-act]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const act = btn.dataset.act;
          if (act === 'view') openTask(id);
          if (act === 'navigate') openNav(id);
          if (act === 'inspect') openInspect(id);
          if (act === 'start') updateProgress(id, 'Work Started');
          if (act === 'wip') updateProgress(id, 'Work In Progress');
          if (act === 'complete') openComplete(id);
        });
      });
      if (card.classList.contains('sla-alert')) {
        card.addEventListener('click', () => openTask(id));
      }
    });
  }

  function renderPriorityTasks() {
    const list = [...tasks].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority.localeCompare(b.priority);
      return a.dueRank - b.dueRank;
    });
    const el = document.getElementById('priorityTasks');
    el.innerHTML = list.slice(0, 4).map(taskCardHTML).join('');
    bindTaskActions(el);

    if (window.CivicMaps) {
      const you = CivicMaps.CHENNAI;
      const map = CivicMaps.createMap('officerTaskMap', { center: [you.lat, you.lng], zoom: 13 });
      CivicMaps.plotMarkers(map, list.map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        priority: t.priority,
        status: t.status,
        lat: t.lat || you.lat,
        lng: t.lng || you.lng,
        onClick: () => openTask(t.id),
      })), { youAreHere: you, fit: true });
    }
  }

  function renderSLAAlerts() {
    const alerts = [
      ...tasks.filter(t => t.due.includes('hours')).map(t => ({ ...t, kind: 'soon', label: t.due })),
      ...tasks.filter(t => t.overdue || t.due.includes('Overdue')).map(t => ({ ...t, kind: t.priority === 'P1' ? 'critical' : 'overdue', label: t.due }))
    ];
    const el = document.getElementById('slaAlertsList');
    el.innerHTML = alerts.map(a => `
      <div class="sla-alert ${a.kind}" data-id="${a.id}">
        <strong>${a.kind === 'critical' ? '🔴' : a.kind === 'overdue' ? '🟠' : '⚠️'} ${a.id}</strong>
        <div>${a.title}</div>
        <div style="margin-top:0.35rem;font-weight:700;font-size:0.9rem;">${a.label}</div>
        <button class="btn btn-sm btn-primary" style="margin-top:0.65rem;" data-act="view">Open Task</button>
      </div>
    `).join('') || `<div class="card">No SLA alerts right now.</div>`;
    bindTaskActions(el);
  }

  function renderNearby() {
    const sort = document.getElementById('sortNearby').value;
    const cat = document.getElementById('filterCat').value;
    const st = document.getElementById('filterStatus').value;
    const pri = document.getElementById('filterPri').value;
    let list = tasks.filter(t =>
      (!cat || t.category === cat) &&
      (!st || t.status === st) &&
      (!pri || t.priority === pri)
    );
    if (sort === 'distance') list.sort((a, b) => a.distance - b.distance);
    if (sort === 'priority') list.sort((a, b) => a.priority.localeCompare(b.priority));
    if (sort === 'due') list.sort((a, b) => a.dueRank - b.dueRank);

    const el = document.getElementById('nearbyList');
    el.innerHTML = list.map(t => `
      <div class="nearby-task" data-id="${t.id}">
        <div class="dist-badge">${t.distance}<br>km</div>
        <div>
          <strong>${t.title}</strong>
          <div style="margin-top:0.3rem;display:flex;gap:0.3rem;flex-wrap:wrap;">
            ${pBadge(t.priority)} <span class="badge badge-neutral">${t.category}</span> ${sBadge(t.status)}
          </div>
          <div style="font-size:0.85rem;color:var(--slate-500);margin-top:0.3rem;">📍 ${t.location} · SLA: ${t.sla}</div>
        </div>
        <button class="btn btn-primary btn-sm" data-act="view">View</button>
      </div>
    `).join('');
    bindTaskActions(el);
  }

  function renderCritical() {
    const list = tasks.filter(t => t.critical || t.priority === 'P1');
    const el = document.getElementById('criticalList');
    el.innerHTML = list.map(taskCardHTML).join('');
    bindTaskActions(el);
  }

  function renderProgress() {
    const el = document.getElementById('progressList');
    el.innerHTML = tasks.map(t => {
      const idx = statusIndex(t.status);
      return `
        <div class="progress-card" data-id="${t.id}">
          <div style="display:flex;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
            <strong>${t.id} — ${t.title}</strong>
            ${sBadge(t.status)}
          </div>
          <div class="workflow-steps">
            ${statusFlow.map((s, i) => `<span class="${i < idx ? 'done' : i === idx ? 'current' : ''}">${s}</span>`).join('')}
          </div>
          <div class="progress-actions">
            <button class="btn btn-secondary" data-act="view">Open</button>
            <button class="btn btn-primary" data-act="inspect" ${idx >= 1 ? 'disabled' : ''}>Inspect Site</button>
            <button class="btn btn-primary" data-act="start" ${idx !== 1 ? 'disabled' : ''}>Start Work</button>
            <button class="btn btn-primary" data-act="wip" ${idx !== 2 ? 'disabled' : ''}>Mark Work In Progress</button>
            <button class="btn btn-success" data-act="complete" ${idx < 2 || idx >= 4 ? 'disabled' : ''}>Mark Completed</button>
          </div>
        </div>
      `;
    }).join('');
    bindTaskActions(el);
  }

  function evidenceStageHTML(label, data, state) {
    return `
      <div class="evidence-stage ${state}">
        <h4>${label}</h4>
        ${data ? `
          <div class="evidence-meta">📷 ${data.photos} photos · 🎬 ${data.videos} videos · ${data.time}<br>Submitted by: ${data.by} · Status: Recorded</div>
          <p style="font-size:0.875rem;margin-bottom:0.5rem;">${data.remarks}</p>
          <div class="evidence-thumbs">
            ${Array.from({ length: Math.min(data.photos, 3) }).map((_, i) => `<div class="evidence-thumb">IMG ${i + 1}</div>`).join('')}
            ${data.videos ? `<div class="evidence-thumb">VID</div>` : ''}
          </div>
        ` : `<div class="evidence-meta">Awaiting evidence</div>`}
      </div>
    `;
  }

  function openTask(id) {
    const t = getTask(id);
    if (!t) return;
    activeTaskId = id;
    const idx = statusIndex(t.status);
    document.getElementById('taskModalTitle').textContent = `${t.id} — ${t.title}`;
    document.getElementById('taskModalBody').innerHTML = `
      <div class="detail-grid">
        <div class="item"><strong>Issue ID</strong>${t.id}</div>
        <div class="item"><strong>Priority</strong>${pBadge(t.priority)}</div>
        <div class="item"><strong>Category</strong>${t.category}</div>
        <div class="item"><strong>Status</strong>${sBadge(t.status)}</div>
        <div class="item"><strong>Location</strong>${t.location}</div>
        <div class="item"><strong>Affected Citizens</strong>${t.affected}</div>
        <div class="item"><strong>Community Boosts</strong>${t.boosts}</div>
        <div class="item"><strong>Assigned Date</strong>${t.assignedDate}</div>
        <div class="item"><strong>SLA</strong>${t.sla} · ${t.due}</div>
        <div class="item"><strong>Distance</strong>${t.distance} km</div>
      </div>

      <h4>Original Citizen Complaint</h4>
      <p style="margin:0.5rem 0 1rem;color:var(--slate-600);">${t.complaint}</p>

      <h4>AI-Generated Issue Summary</h4>
      <p style="margin:0.5rem 0 1rem;background:var(--blue-50);padding:0.85rem;border-radius:10px;font-size:0.925rem;">${t.aiSummary}</p>

      ${t.previousReports.length ? `<p style="margin-bottom:1rem;font-size:0.9rem;"><strong>Previous reports:</strong> ${t.previousReports.join(' · ')}</p>` : ''}

      <div class="evidence-split">
        <div class="evidence-box citizen">
          <h4>Citizen Evidence</h4>
          <div class="evidence-meta">${t.citizenEvidence.photos} photos · ${t.citizenEvidence.videos} videos</div>
          <p style="font-size:0.875rem;">${t.citizenEvidence.remarks}</p>
          <div class="evidence-thumbs" style="margin-top:0.5rem;">
            ${Array.from({ length: Math.min(t.citizenEvidence.photos, 4) }).map((_, i) => `<div class="evidence-thumb">C-${i + 1}</div>`).join('')}
          </div>
        </div>
        <div class="evidence-box officer">
          <h4>Officer Inspection Evidence</h4>
          ${t.inspectionEvidence ? `
            <div class="evidence-meta">${t.inspectionEvidence.photos} photos · ${t.inspectionEvidence.time}</div>
            <p style="font-size:0.875rem;">${t.inspectionEvidence.remarks}</p>
          ` : `<p style="font-size:0.875rem;color:var(--slate-500);">No inspection evidence yet. Use Site Inspection to add it.</p>`}
        </div>
      </div>

      <h4>Evidence Chain</h4>
      <div class="evidence-chain" style="margin:1rem 0 1.25rem;">
        ${evidenceStageHTML('CITIZEN EVIDENCE', t.citizenEvidence, 'done')}
        ${evidenceStageHTML('INSPECTION EVIDENCE', t.inspectionEvidence, t.inspectionEvidence ? 'done' : idx === 0 ? 'active' : '')}
        ${evidenceStageHTML('WORK PROGRESS EVIDENCE', t.progressEvidence, t.progressEvidence ? 'done' : (idx >= 2 && idx < 4) ? 'active' : '')}
        ${evidenceStageHTML('COMPLETION EVIDENCE', t.completionEvidence, t.completionEvidence ? 'done' : idx >= 4 ? 'active' : '')}
      </div>

      <h4>Progress Workflow</h4>
      <div class="workflow-steps">
        ${statusFlow.map((s, i) => `<span class="${i < idx ? 'done' : i === idx ? 'current' : ''}">${s}</span>`).join('')}
      </div>

      <div class="task-actions" style="margin-top:1.25rem;">
        <button class="btn btn-secondary btn-lg" id="tdNav">🧭 Navigate</button>
        <button class="btn btn-primary btn-lg" id="tdInspect">🔍 Site Inspection</button>
        <button class="btn btn-primary btn-lg" id="tdStart" ${idx !== 1 ? 'disabled' : ''}>Start Work</button>
        <button class="btn btn-primary btn-lg" id="tdWip" ${idx !== 2 ? 'disabled' : ''}>Work In Progress</button>
        <button class="btn btn-success btn-lg" id="tdComplete" ${idx < 2 || idx >= 4 ? 'disabled' : ''}>Mark Completed</button>
      </div>
    `;
    document.getElementById('tdNav').onclick = () => openNav(id);
    document.getElementById('tdInspect').onclick = () => openInspect(id);
    document.getElementById('tdStart').onclick = () => updateProgress(id, 'Work Started');
    document.getElementById('tdWip').onclick = () => updateProgress(id, 'Work In Progress');
    document.getElementById('tdComplete').onclick = () => openComplete(id);
    CR.openModal('taskModal');
  }

  function openNav(id) {
    const t = getTask(id);
    navTaskId = id;
    const you = CivicMaps?.CHENNAI || { lat: 13.0827, lng: 80.2707 };
    const dest = {
      lat: Number(t.lat) || you.lat + 0.002,
      lng: Number(t.lng) || you.lng + 0.002,
    };
    const dist = window.CivicMaps
      ? CivicMaps.haversineKm(you, dest).toFixed(2)
      : t.distance;

    document.getElementById('navModalBody').innerHTML = `
      <h3 style="margin-bottom:0.35rem;">${t.title}</h3>
      <p style="color:var(--slate-600);margin-bottom:0.75rem;">${dist} km from your current area · Live map navigation</p>
      <div class="detail-grid">
        <div class="item"><strong>Location</strong>${t.location}</div>
        <div class="item"><strong>Coordinates</strong>${dest.lat.toFixed(5)}, ${dest.lng.toFixed(5)}</div>
      </div>
      <div id="officerNavMap" class="cr-live-map"></div>
      <button class="btn btn-secondary btn-block" id="viewMapBtn" style="margin-bottom:0.5rem;">Recenter Map</button>
    `;
    setTimeout(() => {
      if (window.CivicMaps) {
        CivicMaps.createNavMap('officerNavMap', you, dest, t.title);
      }
      document.getElementById('viewMapBtn').onclick = () => {
        const el = document.getElementById('officerNavMap');
        if (el?._crMap) el._crMap.focus(dest.lat, dest.lng, 16);
        CR.toast(`Google Map centered on ${t.location}`, 'success');
      };
    }, 200);
    CR.openModal('navModal');
  }

  document.getElementById('simulateNavigate').addEventListener('click', () => {
    const t = getTask(navTaskId);
    if (!t) return;
    const you = CivicMaps?.CHENNAI || { lat: 13.0827, lng: 80.2707 };
    const dest = {
      lat: Number(t.lat) || you.lat + 0.002,
      lng: Number(t.lng) || you.lng + 0.002,
    };
    if (window.CivicMaps?.openDirections) {
      CivicMaps.openDirections(you, dest);
      CR.toast(`Opening Google Maps directions to ${t.title}…`, 'success');
    } else {
      CR.toast(`Navigating to ${t.title} (${t.distance} km)…`, 'success');
    }
  });

  function openInspect(id) {
    activeTaskId = id;
    const t = getTask(id);
    document.getElementById('inspectBody').innerHTML = `
      <p style="margin-bottom:1rem;"><strong>${t.id}</strong> — ${t.title}</p>
      <div class="inspect-form">
        <div class="form-group">
          <label class="form-label">Location Verified?</label>
          <div class="radio-group">
            <label><input type="radio" name="locOk" value="Yes" checked /> Yes</label>
            <label><input type="radio" name="locOk" value="No" /> No</label>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Issue Exists?</label>
          <div class="radio-group">
            <label><input type="radio" name="exists" value="Yes" checked /> Yes</label>
            <label><input type="radio" name="exists" value="No" /> No</label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Severity</label>
            <select class="form-select" id="severity">
              <option>Low</option><option>Medium</option><option selected>High</option><option>Critical</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Traffic / Safety Impact</label>
            <select class="form-select" id="impact">
              <option>Low</option><option selected>Medium</option><option>High</option><option>Critical</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Current Condition</label>
          <input class="form-input" id="condition" placeholder="e.g. Open pothole ~3m, uneven edges" />
        </div>

        <div class="mic-panel">
          <div style="font-weight:700;">🎙️ Record Inspection Notes</div>
          <p style="opacity:0.85;font-size:0.9rem;margin-top:0.35rem;">Speak naturally — text is editable before saving</p>
          <button type="button" class="mic-btn" id="micBtn" aria-label="Record">🎙️</button>
          <div id="micStatus" style="font-size:0.85rem;opacity:0.9;">Tap mic to start</div>
          <textarea id="voiceNotes" placeholder="Inspection remarks will appear here…"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Remarks</label>
          <textarea class="form-textarea" id="inspectRemarks" placeholder="Additional written remarks"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Photos</label>
            <input type="file" class="form-input" id="inspectPhotos" accept="image/*" multiple />
          </div>
          <div class="form-group">
            <label class="form-label">Video</label>
            <input type="file" class="form-input" id="inspectVideo" accept="video/*" />
          </div>
        </div>
      </div>
    `;

    const micBtn = document.getElementById('micBtn');
    const voiceNotes = document.getElementById('voiceNotes');
    const micStatus = document.getElementById('micStatus');

    micBtn.onclick = () => {
      if (recording && recognition) {
        recognition.stop();
        recording = false;
        micBtn.classList.remove('recording');
        micStatus.textContent = 'Stopped — edit text if needed';
        return;
      }
      recognition = CR.speechToText(voiceNotes, () => {
        voiceNotes.value = 'Road damage approximately three meters long. Traffic affected. Temporary barricade placed.';
        micStatus.textContent = 'Demo fallback text inserted — edit before saving';
        CR.toast('Speech recognition unavailable — demo text inserted.', 'warning');
      });
      if (recognition) {
        recording = true;
        micBtn.classList.add('recording');
        micStatus.textContent = 'Listening… speak now';
        recognition.onend = () => {
          recording = false;
          micBtn.classList.remove('recording');
          micStatus.textContent = 'Captured — you can edit the text';
        };
        recognition.start();
        CR.toast('Listening for inspection notes…', 'success');
      }
    };

    CR.openModal('inspectModal');
  }

  document.getElementById('saveInspection').addEventListener('click', async () => {
    const t = getTask(activeTaskId);
    if (!t) return;
    const voice = document.getElementById('voiceNotes')?.value.trim() || '';
    const remarks = document.getElementById('inspectRemarks')?.value.trim() || '';
    const condition = document.getElementById('condition')?.value.trim() || '';
    const combined = [condition, voice, remarks].filter(Boolean).join(' · ') || 'Site inspected; issue confirmed.';
    const photos = document.getElementById('inspectPhotos')?.files?.length || 2;
    const videos = document.getElementById('inspectVideo')?.files?.length || 0;
    const severityLabel = document.getElementById('severity')?.value || 'High';
    const severityMap = { Low: 2, Medium: 3, High: 4, Critical: 5 };

    t.inspectionEvidence = {
      photos: Math.max(photos, 1),
      videos,
      remarks: combined,
      by: 'Officer Arun',
      time: new Date().toLocaleString('en-IN')
    };
    if (statusIndex(t.status) < 1) t.status = 'Inspected';

    if (window.CivicAPI && t.backendId) {
      try {
        if (await CivicAPI.ping()) {
          await CivicAPI.submitInspection(t.backendId, {
            location_verified: true,
            issue_exists: true,
            severity: severityMap[severityLabel] || 4,
            current_condition: condition || combined,
            remarks: combined,
            photos: [],
            videos: [],
            voice_note_text: voice || null
          });
          CR.toast('Inspection recorded on backend. Status: Assigned → Inspected', 'success');
        } else {
          CR.toast('Inspection recorded successfully. Status: Assigned → Inspected', 'success');
        }
      } catch (err) {
        CR.toast('Saved locally — API: ' + err.message, 'warning');
      }
    } else {
      CR.toast('Inspection recorded successfully. Status: Assigned → Inspected', 'success');
    }

    CR.closeModal('inspectModal');
    refresh();
    openTask(t.id);
  });

  function updateProgress(id, next) {
    const t = getTask(id);
    if (!t) return;
    t.status = next;
    if (next === 'Work Started' || next === 'Work In Progress') {
      t.progressEvidence = t.progressEvidence || {
        photos: 1,
        videos: 0,
        remarks: next === 'Work Started' ? 'Crew mobilized; work started on site.' : 'Work ongoing; partial repair in progress.',
        by: 'Officer Arun',
        time: new Date().toLocaleString('en-IN')
      };
      if (next === 'Work In Progress') {
        t.progressEvidence.remarks = 'Work ongoing; partial repair in progress.';
        t.progressEvidence.time = new Date().toLocaleString('en-IN');
      }
    }
    CR.toast(`${t.id} updated to: ${next}`, 'success');
    refresh();
    if (document.getElementById('taskModal').classList.contains('open')) openTask(id);
  }

  function openComplete(id) {
    completeTaskId = id;
    document.getElementById('completePhoto').value = '';
    document.getElementById('completeRemarks').value = '';
    CR.openModal('completeModal');
  }

  document.getElementById('submitComplete').addEventListener('click', () => {
    const t = getTask(completeTaskId);
    const remarks = document.getElementById('completeRemarks').value.trim();
    const photo = document.getElementById('completePhoto').files[0];
    if (!remarks) {
      CR.toast('Completion remarks are required.', 'danger');
      return;
    }
    if (!photo) {
      CR.toast('Completion photo is required (mock validation).', 'danger');
      return;
    }
    t.completionEvidence = {
      photos: 1,
      videos: 0,
      remarks,
      by: 'Officer Arun',
      time: new Date().toLocaleString('en-IN')
    };
    t.status = 'Admin Verification';
    CR.closeModal('completeModal');
    CR.closeModal('taskModal');
    CR.toast('Submitted for Admin Verification. Citizen verification is not available to officers.', 'success');
    refresh();
  });

  function askAI(q) {
    const box = document.getElementById('aiMessages');
    box.innerHTML += `<div class="ai-bubble user">${q}</div>`;
    const reply = aiReplies[q] || `For "${q}": I can guide field checklists and drafts only. I will not change priority, approve completion, assign work, or verify citizen resolution.`;
    setTimeout(() => {
      box.innerHTML += `<div class="ai-bubble bot">${reply}</div>`;
      box.scrollTop = box.scrollHeight;
    }, 350);
  }

  function refresh() {
    renderStats();
    renderPriorityTasks();
    renderSLAAlerts();
    renderNearby();
    renderCritical();
    renderProgress();
  }

  document.getElementById('startInspectionQuick').addEventListener('click', () => {
    const t = tasks.find(x => x.status === 'Assigned') || tasks[0];
    openInspect(t.id);
  });

  ['sortNearby', 'filterCat', 'filterStatus', 'filterPri'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderNearby);
  });

  document.getElementById('openAiBtn').addEventListener('click', () => CR.openModal('aiModal'));
  document.getElementById('aiQuick').querySelectorAll('button').forEach(b => b.addEventListener('click', () => askAI(b.dataset.q)));
  document.getElementById('aiSend').addEventListener('click', () => {
    const inp = document.getElementById('aiInput');
    if (!inp.value.trim()) return;
    askAI(inp.value.trim());
    inp.value = '';
  });

  document.getElementById('welcomeTitle').textContent = `${CR.greeting()}, ${CR.t ? CR.t('officer_name') : 'Officer'} 👋`;
  CR.initNav();
  /* Expose notifications for topbar notification panel */
  window._officerNotifications = notifications;
  if (window.renderTopOfficerNotif) renderTopOfficerNotif();

  // Stat card clicks → navigate to relevant panel
  document.getElementById('officerStats')?.addEventListener('click', (e) => {
    const card = e.target.closest('.stat-card');
    if (!card) return;
    const label = card.querySelector('.stat-label')?.textContent || '';
    if (label.includes('Critical'))         window.showOfficerPanel?.('criticalTasks');
    else if (label.includes('SLA') || label.includes('Overdue')) window.showOfficerPanel?.('slaAlerts');
    else if (label.includes('Nearby'))      window.showOfficerPanel?.('nearbyTasks');
    else if (label.includes('Assigned') || label.includes("Today")) window.showOfficerPanel?.('myTasks');
    else if (label.includes('Completed'))   window.showOfficerPanel?.('progress');
    else                                    window.showOfficerPanel?.('myTasks');
  });
  window.addEventListener('civic:langchange', () => {
    document.getElementById('welcomeTitle').textContent = `${CR.greeting()}, ${CR.t ? CR.t('officer_name') : 'Officer'} 👋`;
  });
  refresh();

  (async function syncOfficerBackend() {
    if (!window.CivicAPI) return;
    try {
      if (!(await CivicAPI.ping())) {
        CR.toast('Backend offline — using demo officer tasks', 'warning');
        return;
      }
      const data = await CivicAPI.officerProblems();
      const assigned = data.categories?.assigned_issues || [];
      if (!assigned.length) {
        CR.toast('Backend online — no tasks assigned to OFF-001 yet. Ask Admin to assign.', 'warning');
        return;
      }
      tasks.length = 0;
      assigned.forEach((p, i) => {
        const level = p.priority_analysis?.priority_level || 'MEDIUM';
        const lat = Number(p.latitude) || 13.0827 + i * 0.002;
        const lng = Number(p.longitude) || 80.2707 + i * 0.002;
        const you = { lat: 13.0827, lng: 80.2707 };
        const dist = window.CivicMaps ? +CivicMaps.haversineKm(you, { lat, lng }).toFixed(1) : +(0.5 + i * 0.4).toFixed(1);
        tasks.push({
          id: 'CR-' + p.id,
          backendId: p.id,
          title: p.title,
          priority: level === 'CRITICAL' || level === 'HIGH' ? 'P1' : level === 'LOW' ? 'P3' : 'P2',
          category: p.category || 'Road',
          location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat,
          lng,
          distance: dist,
          due: 'Due Today',
          dueRank: 1,
          affected: Array.isArray(p.supports) ? p.supports.length : 0,
          boosts: Array.isArray(p.supports) ? p.supports.length : 0,
          evidenceFiles: p.image_path ? 1 : 0,
          status: p.inspection ? 'Inspected' : 'Assigned',
          critical: level === 'CRITICAL' || level === 'HIGH',
          overdue: false,
          complaint: p.description || '',
          aiSummary: (p.priority_analysis?.explanation || []).join(' ') || 'Assigned field task.',
          assignedDate: p.assignment?.assigned_at ? new Date(p.assignment.assigned_at).toLocaleDateString('en-IN') : CR.formatDate(),
          sla: 'Today',
          previousReports: [],
          citizenEvidence: { photos: 1, videos: 0, remarks: p.description || '', by: 'Citizen', time: p.created_at || '' },
          inspectionEvidence: p.inspection ? {
            photos: (p.inspection.photos || []).length || 1,
            videos: 0,
            remarks: p.inspection.remarks || '',
            by: p.inspection.inspected_by || 'Officer',
            time: p.inspection.inspected_at || ''
          } : null,
          progressEvidence: null,
          completionEvidence: null
        });
      });
      refresh();
      CR.toast(`Officer synced — ${assigned.length} assigned task(s) on map`, 'success');
    } catch (e) {
      CR.toast('Officer sync: ' + e.message, 'warning');
    }
  })();
})();
