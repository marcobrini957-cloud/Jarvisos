'use strict';

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const { detectSession, calcPips } = require('./lib');

// ─── Supabase client (service role — bypasses RLS) ───────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ─── Express setup ───────────────────────────────────────────────────────────
const app = express();
app.use(helmet());
app.use(express.json({ limit: '2mb' }));

// Per-key rate limiter (300 req / 15 min ≈ one sync every 3 s)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/sync', limiter);

// Tighter limiter for copy signal (60 / 15 min)
const copyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.COPY_RATE_LIMIT_MAX || '60', 10),
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/copy/signal', copyLimiter);

// ─── Helpers ─────────────────────────────────────────────────────────────────
// ─── Auth helpers ─────────────────────────────────────────────────────────────
async function resolveUser(apiKey) {
  if (!apiKey || !apiKey.startsWith('vq_')) return null;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('velquor_api_key', apiKey)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

// Resolve the copy_accounts row for this request
// Reads X-Copy-Group + X-Mt5-Login headers + user_id derived from API key
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

// ─── POST /sync ───────────────────────────────────────────────────────────────
app.post('/sync', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const userId = await resolveUser(apiKey);
  if (!userId) return res.status(401).json({ error: 'invalid_api_key' });

  const body = req.body;

  // ── 1. account_snapshots ──────────────────────────────────────────────────
  if (body.account) {
    const acc = body.account;
    await supabase.from('account_snapshots').insert({
      user_id:           userId,
      balance:           acc.balance           ?? 0,
      equity:            acc.equity            ?? 0,
      margin_used:       acc.margin_used       ?? 0,
      free_margin:       acc.free_margin       ?? 0,
      margin_level_pct:  acc.margin_level_pct  ?? 0,
      open_trades_count: acc.open_trades_count ?? 0,
      recorded_at:       new Date().toISOString(),
    });
  }

  // ── 2. open positions ─────────────────────────────────────────────────────
  if (Array.isArray(body.open_positions)) {
    for (const pos of body.open_positions) {
      const openTime  = new Date(pos.open_time * 1000).toISOString();
      const tradeType = pos.trade_type === 0 ? 'buy' : 'sell';
      const session   = detectSession(pos.open_time * 1000);
      const pips      = calcPips(pos.symbol, pos.open_price, pos.current_price, tradeType);

      await supabase.from('trades').upsert({
        user_id:            userId,
        mt5_ticket:         String(pos.ticket),
        symbol:             pos.symbol,
        trade_type:         tradeType,
        lot_size:           pos.lot_size,
        open_price:         pos.open_price,
        close_price:        pos.current_price,
        stop_loss:          pos.stop_loss  ?? null,
        take_profit:        pos.take_profit ?? null,
        open_time:          openTime,
        close_time:         null,
        duration_minutes:   null,
        pips:               pips,
        profit_usd:         pos.profit     ?? 0,
        commission:         pos.commission ?? 0,
        swap:               pos.swap       ?? 0,
        net_profit:         (pos.profit ?? 0) + (pos.commission ?? 0) + (pos.swap ?? 0),
        status:             'open',
        session:            session,
        screenshot_missing: true,
      }, { onConflict: 'mt5_ticket' });
    }
  }

  // ── 3. closed trades (history) ────────────────────────────────────────────
  if (Array.isArray(body.closed_trades)) {
    for (const trade of body.closed_trades) {
      const openTime    = new Date(trade.open_time  * 1000).toISOString();
      const closeTime   = new Date(trade.close_time * 1000).toISOString();
      const durationMin = Math.round((trade.close_time - trade.open_time) / 60);
      const tradeType   = trade.trade_type === 0 ? 'buy' : 'sell';
      const session     = detectSession(trade.open_time * 1000);
      const pips        = calcPips(trade.symbol, trade.open_price, trade.close_price, tradeType);
      const netProfit   = (trade.profit ?? 0) + (trade.commission ?? 0) + (trade.swap ?? 0);

      await supabase.from('trades').upsert({
        user_id:            userId,
        mt5_ticket:         String(trade.ticket),
        symbol:             trade.symbol,
        trade_type:         tradeType,
        lot_size:           trade.lot_size,
        open_price:         trade.open_price,
        close_price:        trade.close_price,
        stop_loss:          trade.stop_loss   ?? null,
        take_profit:        trade.take_profit ?? null,
        open_time:          openTime,
        close_time:         closeTime,
        duration_minutes:   durationMin,
        pips:               pips,
        profit_usd:         trade.profit      ?? 0,
        commission:         trade.commission  ?? 0,
        swap:               trade.swap        ?? 0,
        net_profit:         netProfit,
        status:             'closed',
        session:            session,
        screenshot_missing: false,
      }, { onConflict: 'mt5_ticket' });
    }
  }

  // ── 4. update EA heartbeat on user_profiles ───────────────────────────────
  await supabase.from('user_profiles').update({
    ea_connected: true,
    ea_last_seen: new Date().toISOString(),
    ea_version:   body.ea_version ?? null,
    ea_broker:    body.broker     ?? null,
  }).eq('id', userId);

  return res.json({ ok: true, ts: Date.now() });
});

// ─── POST /copy/signal — master broadcasts a new trade signal ─────────────────
app.post('/copy/signal', async (req, res) => {
  const apiKey   = req.headers['x-api-key'];
  const groupId  = req.headers['x-copy-group'];
  const mt5Login = req.headers['x-mt5-login'];

  const userId = await resolveUser(apiKey);
  if (!userId) return res.status(401).json({ error: 'invalid_api_key' });
  if (!groupId) return res.status(400).json({ error: 'missing_x_copy_group' });
  if (!mt5Login) return res.status(400).json({ error: 'missing_x_mt5_login' });

  // Find this account as master in the group
  const masterAcc = await resolveCopyAccount(userId, groupId, mt5Login, 'master');
  if (!masterAcc) return res.status(403).json({ error: 'not_master_in_group' });

  // Verify group is active
  const { data: group } = await supabase
    .from('copy_groups')
    .select('id, active, lot_mode, lot_fixed, lot_multiplier, max_lot')
    .eq('id', groupId)
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (!group) return res.status(403).json({ error: 'group_inactive_or_not_found' });

  const { signal } = req.body;
  if (!signal || !signal.type || !signal.ticket || !signal.symbol) {
    return res.status(400).json({ error: 'missing_signal_fields' });
  }

  // Insert the copy signal
  const { data: sig, error: sigErr } = await supabase
    .from('copy_signals')
    .insert({
      group_id:          groupId,
      master_account_id: masterAcc.id,
      signal_type:       signal.type,
      master_ticket:     Number(signal.ticket),
      symbol:            signal.symbol,
      trade_type:        signal.trade_type,
      lot_size:          signal.lot_size   ?? null,
      open_price:        signal.open_price ?? null,
      stop_loss:         signal.stop_loss  ?? 0,
      take_profit:       signal.take_profit ?? 0,
      close_price:       signal.close_price ?? null,
    })
    .select('id')
    .single();

  if (sigErr || !sig) return res.status(500).json({ error: 'signal_insert_failed', detail: sigErr?.message });

  // Create pending copy_log entries for all active slaves in this group
  const { data: slaves } = await supabase
    .from('copy_accounts')
    .select('id')
    .eq('group_id', groupId)
    .eq('role', 'slave')
    .eq('status', 'active');

  if (slaves && slaves.length > 0) {
    await supabase.from('copy_log').insert(
      slaves.map(s => ({
        signal_id:        sig.id,
        slave_account_id: s.id,
        status:           'pending',
      }))
    );
  }

  return res.json({ ok: true, signal_id: sig.id, slaves_notified: slaves?.length ?? 0 });
});

// ─── GET /copy/poll — slave polls for pending trade signals ───────────────────
app.get('/copy/poll', async (req, res) => {
  const apiKey   = req.headers['x-api-key'];
  const groupId  = req.headers['x-copy-group'];
  const mt5Login = req.headers['x-mt5-login'];

  const userId = await resolveUser(apiKey);
  if (!userId) return res.status(401).json({ error: 'invalid_api_key' });
  if (!groupId || !mt5Login) return res.status(400).json({ error: 'missing_headers' });

  // Find this account as slave
  const slaveAcc = await resolveCopyAccount(userId, groupId, mt5Login, 'slave');
  if (!slaveAcc) return res.status(403).json({ error: 'not_slave_in_group' });

  // Mark slave as active + update last_seen_at
  await supabase
    .from('copy_accounts')
    .update({ status: 'active', last_seen_at: new Date().toISOString() })
    .eq('id', slaveAcc.id);

  // Fetch pending copy_log entries with full signal + group lot config
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
    .eq('slave_account_id', slaveAcc.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(10);

  const signals = (pending || []).map(p => {
    const s  = p.copy_signals;
    const cg = s?.copy_groups;
    return {
      log_id:        p.id,
      signal_type:   s?.signal_type,
      master_ticket: s?.master_ticket,
      symbol:        s?.symbol,
      trade_type:    s?.trade_type,
      master_lots:   s?.lot_size,
      open_price:    s?.open_price,
      stop_loss:     s?.stop_loss,
      take_profit:   s?.take_profit,
      close_price:   s?.close_price,
      lot_mode:      cg?.lot_mode,
      lot_fixed:     cg?.lot_fixed,
      lot_multiplier: cg?.lot_multiplier,
      max_lot:       cg?.max_lot,
    };
  });

  return res.json({ signals });
});

// ─── POST /copy/ack — slave reports execution result ─────────────────────────
app.post('/copy/ack', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const userId = await resolveUser(apiKey);
  if (!userId) return res.status(401).json({ error: 'invalid_api_key' });

  const { log_id, status, slave_ticket, slave_lots, error_message } = req.body;
  if (!log_id || !status) return res.status(400).json({ error: 'missing_fields' });

  // Verify log entry belongs to a slave account owned by this user
  const { data: logEntry } = await supabase
    .from('copy_log')
    .select('id, slave_account_id, copy_accounts!inner(user_id)')
    .eq('id', log_id)
    .maybeSingle();

  if (!logEntry || logEntry.copy_accounts?.user_id !== userId) {
    return res.status(403).json({ error: 'unauthorized_log_entry' });
  }

  await supabase.from('copy_log').update({
    status:        status,
    slave_ticket:  slave_ticket  ?? null,
    slave_lots:    slave_lots    ?? null,
    error_message: error_message ?? null,
    executed_at:   new Date().toISOString(),
  }).eq('id', log_id);

  return res.json({ ok: true });
});

// ─── POST /disconnect ─────────────────────────────────────────────────────────
app.post('/disconnect', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const userId = await resolveUser(apiKey);
  if (!userId) return res.status(401).json({ error: 'invalid_api_key' });

  await supabase.from('user_profiles').update({
    ea_connected: false,
  }).eq('id', userId);

  return res.json({ ok: true });
});

// ─── GET /health ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[velquor-bridge] listening on 127.0.0.1:${PORT}`);
});
