'use strict';

// Pure helpers for the VELQUOR bridge — no I/O, unit-tested in tests/bridge-lib.test.js.

// MQL5 datetimes are seconds in the BROKER's server timezone, not UTC. EA 2.25+
// reports server_gmt_offset_sec so we can convert to real UTC before storing.
// Without this every trade time — and therefore every session label, calendar
// day and hourly breakdown — sits offset by the broker's timezone (+3h on
// Blueberry in summer). Older EAs send no offset: treat as 0, i.e. unchanged.
function serverSecToUtcMs(sec, offsetSec) {
  const s = Number(sec);
  if (!Number.isFinite(s)) return NaN;
  const off = Number(offsetSec);
  return (s - (Number.isFinite(off) ? off : 0)) * 1000;
}

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

// "2.00" < "2.10" < "10.0" — returns true when a is older than b.
// Non-numeric / missing versions are treated as older than everything.
function versionLt(a, b) {
  const pa = String(a ?? '').split('.').map(Number);
  const pb = String(b ?? '').split('.').map(Number);
  if (pa.some(Number.isNaN) || pa.length === 0) return true;
  if (pb.some(Number.isNaN) || pb.length === 0) return false;
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0, y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

// Build a `trades` upsert row from an EA open-position payload.
function mapOpenPosition(pos, userId, offsetSec = 0) {
  const tradeType = pos.trade_type === 0 ? 'buy' : 'sell';
  return {
    user_id:            userId,
    mt5_ticket:         String(pos.ticket),
    symbol:             pos.symbol,
    trade_type:         tradeType,
    lot_size:           pos.lot_size,
    open_price:         pos.open_price,
    close_price:        pos.current_price,
    stop_loss:          pos.stop_loss   ?? null,
    take_profit:        pos.take_profit ?? null,
    open_time:          new Date(pos.open_time * 1000).toISOString(),
    close_time:         null,
    duration_minutes:   null,
    pips:               calcPips(pos.symbol, pos.open_price, pos.current_price, tradeType),
    profit_usd:         pos.profit     ?? 0,
    commission:         pos.commission ?? 0,
    swap:               pos.swap       ?? 0,
    net_profit:         (pos.profit ?? 0) + (pos.commission ?? 0) + (pos.swap ?? 0),
    status:             'open',
    session:            detectSession(serverSecToUtcMs(pos.open_time, offsetSec)),
    screenshot_missing: true,
  };
}

// Build a `trades` upsert row from an EA closed-trade payload.
function mapClosedTrade(trade, userId, offsetSec = 0) {
  const tradeType = trade.trade_type === 0 ? 'buy' : 'sell';
  return {
    user_id:            userId,
    mt5_ticket:         String(trade.ticket),
    symbol:             trade.symbol,
    trade_type:         tradeType,
    lot_size:           trade.lot_size,
    open_price:         trade.open_price,
    close_price:        trade.close_price,
    stop_loss:          trade.stop_loss   ?? null,
    take_profit:        trade.take_profit ?? null,
    open_time:          new Date(serverSecToUtcMs(trade.open_time,  offsetSec)).toISOString(),
    close_time:         new Date(serverSecToUtcMs(trade.close_time, offsetSec)).toISOString(),
    duration_minutes:   Math.round((trade.close_time - trade.open_time) / 60),
    pips:               calcPips(trade.symbol, trade.open_price, trade.close_price, tradeType),
    profit_usd:         trade.profit      ?? 0,
    commission:         trade.commission  ?? 0,
    swap:               trade.swap        ?? 0,
    net_profit:         (trade.profit ?? 0) + (trade.commission ?? 0) + (trade.swap ?? 0),
    status:             'closed',
    session:            detectSession(serverSecToUtcMs(trade.open_time, offsetSec)),
    screenshot_missing: false,
  };
}

// Deposits / withdrawals / credit, stored as symbol='BALANCE' rows — the shape
// the web app already reads to keep funding out of performance figures. The EA
// only started sending these in 2.24; before that money movements were invisible
// to the site, which is why percentage returns drifted from MetaTrader's report.
function mapBalanceOp(op, userId, offsetSec = 0) {
  const amount = Number(op && op.amount);
  const when   = Number(op && op.time);
  if (!Number.isFinite(amount) || amount === 0) return null;
  if (!Number.isFinite(when)   || when <= 0)    return null;
  const ticket = Number(op.ticket);
  if (!Number.isFinite(ticket) || ticket === 0)  return null;

  const at = new Date(serverSecToUtcMs(when, offsetSec)).toISOString();
  return {
    user_id:            userId,
    // mt5_ticket is a bigint holding the POSITION id for trades. Deal tickets
    // live in the same numeric space, so a balance op is stored NEGATED: it can
    // never collide with a position id, and the row is still uniquely keyed.
    mt5_ticket:         -Math.abs(Number(op.ticket)),
    symbol:             'BALANCE',
    trade_type:         amount >= 0 ? 'buy' : 'sell',
    lot_size:           0,
    open_price:         0,
    close_price:        0,
    open_time:          at,
    close_time:         at,
    duration_minutes:   0,
    pips:               0,
    profit_usd:         amount,
    commission:         0,
    swap:               0,
    net_profit:         amount,
    status:             'closed',
    notes:              op.comment ? String(op.comment).slice(0, 200) : null,
    screenshot_missing: false,
  };
}

const SETTINGS_DEFAULTS = Object.freeze({
  maintenance_mode: false,
  sync_enabled:     true,
  copy_enabled:     true,
  rate_limit_sync:  300,
  rate_limit_copy:  120,
  min_ea_version:   '2.00',
});

// Merge a bridge_settings DB row onto the defaults, ignoring junk values so a
// bad row can never brick the bridge.
function mergeSettings(row) {
  const s = { ...SETTINGS_DEFAULTS };
  if (!row || typeof row !== 'object') return s;
  for (const k of ['maintenance_mode', 'sync_enabled', 'copy_enabled']) {
    if (typeof row[k] === 'boolean') s[k] = row[k];
  }
  for (const k of ['rate_limit_sync', 'rate_limit_copy']) {
    const v = Number(row[k]);
    if (Number.isInteger(v) && v > 0 && v <= 100000) s[k] = v;
  }
  if (typeof row.min_ea_version === 'string' && /^\d+(\.\d+)*$/.test(row.min_ea_version)) {
    s.min_ea_version = row.min_ea_version;
  }
  return s;
}

module.exports = {
  detectSession, calcPips, versionLt, serverSecToUtcMs,
  mapOpenPosition, mapClosedTrade, mapBalanceOp,
  SETTINGS_DEFAULTS, mergeSettings,
};
