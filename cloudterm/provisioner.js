// VELQUOR cloud terminal provisioner
// Runs on the Hetzner box (pm2, port 3002, localhost-only behind nginx).
// Starts/stops one MT5-under-Wine container per user ("Instant Connect").
//
// Env (/opt/velquor-term/.env):
//   BRIDGE_ADMIN_TOKEN   same token as the bridge — auth for every route
//   TERMINAL_CRED_KEY    32-byte hex — AES-256-GCM key for stored credentials
//   TERM_CAPACITY        max simultaneous terminals (default 4 on CX23)
//   BRIDGE_URL           passed into containers (default https://bridge.velquor.app)

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 3002;
const ADMIN_TOKEN = process.env.BRIDGE_ADMIN_TOKEN;
const CRED_KEY = Buffer.from(process.env.TERMINAL_CRED_KEY || '', 'hex');
const CAPACITY = parseInt(process.env.TERM_CAPACITY || '4', 10);
const BRIDGE_URL = process.env.BRIDGE_URL || 'https://bridge.velquor.app';
const ACCOUNTS_DIR = '/opt/velquor-term/accounts';
const IMAGE = 'velquor-mt5';

if (!ADMIN_TOKEN || CRED_KEY.length !== 32) {
  console.error(JSON.stringify({ level: 'fatal', msg: 'BRIDGE_ADMIN_TOKEN and 64-hex-char TERMINAL_CRED_KEY required' }));
  process.exit(1);
}
fs.mkdirSync(ACCOUNTS_DIR, { recursive: true, mode: 0o700 });

const log = (obj) => console.log(JSON.stringify({ ts: new Date().toISOString(), ...obj }));

// ── crypto ───────────────────────────────────────────────────────────────────
function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', CRED_KEY, iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}
function decrypt(b64) {
  const buf = Buffer.from(b64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', CRED_KEY, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8'));
}

// ── docker helpers ───────────────────────────────────────────────────────────
const docker = (args) =>
  new Promise((resolve, reject) =>
    execFile('docker', args, { timeout: 60000 }, (err, stdout, stderr) =>
      err ? reject(new Error(stderr || err.message)) : resolve(stdout.trim())));

// Container per (user, slot). Slot '' / 'main' = the classic Instant Connect
// terminal (legacy name, no suffix). Copy-trading slave/master terminals get
// their own slot: velquor-term-<uid>--<slot>.
const cleanId = (s) => String(s || '').replace(/[^a-zA-Z0-9-]/g, '');
const containerName = (userId, slot) => {
  const base = `velquor-term-${cleanId(userId)}`;
  return slot && slot !== 'main' ? `${base}--${cleanId(slot)}` : base;
};

async function runningTerminals() {
  const out = await docker(['ps', '--filter', 'name=velquor-term-', '--format', '{{.Names}}']);
  return out ? out.split('\n') : [];
}

// Copy-mode envs for the entrypoint (enum ints match the EA:
// COPY_OFF=0 MASTER=1 SLAVE=2; LOT_PROPORTIONAL=0 LOT_FIXED=1).
function copyEnv(copy) {
  if (!copy || !copy.mode || !copy.group_id) return [];
  const mode = copy.mode === 'master' ? 1 : copy.mode === 'slave' ? 2 : 0;
  if (!mode) return [];
  return [
    `VQ_COPY_MODE=${mode}`,
    `VQ_COPY_GROUP=${String(copy.group_id)}`,
    `VQ_COPY_LOT_MODE=${copy.lot_mode === 'fixed' ? 1 : 0}`,
    `VQ_COPY_LOT_FIXED=${Number(copy.lot_fixed) > 0 ? Number(copy.lot_fixed) : 0.01}`,
    `VQ_COPY_LOT_MULT=${Number(copy.lot_mult) > 0 ? Number(copy.lot_mult) : 1.0}`,
    `VQ_COPY_MAX_LOT=${Number(copy.max_lot) > 0 ? Number(copy.max_lot) : 10.0}`,
  ];
}

async function startContainer(name, creds, copy) {
  await docker(['rm', '-f', name]).catch(() => {});
  const envFile = path.join(ACCOUNTS_DIR, `${name}.env.tmp`);
  fs.writeFileSync(envFile, [
    `MT5_LOGIN=${creds.login}`,
    `MT5_PASSWORD=${creds.password}`,
    `MT5_SERVER=${creds.server}`,
    `VQ_API_KEY=${creds.api_key}`,
    `BRIDGE_URL=${BRIDGE_URL}`,
    ...copyEnv(copy),
  ].join('\n'), { mode: 0o600 });
  try {
    await docker(['run', '-d', '--name', name,
      '--restart', 'unless-stopped',
      '--memory', '700m', '--cpus', '0.6',
      '--env-file', envFile, IMAGE]);
  } finally {
    fs.unlinkSync(envFile);
  }
}

// ── http ─────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '16kb' }));
app.use((req, res, next) => {
  if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

// POST /provision
// Body: { user_id, login, password, server, api_key, slot?, copy?, reuse_stored? }
// - slot: extra terminal for copy trading (e.g. "c1a2b3c4"); omitted = main.
// - copy: { mode: 'master'|'slave', group_id, lot_mode, lot_fixed, lot_mult, max_lot }
// - reuse_stored: restart the slot with its stored credentials (no password
//   needed — used to flip an existing terminal into copy master/slave mode).
app.post('/provision', async (req, res) => {
  try {
    const { user_id, login, password, server, api_key, slot, copy, reuse_stored } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const name = containerName(user_id, slot);
    const credPath = path.join(ACCOUNTS_DIR, `${name}.cred`);

    let creds;
    if (reuse_stored) {
      if (!fs.existsSync(credPath)) return res.status(404).json({ error: 'no_stored_credentials' });
      creds = decrypt(fs.readFileSync(credPath, 'utf8'));
      if (api_key) creds.api_key = String(api_key);
    } else {
      if (!login || !password || !server || !api_key) {
        return res.status(400).json({ error: 'login, password, server, api_key required' });
      }
      creds = { login: String(login), password: String(password), server: String(server), api_key: String(api_key) };
    }

    const running = await runningTerminals();
    if (!running.includes(name) && running.length >= CAPACITY) {
      return res.status(507).json({ error: 'at_capacity', used: running.length, max: CAPACITY });
    }
    const stored = { ...creds };
    if (copy) stored.copy = copy;   // survives reuse_stored restarts
    fs.writeFileSync(credPath, encrypt(stored), { mode: 0o600 });
    await startContainer(name, creds, copy ?? stored.copy);
    log({ msg: 'provisioned', user: user_id, slot: slot || 'main', login: creds.login, copy: copy?.mode || 'off' });
    res.json({ status: 'starting' });
  } catch (e) {
    log({ level: 'error', msg: 'provision_failed', err: e.message });
    res.status(500).json({ error: 'provision_failed' });
  }
});

app.get('/provision/:userId/status', async (req, res) => {
  try {
    const name = containerName(req.params.userId, req.query.slot);
    const out = await docker(['inspect', '--format',
      '{{.State.Running}} {{.State.StartedAt}} {{.State.RestartCount}}', name])
      .catch(() => null);
    if (!out) return res.json({ exists: false, running: false });
    const [running, startedAt, restarts] = out.split(' ');
    res.json({ exists: true, running: running === 'true', startedAt, restarts: Number(restarts) });
  } catch (e) {
    res.status(500).json({ error: 'status_failed' });
  }
});

// GET /provision/:userId/slots — every terminal this user has (main + copy)
app.get('/provision/:userId/slots', async (req, res) => {
  try {
    const base = `velquor-term-${cleanId(req.params.userId)}`;
    const running = await runningTerminals();
    const mine = running.filter(n => n === base || n.startsWith(`${base}--`));
    res.json({
      count: mine.length,
      slots: mine.map(n => (n === base ? 'main' : n.slice(base.length + 2))),
    });
  } catch (e) {
    res.status(500).json({ error: 'slots_failed' });
  }
});

app.delete('/provision/:userId', async (req, res) => {
  try {
    const name = containerName(req.params.userId, req.query.slot);
    await docker(['rm', '-f', name]).catch(() => {});
    fs.rmSync(path.join(ACCOUNTS_DIR, `${name}.cred`), { force: true });
    log({ msg: 'deprovisioned', user: req.params.userId, slot: req.query.slot || 'main' });
    res.json({ status: 'disconnected' });
  } catch (e) {
    res.status(500).json({ error: 'deprovision_failed' });
  }
});

app.get('/capacity', async (_req, res) => {
  const running = await runningTerminals().catch(() => []);
  res.json({ used: running.length, max: CAPACITY });
});

app.listen(PORT, '127.0.0.1', () => log({ msg: 'provisioner up', port: PORT, capacity: CAPACITY }));
