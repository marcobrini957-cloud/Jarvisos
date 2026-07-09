'use strict';

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

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

// ─── Helpers — match logic in app/api/mt5-sync/route.ts ──────────────────────
function detectSession(openTimeMs) {
  const d = new Date(openTimeMs);
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  if (mins >= 810 && mins < 1320) return 'new_york';
  if (mins >= 480 && mins < 990)  return 'london';
  return 'asian';
}

function calcPips(symbol, openPrice, closePrice, tradeType) {
  const diff = tradeType === 'buy'
    ? closePrice - openPrice
    : openPrice - closePrice;
  const sym = symbol.toUpperCase();
  if (sym.includes('XAU') || sym.includes('GOLD')) return parseFloat((diff * 10).toFixed(2));
  if (sym.includes('JPY'))                           return parseFloat((diff / 0.01).toFixed(2));
  if (sym.includes('NAS') || sym.includes('SPX') ||
      sym.includes('US30') || sym.includes('DAX') ||
      sym.includes('GER') || sym.includes('NI225')) return parseFloat(diff.toFixed(2));
  return parseFloat((diff / 0.0001).toFixed(2));
}

// ─── Auth helper ─────────────────────────────────────────────────────────────
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

// ─── POST /sync ───────────────────────────────────────────────────────────────
// Payload sent by the MQL5 EA every heartbeat interval
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
    ea_connected:  true,
    ea_last_seen:  new Date().toISOString(),
    ea_version:    body.ea_version  ?? null,
    ea_broker:     body.broker      ?? null,
  }).eq('id', userId);

  return res.json({ ok: true, ts: Date.now() });
});

// ─── POST /disconnect ─────────────────────────────────────────────────────────
// EA sends this on OnDeinit so the dashboard shows "offline" immediately
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
