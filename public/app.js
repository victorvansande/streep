// KSA Streepkarton - Sleek & Ultra-Fast Mobile Client with Mini-Leaderboard & Cara Rouge

const CLOUD_CHANNEL = 'ksa_streep_2026_victorvansande';

const DEFAULT_MEMBERS = [
  { id: 'm_daan', name: 'Daan', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_dominique', name: 'Dominique', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_eline', name: 'Eline', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_emile', name: 'Emile', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_floris', name: 'Floris', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_gino', name: 'Gino', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_hanne', name: 'Hanne', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_jassin', name: 'Jassin', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_jules', name: 'Jules', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_julie', name: 'Julie', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_len', name: 'Len', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_leon', name: 'Leon', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_lex', name: 'Lex', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_luna', name: 'Luna', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_mart', name: 'Mart', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_matthijs', name: 'Matthijs', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_merlijn', name: 'Merlijn', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_olivier', name: 'Olivier', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_phebe', name: 'Phebe', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_riet', name: 'Riet', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_rik', name: 'Rik', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_rosan', name: 'Rosan', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_siebe', name: 'Siebe', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_vicce', name: 'Vicce', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_lotte', name: 'Lotte', hasPin: false, tallies: 0, drinks: {} },
  { id: 'm_tobias', name: 'Tobias', hasPin: false, tallies: 0, drinks: {} }
];

const DEFAULT_DRINKS = [
  { id: 'pintje', name: 'Pintje', icon: '🍺', price: 1.0 },
  { id: 'cara_rouge', name: 'Cara Rouge', icon: '🍒', price: 1.0 },
  { id: 'cola', name: 'Cola', icon: '🥤', price: 1.0 },
  { id: 'cola_zero', name: 'Cola Zero', icon: '🥤', price: 1.0 },
  { id: 'fanta', name: 'Fanta', icon: '🍊', price: 1.0 },
  { id: 'sprite', name: 'Sprite', icon: '🍋', price: 1.0 },
  { id: 'bruiswater', name: 'Bruiswater', icon: '💧', price: 1.0 }
];

let state = {
  members: JSON.parse(JSON.stringify(DEFAULT_MEMBERS)),
  drinks: DEFAULT_DRINKS,
  totalTallies: 0,
  totalEuros: 0,
  pricePerTally: 1.0,
  title: 'Karton Najaar 2026'
};

const processedEventIds = new Set();
let activeUser = null; // { id, name, pin }
let adminPassword = null;
let currentPendingAction = null;
let currentPinInput = '';
let selectedDrinkId = localStorage.getItem('ksa_selected_drink') || 'pintje';
let targetMemberForDrink = null;
let sseConnection = null;

// Audio context
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
}

function playMarkerSound(count = 1) {
  try {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.1);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.Q.setValueAtTime(2, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  } catch (e) {}
}

function playSuccessChime() {
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, now);
    osc.frequency.exponentialRampToValueAtTime(784, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  } catch (e) {}
}

function playErrorTone() {
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  } catch (e) {}
}

function triggerHaptic(type = 'light') {
  if (navigator.vibrate) {
    if (type === 'light') navigator.vibrate(12);
    else if (type === 'heavy') navigator.vibrate([25, 30, 25]);
    else if (type === 'error') navigator.vibrate([40, 50, 40]);
  }
}

// Permanent Cookie + LocalStorage persistence (10 years)
function setCookie(name, value, days = 3650) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (e) {}
}

function getCookie(name) {
  try {
    const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
    return matches ? decodeURIComponent(matches[1]) : null;
  } catch (e) {
    return null;
  }
}

function deleteCookie(name) {
  try {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch (e) {}
}

function loadStoredUser() {
  try {
    const rawLocal = localStorage.getItem('ksa_streep_active_user');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && parsed.id) return parsed;
    }
    const rawCookie = getCookie('ksa_user_session');
    if (rawCookie) {
      const parsed = JSON.parse(rawCookie);
      if (parsed && parsed.id) {
        localStorage.setItem('ksa_streep_active_user', rawCookie);
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

function saveStoredUser(userObj) {
  try {
    const str = JSON.stringify(userObj);
    localStorage.setItem('ksa_streep_active_user', str);
    setCookie('ksa_user_session', str, 3650);
    activeUser = userObj;
    updateMyQuickBanner();
  } catch (e) {}
}

function clearStoredUser() {
  try {
    localStorage.removeItem('ksa_streep_active_user');
    deleteCookie('ksa_user_session');
    activeUser = null;
    updateMyQuickBanner();
  } catch (e) {}
}

function getSelectedDrink() {
  return state.drinks.find(d => d.id === selectedDrinkId) || state.drinks[0];
}

function updateDrinkSelectorUI() {
  const current = getSelectedDrink();
  const badge = document.getElementById('currentDrinkBadge');
  const quickLabel = document.getElementById('quickAddLabel');

  if (badge) {
    badge.textContent = `${current.name} ${current.icon} (wijzig)`;
  }
  if (quickLabel) {
    quickLabel.textContent = `${current.icon} +1 ${current.name}`;
  }
}

function updateMyQuickBanner() {
  const nameEl = document.getElementById('myUserName');
  const countEl = document.getElementById('myUserCount');
  const actionRow = document.getElementById('myActionRow');
  const choiceBtn = document.getElementById('btnMyQuickChoice');

  updateDrinkSelectorUI();

  if (activeUser && state.members) {
    const member = state.members.find(m => m.id === activeUser.id);
    if (member) {
      nameEl.textContent = member.name;
      const euro = (member.tallies * (state.pricePerTally || 1.0)).toFixed(2).replace('.', ',');
      countEl.textContent = `${member.tallies} strepen (€ ${euro})`;
      actionRow.style.opacity = '1';
      actionRow.style.pointerEvents = 'auto';
      choiceBtn.style.opacity = '1';
      choiceBtn.style.pointerEvents = 'auto';
      return;
    }
  }

  nameEl.textContent = 'Kies wie je bent';
  countEl.textContent = 'Tik om te kiezen';
  actionRow.style.opacity = '0.4';
  actionRow.style.pointerEvents = 'none';
  choiceBtn.style.opacity = '0.5';
}

function updateAdminBar() {
  const bar = document.getElementById('adminActiveBar');
  bar.style.display = adminPassword ? 'flex' : 'none';
}

function recalculateState() {
  state.totalTallies = state.members.reduce((sum, m) => sum + (m.tallies || 0), 0);
  state.totalEuros = state.totalTallies * (state.pricePerTally || 1.0);
}

function saveLocalState() {
  try {
    localStorage.setItem('ksa_streep_karton_cache', JSON.stringify(state));
  } catch (e) {}
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem('ksa_streep_karton_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.members && parsed.members.length > 0) {
        state = parsed;
        // Ensure Cara Rouge is present in loaded state
        if (!state.drinks.some(d => d.id === 'cara_rouge')) {
          state.drinks.splice(1, 0, { id: 'cara_rouge', name: 'Cara Rouge', icon: '🍒', price: 1.0 });
        }
      }
    }
  } catch (e) {}
}

// Render Mini Leaderboard (Top 3)
function renderMiniLeaderboard() {
  const container = document.getElementById('podiumContent');
  if (!container) return;

  const sorted = [...state.members]
    .filter(m => (m.tallies || 0) > 0)
    .sort((a, b) => (b.tallies || 0) - (a.tallies || 0));

  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="podium-empty-hint">
        🍺 De strijd om de Gouden Pint ligt nog open! Trek het eerste streepje!
      </div>
    `;
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  const titles = ['1ste', '2de', '3de'];
  let html = '';

  for (let i = 0; i < 3; i++) {
    const member = sorted[i];
    if (member) {
      html += `
        <div class="podium-pill ${i === 0 ? 'rank-1' : ''}" onclick="window.app.quickAddOne('${member.id}')">
          <span class="podium-medal">${medals[i]}</span>
          <span class="podium-name">${member.name}</span>
          <span class="podium-count">${member.tallies} strepen</span>
        </div>
      `;
    } else {
      html += `
        <div class="podium-pill" style="opacity: 0.5;">
          <span class="podium-medal">${medals[i]}</span>
          <span class="podium-name" style="font-size: 11px;">Nog vrij</span>
          <span class="podium-count">0</span>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}

// Apply a cloud event to state
function applySyncEvent(ev, isLocalOrigin = false) {
  if (!ev || !ev.eventId) return false;
  if (processedEventIds.has(ev.eventId)) return false;
  processedEventIds.add(ev.eventId);

  let stateChanged = false;

  switch (ev.type) {
    case 'tally': {
      const member = state.members.find(m => m.id === ev.memberId);
      if (member) {
        const count = ev.count || 1;
        member.tallies = Math.max(0, (member.tallies || 0) + count);
        if (!member.drinks) member.drinks = {};
        const drinkId = ev.drinkId || 'pintje';
        member.drinks[drinkId] = Math.max(0, (member.drinks[drinkId] || 0) + count);
        stateChanged = true;
        if (!isLocalOrigin) playMarkerSound(count);
      }
      break;
    }
    case 'set_pin': {
      const member = state.members.find(m => m.id === ev.memberId);
      if (member) {
        member.hasPin = true;
        member.pinHash = ev.pinHash;
        stateChanged = true;
      }
      break;
    }
    case 'reset_pin': {
      const member = state.members.find(m => m.id === ev.memberId);
      if (member) {
        member.hasPin = false;
        member.pinHash = '';
        stateChanged = true;
      }
      break;
    }
    case 'set_tallies': {
      const member = state.members.find(m => m.id === ev.memberId);
      if (member) {
        member.tallies = Math.max(0, ev.tallies);
        stateChanged = true;
      }
      break;
    }
    case 'add_member': {
      if (!state.members.some(m => m.id === ev.member.id)) {
        state.members.push(ev.member);
        stateChanged = true;
      }
      break;
    }
    case 'remove_member': {
      state.members = state.members.filter(m => m.id !== ev.memberId);
      stateChanged = true;
      break;
    }
    case 'clear_all': {
      state.members.forEach(m => {
        m.tallies = 0;
        m.drinks = {};
      });
      stateChanged = true;
      break;
    }
    case 'new_karton': {
      state.title = ev.title || state.title;
      state.members.forEach(m => {
        m.tallies = 0;
        m.drinks = {};
      });
      stateChanged = true;
      break;
    }
  }

  if (stateChanged) {
    recalculateState();
    saveLocalState();
    renderMembers();
    renderStats();
    renderSettle();
    renderAdminMemberList();
    renderMiniLeaderboard();
  }
  return stateChanged;
}

// Publish an event to ntfy.sh cloud bus
async function publishCloudEvent(ev) {
  ev.eventId = ev.eventId || ('ev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
  ev.timestamp = Date.now();

  applySyncEvent(ev, true);

  try {
    await fetch(`https://ntfy.sh/${encodeURIComponent(CLOUD_CHANNEL)}`, {
      method: 'POST',
      body: JSON.stringify(ev),
      headers: { 'Title': 'KSA Streep' }
    });
  } catch (e) {
    console.warn('Kon event niet naar ntfy sturen:', e);
  }
}

// Connect to live SSE stream on ntfy.sh
function connectCloudSync() {
  if (sseConnection) return;
  const sseUrl = `https://ntfy.sh/${encodeURIComponent(CLOUD_CHANNEL)}/sse`;

  try {
    sseConnection = new EventSource(sseUrl);

    sseConnection.onopen = () => {
      document.getElementById('statusDot').classList.remove('offline');
      document.getElementById('cloudSyncBanner').style.display = 'flex';
    };

    sseConnection.onmessage = (e) => {
      try {
        const envelope = JSON.parse(e.data);
        if (envelope.event === 'message' && envelope.message) {
          const payload = JSON.parse(envelope.message);
          applySyncEvent(payload, false);
        }
      } catch (err) {}
    };

    sseConnection.onerror = () => {
      document.getElementById('statusDot').classList.add('offline');
      if (sseConnection) {
        sseConnection.close();
        sseConnection = null;
      }
      setTimeout(connectCloudSync, 4000);
    };
  } catch (e) {
    setTimeout(connectCloudSync, 5000);
  }
}

async function fetchCloudHistory() {
  try {
    const res = await fetch(`https://ntfy.sh/${encodeURIComponent(CLOUD_CHANNEL)}/json?poll=1&since=30d`);
    if (!res.ok) return;
    const text = await res.text();
    const lines = text.split('\n').filter(l => l.trim().length > 0);

    lines.forEach(line => {
      try {
        const envelope = JSON.parse(line);
        if (envelope.message) {
          const ev = JSON.parse(envelope.message);
          applySyncEvent(ev, false);
        }
      } catch (e) {}
    });
  } catch (e) {}
}

// Compact Turven SVG Generator
function renderTurvenSvgCompact(tallyCount, seed = 0) {
  if (!tallyCount || tallyCount <= 0) {
    return '<span class="no-strepen-hint">Geen streepjes</span>';
  }

  const fullFives = Math.floor(tallyCount / 5);
  const remainder = tallyCount % 5;
  let html = '';

  function getJitter(s, idx, offset) {
    const x = Math.sin(s * 7919 + idx * 37 + offset) * 10000;
    return (x - Math.floor(x)) * 2 - 1;
  }

  for (let g = 0; g < fullFives; g++) {
    let paths = '';
    const xVals = [5, 11, 17, 23];
    xVals.forEach((baseX, i) => {
      const jx = getJitter(seed, g * 5 + i, 1) * 0.9;
      paths += `<path class="tally-stroke-mini" d="M ${(baseX + jx).toFixed(1)} 3 L ${(baseX - jx * 0.5).toFixed(1)} 23" />`;
    });

    const dj1 = getJitter(seed, g, 4) * 0.9;
    const diagX1 = (2 + dj1).toFixed(1);
    const diagX2 = (27 - dj1).toFixed(1);
    paths += `<path class="tally-diag-mini" d="M ${diagX1} 21 L ${diagX2} 5" />`;

    html += `
      <div class="turf-group-mini" title="5 streepjes">
        <svg viewBox="0 0 29 26">
          ${paths}
        </svg>
      </div>
    `;
  }

  if (remainder > 0) {
    let paths = '';
    const xVals = [5, 11, 17, 23];
    for (let r = 0; r < remainder; r++) {
      const baseX = xVals[r];
      const jx = getJitter(seed, fullFives * 5 + r, 1) * 0.9;
      paths += `<path class="tally-stroke-mini" d="M ${(baseX + jx).toFixed(1)} 3 L ${(baseX - jx * 0.5).toFixed(1)} 23" />`;
    }

    const w = remainder * 6 + 7;
    html += `
      <div class="turf-group-mini" style="width: ${w}px;" title="${remainder} streepje(s)">
        <svg viewBox="0 0 ${w} 26">
          ${paths}
        </svg>
      </div>
    `;
  }

  return html;
}

// Render Compact Member Rows
function renderMembers() {
  const container = document.getElementById('membersRows');
  const search = (document.getElementById('searchInput').value || '').trim().toLowerCase();

  const filtered = state.members.filter(m => {
    if (!search) return true;
    return m.name.toLowerCase().includes(search);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: #886f54; font-size: 13px;">Geen leiding of bezoeker gevonden met '${search}'</div>`;
    return;
  }

  // Calculate ranks for medals
  const sortedRanks = [...state.members]
    .filter(m => (m.tallies || 0) > 0)
    .sort((a, b) => b.tallies - a.tallies);

  let html = '';
  filtered.forEach((m, idx) => {
    const isMe = activeUser && activeUser.id === m.id;
    const euro = (m.tallies * (state.pricePerTally || 1.0)).toFixed(2).replace('.', ',');
    const pinWarning = !m.hasPin ? `<span class="member-row-pin-status needs-setup">⚠️ Stel PIN in</span>` : '';

    // Show medal badge if top 3
    const rankIndex = sortedRanks.findIndex(r => r.id === m.id);
    let medalTag = '';
    if (rankIndex === 0) medalTag = '🥇 ';
    else if (rankIndex === 1) medalTag = '🥈 ';
    else if (rankIndex === 2) medalTag = '🥉 ';

    html += `
      <div class="member-row ${isMe ? 'is-current-user' : ''}" data-id="${m.id}">
        <div class="member-info-col" onclick="window.app.onMemberNameTap('${m.id}')">
          <span class="member-row-name">${medalTag}${m.name}</span>
          ${pinWarning}
        </div>

        <div class="member-turf-col" onclick="window.app.onMemberRowTap('${m.id}')">
          ${renderTurvenSvgCompact(m.tallies || 0, idx + 1)}
        </div>

        <div class="member-actions-col">
          <div class="member-count-badge" onclick="window.app.onMemberNameTap('${m.id}')">
            <span class="badge-count">${m.tallies}</span>
            <span class="badge-euro">€${euro}</span>
          </div>
          <button class="btn-row-add-pill" onclick="window.app.quickAddOne('${m.id}')" title="Streepje zetten">+1</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  recalculateState();
  document.getElementById('grandTallies').textContent = state.totalTallies || 0;
  document.getElementById('grandEuros').textContent = `€ ${((state.totalEuros || 0)).toFixed(0)}`;
  document.getElementById('boardTitle').textContent = state.title || 'Karton Najaar 2026';
  document.getElementById('memberCountHeader').textContent = `${state.members.length} Tellers`;

  updateMyQuickBanner();
  updateAdminBar();
  renderMiniLeaderboard();
}

// Render Admin Member Controls
function renderAdminMemberList() {
  const container = document.getElementById('adminMembersList');
  if (!container) return;

  let html = '';
  const sorted = [...state.members].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach(m => {
    html += `
      <div class="admin-member-row">
        <div>
          <strong class="font-marker" style="font-size: 16px;">${m.name}</strong>
          <div style="font-size: 11px; color: #705b45;">
            ${m.tallies} strepen (€${m.tallies}) • ${m.hasPin ? 'PIN Actief' : '<span style="color:red;">Geen PIN</span>'}
          </div>
        </div>
        <div style="display: flex; gap: 4px; align-items: center;">
          <button class="admin-btn-sm" onclick="window.app.adminTally('${m.id}', 1)">+1</button>
          <button class="admin-btn-sm" onclick="window.app.adminTally('${m.id}', -1)">-1</button>
          <button class="admin-btn-sm" onclick="window.app.adminTally('${m.id}', 5)">+5</button>
          <button class="admin-btn-sm" onclick="window.app.adminSetTalliesPrompt('${m.id}', ${m.tallies})">✏️</button>
          <button class="admin-btn-sm" style="color: #b91c1c;" onclick="window.app.adminResetPin('${m.id}')" title="Reset PIN">🔑</button>
          <button class="admin-btn-sm" style="color: #991b1b;" onclick="window.app.adminRemoveMember('${m.id}', '${m.name}')">✕</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Render Stats View
function renderStats() {
  const grid = document.getElementById('statsDrinksGrid');
  const drinkTotals = {};
  (state.drinks || []).forEach(d => { drinkTotals[d.id] = 0; });
  (state.members || []).forEach(m => {
    if (m.drinks) {
      Object.keys(m.drinks).forEach(dId => {
        drinkTotals[dId] = (drinkTotals[dId] || 0) + m.drinks[dId];
      });
    }
  });

  let html = '';
  (state.drinks || []).forEach(d => {
    const count = drinkTotals[d.id] || 0;
    html += `
      <div class="drink-pill-card">
        <span class="drink-pill-icon">${d.icon}</span>
        <div>
          <div class="drink-pill-name">${d.name}</div>
          <div class="drink-pill-price">${count}x geturfd (€${count})</div>
        </div>
      </div>
    `;
  });
  grid.innerHTML = html;

  const sorted = [...state.members].sort((a, b) => (b.tallies || 0) - (a.tallies || 0));
  const boardEl = document.getElementById('leaderboardList');
  let boardHtml = '';
  sorted.forEach((m, idx) => {
    const medals = ['🥇', '🥈', '🥉'];
    const rank = medals[idx] || `#${idx + 1}`;
    boardHtml += `
      <div style="display: flex; justify-content: space-between; padding: 8px 4px; border-bottom: 1px solid #ebd9c2; font-size: 14px;">
        <div><span>${rank}</span> <strong class="font-marker" style="margin-left: 6px;">${m.name}</strong></div>
        <div style="font-weight: 800; color: #0f356b;">${m.tallies} strepen</div>
      </div>
    `;
  });
  boardEl.innerHTML = boardHtml;
}

// Render Settlement View
function renderSettle() {
  const container = document.getElementById('settleList');
  let html = '';
  const sorted = [...state.members].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach(m => {
    const count = m.tallies || 0;
    html += `
      <div style="display: flex; justify-content: space-between; padding: 7px 4px; border-bottom: 1px solid #ebd9c2; font-size: 14px;">
        <span class="font-marker" style="font-size: 16px;">${m.name}</span>
        <span style="font-weight: 700; color: #8f1d1d;">${count} strepen = € ${count},00</span>
      </div>
    `;
  });

  html += `
    <div style="display: flex; justify-content: space-between; padding: 12px 4px 4px 4px; font-size: 16px; font-weight: 800; color: #8f1d1d;">
      <span>TOTAAL BORD</span>
      <span>${state.totalTallies} = € ${state.totalTallies},00</span>
    </div>
  `;
  container.innerHTML = html;
}

function showToast(text, icon = '🍺') {
  const el = document.getElementById('toastBar');
  document.getElementById('toastIcon').textContent = icon;
  document.getElementById('toastText').textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

// PDF Generation
function generatePdfReport() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDF bibliotheek aan het laden, probeer over enkele seconden opnieuw.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('KSA STREEPKARTON - TOTALE VERREKENING', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${state.title || 'Streepkarton'} | Datum opmaak: ${new Date().toLocaleDateString('nl-BE')} om ${new Date().toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`, 14, 21);

  doc.setFillColor(250, 243, 232);
  doc.setDrawColor(206, 183, 153);
  doc.roundedRect(14, 30, 182, 22, 3, 3, 'FD');

  doc.setTextColor(30, 26, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('FINANCIEEL OVERZICHT', 20, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Totaal Consumpties: ${state.totalTallies} streepjes (1 streep = € 1,00)`, 20, 46);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.setFontSize(14);
  doc.text(`TOTAAL TE ONTVANGEN: € ${state.totalTallies},00`, 110, 42);

  const sorted = [...state.members].sort((a, b) => a.name.localeCompare(b.name));
  const tableData = sorted.map((m, idx) => [
    idx + 1,
    m.name,
    m.tallies || 0,
    `€ ${(m.tallies || 0).toFixed(2).replace('.', ',')}`,
    '[  ] Betaald'
  ]);

  doc.autoTable({
    startY: 57,
    head: [['Nr.', 'Naam Leiding / Bezoeker', 'Aantal Strepen', 'Te Betalen', 'Handtekening / Betaald']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [185, 28, 28],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: { fontSize: 9, textColor: [30, 26, 22] },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 55, fontStyle: 'bold' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 45, halign: 'center' }
    },
    foot: [['', 'TOTAAL BORD', String(state.totalTallies), `€ ${state.totalTallies},00`, '']],
    footStyles: {
      fillColor: [244, 232, 213],
      textColor: [185, 28, 28],
      fontStyle: 'bold',
      fontSize: 10
    }
  });

  const finalY = doc.lastAutoTable.finalY || 240;
  doc.setTextColor(100, 80, 60);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Gelieve het openstaande bedrag over te schrijven naar de KSA leidingrekening of via Payconiq.', 14, Math.min(285, finalY + 10));

  const filename = `KSA_Streepkarton_Afrekening_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  showToast('PDF Verrekening gedownload! 📄', '📄');
}

// Actions triggered by user interface
window.app = {
  selectDrinkItem: (id) => {
    selectedDrinkId = id;
    localStorage.setItem('ksa_selected_drink', id);
    updateDrinkSelectorUI();
    openDrinkPicker(targetMemberForDrink);
  },

  onSelectUserChoice: (memberId) => {
    closeSelectUserModal();
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    if (!member.hasPin) {
      openSetupPinModal(memberId);
    } else {
      openPinModal({
        type: 'setActiveUser',
        memberId: member.id,
        memberName: member.name
      });
    }
  },

  quickAddOne: (memberId) => {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;

    const currentDrink = getSelectedDrink();

    if (adminPassword) {
      window.app.adminTally(memberId, 1);
      return;
    }

    if (activeUser && activeUser.id === memberId) {
      directTally(memberId, 1, currentDrink.id, member.name, currentDrink.name);
      return;
    }

    if (!member.hasPin) {
      openSetupPinModal(memberId);
      return;
    }

    openPinModal({
      type: 'tally',
      memberId: member.id,
      memberName: member.name,
      count: 1,
      drinkId: currentDrink.id,
      drinkName: currentDrink.name
    });
  },

  onMemberNameTap: (memberId) => {
    if (adminPassword) {
      window.app.adminTally(memberId, 1);
      return;
    }
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;
    if (!member.hasPin) {
      openSetupPinModal(memberId);
      return;
    }
    openDrinkPicker(memberId);
  },

  onMemberRowTap: (memberId) => {
    window.app.quickAddOne(memberId);
  },

  adminTally: async (memberId, count) => {
    if (!adminPassword) return;
    const currentDrink = getSelectedDrink();
    publishCloudEvent({
      type: 'tally',
      memberId,
      count,
      drinkId: currentDrink.id
    });
    playMarkerSound(count);
    triggerHaptic('heavy');
    showToast(`${count > 0 ? '+' + count : count} streep voor lid (Admin)`, '🔑');
  },

  adminSetTalliesPrompt: async (memberId, currentVal) => {
    const input = prompt(`Voer het exacte aantal streepjes in voor dit lid:`, currentVal);
    if (input === null) return;
    const count = parseInt(input, 10);
    if (isNaN(count) || count < 0) return;

    publishCloudEvent({
      type: 'set_tallies',
      memberId,
      tallies: count
    });
    showToast('Strepen aangepast!', '✏️');
  },

  adminResetPin: async (memberId) => {
    if (!confirm('Pincode van dit lid resetten?')) return;
    publishCloudEvent({
      type: 'reset_pin',
      memberId
    });
    showToast('Pincode gereset!', '🔑');
  },

  adminRemoveMember: async (memberId, name) => {
    if (!confirm(`'${name}' van het karton verwijderen?`)) return;
    publishCloudEvent({
      type: 'remove_member',
      memberId
    });
    showToast(`${name} verwijderd`, '🗑️');
  }
};

// Modals
function openSelectUserModal() {
  const list = document.getElementById('selectUserList');
  let html = '';
  const sorted = [...state.members].sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach(m => {
    html += `
      <button class="keypad-btn" style="padding: 12px 8px; font-size: 15px; font-weight: 700; border-radius: 14px;" onclick="window.app.onSelectUserChoice('${m.id}')">
        ${m.name}
      </button>
    `;
  });
  list.innerHTML = html;
  document.getElementById('selectUserModal').classList.add('open');
}

function closeSelectUserModal() {
  document.getElementById('selectUserModal').classList.remove('open');
}

function openAddVisitorModal() {
  document.getElementById('inputVisitorName').value = '';
  document.getElementById('addVisitorModal').classList.add('open');
  setTimeout(() => document.getElementById('inputVisitorName').focus(), 150);
}

function closeAddVisitorModal() {
  document.getElementById('addVisitorModal').classList.remove('open');
}

function openPinModal(action) {
  currentPendingAction = action;
  currentPinInput = '';
  updatePinDots();

  const member = state.members.find(m => m.id === action.memberId);
  document.getElementById('pinTargetName').textContent = member ? member.name : 'Leiding';

  if (action.type === 'setActiveUser') {
    document.getElementById('pinTargetSub').textContent = `Geef je pincode in om in te loggen als ${member.name}`;
  } else if (action.count === 5) {
    document.getElementById('pinTargetSub').textContent = `Pincode van ${member.name} voor ⚡ 5 strepen`;
  } else {
    document.getElementById('pinTargetSub').textContent = `Pincode van ${member.name} (+${action.count || 1} ${action.drinkName || 'drank'})`;
  }

  document.getElementById('pinModal').classList.add('open');
}

function closePinModal() {
  document.getElementById('pinModal').classList.remove('open');
  currentPendingAction = null;
  currentPinInput = '';
}

function updatePinDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`dot${i}`);
    if (i < currentPinInput.length) dot.classList.add('filled');
    else dot.classList.remove('filled');
  }
}

function handleKeypadTap(num) {
  triggerHaptic('light');
  if (currentPinInput.length < 4) {
    currentPinInput += String(num);
    updatePinDots();
    if (currentPinInput.length === 4) {
      setTimeout(() => submitPinAction(currentPinInput), 80);
    }
  }
}

async function submitPinAction(pin) {
  if (!currentPendingAction) return;
  const action = currentPendingAction;

  if (action.type === 'setActiveUser') {
    saveStoredUser({ id: action.memberId, name: action.memberName, pin });
    playSuccessChime();
    showToast(`Ingelogd als ${action.memberName}!`, '👋');
    closePinModal();
    renderMembers();
    return;
  }

  const currentDrink = getSelectedDrink();

  publishCloudEvent({
    type: 'tally',
    memberId: action.memberId,
    count: action.count || 1,
    drinkId: action.drinkId || currentDrink.id
  });

  playMarkerSound(action.count || 1);
  triggerHaptic('heavy');
  showToast(`+${action.count || 1} streep voor ${action.memberName}!`, '✍️');
  closePinModal();
}

function handlePinError(message) {
  playErrorTone();
  triggerHaptic('error');
  const sheet = document.getElementById('pinSheet');
  sheet.classList.add('shake');
  setTimeout(() => sheet.classList.remove('shake'), 400);
  currentPinInput = '';
  updatePinDots();
  showToast(message, '❌');
}

// PIN Setup Modal
let pendingSetupMemberId = null;
function openSetupPinModal(memberId) {
  pendingSetupMemberId = memberId;
  const member = state.members.find(m => m.id === memberId);
  document.getElementById('setupTargetName').textContent = member ? member.name : '';
  document.getElementById('inputNewPin').value = '';
  document.getElementById('inputConfirmPin').value = '';
  document.getElementById('setupPinModal').classList.add('open');
}

function closeSetupPinModal() {
  document.getElementById('setupPinModal').classList.remove('open');
  pendingSetupMemberId = null;
}

async function submitNewPin() {
  const pin1 = document.getElementById('inputNewPin').value.trim();
  const pin2 = document.getElementById('inputConfirmPin').value.trim();

  if (pin1.length !== 4 || !/^\d{4}$/.test(pin1)) {
    alert('Pincode moet 4 cijfers zijn!');
    return;
  }
  if (pin1 !== pin2) {
    alert('Pincodes komen niet overeen!');
    return;
  }

  const member = state.members.find(m => m.id === pendingSetupMemberId);
  if (member) {
    publishCloudEvent({
      type: 'set_pin',
      memberId: pendingSetupMemberId,
      pinHash: pin1
    });

    saveStoredUser({ id: member.id, name: member.name, pin: pin1 });
  }

  playSuccessChime();
  showToast('Pincode ingesteld en onthouden!', '🔒');
  closeSetupPinModal();
  renderMembers();
}

// Drink Modal
function openDrinkPicker(memberId) {
  targetMemberForDrink = memberId;
  const member = state.members.find(m => m.id === memberId);
  document.getElementById('drinkTargetName').textContent = member ? member.name : (activeUser ? activeUser.name : 'Leiding');

  const grid = document.getElementById('drinksListGrid');
  let html = '';
  (state.drinks || []).forEach(d => {
    const sel = d.id === selectedDrinkId ? 'selected' : '';
    html += `
      <div class="drink-pill-card ${sel}" onclick="window.app.selectDrinkItem('${d.id}')">
        <span class="drink-pill-icon">${d.icon}</span>
        <div>
          <div class="drink-pill-name">${d.name}</div>
          <div class="drink-pill-price">€ 1,00</div>
        </div>
      </div>
    `;
  });
  grid.innerHTML = html;
  document.getElementById('drinkModal').classList.add('open');
}

function closeDrinkModal() {
  document.getElementById('drinkModal').classList.remove('open');
  targetMemberForDrink = null;
}

function directTally(memberId, count, drinkId, memberName, drinkName) {
  publishCloudEvent({
    type: 'tally',
    memberId,
    count,
    drinkId
  });
  playMarkerSound(count);
  triggerHaptic('heavy');
  showToast(`+${count} ${drinkName || 'drank'} voor ${memberName}!`, '✍️');
}

// Initial Loading
async function initApp() {
  loadLocalState();
  activeUser = loadStoredUser();
  adminPassword = sessionStorage.getItem('ksa_admin_password') || null;

  renderMembers();
  renderStats();
  renderSettle();
  renderAdminMemberList();
  renderMiniLeaderboard();
  updateDrinkSelectorUI();

  if (!activeUser && !adminPassword) {
    setTimeout(openSelectUserModal, 500);
  }

  connectCloudSync();
  fetchCloudHistory();

  document.getElementById('qrUrlLink').href = window.location.href;
  document.getElementById('qrUrlLink').textContent = window.location.href;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initApp();

  document.getElementById('searchInput').addEventListener('input', renderMembers);
  document.getElementById('btnSwitchUser').addEventListener('click', openSelectUserModal);
  document.getElementById('btnCloseSelectUser').addEventListener('click', closeSelectUserModal);

  // Add Visitor Modal
  document.getElementById('btnOpenAddVisitor').addEventListener('click', openAddVisitorModal);
  document.getElementById('btnCloseAddVisitor').addEventListener('click', closeAddVisitorModal);

  document.getElementById('btnSubmitAddVisitor').addEventListener('click', () => {
    const name = document.getElementById('inputVisitorName').value.trim();
    if (!name) {
      alert('Vul een naam in');
      return;
    }

    publishCloudEvent({
      type: 'add_member',
      member: {
        id: 'm_' + Date.now(),
        name: name,
        hasPin: false,
        tallies: 0,
        drinks: {},
        isVisitor: true
      }
    });

    closeAddVisitorModal();
    playSuccessChime();
    showToast(`${name} toegevoegd!`, '➕');
  });

  // Dedicated Drink Selector Button in Quick Bar
  document.getElementById('btnMyQuickChoice').addEventListener('click', () => {
    openDrinkPicker(activeUser ? activeUser.id : null);
  });

  // Quick Action Buttons (1-TAP ON PHONE)
  document.getElementById('btnMyQuickBeer').addEventListener('click', () => {
    if (activeUser) {
      const current = getSelectedDrink();
      directTally(activeUser.id, 1, current.id, activeUser.name, current.name);
    } else {
      openSelectUserModal();
    }
  });

  document.getElementById('btnMyQuickFive').addEventListener('click', () => {
    if (activeUser) {
      const current = getSelectedDrink();
      directTally(activeUser.id, 5, current.id, activeUser.name, current.name);
    } else {
      openSelectUserModal();
    }
  });

  // Drink modal actions
  document.getElementById('btnConfirmDrinkOne').addEventListener('click', () => {
    const memId = targetMemberForDrink || (activeUser ? activeUser.id : null);
    if (!memId) {
      closeDrinkModal();
      return;
    }
    const current = getSelectedDrink();
    closeDrinkModal();

    if (adminPassword) {
      window.app.adminTally(memId, 1);
      return;
    }

    if (activeUser && activeUser.id === memId) {
      directTally(memId, 1, current.id, activeUser.name, current.name);
    } else {
      const mem = state.members.find(m => m.id === memId);
      openPinModal({
        type: 'tally',
        memberId: memId,
        memberName: mem ? mem.name : '',
        count: 1,
        drinkId: current.id,
        drinkName: current.name
      });
    }
  });

  document.getElementById('btnConfirmDrinkFive').addEventListener('click', () => {
    const memId = targetMemberForDrink || (activeUser ? activeUser.id : null);
    if (!memId) {
      closeDrinkModal();
      return;
    }
    const current = getSelectedDrink();
    closeDrinkModal();

    if (adminPassword) {
      window.app.adminTally(memId, 5);
      return;
    }

    if (activeUser && activeUser.id === memId) {
      directTally(memId, 5, current.id, activeUser.name, current.name);
    } else {
      const mem = state.members.find(m => m.id === memId);
      openPinModal({
        type: 'tally',
        memberId: memId,
        memberName: mem ? mem.name : '',
        count: 5,
        drinkId: current.id,
        drinkName: current.name
      });
    }
  });

  // Tab navigation
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic('light');
      const targetId = btn.getAttribute('data-tab');

      if (targetId === 'tabAdmin' && !adminPassword) {
        document.getElementById('adminLoginModal').classList.add('open');
        return;
      }

      document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      ['tabKarton', 'tabStats', 'tabSettle', 'tabAdmin', 'tabConnect'].forEach(id => {
        document.getElementById(id).style.display = id === targetId ? 'block' : 'none';
      });

      if (targetId === 'tabStats') renderStats();
      if (targetId === 'tabSettle') renderSettle();
      if (targetId === 'tabAdmin') renderAdminMemberList();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.getElementById('btnHeaderAdmin').addEventListener('click', () => {
    if (adminPassword) {
      document.getElementById('navBtnAdmin').click();
    } else {
      document.getElementById('adminLoginModal').classList.add('open');
    }
  });

  document.getElementById('btnCloseAdminLogin').addEventListener('click', () => {
    document.getElementById('adminLoginModal').classList.remove('open');
  });

  document.getElementById('btnSubmitAdminLogin').addEventListener('click', () => {
    const pwd = document.getElementById('inputAdminPassword').value.trim();
    if (!pwd) return;

    if (pwd === 'ksa' || pwd === 'admin') {
      adminPassword = pwd;
      sessionStorage.setItem('ksa_admin_password', pwd);
      document.getElementById('adminLoginModal').classList.remove('open');
      showToast('Admin ingelogd! 🔑', '🔑');
      updateAdminBar();
      document.getElementById('navBtnAdmin').click();
    } else {
      alert('Verkeerd admin wachtwoord! (Standaard: ksa)');
    }
  });

  document.getElementById('btnExitAdmin').addEventListener('click', () => {
    adminPassword = null;
    sessionStorage.removeItem('ksa_admin_password');
    updateAdminBar();
    showToast('Admin afgesloten', '🔒');
    document.querySelector('.nav-tab-btn[data-tab="tabKarton"]').click();
  });

  document.getElementById('btnAdminClearAll').addEventListener('click', async () => {
    const confirmation = prompt('Typ "WIS ALLES" om te bevestigen dat je alle strepen naar 0 wil resetten:');
    if (confirmation !== 'WIS ALLES') return;

    publishCloudEvent({ type: 'clear_all' });
    showToast('Alle streepjes gewist naar 0! 🗑️', '🗑️');
  });

  document.getElementById('btnAddMemberSubmit').addEventListener('click', () => {
    const name = document.getElementById('inputNewMemberName').value.trim();
    if (!name) return;

    publishCloudEvent({
      type: 'add_member',
      member: {
        id: 'm_' + Date.now(),
        name,
        hasPin: false,
        tallies: 0,
        drinks: {}
      }
    });

    document.getElementById('inputNewMemberName').value = '';
    showToast(`${name} toegevoegd!`, '➕');
  });

  // PDF Downloads
  document.getElementById('btnDownloadPdf').addEventListener('click', generatePdfReport);
  document.getElementById('btnAdminDownloadPdf').addEventListener('click', generatePdfReport);

  // Keypad
  document.querySelectorAll('.keypad-btn[data-num]').forEach(btn => {
    btn.addEventListener('click', () => handleKeypadTap(btn.getAttribute('data-num')));
  });

  document.getElementById('btnKeypadClear').addEventListener('click', () => {
    triggerHaptic('light');
    currentPinInput = '';
    updatePinDots();
  });

  document.getElementById('btnKeypadBack').addEventListener('click', () => {
    triggerHaptic('light');
    if (currentPinInput.length > 0) {
      currentPinInput = currentPinInput.slice(0, -1);
      updatePinDots();
    }
  });

  document.getElementById('btnClosePinModal').addEventListener('click', closePinModal);
  document.getElementById('btnCloseSetupPin').addEventListener('click', closeSetupPinModal);
  document.getElementById('btnSubmitNewPin').addEventListener('click', submitNewPin);
  document.getElementById('btnCloseDrinkModal').addEventListener('click', closeDrinkModal);

  // WhatsApp
  document.getElementById('btnShareWhatsApp').addEventListener('click', () => {
    let msg = `🍺 *KSA STREEPKARTON AFREKENING*\n`;
    msg += `Totaal: *${state.totalTallies} strepen* (= € ${state.totalTallies},00)\n`;
    msg += `--------------------------------\n`;

    const activeList = [...state.members].filter(m => (m.tallies || 0) > 0).sort((a, b) => b.tallies - a.tallies);
    activeList.forEach(m => {
      msg += `• *${m.name}*: ${m.tallies} strepen (€ ${m.tallies},00)\n`;
    });

    msg += `--------------------------------\n`;
    msg += `Gelieve te betalen via overschrijving of Payconiq! 🍻`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  });

  // Reset Karton
  document.getElementById('btnNewKarton').addEventListener('click', () => {
    const title = prompt('Naam voor het nieuwe karton:', 'Karton ' + new Date().toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' }));
    if (!title) return;
    if (!confirm('Huidig karton archiveren en alle streepjes resetten naar 0?')) return;

    publishCloudEvent({ type: 'new_karton', title });
    showToast('Nieuw karton gestart!', '📦');
    document.querySelector('.nav-tab-btn[data-tab="tabKarton"]').click();
  });
});
