'use strict';

// Pure helpers for the VELQUOR bridge — no I/O, unit-tested in tests/bridge-lib.test.js.

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
function mapOpenPosition(pos, userId) {
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
    session:            detectSession(pos.open_time * 1000),
    screenshot_missing: true,
  };
}

// Build a `trades` upsert row from an EA closed-trade payload.
function mapClosedTrade(trade, userId) {
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
    open_time:          new Date(trade.open_time  * 1000).toISOString(),
    close_time:         new Date(trade.close_time * 1000).toISOString(),
    duration_minutes:   Math.round((trade.close_time - trade.open_time) / 60),
    pips:               calcPips(trade.symbol, trade.open_price, trade.close_price, tradeType),
    profit_usd:         trade.profit      ?? 0,
    commission:         trade.commission  ?? 0,
    swap:               trade.swap        ?? 0,
    net_profit:         (trade.profit ?? 0) + (trade.commission ?? 0) + (trade.swap ?? 0),
    status:             'closed',
    session:            detectSession(trade.open_time * 1000),
    screenshot_missing: false,
  };
}

// Deposits / withdrawals / credit, stored as symbol='BALANCE' rows — the shape
// the web app already reads to keep funding out of performance figures. The EA
// only started sending these in 2.24; before that money movements were invisible
// to the site, which is why percentage returns drifted from MetaTrader's report.
function mapBalanceOp(op, userId) {
  const amount = Number(op && op.amount);
  const when   = Number(op && op.time);
  if (!Number.isFinite(amount) || amount === 0) return null;
  if (!Number.isFinite(when)   || when <= 0)    return null;

  const at = new Date(when * 1000).toISOString();
  return {
    user_id:            userId,
    // Deal tickets share a sequence with trade tickets, so prefix to guarantee
    // a balance op can never collide with a position id on the unique index.
    mt5_ticket:         `bal_${op.ticket}`,
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
  detectSession, calcPips, versionLt,
  mapOpenPosition, mapClosedTrade, mapBalanceOp,
  SETTINGS_DEFAULTS, mergeSettings,
};
