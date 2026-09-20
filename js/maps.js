/**
 * CivicResolve — Google Maps helper
 * Uses Google Maps embed (no API key required) with clear clickable location pins.
 * Optional: set window.CIVIC_GOOGLE_MAPS_KEY for full JS API multi-marker mode.
 */
(function (global) {
  const CHENNAI = { lat: 13.0827, lng: 80.2707, zoom: 14 };

  const PRIORITY_COLORS = {
    P1: '#dc2626',
    P2: '#ea580c',
    P3: '#ca8a04',
    P4: '#2563eb',
    CRITICAL: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#ca8a04',
    LOW: '#2563eb',
  };

  function colorFor(priority) {
    const key = String(priority || 'P3').toUpperCase();
    return PRIORITY_COLORS[key] || PRIORITY_COLORS.P3;
  }

  function embedUrl(lat, lng, zoom) {
    const z = zoom || 15;
    return `https://www.google.com/maps?q=${lat},${lng}&hl=en&z=${z}&output=embed`;
  }

  function directionsEmbed(from, to) {
    return `https://www.google.com/maps?saddr=${from.lat},${from.lng}&daddr=${to.lat},${to.lng}&hl=en&output=embed`;
  }

  function openGoogleMaps(lat, lng, title) {
    const q = encodeURIComponent(title ? `${title} @ ${lat},${lng}` : `${lat},${lng}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=`, '_blank');
  }

  function openDirections(from, to) {
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`,
      '_blank'
    );
  }

  function haversineKm(a, b) {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  /**
   * Create Google Map shell inside element.
   * Returns controller { focus, setPins, el }
   */
  function createMap(elId, opts = {}) {
    const el = document.getElementById(elId);
    if (!el) return null;

    const center = opts.center
      ? { lat: opts.center[0], lng: opts.center[1] }
      : CHENNAI;
    const zoom = opts.zoom || CHENNAI.zoom;

    el.classList.add('cr-live-map', 'gmap-wrap');
    el.innerHTML = `
      <div class="gmap-frame-wrap">
        <iframe
          class="gmap-frame"
          title="Google Map"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          src="${embedUrl(center.lat, center.lng, zoom)}"
          allowfullscreen
        ></iframe>
        <div class="gmap-brand">Google Maps</div>
      </div>
      <div class="gmap-pin-bar" id="${elId}_pins"></div>
    `;

    const frame = el.querySelector('.gmap-frame');
    const pinBar = el.querySelector('.gmap-pin-bar');

    const controller = {
      el,
      frame,
      pinBar,
      items: [],
      focus(lat, lng, zoomLevel) {
        frame.src = embedUrl(lat, lng, zoomLevel || 16);
      },
      setPins() {},
    };

    el._crMap = controller;
    return controller;
  }

  /**
   * Plot clear location points under / beside the Google Map.
   */
  function plotMarkers(map, items, opts = {}) {
    if (!map || !map.pinBar) return [];
    const list = (items || []).filter((item) => {
      const lat = Number(item.lat ?? item.latitude);
      const lng = Number(item.lng ?? item.longitude);
      return !Number.isNaN(lat) && !Number.isNaN(lng);
    });

    map.items = list;

    if (!list.length) {
      map.pinBar.innerHTML = `<div class="gmap-empty">No location points to show</div>`;
      return [];
    }

    map.pinBar.innerHTML = list
      .map((item, i) => {
        const lat = Number(item.lat ?? item.latitude);
        const lng = Number(item.lng ?? item.longitude);
        const color = colorFor(item.priority || item.priority_level);
        const label = item.priority || `#${i + 1}`;
        return `
          <button type="button" class="gmap-pin-card ${i === 0 ? 'active' : ''}" data-idx="${i}" style="--pin:${color}">
            <span class="gmap-pin-dot" data-label="${label}"></span>
            <span class="gmap-pin-text">
              <strong>${item.title || item.id || 'Issue'}</strong>
              <small>${item.category || ''} ${item.status ? '· ' + item.status : ''}</small>
              <small class="gmap-coords">📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</small>
            </span>
          </button>
        `;
      })
      .join('');

    const activate = (idx) => {
      const item = list[idx];
      if (!item) return;
      const lat = Number(item.lat ?? item.latitude);
      const lng = Number(item.lng ?? item.longitude);
      map.focus(lat, lng, 16);
      map.pinBar.querySelectorAll('.gmap-pin-card').forEach((btn, j) => {
        btn.classList.toggle('active', j === idx);
      });
    };

    map.pinBar.querySelectorAll('.gmap-pin-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.idx;
        activate(idx);
        const item = list[idx];
        if (item && typeof item.onClick === 'function') {
          /* keep map focus; details via separate Open button if needed */
        }
      });
      btn.addEventListener('dblclick', () => {
        const item = list[+btn.dataset.idx];
        if (item && typeof item.onClick === 'function') item.onClick(item);
      });
    });

    /* First point visible immediately */
    activate(0);

    if (opts.youAreHere) {
      const y = opts.youAreHere;
      const youBtn = document.createElement('button');
      youBtn.type = 'button';
      youBtn.className = 'gmap-pin-card gmap-you';
      youBtn.innerHTML = `
        <span class="gmap-pin-dot you" data-label="YOU"></span>
        <span class="gmap-pin-text">
          <strong>Your location</strong>
          <small class="gmap-coords">📍 ${y.lat.toFixed(5)}, ${y.lng.toFixed(5)}</small>
        </span>
      `;
      youBtn.addEventListener('click', () => map.focus(y.lat, y.lng, 14));
      map.pinBar.prepend(youBtn);
    }

    return list;
  }

  /** Officer navigation: Google directions embed + open in Google Maps */
  function createNavMap(elId, from, to, title) {
    const el = document.getElementById(elId);
    if (!el) return null;
    el.classList.add('cr-live-map', 'gmap-wrap');
    el.innerHTML = `
      <div class="gmap-frame-wrap gmap-nav">
        <iframe
          class="gmap-frame"
          title="Google Maps directions"
          loading="lazy"
          src="${directionsEmbed(from, to)}"
          allowfullscreen
        ></iframe>
        <div class="gmap-brand">Google Maps · Directions</div>
      </div>
      <div class="gmap-nav-meta">
        <div><strong>From</strong> ${from.lat.toFixed(5)}, ${from.lng.toFixed(5)}</div>
        <div><strong>To</strong> ${to.lat.toFixed(5)}, ${to.lng.toFixed(5)} · ${title || 'Site'}</div>
        <button type="button" class="btn btn-primary btn-sm" id="${elId}_openGmaps">Open in Google Maps</button>
      </div>
    `;
    const openBtn = document.getElementById(`${elId}_openGmaps`);
    if (openBtn) openBtn.onclick = () => openDirections(from, to);
    el._crMap = {
      focus: (lat, lng) => {
        const frame = el.querySelector('.gmap-frame');
        if (frame) frame.src = embedUrl(lat, lng, 16);
      },
    };
    return el._crMap;
  }

  function invalidate(elId) {
    const el = document.getElementById(elId);
    if (!el || !el._crMap) return;
    /* iframe maps don't need invalidate; no-op for API compat */
  }

  global.CivicMaps = {
    CHENNAI,
    createMap,
    plotMarkers,
    createNavMap,
    haversineKm,
    colorFor,
    invalidate,
    openGoogleMaps,
    openDirections,
    embedUrl,
  };
})(typeof window !== 'undefined' ? window : globalThis);
