const express = require('express');
const EventEmitter = require('events');
const spaceStations = require('./src/dbs/spacestation');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = 3000;

// ─────────────────────────────────────────────
// FEATURE 3: Logging Middleware
// ─────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

  console.log(`[${ts()}] ${req.method} ${req.path}`);

  res.on('finish', () => {
    console.log(`[${ts()}] ${req.method} ${req.path} - ${res.statusCode} OK (${Date.now() - start}ms)`);
  });

  next();
});

// ─────────────────────────────────────────────
// FEATURE 1a + 1b: Message Relay + Fault Tolerance
// GET /messages?station=earth|mars|jupiter
// ─────────────────────────────────────────────
const DELAYS = { earth: 0, mars: 2000, jupiter: 5000 };

app.get('/messages', async (req, res) => {
  const { station } = req.query;

  if (!station || !DELAYS.hasOwnProperty(station)) {
    return res.status(400).json({ error: 'station must be earth, mars, or jupiter' });
  }

  // Random fault ~30% of the time
  if (Math.random() < 0.3) {
    console.error(`[${new Date().toISOString()}] ERROR: The system is offline. Please try again.`);
    return res.status(503).send('The system is offline. Please try again.');
  }

  await new Promise(resolve => setTimeout(resolve, DELAYS[station]));

  res.json({ message: `Hello from ${station}` });
});

// ─────────────────────────────────────────────
// FEATURE 2: Data Aggregation & Reporting
// GET /reports?station=<optional>
// ─────────────────────────────────────────────
app.get('/reports', (req, res) => {
  const { station } = req.query;

  let data = spaceStations;
  if (station) {
    data = spaceStations.filter(s => s.name === station.toLowerCase());
    if (!data.length) return res.status(404).json({ error: 'Station not found' });
  }

  const stations = data.map(s => ({
    name: s.name,
    status: { crewHealth: s.crewHealth, foodSupply: s.foodSupply },
  }));

  const averageCrewHealth = data.reduce((sum, s) => sum + s.crewHealth, 0) / data.length;

  res.json({ stations, averageCrewHealth: +averageCrewHealth.toFixed(2) });
});

// ─────────────────────────────────────────────
// FEATURE 4: Live Updates — Starship Proximity
// GET  /subscribe  → SSE stream
// POST /location   → update starship coords
// ─────────────────────────────────────────────
const proximityEmitter = new EventEmitter();
const THRESHOLD = 100;
const stationCoords = { earth: { x: 0, y: 0 }, mars: { x: 225, y: 0 }, jupiter: { x: 778, y: 0 } };

app.get('/subscribe', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();

  const handler = data => res.write(`data: ${JSON.stringify(data)}\n\n`);
  proximityEmitter.on('proximity', handler);
  req.on('close', () => proximityEmitter.off('proximity', handler));
});

app.post('/location', (req, res) => {
  const { id, name, x, y } = req.body;
  if (!id || x === undefined || y === undefined) {
    return res.status(400).json({ error: 'id, x, and y are required' });
  }

  for (const [station, coords] of Object.entries(stationCoords)) {
    const dist = Math.sqrt((x - coords.x) ** 2 + (y - coords.y) ** 2);
    if (dist <= THRESHOLD) {
      proximityEmitter.emit('proximity', {
        starship: { id, name: name || id },
        station,
        distance: +dist.toFixed(2),
        timestamp: new Date().toISOString(),
      });
    }
  }

  res.json({ message: 'Location updated' });
});

// ─────────────────────────────────────────────
// FEATURE 5: Robust Security — Contact Form
// GET  /contact → HTML form
// POST /contact → validate + sanitize
// ─────────────────────────────────────────────
function sanitize(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

app.get('/contact', (req, res) => {
  res.send(`
    <form method="POST" action="/contact">
      <input name="name" placeholder="Name" required /><br/>
      <textarea name="message" placeholder="Message" required></textarea><br/>
      <button>Send</button>
    </form>
  `);
});

app.post('/contact', (req, res) => {
  const { name, message } = req.body;
  const ts = new Date().toISOString();

  if (!name || !message) {
    console.log(`[${ts}] CONTACT REJECTED: missing fields`);
    return res.status(400).json({ error: 'name and message are required' });
  }

  const cleanName = sanitize(name.trim());
  const cleanMessage = sanitize(message.trim());

  console.log(`[${ts}] CONTACT SUCCESS from "${cleanName}"`);
  res.json({ success: true, name: cleanName, message: cleanMessage });
});

// ─────────────────────────────────────────────
// FEATURE 6: Realtime Streaming
// GET /updates → chunked stream of space events
// ─────────────────────────────────────────────
const EVENTS = [
  'Meteor shower detected near Mars',
  'Solar flare erupting from Sun sector 7',
  'Spacecraft Odyssey launched from Earth',
  'Comet passing through Jupiter orbit',
];

app.get('/updates', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  let i = 0;
  const send = () => {
    if (i >= EVENTS.length) return res.end();
    res.write(JSON.stringify({ timestamp: new Date().toISOString(), event: EVENTS[i++] }) + '\n');
    setTimeout(send, 1000);
  };
  send();
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
