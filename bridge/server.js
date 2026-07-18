'use strict';

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const {
  mapOpenPosition, mapClosedTrade, versionLt,
  SETTINGS_DEFAULTS, mergeSettings,
} = require('./lib');

const VERSION    = '2.0.0';
const STARTED_AT = new Date();

// ─── Structured logging (JSON lines — pm2/journald friendly) ─────────────────
function log(level, msg, meta) {
  const line = { ts: new Date().toISOString(), level, msg, ...(meta || {}) };
  (level === 'error' ? console.error : console.log)(JSON.stringify(line));
}

// ─── Supabase client (service role — bypasses RLS) ───────────────────────────
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  log('error', 'missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — refusing to start');
  process.exit(1);
}
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ─── Live settings (polled from bridge_settings, admin-editable) ─────────────
let settings = { ...SETTINGS_DEFAULTS };
let settingsSource = 'defaults'; // 'db' once the table is readable

async function refreshSettings() {
  try {
    const { data, error } = await supabase
      .from('bridge_settings')
      .select('maintenance_mode, sync_enabled, copy_enabled, rate_limit_sync, rate_limit_copy, min_ea_version')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    settings = mergeSettings(data);
    if (settingsSource !== 'db') {
      settingsSource = 'db';
      log('info', 'settings loaded from bridge_settings', settings);
    }
  } catch (e) {
    if (settingsSource === 'defaults') {
      // Table probably doesn't exist yet (migration not run) — stay on defaults.
      log('warn', 'bridge_settings unreadable, using defaults', { error: e.message });
    } else {
      log('error', 'settings refresh failed, keeping last known', { error: e.message });
    }
  }
}

// ─── Metrics (in-memory since boot; snapshot goes out with the heartbeat) ────
const metrics = {
  requests: 0, syncs: 0, signals: 0, polls: 0, acks: 0,
  unauthorized: 0, banned_rejects: 0, errors: 0,
  last_error: null, last_error_at: null,
  active_keys_1h: 0,
};
const seenKeys = new Map(); // apiKey -> last seen ms (for active_keys_1h)

function touchKey(apiKey) {
  const now = Date.now();
  seenKeys.set(apiKey, now);
  if (seenKeys.size > 5000) {
    for (const [k, ts] of seenKeys) if (now - ts > 3600_000) seenKeys.delete(k);
  }
}

async function heartbeat() {
  const now = Date.now();
  metrics.active_keys_1h = [...seenKeys.values()].filter(ts => now - ts < 3600_000).length;
  try {
    await supabase.from('bridge_settings').update({
      bridge_last_seen:  new Date().toISOString(),
      bridge_version:    VERSION,
      bridge_started_at: STARTED_AT.toISOString(),
      bridge_stats:      { ...metrics, rss_mb: Math.round(process.memoryUsage().rss / 1048576) },
    }).eq('id', 1);
  } catch { /* table may not exist yet — heartbeat is best-effort */ }
}

// ─── Auth: API key → user (60 s cache; carries banned + tier) ────────────────
const userCache = new Map(); // apiKey -> { user, ts }
const USER_CACHE_TTL = 60_000;

async function resolveUser(apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('vq_')) return null;
  const hit = userCache.get(apiKey);
  if (hit && Date.now() - hit.ts < USER_CACHE_TTL) return hit.user;

  let user = null;
  let { data, error } = await supabase
    .from('user_profiles')
    .select('id, banned, subscription_tier')
    .eq('velquor_api_key', apiKey)
    .maybeSingle();

  if (error && /column|banned|subscription_tier/i.test(error.message)) {
    // Migration not run yet — fall back to the minimal shape so syncing still works.
    ({ data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('velquor_api_key', apiKey)
      .maybeSingle());
  }
  if (!error && data) {
    user = { id: data.id, banned: data.banned === true, tier: data.subscription_tier ?? 'free' };
  }
  userCache.set(apiKey, { user, ts: Date.now() });
  if (userCache.size > 5000) userCache.clear();
  return user;
}

// Standard auth for EA-facing routes. Returns user or null (response sent).
async function authed(req, res) {
  const user = await resolveUser(req.headers['x-api-key']);
  if (!user) {
    metrics.unauthorized++;
    res.status(401).json({ error: 'invalid_api_key' });
    return null;
  }
  if (user.banned) {
    metrics.banned_rejects++;
    res.status(403).json({ error: 'account_banned' });
    return null;
  }
  return user;
}

// Slave-login lookup for /sync filtering (60 s cache, same shape as userCache)
const slaveLoginCache = new Map(); // userId -> { logins: Set<number>, ts }
async function isSlaveLogin(userId, loginNum) {
  const hit = slaveLoginCache.get(userId);
  if (hit && Date.now() - hit.ts < 60_000) return hit.logins.has(loginNum);
  const { data } = await supabase
    .from('copy_accounts')
    .select('mt5_login')
    .eq('user_id', userId)
    .eq('role', 'slave');
  const logins = new Set((data || []).map(r => Number(r.mt5_login)));
  slaveLoginCache.set(userId, { logins, ts: Date.now() });
  return logins.has(loginNum);
}

async function resolveCopyAccount(userId, groupId, mt5Login, role) {
  if (!userId || !groupId || !mt5Login) return null;
  const { data, error } = await supabase
    .from('copy_accounts')
    .select('id, status')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('role', role)
    .eq('mt5_login', String(mt5Login))
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// ─── Express setup ───────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1); // behind nginx
app.use(helmet());
app.use(express.json({ limit: '2mb' }));

// Async handler wrapper — one thrown error must never kill the process.
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Request log + counters
app.use((req, res, next) => {
  metrics.requests++;
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (res.statusCode >= 400 || ms > 2000) {
      log(res.statusCode >= 500 ? 'error' : 'warn', 'request', {
        method: req.method, path: req.path, status: res.statusCode, ms: Math.round(ms),
        key: typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'].slice(0, 8) : undefined,
      });
    }
  });
  next();
});

// Maintenance mode — everything except /health and /admin gets 503
app.use((req, res, next) => {
  if (settings.maintenance_mode && req.path !== '/health' && !req.path.startsWith('/admin')) {
    return res.status(503).json({ error: 'maintenance', retry_after_s: 60 });
  }
  next();
});

// Rate limits — max reads live settings, so admin changes apply without restart.
// Keyed per api-key + MT5 login: one user runs several cloud terminals (master +
// slaves) on the same key, and a slave's copy polling must never starve the
// master's /copy/signal posts.
const keyOrIp = (req) => {
  const key = typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : req.ip;
  const login = typeof req.headers['x-mt5-login'] === 'string' ? req.headers['x-mt5-login'] : '';
  return `${key}:${login}`;
};
app.use('/sync', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => settings.rate_limit_sync,
  keyGenerator: keyOrIp, standardHeaders: true, legacyHeaders: false,
}));
app.use('/copy', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => settings.rate_limit_copy,
  keyGenerator: keyOrIp, standardHeaders: true, legacyHeaders: false,
}));

// ─── POST /sync ───────────────────────────────────────────────────────────────
app.post('/sync', wrap(async (req, res) => {
  if (!settings.sync_enabled) return res.status(503).json({ error: 'sync_disabled' });

  const user = await authed(req, res);
  if (!user) return;
  touchKey(req.headers['x-api-key']);

  const body = req.body || {};

  if (body.ea_version && versionLt(body.ea_version, settings.min_ea_version)) {
    return res.status(426).json({ error: 'upgrade_required', min_version: settings.min_ea_version });
  }

  // Heartbeat any copy-trading rows for this terminal: a quiet master would
  // otherwise sit at 'pending' forever (signals/polls are the only other
  // touchpoints). Login comes from the X-Mt5-Login header (EA + sidecar).
  const mt5Login = req.headers['x-mt5-login'];
  const loginNum = mt5Login && /^\d{3,12}$/.test(String(mt5Login)) ? Number(mt5Login) : null;
  if (loginNum) {
    // Heartbeat + live account figures — the only place slave balances are
    // stored (they're excluded from account_snapshots by design).
    const hb = { last_seen_at: new Date().toISOString(), status: 'active' };
    if (body.account) {
      hb.balance           = body.account.balance           ?? null;
      hb.equity            = body.account.equity            ?? null;
      hb.open_trades_count = body.account.open_trades_count ?? null;
    }
    await supabase
      .from('copy_accounts')
      .update(hb)
      .eq('user_id', user.id)
      .eq('mt5_login', String(mt5Login))
      .in('status', ['pending', 'active']);
  }

  // Copy-slave terminals sync only as heartbeat + copy plumbing: their
  // balances and trades must NOT land in the user's journal/equity data
  // (they'd blend with the master account and double-count every mirror).
  if (loginNum && await isSlaveLogin(user.id, loginNum)) {
    return res.json({ ok: true, slave: true });
  }

  // 1. account snapshot — tagged with the terminal's login so multi-terminal
  // users (copy master + slaves on one API key) don't blend balances.
  if (body.account) {
    const acc = body.account;
    await supabase.from('account_snapshots').insert({
      user_id:           user.id,
      mt5_login:         loginNum,
      balance:           acc.balance           ?? 0,
      equity:            acc.equity            ?? 0,
      margin_used:       acc.margin_used       ?? 0,
      free_margin:       acc.free_margin       ?? 0,
      margin_level_pct:  acc.margin_level_pct  ?? 0,
      open_trades_count: acc.open_trades_count ?? 0,
      snapshot_at:       new Date().toISOString(),
    });
  }

  // 2+3. trades — batched into at most two upsert calls instead of one per row
  const rows = [
    ...(Array.isArray(body.open_positions) ? body.open_positions.map(p => mapOpenPosition(p, user.id)) : []),
    ...(Array.isArray(body.closed_trades)  ? body.closed_trades.map(t => mapClosedTrade(t, user.id))   : []),
  ].map(r => ({ ...r, mt5_login: loginNum }));
  if (rows.length > 0) {
    const { error } = await supabase.from('trades').upsert(rows, { onConflict: 'mt5_ticket' });
    if (error) {
      metrics.errors++;
      metrics.last_error = `trades upsert: ${error.message}`;
      metrics.last_error_at = new Date().toISOString();
      log('error', 'trades upsert failed', { user: user.id, count: rows.length, error: error.message });
      return res.status(500).json({ error: 'trades_upsert_failed' });
    }
  }

  // 4. EA heartbeat on the profile
  await supabase.from('user_profiles').update({
    ea_connected: true,
    ea_last_seen: new Date().toISOString(),
    ea_version:   body.ea_version ?? null,
    ea_broker:    body.broker     ?? null,
  }).eq('id', user.id);

  metrics.syncs++;
  return res.json({ ok: true, ts: Date.now() });
}));

// ─── Hot-path caches for /copy/signal (10 s TTL) ─────────────────────────────
// Latency budget: every awaited Supabase round-trip here delays every mirror.
// Staleness is bounded and safe — a just-added slave misses at most one
// 10 s window, and lot-config edits apply within 10 s.
const HOT_TTL = 10_000;
const groupConfigCache = new Map(); // groupId -> { group, ts }
const groupSlavesCache = new Map(); // groupId -> { slaves, ts }
const masterAccCache   = new Map(); // `${userId}:${groupId}:${login}` -> { acc, ts }

async function cachedMasterAcc(userId, groupId, login) {
  const key = `${userId}:${groupId}:${login}`;
  const hit = masterAccCache.get(key);
  if (hit && Date.now() - hit.ts < 60_000) return hit.acc;
  const acc = await resolveCopyAccount(userId, groupId, login, 'master');
  if (acc) masterAccCache.set(key, { acc, ts: Date.now() });
  return acc;
}

async function cachedGroup(groupId, userId) {
  const hit = groupConfigCache.get(groupId);
  if (hit && Date.now() - hit.ts < HOT_TTL) return hit.group;
  const { data: group } = await supabase
    .from('copy_groups')
    .select('id, active, lot_mode, lot_fixed, lot_multiplier, max_lot')
    .eq('id', groupId)
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();
  if (group) groupConfigCache.set(groupId, { group, ts: Date.now() });
  return group;
}

async function cachedSlaves(groupId) {
  const hit = groupSlavesCache.get(groupId);
  if (hit && Date.now() - hit.ts < HOT_TTL) return hit.slaves;
  const { data: slaves } = await supabase
    .from('copy_accounts')
    .select('id')
    .eq('group_id', groupId)
    .eq('role', 'slave')
    .eq('status', 'active');
  groupSlavesCache.set(groupId, { slaves: slaves || [], ts: Date.now() });
  return slaves || [];
}

// ─── POST /copy/signal — master broadcasts a new trade signal ─────────────────
// The signal payload is handed to waiting slave long-polls IN MEMORY before
// anything touches the database; copy_signals/copy_log inserts happen right
// after, off the response path, purely as the audit trail. If an ack races
// ahead of its copy_log insert, the ack 403s and the sidecar retries it.
app.post('/copy/signal', wrap(async (req, res) => {
  if (!settings.copy_enabled) return res.status(503).json({ error: 'copy_disabled' });

  const user = await authed(req, res);
  if (!user) return;
  touchKey(req.headers['x-api-key']);

  const groupId  = req.headers['x-copy-group'];
  const mt5Login = req.headers['x-mt5-login'];
  if (!groupId)  return res.status(400).json({ error: 'missing_x_copy_group' });
  if (!mt5Login) return res.status(400).json({ error: 'missing_x_mt5_login' });

  const masterAcc = await cachedMasterAcc(user.id, groupId, mt5Login);
  if (!masterAcc) return res.status(403).json({ error: 'not_master_in_group' });

  const group = await cachedGroup(groupId, user.id);
  if (!group) return res.status(403).json({ error: 'group_inactive_or_not_found' });

  const { signal } = req.body || {};
  if (!signal || !signal.type || !signal.ticket || !signal.symbol) {
    return res.status(400).json({ error: 'missing_signal_fields' });
  }

  const slaves = await cachedSlaves(groupId);
  const sigId  = crypto.randomUUID();

  // Deliver instantly to any waiting long-poll, in the exact shape /copy/poll
  // returns, with pre-generated copy_log ids the EA will ack against.
  const deliveries = slaves.map(s => ({
    slaveId: s.id,
    logId:   crypto.randomUUID(),
  }));
  for (const d of deliveries) {
    notifySlave(d.slaveId, [{
      log_id:         d.logId,
      signal_type:    signal.type,
      master_ticket:  Number(signal.ticket),
      symbol:         signal.symbol,
      trade_type:     signal.trade_type,
      master_lots:    signal.lot_size    ?? null,
      open_price:     signal.open_price  ?? null,
      stop_loss:      signal.stop_loss   ?? 0,
      take_profit:    signal.take_profit ?? 0,
      close_price:    signal.close_price ?? null,
      lot_mode:       group.lot_mode,
      lot_fixed:      group.lot_fixed,
      lot_multiplier: group.lot_multiplier,
      max_lot:        group.max_lot,
    }]);
  }

  metrics.signals++;
  res.json({ ok: true, signal_id: sigId, slaves_notified: slaves.length });

  // Audit trail — after the response, but still awaited inside wrap so a DB
  // failure is logged. Slaves not waiting right now pick the rows up via the
  // pending-query fallback on their next poll.
  const { error: sigErr } = await supabase
    .from('copy_signals')
    .insert({
      id:                sigId,
      group_id:          groupId,
      master_account_id: masterAcc.id,
      signal_type:       signal.type,
      master_ticket:     Number(signal.ticket),
      symbol:            signal.symbol,
      trade_type:        signal.trade_type,
      lot_size:          signal.lot_size    ?? null,
      open_price:        signal.open_price  ?? null,
      stop_loss:         signal.stop_loss   ?? 0,
      take_profit:       signal.take_profit ?? 0,
      close_price:       signal.close_price ?? null,
    });
  if (sigErr) {
    metrics.errors++;
    metrics.last_error = `signal insert: ${sigErr.message}`;
    metrics.last_error_at = new Date().toISOString();
    return;
  }
  if (deliveries.length > 0) {
    const { error: logErr } = await supabase.from('copy_log').insert(
      deliveries.map(d => ({ id: d.logId, signal_id: sigId, slave_account_id: d.slaveId, status: 'pending' }))
    );
    if (logErr) {
      metrics.errors++;
      metrics.last_error = `copy_log insert: ${logErr.message}`;
      metrics.last_error_at = new Date().toISOString();
    }
  }
}));

// ─── Long-poll plumbing: /copy/signal wakes waiting /copy/poll requests ───────
// Waiters resolve WITH the signal payloads, so a woken poll returns them
// directly — zero database reads between master signal and slave delivery.
const slaveWaiters = new Map(); // slaveAccountId -> Set<fn(payloads)>
function notifySlave(slaveAccId, payloads) {
  const set = slaveWaiters.get(slaveAccId);
  if (!set) return;
  for (const fn of set) fn(payloads);
}
// Arm BEFORE querying for pending rows, or a signal landing in between would
// be missed and only delivered at the wait timeout.
function armSlaveWaiter(slaveAccId, ms, req) {
  let done = false;
  let resolveFn;
  const promise = new Promise(resolve => { resolveFn = resolve; });
  const finish = (payloads) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    const set = slaveWaiters.get(slaveAccId);
    if (set) { set.delete(finish); if (set.size === 0) slaveWaiters.delete(slaveAccId); }
    resolveFn(payloads ?? null);
  };
  const timer = setTimeout(finish, ms);
  if (!slaveWaiters.has(slaveAccId)) slaveWaiters.set(slaveAccId, new Set());
  slaveWaiters.get(slaveAccId).add(finish);
  req.on('close', () => finish());
  return { promise, cancel: () => finish() };
}

async function fetchPendingSignals(slaveAccId) {
  const { data: pending } = await supabase
    .from('copy_log')
    .select(`
      id,
      copy_signals(
        id, signal_type, master_ticket, symbol, trade_type, lot_size,
        open_price, stop_loss, take_profit, close_price,
        copy_groups(lot_mode, lot_fixed, lot_multiplier, max_lot)
      )
    `)
    .eq('slave_account_id', slaveAccId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);
  return pending || [];
}

// ─── GET /copy/poll — slave polls for pending trade signals ───────────────────
// ?wait=<seconds> (max 25) holds the request open until a signal arrives, so
// sidecars sit in a blocking poll instead of hammering every few seconds.
app.get('/copy/poll', wrap(async (req, res) => {
  if (!settings.copy_enabled) return res.status(503).json({ error: 'copy_disabled' });

  const user = await authed(req, res);
  if (!user) return;
  touchKey(req.headers['x-api-key']);

  const groupId  = req.headers['x-copy-group'];
  const mt5Login = req.headers['x-mt5-login'];
  if (!groupId || !mt5Login) return res.status(400).json({ error: 'missing_headers' });

  const slaveAcc = await resolveCopyAccount(user.id, groupId, mt5Login, 'slave');
  if (!slaveAcc) return res.status(403).json({ error: 'not_slave_in_group' });

  await supabase
    .from('copy_accounts')
    .update({ status: 'active', last_seen_at: new Date().toISOString() })
    .eq('id', slaveAcc.id);

  const waitS = Math.min(Number(req.query.wait) || 0, 25);
  const waiter = waitS > 0 ? armSlaveWaiter(slaveAcc.id, waitS * 1000, req) : null;

  let pending = await fetchPendingSignals(slaveAcc.id);
  if (pending.length === 0 && waiter) {
    const pushed = await waiter.promise;
    if (req.destroyed) return;
    if (pushed) {
      // Fast path: payloads pushed in memory by /copy/signal — no DB read.
      metrics.polls++;
      return res.json({ signals: pushed });
    }
    // Timed out — one last catch-up query for rows that arrived while the
    // inbox was occupied or via other paths.
    pending = await fetchPendingSignals(slaveAcc.id);
  }
  waiter?.cancel();

  const signals = pending.map(p => {
    const s  = p.copy_signals;
    const cg = s?.copy_groups;
    return {
      log_id:         p.id,
      signal_type:    s?.signal_type,
      master_ticket:  s?.master_ticket,
      symbol:         s?.symbol,
      trade_type:     s?.trade_type,
      master_lots:    s?.lot_size,
      open_price:     s?.open_price,
      stop_loss:      s?.stop_loss,
      take_profit:    s?.take_profit,
      close_price:    s?.close_price,
      lot_mode:       cg?.lot_mode,
      lot_fixed:      cg?.lot_fixed,
      lot_multiplier: cg?.lot_multiplier,
      max_lot:        cg?.max_lot,
    };
  });

  metrics.polls++;
  return res.json({ signals });
}));

// ─── POST /copy/ack — slave reports execution result ─────────────────────────
app.post('/copy/ack', wrap(async (req, res) => {
  const user = await authed(req, res);
  if (!user) return;

  const { log_id, status, slave_ticket, slave_lots, error_message } = req.body || {};
  if (!log_id || !status) return res.status(400).json({ error: 'missing_fields' });

  const { data: logEntry } = await supabase
    .from('copy_log')
    .select('id, slave_account_id, copy_accounts!inner(user_id)')
    .eq('id', log_id)
    .maybeSingle();
  if (!logEntry || logEntry.copy_accounts?.user_id !== user.id) {
    return res.status(403).json({ error: 'unauthorized_log_entry' });
  }

  // pending-only: a redelivered signal's late 'skipped'/'failed' ack must
  // never overwrite the real execution result already recorded.
  const { data: updated } = await supabase.from('copy_log').update({
    status:        status,
    slave_ticket:  slave_ticket  ?? null,
    slave_lots:    slave_lots    ?? null,
    error_message: error_message ?? null,
    executed_at:   new Date().toISOString(),
  }).eq('id', log_id).eq('status', 'pending').select('id');

  metrics.acks++;
  return res.json({ ok: true, stale: !updated || updated.length === 0 });
}));

// ─── POST /disconnect ─────────────────────────────────────────────────────────
app.post('/disconnect', wrap(async (req, res) => {
  const user = await authed(req, res);
  if (!user) return;
  await supabase.from('user_profiles').update({ ea_connected: false }).eq('id', user.id);
  return res.json({ ok: true });
}));

// ─── GET /health ──────────────────────────────────────────────────────────────
app.get('/health', wrap(async (req, res) => {
  let db = 'ok';
  if (req.query.deep === '1') {
    const { error } = await supabase.from('user_profiles').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) db = 'error';
  }
  res.json({
    status: settings.maintenance_mode ? 'maintenance' : 'ok',
    version: VERSION,
    uptime_s: Math.round((Date.now() - STARTED_AT.getTime()) / 1000),
    db,
    ts: Date.now(),
  });
}));

// ─── /admin/* — token-gated ops endpoints (used by the VELQUOR admin console) ─
function adminAuthed(req, res) {
  const token = process.env.BRIDGE_ADMIN_TOKEN;
  if (!token) { res.status(501).json({ error: 'admin_disabled' }); return false; }
  if (req.headers.authorization !== `Bearer ${token}`) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

app.get('/admin/stats', wrap(async (req, res) => {
  if (!adminAuthed(req, res)) return;
  res.json({
    version:    VERSION,
    started_at: STARTED_AT.toISOString(),
    uptime_s:   Math.round((Date.now() - STARTED_AT.getTime()) / 1000),
    rss_mb:     Math.round(process.memoryUsage().rss / 1048576),
    settings, settings_source: settingsSource,
    metrics:    { ...metrics },
  });
}));

app.post('/admin/reload', wrap(async (req, res) => {
  if (!adminAuthed(req, res)) return;
  await refreshSettings();
  userCache.clear();
  log('info', 'admin reload: settings refreshed, user cache cleared');
  res.json({ ok: true, settings });
}));

// ─── Error handling — a bad request must never take the bridge down ──────────
app.use((err, req, res, _next) => {
  metrics.errors++;
  metrics.last_error = err.message;
  metrics.last_error_at = new Date().toISOString();
  log('error', 'unhandled route error', { path: req.path, error: err.message, stack: err.stack });
  if (!res.headersSent) res.status(500).json({ error: 'internal_error' });
});

process.on('unhandledRejection', (reason) => {
  metrics.errors++;
  log('error', 'unhandledRejection', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
  log('error', 'uncaughtException — exiting for pm2 restart', { error: err.message, stack: err.stack });
  process.exit(1);
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);

refreshSettings();
const settingsTimer  = setInterval(refreshSettings, 30_000);
const heartbeatTimer = setInterval(heartbeat, 30_000);

const server = app.listen(PORT, '127.0.0.1', () => {
  log('info', `velquor-bridge v${VERSION} listening`, { port: PORT });
  heartbeat();
});

function shutdown(sig) {
  log('info', `${sig} received — shutting down gracefully`);
  clearInterval(settingsTimer);
  clearInterval(heartbeatTimer);
  server.close(async () => {
    await heartbeat().catch(() => {});
    log('info', 'shutdown complete');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
