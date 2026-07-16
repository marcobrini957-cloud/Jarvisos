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

const containerName = (userId) => `velquor-term-${userId.replace(/[^a-zA-Z0-9-]/g, '')}`;

async function runningTerminals() {
  const out = await docker(['ps', '--filter', 'name=velquor-term-', '--format', '{{.Names}}']);
  return out ? out.split('\n') : [];
}

async function startContainer(userId, creds) {
  const name = containerName(userId);
  await docker(['rm', '-f', name]).catch(() => {});
  const envFile = path.join(ACCOUNTS_DIR, `${name}.env.tmp`);
  fs.writeFileSync(envFile, [
    `MT5_LOGIN=${creds.login}`,
    `MT5_PASSWORD=${creds.password}`,
    `MT5_SERVER=${creds.server}`,
    `VQ_API_KEY=${creds.api_key}`,
    `BRIDGE_URL=${BRIDGE_URL}`,
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

app.post('/provision', async (req, res) => {
  try {
    const { user_id, login, password, server, api_key } = req.body || {};
    if (!user_id || !login || !password || !server || !api_key) {
      return res.status(400).json({ error: 'user_id, login, password, server, api_key required' });
    }
    const running = await runningTerminals();
    const name = containerName(user_id);
    if (!running.includes(name) && running.length >= CAPACITY) {
      return res.status(507).json({ error: 'at_capacity', used: running.length, max: CAPACITY });
    }
    const creds = { login: String(login), password: String(password), server: String(server), api_key: String(api_key) };
    fs.writeFileSync(path.join(ACCOUNTS_DIR, `${name}.cred`), encrypt(creds), { mode: 0o600 });
    await startContainer(user_id, creds);
    log({ msg: 'provisioned', user: user_id, login: creds.login, server: creds.server });
    res.json({ status: 'starting' });
  } catch (e) {
    log({ level: 'error', msg: 'provision_failed', err: e.message });
    res.status(500).json({ error: 'provision_failed' });
  }
});

app.get('/provision/:userId/status', async (req, res) => {
  try {
    const name = containerName(req.params.userId);
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

app.delete('/provision/:userId', async (req, res) => {
  try {
    const name = containerName(req.params.userId);
    await docker(['rm', '-f', name]).catch(() => {});
    fs.rmSync(path.join(ACCOUNTS_DIR, `${name}.cred`), { force: true });
    log({ msg: 'deprovisioned', user: req.params.userId });
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
