// KSA Streepkarton - Sleek & Ultra-Fast Mobile Client

let state = {
  members: [],
  drinks: [],
  totalTallies: 0,
  totalEuros: 0,
  pricePerTally: 1.0,
  title: 'Karton Najaar 2026'
};

let activeUser = null; // { id, name, pin }
let currentPendingAction = null; // for proxy tally or PIN setup
let currentPinInput = '';
let selectedDrinkId = 'pintje';
let targetMemberForDrink = null;
let ws = null;
let reconnectTimer = null;

// Audio context for haptic sound
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

// Session Persistence
function loadStoredUser() {
  try {
    const raw = localStorage.getItem('ksa_streep_active_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveStoredUser(userObj) {
  try {
    localStorage.setItem('ksa_streep_active_user', JSON.stringify(userObj));
    activeUser = userObj;
    updateMyQuickBanner();
  } catch (e) {}
}

function clearStoredUser() {
  try {
    localStorage.removeItem('ksa_streep_active_user');
    activeUser = null;
    updateMyQuickBanner();
  } catch (e) {}
}

function updateMyQuickBanner() {
  const nameEl = document.getElementById('myUserName');
  const countEl = document.getElementById('myUserCount');
  const actionRow = document.getElementById('myActionRow');

  if (activeUser && state.members) {
    const member = state.members.find(m => m.id === activeUser.id);
    if (member) {
      nameEl.textContent = member.name;
      const euro = (member.tallies * (state.pricePerTally || 1.0)).toFixed(2).replace('.', ',');
      countEl.textContent = `${member.tallies} strepen (€ ${euro})`;
      actionRow.style.opacity = '1';
      actionRow.style.pointerEvents = 'auto';
      return;
    }
  }

  nameEl.textContent = 'Kies wie je bent';
  countEl.textContent = 'Tik om te kiezen';
  actionRow.style.opacity = '0.4';
  actionRow.style.pointerEvents = 'none';
}

// Compact Turven SVG Generator (Blocks of 5)
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

  // Draw 5-blocks
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

  // Draw remainder
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
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: #886f54; font-size: 13px;">Geen leiding gevonden met '${search}'</div>`;
    return;
  }

  let html = '';
  filtered.forEach((m, idx) => {
    const isMe = activeUser && activeUser.id === m.id;
    const euro = (m.tallies * (state.pricePerTally || 1.0)).toFixed(2).replace('.', ',');
    const pinWarning = !m.hasPin ? `<span class="member-row-pin-status needs-setup">⚠️ Stel PIN in</span>` : '';

    html += `
      <div class="member-row ${isMe ? 'is-current-user' : ''}" data-id="${m.id}">
        <div class="member-info-col" onclick="window.app.onMemberNameTap('${m.id}')">
          <span class="member-row-name">${m.name}</span>
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
          <button class="btn-row-add" onclick="window.app.quickAddOne('${m.id}')" title="Streepje zetten">+1</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Header totals
  document.getElementById('grandTallies').textContent = state.totalTallies || 0;
  document.getElementById('grandEuros').textContent = `€ ${((state.totalEuros || 0)).toFixed(0)}`;
  document.getElementById('boardTitle').textContent = state.title || 'Karton Najaar 2026';

  updateMyQuickBanner();
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
      <div class="drink-pill">
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
  sorted.slice(0, 10).forEach((m, idx) => {
    const medals = ['🥇', '🥈', '🥉'];
    const rank = medals[idx] || `#${idx + 1}`;
    boardHtml += `
      <div style="display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #ebd9c2; font-size: 14px;">
        <div><span>${rank}</span> <strong class="font-marker" style="margin-left: 6px;">${m.name}</strong></div>
        <div style="font-weight: 700; color: #0f356b;">${m.tallies} strepen</div>
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
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ebd9c2; font-size: 14px;">
        <span class="font-marker" style="font-size: 16px;">${m.name}</span>
        <span style="font-weight: 700; color: #8f1d1d;">${count} strepen = € ${count},00</span>
      </div>
    `;
  });

  html += `
    <div style="display: flex; justify-content: space-between; padding: 10px 0 4px 0; font-size: 16px; font-weight: 800; color: #8f1d1d;">
      <span>TOTAAL BORD</span>
      <span>${state.totalTallies} = € ${state.totalTallies},00</span>
    </div>
  `;
  container.innerHTML = html;
}

// Toast notice
function showToast(text, icon = '🍺') {
  const el = document.getElementById('toastBar');
  document.getElementById('toastIcon').textContent = icon;
  document.getElementById('toastText').textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

// User Selection Modal
function openSelectUserModal() {
  const list = document.getElementById('selectUserList');
  let html = '';
  const sorted = [...state.members].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach(m => {
    html += `
      <button class="keypad-btn" style="padding: 10px 6px; font-size: 15px; font-weight: 700;" onclick="window.app.onSelectUserChoice('${m.id}')">
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

// PIN Keypad Management
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
    document.getElementById('pinTargetSub').textContent = `Pincode van ${member.name} (+${action.count || 1} ${action.drinkName || 'pint'})`;
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
    // Verify PIN before saving as active user
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: action.memberId, pin })
      });
      const data = await res.json();
      if (!data.valid) {
        handlePinError('Foutieve pincode');
        return;
      }
      saveStoredUser({ id: action.memberId, name: action.memberName, pin });
      playSuccessChime();
      showToast(`Ingelogd als ${action.memberName}!`, '👋');
      closePinModal();
      renderMembers();
    } catch (e) {
      handlePinError('Verbindingsfout');
    }
    return;
  }

  // Tally action (for self or friend proxy)
  try {
    const res = await fetch('/api/tally', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: action.memberId,
        count: action.count || 1,
        drinkId: action.drinkId || 'pintje',
        pin
      })
    });
    const data = await res.json();
    if (!res.ok) {
      handlePinError(data.error || 'Foutieve pincode');
      return;
    }

    playMarkerSound(action.count || 1);
    triggerHaptic('heavy');
    showToast(`+${action.count || 1} streep voor ${action.memberName}!`, '✍️');
    closePinModal();
  } catch (e) {
    handlePinError('Verbindingsfout');
  }
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

  try {
    const res = await fetch('/api/set-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: pendingSetupMemberId, pin: pin1 })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Fout');
      return;
    }

    const member = state.members.find(m => m.id === pendingSetupMemberId);
    if (member) {
      saveStoredUser({ id: member.id, name: member.name, pin: pin1 });
    }
    playSuccessChime();
    showToast('Pincode ingesteld!', '🔒');
    closeSetupPinModal();
    renderMembers();
  } catch (e) {
    alert('Fout bij opslaan pincode');
  }
}

// Drink Modal
function openDrinkPicker(memberId) {
  targetMemberForDrink = memberId;
  const member = state.members.find(m => m.id === memberId);
  document.getElementById('drinkTargetName').textContent = member ? member.name : '';

  const grid = document.getElementById('drinksListGrid');
  let html = '';
  (state.drinks || []).forEach(d => {
    const sel = d.id === selectedDrinkId ? 'selected' : '';
    html += `
      <div class="drink-pill ${sel}" onclick="window.app.selectDrinkItem('${d.id}')">
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

// Core App Action Handlers
window.app = {
  selectDrinkItem: (id) => {
    selectedDrinkId = id;
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

    if (!member.hasPin) {
      openSetupPinModal(memberId);
      return;
    }

    // Fast 1-tap if active user matches
    if (activeUser && activeUser.id === memberId && activeUser.pin) {
      directTally(memberId, 1, 'pintje', activeUser.pin, member.name);
    } else {
      // Proxy tally for friend
      openPinModal({
        type: 'tally',
        memberId: member.id,
        memberName: member.name,
        count: 1,
        drinkId: 'pintje',
        drinkName: 'pint'
      });
    }
  },

  onMemberNameTap: (memberId) => {
    const member = state.members.find(m => m.id === memberId);
    if (!member) return;
    if (!member.hasPin) {
      openSetupPinModal(memberId);
      return;
    }
    // Open drink picker for this member
    openDrinkPicker(memberId);
  },

  onMemberRowTap: (memberId) => {
    window.app.quickAddOne(memberId);
  }
};

// Fast Direct Tally (Bypasses modal when active user is logged in)
async function directTally(memberId, count, drinkId, pin, memberName) {
  try {
    const res = await fetch('/api/tally', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, count, drinkId, pin })
    });
    const data = await res.json();
    if (!res.ok) {
      clearStoredUser();
      openPinModal({ type: 'tally', memberId, memberName, count, drinkId });
      return;
    }
    playMarkerSound(count);
    triggerHaptic('heavy');
    showToast(`+${count} streep voor ${memberName}!`, '✍️');
  } catch (e) {
    showToast('Verbindingsfout', '❌');
  }
}

// WebSocket Live Sync
function setupWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      document.getElementById('statusDot').classList.remove('offline');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.state) {
          state = msg.state;
          renderMembers();
          renderStats();
          renderSettle();
        }
        if (msg.type === 'TALLY_ADDED') {
          playMarkerSound(msg.count);
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      document.getElementById('statusDot').classList.add('offline');
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(setupWebSocket, 2000);
    };

    ws.onerror = () => ws.close();
  } catch (e) {
    setTimeout(setupWebSocket, 3000);
  }
}

// Initial Loading
async function initApp() {
  activeUser = loadStoredUser();

  try {
    const res = await fetch('/api/state');
    if (res.ok) {
      state = await res.json();
      renderMembers();
      renderStats();
      renderSettle();

      // If user hasn't selected who they are, prompt them cleanly
      if (!activeUser) {
        setTimeout(openSelectUserModal, 500);
      }
    }
  } catch (e) {}

  setupWebSocket();
  loadNetworkInfo();
}

async function loadNetworkInfo() {
  try {
    const res = await fetch('/api/network-info');
    if (res.ok) {
      const data = await res.json();
      if (data.qrCodeDataUrl) {
        document.getElementById('qrCodeImg').src = data.qrCodeDataUrl;
      }
      const link = document.getElementById('qrUrlLink');
      link.href = data.url;
      link.textContent = data.url;
    }
  } catch (e) {}
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initApp();

  // Search filter
  document.getElementById('searchInput').addEventListener('input', renderMembers);

  // Switch user
  document.getElementById('btnSwitchUser').addEventListener('click', openSelectUserModal);
  document.getElementById('btnCloseSelectUser').addEventListener('click', closeSelectUserModal);

  // My Quick Action Buttons (At the top of screen for 1-tap tallying!)
  document.getElementById('btnMyQuickBeer').addEventListener('click', () => {
    if (activeUser) {
      directTally(activeUser.id, 1, 'pintje', activeUser.pin, activeUser.name);
    } else {
      openSelectUserModal();
    }
  });

  document.getElementById('btnMyQuickFive').addEventListener('click', () => {
    if (activeUser) {
      directTally(activeUser.id, 5, 'pintje', activeUser.pin, activeUser.name);
    } else {
      openSelectUserModal();
    }
  });

  document.getElementById('btnMyQuickChoice').addEventListener('click', () => {
    if (activeUser) {
      openDrinkPicker(activeUser.id);
    } else {
      openSelectUserModal();
    }
  });

  // Drink modal actions
  document.getElementById('btnConfirmDrinkOne').addEventListener('click', () => {
    if (!targetMemberForDrink) return;
    const memId = targetMemberForDrink;
    const drId = selectedDrinkId;
    closeDrinkModal();

    if (activeUser && activeUser.id === memId && activeUser.pin) {
      directTally(memId, 1, drId, activeUser.pin, activeUser.name);
    } else {
      const mem = state.members.find(m => m.id === memId);
      openPinModal({
        type: 'tally',
        memberId: memId,
        memberName: mem ? mem.name : '',
        count: 1,
        drinkId: drId
      });
    }
  });

  document.getElementById('btnConfirmDrinkFive').addEventListener('click', () => {
    if (!targetMemberForDrink) return;
    const memId = targetMemberForDrink;
    const drId = selectedDrinkId;
    closeDrinkModal();

    if (activeUser && activeUser.id === memId && activeUser.pin) {
      directTally(memId, 5, drId, activeUser.pin, activeUser.name);
    } else {
      const mem = state.members.find(m => m.id === memId);
      openPinModal({
        type: 'tally',
        memberId: memId,
        memberName: mem ? mem.name : '',
        count: 5,
        drinkId: drId
      });
    }
  });

  // Tab navigation
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic('light');
      document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetId = btn.getAttribute('data-tab');
      ['tabKarton', 'tabStats', 'tabSettle', 'tabConnect'].forEach(id => {
        document.getElementById(id).style.display = id === targetId ? 'block' : 'none';
      });

      if (targetId === 'tabStats') renderStats();
      if (targetId === 'tabSettle') renderSettle();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Numeric Keypad Buttons
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

  // WhatsApp Settlement
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
  document.getElementById('btnNewKarton').addEventListener('click', async () => {
    const title = prompt('Naam voor het nieuwe karton:', 'Karton ' + new Date().toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' }));
    if (!title) return;

    if (!confirm('Huidig karton archiveren en alle streepjes resetten naar 0? (Pincodes blijven bewaard!)')) return;

    try {
      const res = await fetch('/api/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTitle: title })
      });
      if (res.ok) {
        showToast('Nieuw karton gestart!', '📦');
        document.querySelector('.nav-tab-btn[data-tab="tabKarton"]').click();
      }
    } catch (e) {
      alert('Fout bij resetten');
    }
  });
});
