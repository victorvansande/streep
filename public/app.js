// KSA Streepkarton - Sleek & Ultra-Fast Mobile Client with Admin & PDF

let state = {
  members: [],
  drinks: [],
  totalTallies: 0,
  totalEuros: 0,
  pricePerTally: 1.0,
  title: 'Karton Najaar 2026'
};

let activeUser = null; // { id, name, pin }
let adminPassword = null; // cached during admin session
let currentPendingAction = null;
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

function updateAdminBar() {
  const bar = document.getElementById('adminActiveBar');
  bar.style.display = adminPassword ? 'flex' : 'none';
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

  document.getElementById('grandTallies').textContent = state.totalTallies || 0;
  document.getElementById('grandEuros').textContent = `€ ${((state.totalEuros || 0)).toFixed(0)}`;
  document.getElementById('boardTitle').textContent = state.title || 'Karton Najaar 2026';
  document.getElementById('memberCountHeader').textContent = `${state.members.length} Leiding`;

  updateMyQuickBanner();
  updateAdminBar();
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

// PDF Generation
function generatePdfReport() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('PDF bibliotheek aan het laden, probeer over 2 seconden opnieuw.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header banner
  doc.setFillColor(163, 34, 34); // KSA Red
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('KSA STREEPKARTON - TOTALE VERREKENING', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${state.title || 'Streepkarton'} | Datum opmaak: ${new Date().toLocaleDateString('nl-BE')} om ${new Date().toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`, 14, 21);

  // Summary box
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
  doc.setTextColor(163, 34, 34);
  doc.setFontSize(14);
  doc.text(`TOTAAL TE ONTVANGEN: € ${state.totalTallies},00`, 110, 42);

  // Table rows
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
    head: [['Nr.', 'Naam Leiding', 'Aantal Strepen', 'Te Betalen', 'Handtekening / Betaald']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [163, 34, 34],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 26, 22]
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 50, halign: 'center' }
    },
    foot: [[
      '',
      'TOTAAL BORD',
      String(state.totalTallies),
      `€ ${state.totalTallies},00`,
      ''
    ]],
    footStyles: {
      fillColor: [244, 232, 213],
      textColor: [163, 34, 34],
      fontStyle: 'bold',
      fontSize: 10
    }
  });

  const finalY = doc.lastAutoTable.finalY || 240;
  doc.setTextColor(100, 80, 60);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Gelieve het openstaande bedrag over te schrijven naar de KSA rekening of via Payconiq.', 14, Math.min(285, finalY + 10));

  const filename = `KSA_Streepkarton_Afrekening_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  showToast('PDF Verrekening gedownload! 📄', '📄');
}

// Admin Action Handlers
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

    // ADMIN OVERRIDE: Tally without PIN!
    if (adminPassword) {
      window.app.adminTally(memberId, 1);
      return;
    }

    if (!member.hasPin) {
      openSetupPinModal(memberId);
      return;
    }

    if (activeUser && activeUser.id === memberId && activeUser.pin) {
      directTally(memberId, 1, 'pintje', activeUser.pin, member.name);
    } else {
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

  // Admin specific methods
  adminTally: async (memberId, count) => {
    if (!adminPassword) return;
    try {
      const res = await fetch('/api/admin/tally', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, memberId, count, drinkId: 'pintje' })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Admin fout', '❌');
        return;
      }
      playMarkerSound(count);
      triggerHaptic('heavy');
      showToast(`${count > 0 ? '+' + count : count} streep voor lid (Admin)`, '🔑');
    } catch (e) {
      showToast('Fout bij strepen toevoegen', '❌');
    }
  },

  adminSetTalliesPrompt: async (memberId, currentVal) => {
    const input = prompt(`Voer het exacte aantal streepjes in voor dit lid:`, currentVal);
    if (input === null) return;
    const count = parseInt(input, 10);
    if (isNaN(count) || count < 0) {
      alert('Voer een geldig getal in');
      return;
    }
    try {
      const res = await fetch('/api/admin/set-member-tallies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, memberId, tallies: count })
      });
      if (res.ok) {
        showToast('Strepen aangepast!', '✏️');
      }
    } catch (e) {
      alert('Fout bij aanpassen');
    }
  },

  adminResetPin: async (memberId) => {
    if (!confirm('Weet je zeker dat je de pincode van dit lid wil resetten? Het lid kan dan zelf een nieuwe code kiezen.')) return;
    try {
      const res = await fetch('/api/admin/reset-member-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, memberId })
      });
      if (res.ok) {
        showToast('Pincode gereset!', '🔑');
      }
    } catch (e) {
      alert('Fout bij resetten');
    }
  },

  adminRemoveMember: async (memberId, name) => {
    if (!confirm(`Weet je zeker dat je '${name}' van het karton wil verwijderen?`)) return;
    try {
      const res = await fetch(`/api/member/${memberId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`${name} verwijderd`, '🗑️');
      }
    } catch (e) {
      alert('Fout bij verwijderen');
    }
  }
};

// Modals
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
          renderAdminMemberList();
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
  adminPassword = sessionStorage.getItem('ksa_admin_password') || null;

  try {
    const res = await fetch('/api/state');
    if (res.ok) {
      state = await res.json();
      renderMembers();
      renderStats();
      renderSettle();
      renderAdminMemberList();

      if (!activeUser && !adminPassword) {
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

  document.getElementById('searchInput').addEventListener('input', renderMembers);
  document.getElementById('btnSwitchUser').addEventListener('click', openSelectUserModal);
  document.getElementById('btnCloseSelectUser').addEventListener('click', closeSelectUserModal);

  // Quick Action Buttons
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

    if (adminPassword) {
      window.app.adminTally(memId, 1);
      return;
    }

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

    if (adminPassword) {
      window.app.adminTally(memId, 5);
      return;
    }

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
      const targetId = btn.getAttribute('data-tab');

      // Admin tab requires password if not already unlocked
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

  // Admin button on header
  document.getElementById('btnHeaderAdmin').addEventListener('click', () => {
    if (adminPassword) {
      document.getElementById('navBtnAdmin').click();
    } else {
      document.getElementById('adminLoginModal').classList.add('open');
    }
  });

  // Admin Login Modal
  document.getElementById('btnCloseAdminLogin').addEventListener('click', () => {
    document.getElementById('adminLoginModal').classList.remove('open');
  });

  document.getElementById('btnSubmitAdminLogin').addEventListener('click', async () => {
    const pwd = document.getElementById('inputAdminPassword').value.trim();
    if (!pwd) return;

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });
      if (res.ok) {
        adminPassword = pwd;
        sessionStorage.setItem('ksa_admin_password', pwd);
        document.getElementById('adminLoginModal').classList.remove('open');
        showToast('Admin ingelogd! 🔑', '🔑');
        updateAdminBar();
        document.getElementById('navBtnAdmin').click();
      } else {
        alert('Verkeerd admin wachtwoord!');
      }
    } catch (e) {
      alert('Verbindingsfout');
    }
  });

  // Exit Admin Mode
  document.getElementById('btnExitAdmin').addEventListener('click', () => {
    adminPassword = null;
    sessionStorage.removeItem('ksa_admin_password');
    updateAdminBar();
    showToast('Admin afgesloten', '🔒');
    document.querySelector('.nav-tab-btn[data-tab="tabKarton"]').click();
  });

  // Admin: Wipe All Tallies
  document.getElementById('btnAdminClearAll').addEventListener('click', async () => {
    const confirmation = prompt('Typ "WIS ALLES" om te bevestigen dat je alle strepen van iedereen naar 0 wil resetten:');
    if (confirmation !== 'WIS ALLES') {
      alert('Geannuleerd');
      return;
    }

    try {
      const res = await fetch('/api/admin/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      });
      if (res.ok) {
        showToast('Alle streepjes gewist naar 0! 🗑️', '🗑️');
      }
    } catch (e) {
      alert('Fout bij wissen');
    }
  });

  // Admin: Add Member
  document.getElementById('btnAddMemberSubmit').addEventListener('click', async () => {
    const name = document.getElementById('inputNewMemberName').value.trim();
    if (!name) return;

    try {
      const res = await fetch('/api/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Fout');
        return;
      }
      document.getElementById('inputNewMemberName').value = '';
      showToast(`${name} toegevoegd!`, '➕');
    } catch (e) {
      alert('Fout bij toevoegen');
    }
  });

  // Admin: Change Password
  document.getElementById('btnChangeAdminPwd').addEventListener('click', async () => {
    const newPwd = document.getElementById('inputNewAdminPwd').value.trim();
    if (!newPwd || newPwd.length < 3) {
      alert('Minimaal 3 tekens');
      return;
    }

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: adminPassword, newPassword: newPwd })
      });
      if (res.ok) {
        adminPassword = newPwd;
        sessionStorage.setItem('ksa_admin_password', newPwd);
        document.getElementById('inputNewAdminPwd').value = '';
        showToast('Admin wachtwoord gewijzigd!', '🔑');
      } else {
        alert('Fout bij wijzigen');
      }
    } catch (e) {
      alert('Verbindingsfout');
    }
  });

  // PDF Downloads (both from settle tab and admin tab)
  document.getElementById('btnDownloadPdf').addEventListener('click', generatePdfReport);
  document.getElementById('btnAdminDownloadPdf').addEventListener('click', generatePdfReport);

  // Numeric Keypad
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
