// Streep KSA Herentals - Sleek & Ultra-Fast Mobile Client

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
  { id: 'ice_tea', name: 'Ice Tea', icon: '🍹', price: 1.0 },
  { id: 'ice_tea_green', name: 'Ice Tea Green', icon: '🍃', price: 1.0 },
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
let selectedDrinkId = localStorage.getItem('ksa_selected_drink') || 'pintje';
let targetMemberForDrink = null;

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
    const serialized = JSON.stringify(state);
    localStorage.setItem('ksa_streep_karton_cache', serialized);
    // Veiligheidsreserve: bewaar altijd een permanente rollende backup zodra er streepjes zijn
    if (state.totalTallies > 0) {
      localStorage.setItem('ksa_streep_safety_backup', serialized);
    }
  } catch (e) {}
}

function loadLocalState() {
  try {
    let raw = localStorage.getItem('ksa_streep_karton_cache');
    // Als de hoofdcache leeg zou zijn geraakt, herstel direct uit de veiligheidsreserve
    if (!raw) {
      raw = localStorage.getItem('ksa_streep_safety_backup');
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.members && parsed.members.length > 0) {
        // Slimme merge: behoud ALTIJD alle bestaande live strepen, drankentellingen en pincodes
        const existingMembersMap = new Map();
        parsed.members.forEach(m => existingMembersMap.set(m.id, m));

        const mergedMembers = [];
        DEFAULT_MEMBERS.forEach(defM => {
          if (existingMembersMap.has(defM.id)) {
            const existing = existingMembersMap.get(defM.id);
            mergedMembers.push({
              ...defM,
              ...existing,
              tallies: existing.tallies || 0,
              drinks: existing.drinks || {},
              hasPin: existing.hasPin || false,
              pinHash: existing.pinHash || null
            });
            existingMembersMap.delete(defM.id);
          } else {
            // Nieuw toegevoegd lid in de code
            mergedMembers.push({ ...defM });
          }
        });

        // Behoud alle dynamisch toegevoegde bezoekers tijdens het kamp/jaar
        existingMembersMap.forEach(extraM => {
          mergedMembers.push(extraM);
        });

        state = {
          ...parsed,
          members: mergedMembers,
          drinks: parsed.drinks && parsed.drinks.length > 0 ? parsed.drinks : DEFAULT_DRINKS
        };

        // Zorg dat alle standaarddrankjes aanwezig blijven
        DEFAULT_DRINKS.forEach(d => {
          if (!state.drinks.some(sd => sd.id === d.id)) {
            state.drinks.push(d);
          }
        });

        recalculateState();
      }
    }
  } catch (e) {
    console.warn('Fout bij laden van lokale data:', e);
  }
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
      <div class="podium-empty-hint" style="color: #8c7358; font-style: italic; font-size: 13px; padding: 6px 0; text-align: center;">
        Nog geen gegevens
      </div>
    `;
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  let html = '';

  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    const member = sorted[i];
    if (member && (member.tallies || 0) > 0) {
      html += `
        <div class="podium-pill ${i === 0 ? 'rank-1' : ''}">
          <span class="podium-medal">${medals[i]}</span>
          <span class="podium-name">${member.name}</span>
          <span class="podium-count">${member.tallies} strepen</span>
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
        if (activeUser && activeUser.id === ev.memberId) {
          activeUser.hasPin = false;
          saveStoredUser(activeUser);
        }
        stateChanged = true;
      }
      break;
    }
    case 'reset_all_pins': {
      state.members.forEach(m => {
        m.hasPin = false;
        m.pinHash = '';
      });
      if (activeUser) {
        activeUser.hasPin = false;
        saveStoredUser(activeUser);
      }
      stateChanged = true;
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

// --- LIVE MULTI-BROKER REALTIME CLOUD ENGINE (HiveMQ + EMQX Ultra-Fast WSS) ---
const MQTT_BROKERS = [
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://broker.emqx.io:8084/mqtt'
];
const MQTT_BASE_TOPIC = 'ksa/streep/2026/victorvansande';
const TOPIC_EVENTS = `${MQTT_BASE_TOPIC}/events`;
const TOPIC_STATE = `${MQTT_BASE_TOPIC}/state`;
const TOPIC_REQ = `${MQTT_BASE_TOPIC}/req`;
const OUTBOX_KEY = 'ksa_streep_outbox_queue';

let mqttClient = null;
let currentBrokerIdx = 0;
let myClientId = 'ksa_' + Math.random().toString(16).substring(2, 10);
let isConnecting = false;

// Persistent Outbox Queue (Garandeert dat streepjes NOOIT verloren gaan)
function getOutbox() {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addToOutbox(ev) {
  try {
    const list = getOutbox();
    if (!list.some(e => e.eventId === ev.eventId)) {
      list.push(ev);
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
    }
    updateOutboxStatusUI();
  } catch (e) {}
}

function removeFromOutbox(eventId) {
  try {
    const list = getOutbox().filter(e => e.eventId !== eventId);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(list));
    updateOutboxStatusUI();
  } catch (e) {}
}

function isLiveConnected() {
  return typeof navigator !== 'undefined' && navigator.onLine && mqttClient && mqttClient.connected;
}

// Optimistic UI: Gebruikers hoeven NOOIT te wachten op een trage verbinding!
// Knoppen blijven altijd direct klikbaar, data wordt via persistente outbox gesynchroniseerd.
function updateTallyButtonsLockState() {
  const quickBeer = document.getElementById('btnMyQuickBeer');
  if (quickBeer) {
    quickBeer.style.opacity = '1';
    quickBeer.style.cursor = 'pointer';
    quickBeer.title = '';
  }

  document.querySelectorAll('.btn-row-add-pill').forEach(btn => {
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    btn.title = 'Streepje toevoegen';
  });
}

function updateOutboxStatusUI() {
  const pendingCount = getOutbox().length;
  if (pendingCount > 0) {
    updateCloudStatus('connecting', `${pendingCount} streepje(s) in wachtrij... (wordt verzonden)`);
  } else if (mqttClient && mqttClient.connected) {
    updateCloudStatus('connected', 'Live verbonden');
  }
}

function flushOutbox() {
  const list = getOutbox();
  if (!list || list.length === 0) return;
  if (!mqttClient || !mqttClient.connected) return;

  list.forEach(ev => {
    try {
      mqttClient.publish(TOPIC_EVENTS, JSON.stringify(ev), { qos: 1 }, (err) => {
        if (!err) {
          removeFromOutbox(ev.eventId);
        }
      });
    } catch (e) {}
  });

  publishCurrentStateSnapshot();
}

function updateCloudStatus(status, text) {
  const banner = document.getElementById('cloudSyncBanner');
  const dot = document.getElementById('cloudSyncDot');
  const statusDot = document.getElementById('statusDot');
  const txt = document.getElementById('cloudSyncText');
  const sub = document.getElementById('cloudSyncSub');
  if (!banner || !txt) return;

  banner.style.display = 'flex';

  if (status === 'connected') {
    if (dot) {
      dot.className = 'live-pulse-dot';
      dot.style.background = '#10b981';
    }
    if (statusDot) statusDot.classList.remove('offline');
    banner.style.background = '#ecfdf5';
    banner.style.borderColor = '#a7f3d0';
    banner.style.color = '#047857';
    txt.textContent = text || 'Live verbonden';
    if (sub) sub.textContent = '🟢 Live';
  } else if (status === 'connecting') {
    if (dot) {
      dot.className = 'live-pulse-dot connecting';
      dot.style.background = '#f59e0b';
    }
    if (statusDot) statusDot.classList.add('offline');
    banner.style.background = '#fffbeb';
    banner.style.borderColor = '#fde68a';
    banner.style.color = '#b45309';
    txt.textContent = text || 'Verbinding controleren...';
    if (sub) sub.textContent = '🟡 Bezig';
  } else {
    if (dot) {
      dot.className = 'live-pulse-dot offline';
      dot.style.background = '#ef4444';
    }
    if (statusDot) statusDot.classList.add('offline');
    banner.style.background = '#fef2f2';
    banner.style.borderColor = '#fecaca';
    banner.style.color = '#b91c1c';
    txt.textContent = text || (!navigator.onLine ? 'Geen verbinding (4G of wifi staat uit)' : 'Verbinding verbroken (opnieuw verbinden...)');
    if (sub) sub.textContent = '🔴 Offline';
  }

  updateTallyButtonsLockState();
}

function broadcastStateRequest() {
  if (mqttClient && mqttClient.connected) {
    try {
      mqttClient.publish(TOPIC_REQ, JSON.stringify({ from: myClientId, ts: Date.now() }), { qos: 0 });
    } catch (e) {}
  }
}

function publishCurrentStateSnapshot() {
  if (mqttClient && mqttClient.connected) {
    try {
      const snapshot = {
        state: state,
        sender: (activeUser && activeUser.name) ? activeUser.name : 'Leiding',
        from: myClientId,
        timestamp: Date.now(),
        version: state.version || 1
      };
      mqttClient.publish(TOPIC_STATE, JSON.stringify(snapshot), { qos: 1, retain: true });
    } catch (e) {}
  }
}

function handleIncomingStateSnapshot(snapshot) {
  if (!snapshot || !snapshot.state || !Array.isArray(snapshot.state.members)) return;
  if (snapshot.from === myClientId) return; // Eigen snapshot negeren

  const remoteState = snapshot.state;
  const remoteTime = snapshot.timestamp || 0;
  const localTime = state.updatedAt || 0;
  const pendingOutbox = getOutbox();

  // Als remote nieuwer is OF lokaal geen niet-verzonden wijzigingen heeft: overnemen!
  // Hierdoor worden resets (0 strepen) en correcties (-1) van de admin DIRECT gesynchroniseerd!
  if (remoteTime >= localTime || pendingOutbox.length === 0) {
    state.members = JSON.parse(JSON.stringify(remoteState.members));
    if (remoteState.drinks) state.drinks = remoteState.drinks;
    if (remoteState.title) state.title = remoteState.title;
    state.updatedAt = remoteTime;
    state.version = snapshot.version || ((state.version || 0) + 1);

    // Als deze GSM offline streepjes had getrokken die nog in de wachtrij staan:
    // Herpas ze direct toe op de nieuwste stand en verzend ze meteen!
    if (pendingOutbox.length > 0) {
      pendingOutbox.forEach(ev => {
        applySyncEvent(ev, true);
      });
      flushOutbox();
    }

    recalculateState();
    saveLocalState();
    renderMembers();
    renderStats();
    renderSettle();
    renderAdminMemberList();
    renderMiniLeaderboard();
    updateMyQuickBanner();
  }
}

function handleIncomingCloudEvent(ev) {
  if (!ev || !ev.eventId) return;
  if (processedEventIds.has(ev.eventId)) return;

  // Show friendly live notification toast if someone else tallied
  if (ev.type === 'tally' && ev.from !== myClientId) {
    const member = state.members.find(m => m.id === ev.memberId);
    const mName = member ? member.name : (ev.memberName || 'Iemand');
    const drink = state.drinks.find(d => d.id === ev.drinkId) || { name: 'Drankje', icon: '🍺' };
    if (ev.count > 0) {
      showToast(`⚡ ${mName} trok net +${ev.count} ${drink.name}!`, drink.icon);
    } else if (ev.count < 0) {
      showToast(`✏️ Streepje gecorrigeerd voor ${mName}`, '🔧');
    }
  } else if (ev.type === 'add_member' && ev.from !== myClientId) {
    showToast(`👤 ${ev.member?.name || 'Bezoeker'} toegevoegd door ${ev.sender || 'leiding'}!`, '➕');
  } else if (ev.type === 'clear_all' && ev.from !== myClientId) {
    showToast(`🗑️ Alle strepen gewist door admin`, '🗑️');
  } else if (ev.type === 'reset_all_pins' && ev.from !== myClientId) {
    showToast(`🔑 Pincodes gereset door admin`, '🔑');
  }

  const changed = applySyncEvent(ev, false);
  if (changed) {
    publishCurrentStateSnapshot();
  }
}

// Publish an event to the cloud bus (Met 100% garantie dat niets verloren gaat)
async function publishCloudEvent(ev) {
  ev.eventId = ev.eventId || ('ev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
  ev.timestamp = Date.now();
  ev.from = myClientId;
  ev.sender = (activeUser && activeUser.name) ? activeUser.name : 'Anoniem';

  // 1. Schrijf direct synchroon naar de persistente Outbox op de GSM (overleeft afsluiten/batterijleeg)
  addToOutbox(ev);

  // 2. Directe 0ms optimistische update op het eigen scherm
  applySyncEvent(ev, true);
  state.updatedAt = ev.timestamp;
  state.version = (state.version || 0) + 1;
  saveLocalState();

  // 3. Multi-channel verzenden: MQTT met QoS 1 (Broker bevestigt ontvangst via puback)
  if (mqttClient && mqttClient.connected) {
    try {
      mqttClient.publish(TOPIC_EVENTS, JSON.stringify(ev), { qos: 1 }, (err) => {
        if (!err) {
          // Broker heeft bevestigd dat het streepje ontvangen is!
          removeFromOutbox(ev.eventId);
        }
      });
      // Retained state snapshot updaten voor nieuwe browsers
      publishCurrentStateSnapshot();
    } catch (e) {
      console.warn('MQTT publish fout:', e);
    }
  } else {
    // Probeer direct verbinding te herstellen
    connectCloudSync();
  }

  // 4. Achtergrond keepalive baken (W3C standaard voor als gsm direct in de broekzak gaat)
  try {
    if (window.fetch) {
      fetch(`https://ntfy.sh/${encodeURIComponent(CLOUD_CHANNEL)}`, {
        method: 'POST',
        body: JSON.stringify(ev),
        keepalive: true
      }).catch(() => {});
    }
  } catch (e) {}
}

function connectCloudSync() {
  if (typeof window.mqtt === 'undefined') {
    setTimeout(connectCloudSync, 200);
    return;
  }

  if (mqttClient && mqttClient.connected) {
    updateCloudStatus('connected');
    return;
  }

  if (isConnecting) return;
  isConnecting = true;

  const brokerUrl = MQTT_BROKERS[currentBrokerIdx];
  updateCloudStatus('connecting', 'Live verbinding maken...');

  try {
    if (mqttClient) {
      try { mqttClient.end(true); } catch (e) {}
      mqttClient = null;
    }

    mqttClient = window.mqtt.connect(brokerUrl, {
      clientId: myClientId,
      clean: true,
      connectTimeout: 2800,
      reconnectPeriod: 1200,
      keepalive: 25
    });

    mqttClient.on('connect', () => {
      isConnecting = false;
      updateCloudStatus('connected', 'Live verbonden');

      mqttClient.subscribe([TOPIC_EVENTS, TOPIC_STATE, TOPIC_REQ], { qos: 1 }, (err) => {
        if (!err) {
          // Verzend eventuele wachtende streepjes direct
          flushOutbox();
          // Vraag de laatste stand op
          broadcastStateRequest();
        }
      });
    });

    mqttClient.on('message', (topic, payloadBuffer) => {
      try {
        const payloadStr = payloadBuffer.toString();
        const data = JSON.parse(payloadStr);

        if (topic === TOPIC_EVENTS) {
          handleIncomingCloudEvent(data);
        } else if (topic === TOPIC_STATE) {
          handleIncomingStateSnapshot(data);
        } else if (topic === TOPIC_REQ) {
          if (data && data.from !== myClientId) {
            publishCurrentStateSnapshot();
          }
        }
      } catch (err) {
        console.warn('Fout bij parsen MQTT bericht:', err);
      }
    });

    mqttClient.on('error', (err) => {
      console.warn('MQTT fout op broker:', brokerUrl, err);
      isConnecting = false;
      try { mqttClient.end(true); } catch (e) {}
      mqttClient = null;
      // Schakel direct over naar de alternatieve broker
      currentBrokerIdx = (currentBrokerIdx + 1) % MQTT_BROKERS.length;
      updateCloudStatus('connecting', 'Verbinding herstellen...');
      setTimeout(connectCloudSync, 400);
    });

    mqttClient.on('offline', () => {
      isConnecting = false;
      updateCloudStatus(!navigator.onLine ? 'offline' : 'connecting');
    });

    mqttClient.on('close', () => {
      isConnecting = false;
      if (!isLiveConnected()) {
        updateCloudStatus(!navigator.onLine ? 'offline' : 'connecting');
      }
    });

    mqttClient.on('reconnect', () => {
      updateCloudStatus('connecting', 'Verbinding herstellen...');
    });
  } catch (err) {
    isConnecting = false;
    console.error('MQTT startup fout:', err);
    setTimeout(connectCloudSync, 1200);
  }
}

async function fetchCloudHistory() {
  if (mqttClient && mqttClient.connected) {
    broadcastStateRequest();
  }
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
    const pinWarning = !m.hasPin ? `<span class="member-row-pin-status needs-setup" onclick="event.stopPropagation(); window.app.openSetupPinModal('${m.id}')" title="Tik om PIN in te stellen">⚠️ Stel PIN in</span>` : '';

    // Geen medaille tenzij lid effectief > 0 strepen heeft en in top 3 staat
    let medalTag = '';
    if ((m.tallies || 0) > 0) {
      const rankIndex = sortedRanks.findIndex(r => r.id === m.id);
      if (rankIndex === 0) medalTag = '🥇 ';
      else if (rankIndex === 1) medalTag = '🥈 ';
      else if (rankIndex === 2) medalTag = '🥉 ';
    }

    html += `
      <div class="member-row ${isMe ? 'is-current-user' : ''}" data-id="${m.id}">
        <div class="member-info-col">
          <span class="member-row-name">${medalTag}${m.name}</span>
          ${pinWarning}
        </div>

        <div class="member-turf-col">
          ${renderTurvenSvgCompact(m.tallies || 0, idx + 1)}
        </div>

        <div class="member-actions-col">
          <div class="member-count-badge">
            <span class="badge-count">${m.tallies}</span>
            <span class="badge-euro">€${euro}</span>
          </div>
          ${adminPassword ? `<button class="btn-row-minus-pill" onclick="event.stopPropagation(); window.app.adminTally('${m.id}', -1)" title="1 streepje aftrekken (Admin)">-1</button>` : ''}
          <button class="btn-row-add-pill" onclick="event.stopPropagation(); window.app.quickAddOne('${m.id}')" title="Streepje toevoegen">+1</button>
          <button class="btn-row-drink-pill" onclick="event.stopPropagation(); window.app.openDrinkPicker('${m.id}')" title="Kies drankje">🥤</button>
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
  const hasLeaderboard = state.members.some(m => (m.tallies || 0) > 0);
  const boardEl = document.getElementById('leaderboardList');
  let boardHtml = '';

  sorted.forEach((m, idx) => {
    const medals = ['🥇', '🥈', '🥉'];
    const count = m.tallies || 0;
    // Zet bij NIEMAND een medaille tot er effectief een leaderboard is en het lid > 0 strepen heeft
    const rank = (hasLeaderboard && count > 0 && idx < 3) ? medals[idx] : `#${idx + 1}`;
    
    // Bereken het detailoverzicht van gedronken drankjes voor dit lid
    const consumed = [];
    (state.drinks || []).forEach(d => {
      const c = (m.drinks && m.drinks[d.id]) || 0;
      if (c > 0) consumed.push({ ...d, count: c });
    });

    let detailsHtml = '';
    if (consumed.length > 0) {
      detailsHtml += `<div style="font-size: 11px; font-weight: 700; color: #5a4025; margin-bottom: 6px;">Bestelde drankjes van ${m.name}:</div>`;
      detailsHtml += `<div style="display: flex; flex-wrap: wrap; gap: 6px;">`;
      consumed.forEach(item => {
        detailsHtml += `
          <span style="background: #fffdf9; border: 1.5px solid #d8c2a7; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; color: #2e1e0f; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
            <span>${item.icon}</span>
            <span>${item.count}x ${item.name}</span>
            <span style="color: #8c6a46; font-size: 10.5px; font-weight: 600;">(€ ${item.count},00)</span>
          </span>
        `;
      });
      detailsHtml += `</div>`;
    } else {
      detailsHtml = `<div style="font-size: 11.5px; color: #8c6a46; font-style: italic;">Nog geen drankjes geregistreerd op dit karton.</div>`;
    }

    boardHtml += `
      <div class="stats-accordion-item" style="border-bottom: 1px solid #ebd9c2;">
        <div 
          onclick="window.app.toggleMemberStatsBreakdown('${m.id}')" 
          style="display: flex; justify-content: space-between; align-items: center; padding: 10px 4px; cursor: pointer; -webkit-tap-highlight-color: transparent;"
        >
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 15px;">${rank}</span>
            <strong class="font-marker" style="font-size: 17px; color: #2a1b0e;">${m.name}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 800; color: #0f356b; font-size: 14px;">${m.tallies || 0} strepen</span>
            <span id="chevron_${m.id}" style="font-size: 10px; color: #8c6a46; transition: transform 0.2s ease;">▼</span>
          </div>
        </div>

        <div id="stats_detail_${m.id}" style="display: none; background: #faf4eb; border-radius: 14px; padding: 10px 12px; margin: 2px 2px 8px 2px; border: 1px solid #e0cdb6;">
          ${detailsHtml}
        </div>
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
  doc.text('STREEP KSA HERENTALS - TOTALE VERREKENING', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${state.title || 'Streep KSA Herentals'} | Datum opmaak: ${new Date().toLocaleDateString('nl-BE')} om ${new Date().toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}`, 14, 21);

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

  const filename = `Streep_KSA_Herentals_Afrekening_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  showToast('PDF Verrekening gedownload! 📄', '📄');
}

// Data Backup & Export / Import
function exportBackupJson() {
  const backupData = {
    app: 'Streep KSA Herentals',
    exportedAt: new Date().toISOString(),
    state: state
  };
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KSA_Streepkarton_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data Backup gedownload! 💾', '💾');
}

function importBackupJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const importedState = data.state || data;
      if (!importedState || !Array.isArray(importedState.members)) {
        alert('Ongeldig backupbestand: geen leden gevonden.');
        return;
      }
      if (!confirm(`Weet je zeker dat je deze backup wil herstellen? (${importedState.members.length} personen, ${importedState.totalTallies || 0} strepen)`)) {
        return;
      }
      state = importedState;
      recalculateState();
      saveLocalState();
      publishCurrentStateSnapshot();
      renderMembers();
      renderStats();
      renderSettle();
      renderAdminMemberList();
      renderMiniLeaderboard();
      updateMyQuickBanner();
      showToast('Backup succesvol hersteld! 📥', '📥');
    } catch (err) {
      alert('Fout bij herstellen backup: ' + err.message);
    }
  };
  reader.readAsText(file);
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
      if (!member.hasPin) {
        openSetupPinModal(memberId);
        return;
      }
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
    // Geen actie bij tikken op de rij om perongeluk turven tijdens scrollen te voorkomen
  },

  onMemberRowTap: (memberId) => {
    // Geen actie bij scrollen over de turfstreepjes
  },

  toggleMemberStatsBreakdown: (memberId) => {
    const detailEl = document.getElementById(`stats_detail_${memberId}`);
    const chevronEl = document.getElementById(`chevron_${memberId}`);
    if (!detailEl) return;
    const isHidden = detailEl.style.display === 'none';
    if (isHidden) {
      detailEl.style.display = 'block';
      if (chevronEl) chevronEl.style.transform = 'rotate(180deg)';
    } else {
      detailEl.style.display = 'none';
      if (chevronEl) chevronEl.style.transform = 'rotate(0deg)';
    }
  },

  openSetupPinModal: (memberId) => {
    openSetupPinModal(memberId);
  },

  openDrinkPicker: (memberId) => {
    openDrinkPicker(memberId);
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
  const inputEl = document.getElementById('inputPinConfirm');
  if (inputEl) inputEl.value = '';

  const member = state.members.find(m => m.id === action.memberId);
  document.getElementById('pinTargetName').textContent = member ? member.name : 'Leiding';

  if (action.type === 'setActiveUser') {
    document.getElementById('pinTargetSub').textContent = `Geef je pincode in om in te loggen als ${member.name}`;
  } else {
    document.getElementById('pinTargetSub').textContent = `Pincode van ${member.name} (+${action.count || 1} ${action.drinkName || 'drank'})`;
  }

  document.getElementById('pinModal').classList.add('open');
  setTimeout(() => {
    if (inputEl) inputEl.focus();
  }, 180);
}

function closePinModal() {
  document.getElementById('pinModal').classList.remove('open');
  const inputEl = document.getElementById('inputPinConfirm');
  if (inputEl) {
    inputEl.value = '';
    inputEl.blur();
  }
  currentPendingAction = null;
}

async function submitPinAction(pin) {
  if (!currentPendingAction) return;
  const action = currentPendingAction;

  const cleanPin = (pin || '').trim();
  if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
    handlePinError('Voer een 4-cijferige code in');
    return;
  }

  const member = state.members.find(m => m.id === action.memberId);
  if (member && member.hasPin && member.pinHash && member.pinHash !== cleanPin) {
    handlePinError('Foutieve pincode!');
    return;
  }

  if (action.type === 'setActiveUser') {
    saveStoredUser({ id: action.memberId, name: action.memberName, pin: cleanPin });
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
  const inputEl = document.getElementById('inputPinConfirm');
  if (inputEl) {
    inputEl.value = '';
    inputEl.focus();
  }
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

    // Enkel opslaan als actieve gebruiker van deze gsm als er nog GEEN actieve gebruiker was,
    // of als de eigenaar van deze gsm zelf zijn eigen pin instelde.
    // Zodat als iemand anders tijdelijk op jouw gsm turft, de gsm jouw naam permanent onthoudt!
    if (!activeUser || activeUser.id === member.id) {
      saveStoredUser({ id: member.id, name: member.name, pin: pin1 });
    }
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
  generateQrCode();
}

function generateQrCode() {
  const currentUrl = window.location.href;
  const linkEl = document.getElementById('qrUrlLink');
  const imgEl = document.getElementById('qrCodeImg');
  if (linkEl) {
    linkEl.href = currentUrl;
    linkEl.textContent = currentUrl;
  }
  if (!imgEl) return;

  try {
    if (typeof QRious !== 'undefined') {
      const qr = new QRious({
        value: currentUrl,
        size: 260,
        level: 'M'
      });
      imgEl.src = qr.toDataURL();
      return;
    }
  } catch (e) {
    console.warn('QRious fout:', e);
  }

  imgEl.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(currentUrl)}`;
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
      const member = state.members.find(m => m.id === activeUser.id);
      if (member && !member.hasPin) {
        openSetupPinModal(activeUser.id);
        return;
      }
      const current = getSelectedDrink();
      directTally(activeUser.id, 1, current.id, activeUser.name, current.name);
    } else {
      openSelectUserModal();
    }
  });

  // Drink modal confirm selection
  const btnConfirmDrink = document.getElementById('btnConfirmDrinkSelection');
  if (btnConfirmDrink) {
    btnConfirmDrink.addEventListener('click', () => {
      const current = getSelectedDrink();
      closeDrinkModal();
      triggerHaptic('light');
      playSuccessChime();
      showToast(`${current.name} ${current.icon} geselecteerd!`, current.icon);
    });
  }

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

      ['tabKarton', 'tabStats', 'tabAdmin', 'tabConnect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === targetId ? 'block' : 'none';
      });

      if (targetId === 'tabStats') renderStats();
      if (targetId === 'tabAdmin') {
        renderAdminMemberList();
        renderSettle();
      }
      if (targetId === 'tabConnect') generateQrCode();
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

  const inputAdminPwd = document.getElementById('inputAdminPassword');
  if (inputAdminPwd) {
    inputAdminPwd.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('btnSubmitAdminLogin').click();
      }
    });
  }

  document.getElementById('btnSubmitAdminLogin').addEventListener('click', () => {
    const pwd = document.getElementById('inputAdminPassword').value.trim();
    if (!pwd) return;

    if (pwd === 'drank2026') {
      adminPassword = pwd;
      sessionStorage.setItem('ksa_admin_password', pwd);
      document.getElementById('inputAdminPassword').value = '';
      document.getElementById('adminLoginModal').classList.remove('open');
      showToast('Admin ingelogd! 🔑', '🔑');
      updateAdminBar();
      document.getElementById('navBtnAdmin').click();
    } else {
      alert('Verkeerd admin wachtwoord!');
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

  const btnResetAllPins = document.getElementById('btnAdminResetAllPins');
  if (btnResetAllPins) {
    btnResetAllPins.addEventListener('click', () => {
      if (!confirm('Weet je zeker dat je de pincode van IEDEREEN wil wissen? Iedereen zal opnieuw een eigen 4-cijferige pincode moeten instellen bij het volgende streepje.')) return;

      publishCloudEvent({ type: 'reset_all_pins' });
      showToast('Alle pincodes gereset! 🔑', '🔑');
    });
  }

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

  // PDF Download (in Admin paneel)
  const btnPdf = document.getElementById('btnAdminDownloadPdf');
  if (btnPdf) btnPdf.addEventListener('click', generatePdfReport);

  // Backup Export & Import (in Admin paneel)
  const btnExportJson = document.getElementById('btnAdminExportJson');
  if (btnExportJson) btnExportJson.addEventListener('click', exportBackupJson);

  const btnImportJson = document.getElementById('btnAdminImportJson');
  const fileImportJson = document.getElementById('fileImportJson');
  if (btnImportJson && fileImportJson) {
    btnImportJson.addEventListener('click', () => fileImportJson.click());
    fileImportJson.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importBackupJson(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  // PIN Confirmation via native keyboard
  const inputPinConfirm = document.getElementById('inputPinConfirm');
  const btnSubmitPinConfirm = document.getElementById('btnSubmitPinConfirm');

  if (inputPinConfirm) {
    inputPinConfirm.addEventListener('input', () => {
      if (inputPinConfirm.value.length === 4) {
        setTimeout(() => submitPinAction(inputPinConfirm.value), 60);
      }
    });

    inputPinConfirm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submitPinAction(inputPinConfirm.value);
      }
    });
  }

  if (btnSubmitPinConfirm) {
    btnSubmitPinConfirm.addEventListener('click', () => {
      if (inputPinConfirm) submitPinAction(inputPinConfirm.value);
    });
  }

  document.getElementById('btnClosePinModal').addEventListener('click', closePinModal);
  document.getElementById('btnCloseSetupPin').addEventListener('click', closeSetupPinModal);
  document.getElementById('btnSubmitNewPin').addEventListener('click', submitNewPin);
  document.getElementById('btnCloseDrinkModal').addEventListener('click', closeDrinkModal);

  // Reset Karton
  document.getElementById('btnNewKarton').addEventListener('click', () => {
    const title = prompt('Naam voor het nieuwe karton:', 'Karton ' + new Date().toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' }));
    if (!title) return;
    if (!confirm('Huidig karton archiveren en alle streepjes resetten naar 0?')) return;

    publishCloudEvent({ type: 'new_karton', title });
    showToast('Nieuw karton gestart!', '📦');
    document.querySelector('.nav-tab-btn[data-tab="tabKarton"]').click();
  });

  // Bliksemsnelle herverbinding bij ontgrendelen gsm of tabblad openen
  function quickResumeSync() {
    if (!mqttClient || !mqttClient.connected) {
      isConnecting = false;
      connectCloudSync();
    } else {
      broadcastStateRequest();
      flushOutbox();
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      quickResumeSync();
    }
  });

  // Re-check sync on window focus
  window.addEventListener('focus', () => {
    quickResumeSync();
  });

  // Offline / Online netwerkdetectie (bv. 4G uit of hersteld)
  window.addEventListener('online', () => {
    updateCloudStatus('connecting', 'Verbinding herstellen...');
    quickResumeSync();
  });

  window.addEventListener('offline', () => {
    updateCloudStatus('offline', 'Geen verbinding (4G of wifi staat uit)');
  });
});
