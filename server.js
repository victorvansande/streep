import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'streepkarton.json');
const ARCHIVES_FILE = path.join(DATA_DIR, 'archives.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default initial state
const DEFAULT_DRINKS = [
  { id: 'pintje', name: 'Pintje', icon: '🍺', price: 1.0 },
  { id: 'cola', name: 'Cola', icon: '🥤', price: 1.0 },
  { id: 'cola_zero', name: 'Cola Zero', icon: '🥤', price: 1.0 },
  { id: 'fanta', name: 'Fanta', icon: '🍊', price: 1.0 },
  { id: 'sprite', name: 'Sprite', icon: '🍋', price: 1.0 },
  { id: 'bruiswater', name: 'Bruiswater', icon: '💧', price: 1.0 }
];

function hashPin(pin) {
  if (!pin) return '';
  return crypto.createHash('sha256').update(String(pin).trim()).digest('hex');
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      return data;
    } catch (e) {
      console.error('Error loading state, restoring defaults:', e);
    }
  }

  // Initial sample data for KSA leiding
  const initial = {
    id: 'karton_' + Date.now(),
    title: 'Karton Najaar ' + new Date().getFullYear(),
    createdAt: new Date().toISOString(),
    pricePerTally: 1.0,
    drinks: DEFAULT_DRINKS,
    members: [
      { id: 'm_1', name: 'Victor', pinHash: '', hasPin: false, tallies: 0, drinks: {} },
      { id: 'm_2', name: 'Thomas', pinHash: '', hasPin: false, tallies: 0, drinks: {} },
      { id: 'm_3', name: 'Lukas', pinHash: '', hasPin: false, tallies: 0, drinks: {} },
      { id: 'm_4', name: 'Arne', pinHash: '', hasPin: false, tallies: 0, drinks: {} },
      { id: 'm_5', name: 'Simon', pinHash: '', hasPin: false, tallies: 0, drinks: {} },
      { id: 'm_6', name: 'Jonas', pinHash: '', hasPin: false, tallies: 0, drinks: {} }
    ],
    history: []
  };

  saveState(initial);
  return initial;
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function loadArchives() {
  if (fs.existsSync(ARCHIVES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(ARCHIVES_FILE, 'utf-8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

function saveArchives(archives) {
  fs.writeFileSync(ARCHIVES_FILE, JSON.stringify(archives, null, 2), 'utf-8');
}

let state = loadState();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function sanitizeState(s) {
  // Never send raw pinHash to the client for privacy
  return {
    ...s,
    members: s.members.map(m => ({
      id: m.id,
      name: m.name,
      hasPin: Boolean(m.pinHash && m.pinHash.length > 0),
      tallies: m.tallies || 0,
      drinks: m.drinks || {}
    })),
    totalTallies: s.members.reduce((sum, m) => sum + (m.tallies || 0), 0),
    totalEuros: s.members.reduce((sum, m) => sum + (m.tallies || 0), 0) * (s.pricePerTally || 1.0)
  };
}

function broadcast(type, payload = {}) {
  const message = JSON.stringify({
    type,
    state: sanitizeState(state),
    ...payload,
    timestamp: Date.now()
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Helper to find real active local IPv4
function getLocalIp() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    const lowerName = name.toLowerCase();
    // Exclude virtual adapters
    if (lowerName.includes('virtual') || lowerName.includes('vbox') || lowerName.includes('vmware') || lowerName.includes('wsl') || lowerName.includes('bluetooth') || lowerName.includes('loopback')) {
      continue;
    }
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.') && !net.address.startsWith('192.168.56.')) {
        candidates.push({ name, address: net.address });
      }
    }
  }

  // Prioritize Wi-Fi or WLAN
  const wifi = candidates.find(c => c.name.toLowerCase().includes('wi-fi') || c.name.toLowerCase().includes('wlan'));
  if (wifi) return wifi.address;

  // Otherwise return the first valid candidate
  if (candidates.length > 0) return candidates[0].address;

  return 'localhost';
}

// REST API
app.get('/api/state', (req, res) => {
  res.json(sanitizeState(state));
});

app.get('/api/network-info', async (req, res) => {
  const localIp = getLocalIp();
  const url = `http://${localIp}:${PORT}`;
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(url, {
      margin: 2,
      width: 280,
      color: {
        dark: '#2c1e14',
        light: '#f5ecd7'
      }
    });
  } catch (err) {
    console.error('QR code generation error:', err);
  }
  res.json({
    localIp,
    port: PORT,
    url,
    qrCodeDataUrl
  });
});

// Set PIN for a member (initial setup or update)
app.post('/api/set-pin', (req, res) => {
  const { memberId, pin, oldPin } = req.body;
  const member = state.members.find(m => m.id === memberId);
  if (!member) {
    return res.status(404).json({ error: 'Lid niet gevonden' });
  }

  if (!pin || String(pin).trim().length !== 4 || !/^\d{4}$/.test(String(pin).trim())) {
    return res.status(400).json({ error: 'Pincode moet exact 4 cijfers bevatten' });
  }

  // If member already had a PIN, verify oldPin
  if (member.pinHash) {
    if (member.pinHash !== hashPin(oldPin)) {
      return res.status(403).json({ error: 'Oude pincode is onjuist' });
    }
  }

  member.pinHash = hashPin(pin);
  member.hasPin = true;
  saveState(state);

  broadcast('PIN_UPDATED', { memberId, memberName: member.name });
  res.json({ success: true, message: 'Pincode succesvol ingesteld!' });
});

// Verify PIN
app.post('/api/verify-pin', (req, res) => {
  const { memberId, pin } = req.body;
  const member = state.members.find(m => m.id === memberId);
  if (!member) {
    return res.status(404).json({ error: 'Lid niet gevonden' });
  }
  if (!member.pinHash) {
    return res.json({ valid: true, needsSetup: true });
  }
  const valid = member.pinHash === hashPin(pin);
  res.json({ valid, needsSetup: false });
});

// Tally (+1, +5, or drink selection)
app.post('/api/tally', (req, res) => {
  const { memberId, count = 1, drinkId = 'pintje', pin } = req.body;
  const member = state.members.find(m => m.id === memberId);
  if (!member) {
    return res.status(404).json({ error: 'Lid niet gevonden' });
  }

  // Must have PIN set
  if (!member.pinHash) {
    return res.status(400).json({ error: 'Stel eerst een pincode in voor dit lid', needsPinSetup: true });
  }

  // Verify PIN
  if (member.pinHash !== hashPin(pin)) {
    return res.status(403).json({ error: 'Foutieve pincode' });
  }

  const drink = state.drinks.find(d => d.id === drinkId) || state.drinks[0];
  const tallyCount = Math.max(1, parseInt(count, 10) || 1);

  member.tallies = (member.tallies || 0) + tallyCount;
  if (!member.drinks) member.drinks = {};
  member.drinks[drink.id] = (member.drinks[drink.id] || 0) + tallyCount;

  const logEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    memberId: member.id,
    memberName: member.name,
    count: tallyCount,
    drinkId: drink.id,
    drinkName: drink.name,
    drinkIcon: drink.icon
  };

  state.history.unshift(logEntry);
  if (state.history.length > 500) {
    state.history.pop();
  }

  saveState(state);

  broadcast('TALLY_ADDED', {
    memberId: member.id,
    memberName: member.name,
    count: tallyCount,
    drink: drink,
    newTotal: member.tallies
  });

  res.json({
    success: true,
    tallies: member.tallies,
    totalEuros: member.tallies * (state.pricePerTally || 1.0),
    logEntry
  });
});

// Undo latest tally for a member
app.post('/api/undo', (req, res) => {
  const { memberId, pin } = req.body;
  const member = state.members.find(m => m.id === memberId);
  if (!member) return res.status(404).json({ error: 'Lid niet gevonden' });

  if (member.pinHash && member.pinHash !== hashPin(pin)) {
    return res.status(403).json({ error: 'Foutieve pincode' });
  }

  const lastLogIndex = state.history.findIndex(h => h.memberId === memberId);
  if (lastLogIndex === -1) {
    return res.status(400).json({ error: 'Geen recente streepjes gevonden om terug te draaien' });
  }

  const lastLog = state.history[lastLogIndex];
  member.tallies = Math.max(0, (member.tallies || 0) - lastLog.count);
  if (member.drinks && member.drinks[lastLog.drinkId]) {
    member.drinks[lastLog.drinkId] = Math.max(0, member.drinks[lastLog.drinkId] - lastLog.count);
  }

  state.history.splice(lastLogIndex, 1);
  saveState(state);

  broadcast('TALLY_UNDO', {
    memberId: member.id,
    memberName: member.name,
    revertedCount: lastLog.count,
    drinkName: lastLog.drinkName
  });

  res.json({ success: true, tallies: member.tallies });
});

// Add new member
app.post('/api/member', (req, res) => {
  const { name, pin } = req.body;
  const cleanName = (name || '').trim();
  if (!cleanName) {
    return res.status(400).json({ error: 'Naam is verplicht' });
  }

  if (state.members.some(m => m.name.toLowerCase() === cleanName.toLowerCase())) {
    return res.status(400).json({ error: 'Deze naam staat al op het karton' });
  }

  const newMember = {
    id: 'm_' + Date.now(),
    name: cleanName,
    pinHash: pin && /^\d{4}$/.test(pin) ? hashPin(pin) : '',
    hasPin: Boolean(pin && /^\d{4}$/.test(pin)),
    tallies: 0,
    drinks: {}
  };

  state.members.push(newMember);
  saveState(state);

  broadcast('MEMBER_ADDED', { memberName: cleanName });
  res.json({ success: true, member: newMember });
});

// Delete a member
app.delete('/api/member/:id', (req, res) => {
  const { id } = req.params;
  const memberIndex = state.members.findIndex(m => m.id === id);
  if (memberIndex === -1) {
    return res.status(404).json({ error: 'Lid niet gevonden' });
  }

  const removedName = state.members[memberIndex].name;
  state.members.splice(memberIndex, 1);
  saveState(state);

  broadcast('MEMBER_REMOVED', { memberName: removedName });
  res.json({ success: true });
});

// Settle / Verrekening maken & start new cardboard sheet
app.post('/api/settle', (req, res) => {
  const { newTitle } = req.body;
  const archives = loadArchives();

  const totalTallies = state.members.reduce((sum, m) => sum + (m.tallies || 0), 0);
  const totalEuros = totalTallies * (state.pricePerTally || 1.0);

  const archiveEntry = {
    id: state.id || 'karton_' + Date.now(),
    title: state.title || 'Vorig Streepkarton',
    settledAt: new Date().toISOString(),
    totalTallies,
    totalEuros,
    members: state.members.map(m => ({
      name: m.name,
      tallies: m.tallies || 0,
      euros: (m.tallies || 0) * (state.pricePerTally || 1.0),
      drinks: m.drinks || {}
    }))
  };

  archives.unshift(archiveEntry);
  saveArchives(archives);

  // Reset active karton: keep members and their PINs, reset tallies & drink counters
  state.id = 'karton_' + Date.now();
  state.title = (newTitle || '').trim() || ('Karton ' + new Date().toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' }));
  state.createdAt = new Date().toISOString();
  state.history = [];
  state.members.forEach(m => {
    m.tallies = 0;
    m.drinks = {};
  });

  saveState(state);
  broadcast('KARTON_SETTLED', { archive: archiveEntry, newTitle: state.title });

  res.json({ success: true, archive: archiveEntry, newState: sanitizeState(state) });
});

app.get('/api/archives', (req, res) => {
  res.json(loadArchives());
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    state: sanitizeState(state),
    timestamp: Date.now()
  }));

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (e) {
      // ignore
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('==================================================');
  console.log('📦 KSA DIGITAAL STREEPKARTON GESTART!');
  console.log(`📱 Surf op smartphone naar: http://${localIp}:${PORT}`);
  console.log(`💻 Of lokaal:              http://localhost:${PORT}`);
  console.log('==================================================');
});
