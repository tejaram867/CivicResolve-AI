(function () {
  const CR = CivicResolve;
  if (window.CivicAPI) {
    CivicAPI.requireRole('admin');
    CivicAPI.bindLogout();
  }

  const officers = [
    { id: 'o1', name: 'Officer Arun Kumar', area: 'Ward 12', workload: 6, rating: '98%' },
    { id: 'o2', name: 'Officer Meena R', area: 'Ward 8–12', workload: 4, rating: '96%' },
    { id: 'o3', name: 'Officer Vikram S', area: 'Ward 15', workload: 8, rating: '94%' },
    { id: 'o4', name: 'Officer Divya P', area: 'Central', workload: 3, rating: '99%' }
  ];

  let priorityQueue = [
    {
      id: 'CR-1042',
      title: 'Open manhole — School Zone',
      criticality: 'HIGH',
      safety: true,
      affected: 47,
      reports: 18,
      location: 'School Zone, Ward 12',
      category: 'Drainage',
      recommended: 'P1',
      decision: null,
      status: 'New'
    },
    {
      id: 'CR-1048',
      title: 'Main Road structural crack',
      criticality: 'HIGH',
      safety: true,
      affected: 32,
      reports: 11,
      location: 'Main Road, Ward 12',
      category: 'Road',
      recommended: 'P1',
      decision: null,
      status: 'New'
    },
    {
      id: 'CR-1039',
      title: 'Market waste overflow',
      criticality: 'MEDIUM',
      safety: false,
      affected: 22,
      reports: 9,
      location: 'Market Road',
      category: 'Garbage',
      recommended: 'P2',
      decision: null,
      status: 'New'
    }
  ];

  const clusters = [
    {
      id: 'CR-1024',
      title: 'Damaged road section cluster',
      reports: 14,
      boosts: 9,
      location: '1 Physical Location · Ring Road stretch',
      photos: 12,
      videos: 3,
      conclusion: 'These reports likely refer to the same damaged road section.',
      items: [
        { citizen: 'Ravi K', text: 'Deep pothole near bus stop', media: 'Photo' },
        { citizen: 'Anitha M', text: 'Road cracked after rains', media: 'Photo+Video' },
        { citizen: 'Suresh T', text: 'Same stretch — vehicles bouncing', media: 'Photo' },
        { citizen: 'Lakshmi P', text: 'Dangerous for two-wheelers', media: 'Photo' }
      ]
    },
    {
      id: 'CR-1011',
      title: 'Drainage overflow cluster',
      reports: 8,
      boosts: 5,
      location: '1 Physical Location · 2nd Cross',
      photos: 7,
      videos: 1,
      conclusion: 'Reports align geographically within 40m — likely one blockage event.',
      items: [
        { citizen: 'Karthik', text: 'Water stagnating for 2 days', media: 'Photo' },
        { citizen: 'Nisha', text: 'Smell + mosquitoes', media: 'Photo' }
      ]
    }
  ];

  let mapIssues = [
    { id: 'CR-101', title: 'Main Road Pothole', priority: 'P1', category: 'Road', status: 'Assigned', ward: 'Ward 12', criticality: 'Critical', lat: 13.0852, lng: 80.2731 },
    { id: 'CR-102', title: 'Drainage blockage', priority: 'P1', category: 'Drainage', status: 'New', ward: 'Ward 12', criticality: 'High', lat: 13.0801, lng: 80.2684 },
    { id: 'CR-103', title: 'Streetlight outage', priority: 'P3', category: 'Streetlight', status: 'New', ward: 'Ward 15', criticality: 'Low', lat: 13.0788, lng: 80.2755 },
    { id: 'CR-104', title: 'Garbage overflow', priority: 'P2', category: 'Garbage', status: 'New', ward: 'Ward 8', criticality: 'Medium', lat: 13.0864, lng: 80.2692 },
    { id: 'CR-105', title: 'Ring Road patch', priority: 'P2', category: 'Road', status: 'Completed', ward: 'Ward 12', criticality: 'High', lat: 13.0835, lng: 80.2660 }
  ];

  let assignments = [
    { id: 'CR-1042', category: 'Drainage', location: 'Ward 12', priority: 'P1', suggested: 'Officer Arun Kumar', assigned: null },
    { id: 'CR-1048', category: 'Road', location: 'Ward 12', priority: 'P1', suggested: 'Officer Meena R', assigned: null },
    { id: 'CR-1033', category: 'Streetlight', location: 'Ward 15', priority: 'P3', suggested: 'Officer Vikram S', assigned: null }
  ];

  let slaIssues = [
    { id: 'CR-1042', category: 'Drainage', location: 'School Zone', officer: 'Unassigned', priority: 'P1', due: 'Today 4:00 PM', remaining: '2 hours', status: 'Due Soon', urgency: 'due' },
    { id: 'CR-1021', category: 'Road', location: 'Ring Road', officer: 'Arun Kumar', priority: 'P1', due: 'Yesterday 6:00 PM', remaining: 'Overdue 6h', status: 'Critical Overdue', urgency: 'critical' },
    { id: 'CR-1030', category: 'Garbage', location: 'Market', officer: 'Divya P', priority: 'P2', due: 'Yesterday', remaining: 'Overdue 14h', status: 'Overdue', urgency: 'overdue' },
    { id: 'CR-1028', category: 'Water Supply', location: 'Temple St', officer: 'Meena R', priority: 'P2', due: 'Today 8:00 PM', remaining: '6 hours', status: 'Due Today', urgency: 'due' },
    { id: 'CR-1015', category: 'Drainage', location: 'Canal Rd', officer: 'Vikram S', priority: 'P1', due: '2 days ago', remaining: 'Escalated', status: 'Escalated', urgency: 'critical' }
  ];

  let pendingAssignId = null;

  const notifications = [
    { text: '5 new critical issues require review.', time: '20 min ago', read: false },
    { text: '3 issues are approaching SLA.', time: '1 hour ago', read: false },
    { text: 'Officer Arun updated CR-1042.', time: '2 hours ago', read: false },
    { text: 'Citizen requested re-verification for CR-1018.', time: 'Yesterday', read: false },
    { text: '2 issues have been reopened.', time: 'Yesterday', read: true }
  ];

  const aiReplies = {
    'Which issues need priority decisions?': 'CR-1042 and CR-1048 are in the AI Priority Queue with P1 recommendations. Accept or change priority manually — AI will not finalize decisions.',
    'Summarize duplicate clusters': 'Cluster CR-1024 groups 14 reports on one road stretch (12 photos, 3 videos). Cluster CR-1011 groups 8 drainage reports on 2nd Cross. You can merge, split, or mark separate.',
    'What is at SLA risk?': 'CR-1021 is critically overdue (6h). CR-1015 is escalated. CR-1042 is due in ~2 hours and still unassigned — prioritize assignment.',
    'Suggest officer for Ward 12 road issues': 'Suggestion only: Officer Meena R (workload 4) or Officer Arun Kumar (Ward 12 specialist). You must confirm the assignment — I cannot assign automatically.'
  };

  function badge(p) {
    return `<span class="badge badge-${p.toLowerCase()}">${p}</span>`.replace('badge-p1', 'badge-p1').replace('badge-p2', 'badge-p2');
  }
  function pBadge(p) {
    const map = { P1: 'badge-p1', P2: 'badge-p2', P3: 'badge-p3', P4: 'badge-p4' };
    return `<span class="badge ${map[p] || 'badge-neutral'}">${p}</span>`;
  }

  function renderKPIs() {
    const pendingPriority = priorityQueue.filter(q => !q.decision).length;
    const criticalSla     = slaIssues.filter(s => s.urgency === 'critical').length;
    const overdueSla      = slaIssues.filter(s => s.urgency === 'overdue').length;
    const unassigned      = assignments.filter(a => !a.assigned).length;

    document.getElementById('kpiGrid').innerHTML = `

      <!-- ① AI Priority Queue -->
      <div class="dash-box dash-box-priority" data-goto="priority">
        <div class="dash-box-head">
          <span class="dash-box-icon">🤖</span>
          <div>
            <div class="dash-box-title">AI Priority Queue</div>
            <div class="dash-box-sub">Highest-impact issues ranked by AI</div>
          </div>
          <span class="dash-box-count ${pendingPriority > 0 ? 'dash-count-danger' : 'dash-count-ok'}">${pendingPriority} pending</span>
        </div>
        <div class="dash-box-items">
          ${priorityQueue.slice(0,3).map(q => `
            <div class="dash-box-row">
              <span class="dash-row-id">${q.id}</span>
              <span class="dash-row-title">${q.title}</span>
              <span class="badge ${q.criticality === 'HIGH' ? 'badge-p1' : 'badge-p2'}">${q.recommended}</span>
              <span class="dash-row-status ${q.decision ? 'status-ok' : 'status-pending'}">${q.decision ? '✓ Decided' : '⏳ Pending'}</span>
            </div>`).join('')}
        </div>
        <button class="dash-box-btn">View AI Queue →</button>
      </div>

      <!-- ② Duplicate Clusters -->
      <div class="dash-box dash-box-clusters" data-goto="clusters">
        <div class="dash-box-head">
          <span class="dash-box-icon">🧩</span>
          <div>
            <div class="dash-box-title">Duplicate Clusters</div>
            <div class="dash-box-sub">Merge related reports</div>
          </div>
          <span class="dash-box-count dash-count-warning">${clusters.length} clusters</span>
        </div>
        <div class="dash-box-items">
          ${clusters.map(c => `
            <div class="dash-box-row">
              <span class="dash-row-id">${c.id}</span>
              <span class="dash-row-title">${c.title}</span>
              <span class="badge badge-neutral">📄 ${c.reports}</span>
              <span class="badge badge-info">📷 ${c.photos}</span>
            </div>`).join('')}
        </div>
        <button class="dash-box-btn">Review Clusters →</button>
      </div>

      <!-- ③ Civic Map -->
      <div class="dash-box dash-box-map" data-goto="map">
        <div class="dash-box-head">
          <span class="dash-box-icon">🗺️</span>
          <div>
            <div class="dash-box-title">Civic Map</div>
            <div class="dash-box-sub">Live issue heatmap</div>
          </div>
          <span class="dash-box-count dash-count-info">${mapIssues.length} pins</span>
        </div>
        <div class="dash-box-items">
          ${['Road','Drainage','Garbage','Streetlight'].map(cat => {
            const n = mapIssues.filter(m => m.category === cat).length;
            return `<div class="dash-box-row">
              <span class="dash-row-title">${cat}</span>
              <div class="dash-mini-bar-wrap"><div class="dash-mini-bar" style="width:${Math.round((n/mapIssues.length)*100)||8}%"></div></div>
              <span class="dash-row-id">${n} issue${n !== 1 ? 's' : ''}</span>
            </div>`;
          }).join('')}
        </div>
        <button class="dash-box-btn">Open Map →</button>
      </div>

      <!-- ④ Smart Assignment -->
      <div class="dash-box dash-box-assign" data-goto="assignments">
        <div class="dash-box-head">
          <span class="dash-box-icon">👤</span>
          <div>
            <div class="dash-box-title">Smart Assignment</div>
            <div class="dash-box-sub">Match officers to work</div>
          </div>
          <span class="dash-box-count ${unassigned > 0 ? 'dash-count-danger' : 'dash-count-ok'}">${unassigned} unassigned</span>
        </div>
        <div class="dash-box-items">
          ${officers.map(o => `
            <div class="dash-box-row">
              <span class="dash-officer-dot"></span>
              <span class="dash-row-title">${o.name}</span>
              <span class="dash-row-id">${o.area}</span>
              <span class="badge badge-neutral">WL: ${o.workload}</span>
              <span class="dash-row-status status-ok">${o.rating}</span>
            </div>`).join('')}
        </div>
        <button class="dash-box-btn">Manage Assignments →</button>
      </div>

      <!-- ⑤ SLA Management -->
      <div class="dash-box dash-box-sla" data-goto="sla">
        <div class="dash-box-head">
          <span class="dash-box-icon">⏰</span>
          <div>
            <div class="dash-box-title">SLA Management</div>
            <div class="dash-box-sub">Deadlines &amp; escalations</div>
          </div>
          <span class="dash-box-count ${criticalSla > 0 ? 'dash-count-danger' : 'dash-count-warning'}">${criticalSla} critical</span>
        </div>
        <div class="dash-box-sla-pills">
          <div class="sla-mini-pill sla-mini-critical"><span>${criticalSla}</span>Critical Overdue</div>
          <div class="sla-mini-pill sla-mini-overdue"><span>${overdueSla}</span>Overdue</div>
          <div class="sla-mini-pill sla-mini-due"><span>${slaIssues.filter(s=>s.urgency==='due').length}</span>Due Today</div>
          <div class="sla-mini-pill sla-mini-ok"><span>36h</span>Avg Resolution</div>
        </div>
        <div class="dash-box-items">
          ${slaIssues.slice(0,3).map(s => `
            <div class="dash-box-row">
              <span class="dash-row-id">${s.id}</span>
              <span class="dash-row-title">${s.category} · ${s.location}</span>
              <span class="badge ${s.urgency==='critical'?'badge-danger':s.urgency==='overdue'?'badge-danger':'badge-warning'}">${s.remaining}</span>
            </div>`).join('')}
        </div>
        <button class="dash-box-btn">View SLA Board →</button>
      </div>

      <!-- ⑥ Active Issues -->
      <div class="dash-box dash-box-issues" data-goto="issues">
        <div class="dash-box-head">
          <span class="dash-box-icon">📋</span>
          <div>
            <div class="dash-box-title">Active Issues</div>
            <div class="dash-box-sub">Browse all open complaints</div>
          </div>
          <span class="dash-box-count dash-count-info">128 total</span>
        </div>
        <div class="dash-box-items">
          ${[...priorityQueue, ...mapIssues.filter(m => !priorityQueue.find(q=>q.id===m.id))].slice(0,4).map(i => `
            <div class="dash-box-row">
              <span class="dash-row-id">${i.id}</span>
              <span class="dash-row-title">${i.title||i.category}</span>
              <span class="badge badge-neutral">${i.category}</span>
              <span class="badge badge-info">${i.status||'Active'}</span>
            </div>`).join('')}
        </div>
        <button class="dash-box-btn">Browse Issues →</button>
      </div>

    `;/* end kpiGrid */

    /* Wire "Go to section" buttons — analytics excluded (shown inline) */
    document.querySelectorAll('.dash-box[data-goto]').forEach(box => {
      if (box.dataset.goto !== 'analytics') {
        box.addEventListener('click', () => window.showAdminPanel(box.dataset.goto));
      }
    });
  }

  function renderPriority() {
    document.getElementById('priorityQueue').innerHTML = priorityQueue.map(q => `
      <div class="pq-card ${q.criticality === 'HIGH' ? 'critical' : ''}">
        <div class="ai-tag">✨ AI Recommendation</div>
        <h3>${q.id} — ${q.title}</h3>
        <div class="pq-facts">
          <div><strong>Criticality</strong>${q.criticality}</div>
          <div><strong>Safety Risk</strong>${q.safety ? 'YES' : 'NO'}</div>
          <div><strong>Affected Citizens</strong>${q.affected}</div>
          <div><strong>Reports</strong>${q.reports}</div>
          <div><strong>Location</strong>${q.location}</div>
          <div><strong>Category</strong>${q.category}</div>
        </div>
        <div class="decision-box">
          <div class="ai-rec"><em>AI Recommendation</em>${pBadge(q.recommended)}</div>
          <div class="admin-dec"><em>Admin Decision</em>${q.decision ? pBadge(q.decision) : '<span class="badge badge-neutral">Pending</span>'}</div>
        </div>
        <div class="pq-actions">
          <button class="btn btn-primary btn-sm" data-act="accept" data-id="${q.id}">Accept ${q.recommended}</button>
          <button class="btn btn-secondary btn-sm" data-act="change" data-id="${q.id}">Change Priority</button>
          <button class="btn btn-ghost btn-sm" data-act="view" data-id="${q.id}">View Issue</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('#priorityQueue [data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const q = priorityQueue.find(x => x.id === btn.dataset.id);
        const act = btn.dataset.act;
        if (act === 'accept') {
          q.decision = q.recommended;
          CR.toast(`Admin accepted ${q.recommended} for ${q.id}. AI recommendation recorded — decision is yours.`, 'success');
          renderPriority();
        } else if (act === 'change') {
          const next = { P1: 'P2', P2: 'P3', P3: 'P4', P4: 'P1' }[q.decision || q.recommended];
          q.decision = next;
          CR.toast(`Admin set ${q.id} to ${next} (overriding AI suggestion).`, 'warning');
          renderPriority();
        } else {
          openIssue(q);
        }
      });
    });
  }

  function openIssue(q) {
    document.getElementById('adminIssueTitle').textContent = `${q.id} — ${q.title || q.category}`;
    document.getElementById('adminIssueBody').innerHTML = `
      <p style="margin-bottom:0.75rem;">${pBadge(q.priority || q.recommended || q.decision || 'P3')} <span class="badge badge-info">${q.status || 'Active'}</span></p>
      <p><strong>Category:</strong> ${q.category}</p>
      <p><strong>Location:</strong> ${q.location || q.ward || '—'}</p>
      ${q.affected ? `<p><strong>Affected citizens:</strong> ${q.affected}</p>` : ''}
      <p style="margin-top:1rem;color:var(--slate-600);">Lifecycle: Citizen Reports → AI Analysis → Priority → Assignment → Officer Action → Resolution → Citizen Verification.</p>
      <p style="margin-top:0.75rem;font-size:0.9rem;background:var(--blue-50);padding:0.75rem;border-radius:10px;"><strong>Reminder:</strong> AI recommends — Admin decides.</p>
    `;
    document.getElementById('adminIssueFooter').innerHTML = `
      <button class="btn btn-secondary" data-close-modal="adminIssueModal">Close</button>
      <button class="btn btn-primary" id="goAssignFromIssue">Assign Officer</button>
    `;
    document.getElementById('goAssignFromIssue')?.addEventListener('click', () => {
      CR.closeModal('adminIssueModal');
      window.showAdminPanel('assignments');
      openAssign(q.id);
    });
    document.querySelector('#adminIssueFooter [data-close-modal]')?.addEventListener('click', () => CR.closeModal('adminIssueModal'));
    CR.openModal('adminIssueModal');
  }

  function renderClusters() {
    document.getElementById('clusterList').innerHTML = clusters.map(c => `
      <div class="cluster-card">
        <h3>Cluster #${c.id} — ${c.title}</h3>
        <div class="cluster-stats">
          <span>📄 ${c.reports} Citizen Reports</span>
          <span>🚧 ${c.boosts} Boosts</span>
          <span>📍 ${c.location}</span>
          <span>📷 ${c.photos} Photos</span>
          <span>🎬 ${c.videos} Videos</span>
        </div>
        <div class="ai-conclusion"><strong>AI conclusion:</strong> ${c.conclusion}</div>
        <div class="cluster-actions">
          <button class="btn btn-primary btn-sm" data-c="view" data-id="${c.id}">View Cluster</button>
          <button class="btn btn-secondary btn-sm" data-c="merge" data-id="${c.id}">Merge Reports</button>
          <button class="btn btn-secondary btn-sm" data-c="split" data-id="${c.id}">Split Cluster</button>
          <button class="btn btn-ghost btn-sm" data-c="sep" data-id="${c.id}">Mark as Separate</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('#clusterList [data-c]').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = clusters.find(x => x.id === btn.dataset.id);
        const act = btn.dataset.c;
        if (act === 'view') {
          document.getElementById('clusterTitle').textContent = `Cluster #${c.id}`;
          document.getElementById('clusterBody').innerHTML = `
            <p style="margin-bottom:1rem;">${c.conclusion}</p>
            <h4 style="margin-bottom:0.75rem;">Individual citizen reports</h4>
            ${c.items.map(r => `
              <div class="report-chip">
                <div class="thumb">${r.media}</div>
                <div><strong>${r.citizen}</strong><br>${r.text}<br><span style="color:var(--slate-500);font-size:0.8rem;">${r.media}</span></div>
              </div>
            `).join('')}
          `;
          CR.openModal('clusterModal');
        } else if (act === 'merge') {
          CR.toast(`Reports in ${c.id} merged into one master issue (demo).`, 'success');
        } else if (act === 'split') {
          CR.toast(`Cluster ${c.id} split into separate issues (demo).`, 'warning');
        } else {
          CR.toast(`Marked reports in ${c.id} as separate issues.`, 'success');
        }
      });
    });
  }

  function renderMap() {
    const cat = document.getElementById('fCategory').value;
    const pri = document.getElementById('fPriority').value;
    const crit = document.getElementById('fCriticality').value;
    const st = document.getElementById('fStatus').value;
    const ward = document.getElementById('fWard').value;

    const filtered = mapIssues.filter(m =>
      (!cat || m.category === cat) &&
      (!pri || m.priority === pri) &&
      (!crit || m.criticality === crit) &&
      (!st || m.status === st) &&
      (!ward || m.ward === ward)
    );

    if (window.CivicMaps) {
      const map = CivicMaps.createMap('civicMap', { center: [13.0827, 80.2707], zoom: 13 });
      CivicMaps.plotMarkers(map, filtered.map((m) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        priority: m.priority,
        status: m.status,
        lat: m.lat,
        lng: m.lng,
        onClick: () => openIssue(m),
      })), { fit: true });
    }
  }

  function openAssign(issueId) {
    pendingAssignId = issueId;
    const a = assignments.find(x => x.id === issueId) || { id: issueId, category: 'Road', location: 'Ward 12', priority: 'P1', suggested: officers[0].name };
    document.getElementById('assignBody').innerHTML = `
      <p style="margin-bottom:0.75rem;"><strong>${a.id}</strong> · ${a.category} · ${a.location} · ${pBadge(a.priority)}</p>
      <p class="ai-suggest" style="margin-bottom:1rem;">✨ AI Suggested Assignment: ${a.suggested}</p>
      <p class="form-label">Select Civic Officer</p>
      ${officers.map(o => `
        <div class="officer-option" data-oid="${o.id}">
          <div>
            <strong>${o.name}</strong>
            <div style="font-size:0.8rem;color:var(--slate-500);">${o.area} · Workload: ${o.workload} · SLA: ${o.rating}</div>
          </div>
          <span class="badge badge-info">Civic Officer</span>
        </div>
      `).join('')}
    `;
    let selected = officers.find(o => o.name === a.suggested)?.id || officers[0].id;
    const sync = () => {
      document.querySelectorAll('.officer-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.oid === selected);
      });
    };
    document.querySelectorAll('.officer-option').forEach(el => {
      el.addEventListener('click', () => { selected = el.dataset.oid; sync(); });
    });
    sync();
    document.getElementById('confirmAssign').onclick = async () => {
      const off = officers.find(o => o.id === selected);
      const row = assignments.find(x => x.id === pendingAssignId);
      if (row) row.assigned = off.name;
      const sla = slaIssues.find(s => s.id === pendingAssignId);
      if (sla) sla.officer = off.name;

      if (window.CivicAPI) {
        try {
          if (await CivicAPI.ping()) {
            const backendId = String(pendingAssignId).replace(/^CR-/, '');
            await CivicAPI.assignOfficer(backendId, {
              officer_id: 'OFF-001',
              remarks: `Assigned via Admin dashboard to ${off.name}`
            });
            CR.toast(`${pendingAssignId} assigned to ${off.name} (backend synced)`, 'success');
          } else {
            CR.toast(`${pendingAssignId} assigned to ${off.name}`, 'success');
          }
        } catch (err) {
          CR.toast(`${pendingAssignId} assigned locally — API: ${err.message}`, 'warning');
        }
      } else {
        CR.toast(`${pendingAssignId} assigned to ${off.name}`, 'success');
      }

      CR.closeModal('assignModal');
      renderAssignments();
      renderSLA();
      renderIssues();
    };
    CR.openModal('assignModal');
  }

  function renderAssignments() {
    document.getElementById('assignmentPanel').innerHTML = assignments.map(a => `
      <div class="assign-card">
        <div>
          <h3 style="font-size:1.05rem;">${a.id}</h3>
          <div class="assign-meta">
            <span class="badge badge-neutral">${a.category}</span>
            <span class="badge badge-info">${a.location}</span>
            ${pBadge(a.priority)}
            ${a.assigned ? `<span class="badge badge-success">Assigned: ${a.assigned}</span>` : `<span class="badge badge-warning">Unassigned</span>`}
          </div>
          <div class="ai-suggest">✨ AI Suggested Assignment: ${a.suggested} (Civic Officer)</div>
        </div>
        <button class="btn btn-primary" data-assign="${a.id}" ${a.assigned ? 'disabled' : ''}>
          ${a.assigned ? 'Assigned ✓' : 'Assign Civic Officer'}
        </button>
      </div>
    `).join('');
    document.querySelectorAll('[data-assign]').forEach(btn => {
      btn.addEventListener('click', () => openAssign(btn.dataset.assign));
    });
  }

  function renderSLA() {
    document.getElementById('slaSummary').innerHTML = `
      <div class="sla-pill due"><div class="n">4</div><div class="l">Due Today</div></div>
      <div class="sla-pill overdue"><div class="n">3</div><div class="l">Overdue</div></div>
      <div class="sla-pill critical"><div class="n">2</div><div class="l">Critical Overdue</div></div>
      <div class="sla-pill"><div class="n">1</div><div class="l">Escalated</div></div>
      <div class="sla-pill"><div class="n">36h</div><div class="l">Avg Resolution</div></div>
    `;
    document.getElementById('slaTable').innerHTML = `
      <table class="sla-table">
        <thead>
          <tr>
            <th>Issue ID</th><th>Category</th><th>Location</th><th>Officer</th>
            <th>Priority</th><th>SLA Due</th><th>Remaining</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${slaIssues.map(s => `
            <tr class="row-${s.urgency === 'critical' || s.urgency === 'overdue' ? 'overdue' : s.urgency === 'due' ? 'due' : ''}" data-sla="${s.id}">
              <td><strong>${s.id}</strong></td>
              <td>${s.category}</td>
              <td>${s.location}</td>
              <td>${s.officer}</td>
              <td>${pBadge(s.priority)}</td>
              <td>${s.due}</td>
              <td>${s.remaining}</td>
              <td><span class="badge ${s.urgency === 'critical' ? 'badge-danger' : s.urgency === 'overdue' ? 'badge-danger' : 'badge-warning'}">${s.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    document.querySelectorAll('[data-sla]').forEach(row => {
      row.addEventListener('click', () => {
        const s = slaIssues.find(x => x.id === row.dataset.sla);
        document.getElementById('slaModalTitle').textContent = `SLA Timeline — ${s.id}`;
        document.getElementById('slaModalBody').innerHTML = `
          <p>${pBadge(s.priority)} <span class="badge badge-danger">${s.status}</span></p>
          <div class="timeline" style="margin-top:1rem;">
            <div class="tl-item done"><strong>Issue created</strong><span>SLA clock started</span></div>
            <div class="tl-item done"><strong>AI prioritized</strong><span>Recommended ${s.priority}</span></div>
            <div class="tl-item ${s.officer !== 'Unassigned' ? 'done' : 'current'}"><strong>Assigned</strong><span>${s.officer}</span></div>
            <div class="tl-item"><strong>Officer action</strong><span>Inspection & progress</span></div>
            <div class="tl-item"><strong>SLA deadline</strong><span>${s.due} · ${s.remaining}</span></div>
          </div>
        `;
        CR.openModal('slaModal');
      });
    });
  }

  function renderIssues() {
    const all = [
      ...priorityQueue.map(q => ({ ...q, priority: q.decision || q.recommended })),
      ...mapIssues.filter(m => !priorityQueue.find(q => q.id === m.id))
    ];
    document.getElementById('issuesList').innerHTML = all.slice(0, 8).map(i => `
      <div class="issue-row" data-iid="${i.id}">
        <div>
          <strong>${i.id}</strong> — ${i.title || i.category}
          <div style="margin-top:0.35rem;display:flex;gap:0.35rem;flex-wrap:wrap;">
            ${pBadge(i.priority || 'P3')}
            <span class="badge badge-neutral">${i.category}</span>
            <span class="badge badge-info">${i.status || 'Active'}</span>
          </div>
        </div>
        <button class="btn btn-sm btn-secondary">Open</button>
      </div>
    `).join('');
    document.querySelectorAll('[data-iid]').forEach(row => {
      row.addEventListener('click', () => {
        const i = all.find(x => x.id === row.dataset.iid);
        openIssue(i);
      });
    });
  }

  function renderAnalytics() {
    const days = [
      { d: 'Mon', h: 55 }, { d: 'Tue', h: 70 }, { d: 'Wed', h: 48 },
      { d: 'Thu', h: 82 }, { d: 'Fri', h: 90 }, { d: 'Sat', h: 40 }, { d: 'Sun', h: 35 }
    ];
    document.getElementById('barChart').innerHTML = days.map(x => `
      <div class="bar" style="height:${x.h}%;"><span>${x.d}</span></div>
    `).join('');
    const cats = [
      { n: 'Road', p: 38 }, { n: 'Drainage', p: 24 }, { n: 'Garbage', p: 18 },
      { n: 'Lights', p: 12 }, { n: 'Water', p: 8 }
    ];
    document.getElementById('catBars').innerHTML = cats.map(c => `
      <div class="cat-row"><span>${c.n}</span><div class="track"><div class="fill" style="width:${c.p}%"></div></div><span>${c.p}%</span></div>
    `).join('');
  }

  function askAI(q) {
    const box = document.getElementById('aiMessages');
    box.innerHTML += `<div class="ai-bubble user">${q}</div>`;
    const reply = aiReplies[q] || `For "${q}": I can summarize queues and risks. I will not approve priority, assign officers, or verify citizen resolution — those remain admin actions.`;
    setTimeout(() => {
      box.innerHTML += `<div class="ai-bubble bot">${reply}</div>`;
      box.scrollTop = box.scrollHeight;
    }, 350);
  }

  document.getElementById('openAiBtn').addEventListener('click', () => CR.openModal('aiModal'));
  document.getElementById('aiQuick').querySelectorAll('button').forEach(b => b.addEventListener('click', () => askAI(b.dataset.q)));
  document.getElementById('aiSend').addEventListener('click', () => {
    const inp = document.getElementById('aiInput');
    if (!inp.value.trim()) return;
    askAI(inp.value.trim());
    inp.value = '';
  });

  ['fCategory', 'fPriority', 'fCriticality', 'fStatus', 'fWard', 'fDistrict', 'fDate', 'fDept'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderMap);
  });

  document.getElementById('welcomeTitle').textContent = `${CR.greeting()}, ${CR.t ? CR.t('admin_name') : 'Admin'} 👋`;
  CR.initNav();
  CR.initNotifications(notifications);

  // Sync bell count badge + dropdown pill
  (function syncAdminNotifBadge() {
    const bell = document.getElementById('notifDot');
    const pill = document.getElementById('notifCountPill');
    function update() {
      const unread = notifications.filter(n => !n.read).length;
      const label  = unread > 9 ? '9+' : String(unread);
      if (bell) { bell.textContent = label; bell.classList.toggle('visible', unread > 0); }
      if (pill) { pill.textContent = label; pill.classList.toggle('visible', unread > 0); }
    }
    update();
    document.getElementById('notifList')?.addEventListener('click',   () => setTimeout(update, 0));
    document.getElementById('markAllRead')?.addEventListener('click', () => setTimeout(update, 0));
  })();

  function renderAdminAll() {
    renderKPIs();
    renderPriority();
    renderClusters();
    renderMap();
    renderAssignments();
    renderSLA();
    renderIssues();
    renderAnalytics();
  }

  window.addEventListener('civic:langchange', () => {
    document.getElementById('welcomeTitle').textContent = `${CR.greeting()}, ${CR.t ? CR.t('admin_name') : 'Admin'} 👋`;
  });

  renderAdminAll();
  (async function syncAdminBackend() {
    if (!window.CivicAPI) return;
    try {
      if (!(await CivicAPI.ping())) {
        CR.toast('Backend offline — using demo admin data', 'warning');
        return;
      }
      const [dash, queue] = await Promise.all([
        CivicAPI.adminDashboard(),
        CivicAPI.priorityQueue()
      ]);
      if (dash.metrics) {
        const m = dash.metrics;
        // Update the KPI strip numbers from live backend data
        const stripVals = [
          m.total_active_issues, m.critical_issues, m.new_reports,
          m.resolved_issues, m.sla_due_today, m.reopened_issues
        ];
        document.querySelectorAll('.admin-kpi-val').forEach((el, i) => {
          if (stripVals[i] !== undefined) el.textContent = stripVals[i];
        });
        // Re-render the rich section boxes with latest data
        renderKPIs();
      }
      if (queue.queue && queue.queue.length) {
        priorityQueue.length = 0;
        mapIssues.length = 0;
        queue.queue.slice(0, 8).forEach((q) => {
          priorityQueue.push({
            id: 'CR-' + q.id,
            title: q.title,
            criticality: q.priority_level === 'CRITICAL' || q.priority_level === 'HIGH' ? 'HIGH' : 'MEDIUM',
            safety: (q.priority_score || 0) >= 70,
            affected: q.support_count || 0,
            reports: 1,
            location: q.location ? `${q.location.latitude}, ${q.location.longitude}` : 'Jurisdiction',
            category: q.category || 'general',
            recommended: q.priority_level === 'CRITICAL' || q.priority_level === 'HIGH' ? 'P1' : q.priority_level === 'MEDIUM' ? 'P2' : 'P3',
            decision: null,
            status: q.status || 'New'
          });
          mapIssues.push({
            id: 'CR-' + q.id,
            title: q.title,
            priority: q.priority_level === 'CRITICAL' || q.priority_level === 'HIGH' ? 'P1' : q.priority_level === 'LOW' ? 'P3' : 'P2',
            category: q.category || 'Road',
            status: q.status || 'New',
            ward: 'Ward 12',
            criticality: q.priority_level === 'CRITICAL' ? 'Critical' : 'High',
            lat: Number(q.location?.latitude) || 13.0827,
            lng: Number(q.location?.longitude) || 80.2707
          });
        });
        renderPriority();
        renderMap();
        /* Seed unassigned for assignment panel */
        assignments.length = 0;
        queue.queue.filter((q) => !q.assigned_officer || q.assigned_officer === 'UNASSIGNED').slice(0, 4).forEach((q) => {
          assignments.push({
            id: 'CR-' + q.id,
            category: q.category || 'Road',
            location: 'Ward 12',
            priority: q.priority_level === 'HIGH' || q.priority_level === 'CRITICAL' ? 'P1' : 'P2',
            suggested: 'Officer Arun Kumar',
            assigned: null
          });
        });
        renderAssignments();
      }
      CR.toast('Admin dashboard synced with backend', 'success');
    } catch (e) {
      CR.toast('Admin sync failed: ' + e.message, 'warning');
    }
  })();
})();
