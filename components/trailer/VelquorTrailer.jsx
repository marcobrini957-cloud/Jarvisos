'use client';
import React from 'react';
import { Stage, Sprite, useSprite, useTimeline, Easing, clamp } from './animations';

// ── tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#000000', s1: '#0C0C0C', s2: '#131313', s3: '#1A1A1A',
  bd: 'rgba(255,255,255,0.06)', bd2: 'rgba(255,255,255,0.10)',
  t1: '#F2F2F2', t2: '#707070', t3: '#505050',
  ac: '#4D8FFF', gr: '#00FF85', re: '#FF3347', go: '#FFB830', go2: '#F5B040',
  pu: '#A87EFF', cy: '#00EEFF',
};
const FONT = "Inter, system-ui, sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const eout = Easing.easeOutQuart;

function fu(lt, delay = 0, dur = 0.3) {
  const e = eout(clamp((lt - delay) / dur, 0, 1));
  return { opacity: e, transform: `translateY(${(1 - e) * 10}px)` };
}
function cnt(lt, delay, dur, target) {
  return target * Easing.easeOutCubic(clamp((lt - delay) / dur, 0, 1));
}
function h(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
const pulse = (t, period = 1.4) => 0.5 + 0.2 * Math.sin((t / period) * Math.PI * 2);

function SceneFade({ children, noIn, noOut, fadeDur = 0.3 }) {
  const { localTime, duration } = useSprite();
  let o = 1;
  if (!noIn && localTime < fadeDur) o = localTime / fadeDur;
  if (!noOut && duration - localTime < fadeDur) o = Math.min(o, Math.max(0, (duration - localTime) / fadeDur));
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o, fontFamily: FONT, color: C.t1 }}>
      {children}
    </div>
  );
}

function VMark({ size = 72, glow = 0.5 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: `linear-gradient(135deg, ${C.go}, ${C.go2})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.46, fontWeight: 800, color: '#000', fontFamily: FONT,
      boxShadow: `0 0 ${size * 0.9}px rgba(255,184,48,${glow}), 0 0 ${size * 0.35}px rgba(255,184,48,${glow * 0.6})`,
    }}>V</div>
  );
}

// ── SCENE 1 — cold open ──────────────────────────────────────────────────────
function Scene1() {
  const { localTime: lt } = useSprite();
  const markE = eout(clamp(lt / 0.45, 0, 1));
  const letters = 'VELQUOR';
  const typeStart = 0.5, typeStep = 0.055;
  const shown = Math.max(0, Math.floor((lt - typeStart) / typeStep));
  const caretOn = lt > typeStart - 0.05 && lt < typeStart + letters.length * typeStep + 0.5 && Math.floor(lt * 4) % 2 === 0;
  return (
    <SceneFade noIn>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <div style={{ opacity: markE, transform: `scale(${0.92 + 0.08 * markE})` }}>
          <VMark size={64} glow={markE * pulse(lt)} />
        </div>
        <div style={{ height: 30, display: 'flex', alignItems: 'center', fontSize: 22, fontWeight: 700, letterSpacing: '0.3em', color: C.t1 }}>
          <span>{letters.slice(0, shown)}</span>
          <span style={{ width: 2, height: 20, marginLeft: 4, background: C.go, opacity: caretOn ? 0.9 : 0 }}></span>
        </div>
      </div>
    </SceneFade>
  );
}

// ── SCENE 2 — dashboard comes alive ─────────────────────────────────────────
const NAV = ['Overview', 'Trading', 'Portfolio', 'Journal', 'Habits', 'Tasks', 'Macro'];
const METRICS = [
  { t: 'Net P&L Today', v: 1240, f: (v) => '+$' + Math.round(v).toLocaleString('en-US'), c: C.gr, sub: '↑ 3 winning trades', sc: C.gr },
  { t: 'Win Rate', v: 68, f: (v) => Math.round(v) + '%', c: C.t1, sub: 'Last 30 days', sc: C.t2 },
  { t: 'Drawdown', v: 320, f: (v) => '-$' + Math.round(v), c: C.re, sub: '↓ Max daily limit 60%', sc: C.re },
  { t: 'Net Worth', v: 148200, f: (v) => '€ ' + Math.round(v).toLocaleString('en-US'), c: 'gold', sub: 'Across all accounts', sc: C.t2 },
  { t: 'Avg R:R', v: 1.8, f: (v) => v.toFixed(1), c: C.go2, sub: 'This month', sc: C.t2 },
  { t: 'Trades Taken', v: 14, f: (v) => String(Math.round(v)), c: C.t1, sub: 'July 2026', sc: C.t2 },
];

function MetricCard({ m, lt, delay }) {
  const entry = eout(clamp((lt - delay) / 0.32, 0, 1));
  const glowFade = clamp((lt - delay - 0.7) / 0.8, 0, 1);
  const val = cnt(lt, delay + 0.08, 0.85, m.v);
  const gold = m.c === 'gold';
  return (
    <div style={{
      background: C.s1, border: `1px solid ${C.bd}`, borderRadius: 12,
      padding: '16px 18px 14px', display: 'flex', flexDirection: 'column', gap: 5,
      opacity: entry, transform: `translateY(${(1 - entry) * 10}px)`,
      boxShadow: `0 0 20px rgba(77,143,255,${0.22 * entry * (1 - glowFade)})`,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.t3 }}>{m.t}</div>
      <div style={{
        fontSize: 27, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
        color: gold ? 'transparent' : m.c,
        background: gold ? `linear-gradient(135deg, ${C.go}, ${C.go2})` : 'none',
        WebkitBackgroundClip: gold ? 'text' : 'initial', backgroundClip: gold ? 'text' : 'initial',
      }}>{m.f(val)}</div>
      <div style={{ fontSize: 11, color: m.sc, opacity: clamp((lt - delay - 0.35) / 0.35, 0, 1) }}>{m.sub}</div>
    </div>
  );
}

function Scene2() {
  const { localTime: lt } = useSprite();
  const navIcon = <span style={{ width: 14, height: 14, borderRadius: 4, background: 'currentColor', opacity: 0.35, flexShrink: 0, display: 'inline-block' }}></span>;
  return (
    <SceneFade>
      {/* topbar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 52,
        borderBottom: `1px solid ${C.bd2}`, background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, ...fu(lt, 0.05),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg,${C.go},${C.go2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#000' }}>V</div>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>VELQUOR</span>
        </div>
        <div style={{ width: 1, height: 16, background: C.bd2 }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.cy, boxShadow: `0 0 0 2px rgba(0,238,255,0.2), 0 0 10px rgba(0,238,255,${pulse(lt, 1.2) + 0.1})`, opacity: 0.55 + 0.45 * pulse(lt, 1.2) }}></span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.cy }}>London Session</span>
          <div style={{ width: 1, height: 16, background: C.bd2 }}></div>
          <span style={{ fontSize: 11, color: C.t3, fontFamily: MONO }}>10:42 CET</span>
          <span style={{ fontSize: 11, color: '#383838', fontFamily: MONO }}>09:42 UTC</span>
        </div>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 500, color: C.gr, border: '1px solid rgba(0,217,110,0.2)', background: 'rgba(0,217,110,0.06)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gr }}></span>
          MT5 Connected
        </div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,176,48,0.15)', border: '1px solid rgba(255,176,48,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: C.go }}>M</div>
      </div>

      {/* sidebar */}
      <div style={{ position: 'absolute', top: 52, left: 0, bottom: 0, width: 220, background: C.s1, borderRight: `1px solid ${C.bd2}`, padding: '10px 0', ...fu(lt, 0.12) }}>
        {NAV.map((n, i) => {
          const active = i === 0;
          return (
            <div key={n} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', margin: '1px 8px', borderRadius: 8,
              fontSize: 13, color: active ? C.ac : C.t2, background: active ? 'rgba(77,143,255,0.12)' : 'transparent',
              ...fu(lt, 0.22 + i * 0.055, 0.28),
            }}>{navIcon}{n}</div>
          );
        })}
      </div>

      {/* metric grid */}
      <div style={{ position: 'absolute', top: 52 + 28, left: 220 + 28, right: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.t3, ...fu(lt, 0.55) }}>Overview · Tuesday 08 July</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {METRICS.map((m, i) => <MetricCard key={m.t} m={m} lt={lt} delay={0.7 + i * 0.13} />)}
        </div>
      </div>
    </SceneFade>
  );
}

// ── SCENE 3 — trading intelligence ──────────────────────────────────────────
const INSIGHTS = [
  { cat: 'VELQUOR · WARNING', pri: 'HIGH', col: C.re, bg: 'rgba(255,51,71,0.06)', pb: 'rgba(255,51,71,0.15)', msg: "You've reached 60% of your daily max loss. Consider stopping trading for today to protect your account.", action: '→ Review risk settings' },
  { cat: 'VELQUOR · TRADING', pri: 'MEDIUM', col: C.go2, bg: 'rgba(245,176,64,0.06)', pb: 'rgba(245,176,64,0.15)', msg: 'EURUSD win rate dropped to 42% this week vs 68% last month. Review your London session setups.', action: '→ Open trading journal' },
  { cat: 'VELQUOR · OPPORTUNITY', pri: 'MEDIUM', col: C.pu, bg: 'rgba(168,126,255,0.06)', pb: 'rgba(168,126,255,0.15)', msg: 'USDJPY showing strong continuation. Your historical win rate on this pair: 74%.', action: '→ Analyze setup' },
];

function InsightCard({ ins, lt, delay }) {
  const entry = eout(clamp((lt - delay) / 0.35, 0, 1));
  return (
    <div style={{
      borderLeft: `3px solid ${ins.col}`, background: ins.bg, borderRadius: '0 8px 8px 0',
      padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: 7,
      opacity: entry, transform: `translateX(${(1 - entry) * 50}px)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: ins.col }}>{ins.cat}</span>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: ins.pb, color: ins.col }}>{ins.pri}</span>
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, color: C.t1 }}>{ins.msg}</p>
      <span style={{ fontSize: 12, fontWeight: 500, color: ins.col }}>{ins.action}</span>
    </div>
  );
}

function Scene3() {
  const { localTime: lt } = useSprite();
  return (
    <SceneFade>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(700px 420px at 72% 45%, rgba(168,126,255,0.07), transparent 70%)' }}></div>
      <div style={{ position: 'absolute', left: 90, top: 0, bottom: 0, width: 380, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...fu(lt, 0.1) }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.pu, boxShadow: `0 0 12px rgba(168,126,255,${pulse(lt)})` }}></span>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.pu }}>Velquor Intelligence</span>
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: C.t1, ...fu(lt, 0.22) }}>It reads your trading before you do.</div>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: C.t2, ...fu(lt, 0.36) }}>Pattern detection across every trade, session and habit — surfaced the moment it matters.</div>
      </div>
      <div style={{ position: 'absolute', right: 90, top: 0, bottom: 0, width: 520, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 13 }}>
        {INSIGHTS.map((ins, i) => <InsightCard key={ins.cat} ins={ins} lt={lt} delay={0.45 + i * 0.12} />)}
      </div>
    </SceneFade>
  );
}

// ── SCENE 4 — trade journal ──────────────────────────────────────────────────
const TRADES = [
  { sym: 'EURUSD', side: 'BUY', sess: 'London', sessCol: C.ac, sessBg: 'rgba(77,143,255,0.1)', setup: 'Break of Structure', pnl: 340, pips: '+24.0p', when: '08 Jul · 09:42' },
  { sym: 'GBPJPY', side: 'SELL', sess: 'Overlap', sessCol: C.go, sessBg: 'rgba(255,184,48,0.1)', setup: 'Liquidity Grab', pnl: -120, pips: '-8.5p', when: '08 Jul · 08:15' },
  { sym: 'USDJPY', side: 'BUY', sess: 'New York', sessCol: C.go2, sessBg: 'rgba(245,176,64,0.1)', setup: 'Fair Value Gap', pnl: 500, pips: '+35.0p', when: '07 Jul · 16:05' },
  { sym: 'XAUUSD', side: 'SELL', sess: 'Asian', sessCol: C.pu, sessBg: 'rgba(168,126,255,0.1)', setup: 'Order Block', pnl: 210, pips: '+21.0p', when: '07 Jul · 01:22' },
];

function badge(text, color, bg) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 500, fontSize: 11, padding: '2px 8px', borderRadius: 5, letterSpacing: '0.02em', color, background: bg, border: `1px solid ${bg.replace('0.1', '0.2')}` }}>{text}</span>;
}

function TradeRow({ tr, lt, delay, winPulseAt }) {
  const entry = eout(clamp((lt - delay) / 0.32, 0, 1));
  const win = tr.pnl > 0;
  const flash = clamp((lt - delay - 0.05) / 0.2, 0, 1) * (1 - clamp((lt - delay - 0.35) / 0.45, 0, 1));
  let sweep = 0;
  if (win && winPulseAt != null) {
    const p = clamp((lt - winPulseAt) / 0.9, 0, 1);
    sweep = Math.sin(p * Math.PI) * 0.5;
  }
  const buy = tr.side === 'BUY';
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1.1fr auto', gap: 12, alignItems: 'center',
      padding: '14px 18px', borderBottom: `1px solid ${C.bd}`,
      opacity: entry, transform: `translateY(${(1 - entry) * 10}px)`,
      background: sweep > 0 ? `rgba(0,255,133,${sweep * 0.07})` : 'transparent',
      boxShadow: sweep > 0 ? `inset 0 0 24px rgba(0,255,133,${sweep * 0.2})` : 'none',
    }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{tr.sym}</div>
        <div style={{ marginTop: 5 }}>
          {badge(tr.side, buy ? C.gr : C.re, buy ? 'rgba(0,255,133,0.1)' : 'rgba(255,51,71,0.1)')}
        </div>
      </div>
      <div>
        <span style={{ display: 'inline-flex', filter: flash > 0 ? `drop-shadow(0 0 ${8 * flash}px ${tr.sessCol})` : 'none' }}>
          {badge(tr.sess, tr.sessCol, tr.sessBg)}
        </span>
        <div style={{ fontSize: 11, color: '#383838', marginTop: 4, fontFamily: MONO }}>{tr.when}</div>
      </div>
      <div style={{ fontSize: 13, color: C.t2 }}>{tr.setup}</div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600, fontSize: 15, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: win ? C.gr : C.re }}>
          {(win ? '+$' : '-$') + Math.abs(tr.pnl).toFixed(2)}
        </div>
        <div style={{ fontSize: 11, color: '#383838', marginTop: 3, fontFamily: MONO }}>{tr.pips}</div>
      </div>
    </div>
  );
}

function Scene4() {
  const { localTime: lt } = useSprite();
  const winDelays = [0.55, null, 0.85, 1.15];
  return (
    <SceneFade>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 860 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18, ...fu(lt, 0.05) }}>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>Trade Journal</span>
            <span style={{ fontSize: 12, color: C.t3 }}>This week · 4 trades · <span style={{ color: C.gr }}>+$930 net</span></span>
          </div>
          <div style={{ background: C.s1, border: `1px solid ${C.bd}`, borderRadius: 14, overflow: 'hidden', ...fu(lt, 0.15) }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1.1fr auto', gap: 12, padding: '10px 18px', borderBottom: `1px solid ${C.bd2}`, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#383838' }}>
              <span>Symbol</span><span>Session</span><span>Setup</span><span style={{ textAlign: 'right' }}>P&L</span>
            </div>
            {TRADES.map((tr, i) => <TradeRow key={tr.sym} tr={tr} lt={lt} delay={0.3 + i * 0.28} winPulseAt={winDelays[i]} />)}
          </div>
        </div>
      </div>
    </SceneFade>
  );
}

// ── SCENE 5 — session clock & live data ─────────────────────────────────────
const PAIRS = [
  { s: 'EURUSD', bid: 1.08423, dp: 5, pip: 0.00001 },
  { s: 'GBPUSD', bid: 1.27051, dp: 5, pip: 0.00001 },
  { s: 'USDJPY', bid: 157.312, dp: 3, pip: 0.001 },
  { s: 'XAUUSD', bid: 2331.40, dp: 2, pip: 0.01 },
];

function PairCard({ p, i, lt, delay }) {
  const entry = eout(clamp((lt - delay) / 0.32, 0, 1));
  const k = Math.floor(lt * 3);
  const dir = h(k * 7.3 + i * 31.7) > 0.5 ? 1 : -1;
  const mag = (h(k * 13.1 + i * 17.9) * 6 + 2);
  const bid = p.bid + dir * mag * p.pip;
  const ask = bid + 12 * p.pip;
  const col = dir > 0 ? C.gr : C.re;
  const flick = 0.85 + 0.15 * h(k * 3.7 + i);
  return (
    <div style={{
      background: C.s1, border: `1px solid ${C.bd}`, borderRadius: 12, padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 10,
      opacity: entry, transform: `translateY(${(1 - entry) * 10}px)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{p.s}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: col }}>{dir > 0 ? '▲' : '▼'}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.08em', color: C.t3, textTransform: 'uppercase', marginBottom: 3 }}>Bid</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: col, opacity: flick }}>{bid.toFixed(p.dp)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.08em', color: C.t3, textTransform: 'uppercase', marginBottom: 3 }}>Ask</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: C.t2, opacity: flick }}>{ask.toFixed(p.dp)}</div>
        </div>
      </div>
    </div>
  );
}

function Scene5() {
  const { localTime: lt } = useSprite();
  const clockOut = eout(clamp((lt - 1.7) / 0.35, 0, 1));
  const gridIn = lt > 1.85;
  return (
    <SceneFade>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
        opacity: 1 - clockOut, transform: `translateY(${-clockOut * 30}px)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, ...fu(lt, 0.1) }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: C.cy, boxShadow: `0 0 0 3px rgba(0,238,255,0.15), 0 0 18px rgba(0,238,255,${pulse(lt, 1.2) + 0.2})`, opacity: 0.5 + 0.5 * pulse(lt, 1.2) }}></span>
          <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: '0.16em', color: C.cy, textShadow: `0 0 ${24 + 16 * pulse(lt)}px rgba(0,238,255,0.55)` }}>LONDON SESSION</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 17, color: C.t2, fontVariantNumeric: 'tabular-nums', ...fu(lt, 0.24) }}>10:42 CET · <span style={{ color: C.t3 }}>09:42 UTC</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...fu(lt, 0.38) }}>
          <span style={{ fontSize: 13, color: C.t3 }}>London closes in</span>
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 5, color: C.cy, background: 'rgba(0,238,255,0.08)', border: '1px solid rgba(0,238,255,0.18)' }}>6h 48m</span>
        </div>
      </div>
      {gridIn && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.t3, ...fu(lt, 1.9) }}>
            Live Pricing · <span style={{ color: C.cy }}>4 pairs watched</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 220px)', gap: 14 }}>
            {PAIRS.map((p, i) => <PairCard key={p.s} p={p} i={i} lt={lt} delay={2.0 + i * 0.09} />)}
          </div>
        </div>
      )}
    </SceneFade>
  );
}

// ── SCENE 6 — closing card ───────────────────────────────────────────────────
function Scene6() {
  const { localTime: lt } = useSprite();
  const markE = eout(clamp((lt - 0.1) / 0.4, 0, 1));
  return (
    <SceneFade noOut>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <div style={{ opacity: markE, transform: `scale(${0.9 + 0.1 * markE})` }}>
          <VMark size={92} glow={markE * pulse(lt)} />
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.3em', color: C.t1, ...fu(lt, 0.5, 0.35) }}>VELQUOR</div>
        <div style={{ fontSize: 16, fontWeight: 400, letterSpacing: '0.04em', color: C.t2, ...fu(lt, 0.85, 0.35) }}>Your edge. Quantified.</div>
      </div>
      <div style={{ position: 'absolute', bottom: 42, left: 0, right: 0, textAlign: 'center', fontFamily: MONO, fontSize: 13, letterSpacing: '0.1em', color: 'rgba(0,238,255,0.45)', ...fu(lt, 1.2, 0.35) }}>velquor.app</div>
    </SceneFade>
  );
}

function TimeLabel({ children }) {
  const { time } = useTimeline();
  return <div data-screen-label={`t=${Math.floor(time)}s`} style={{ position: 'absolute', inset: 0 }}>{children}</div>;
}

export default function VelquorTrailer({ controls = true, loop: loopProp = false }) {
  return (
    <Stage
      width={1280} height={720} duration={20.3} background="#000000"
      loop={loopProp} autoplay={true} controls={controls}
      persistKey={controls ? 'velquor-trailer-v2' : 'velquor-trailer-bg'}
    >
      <TimeLabel>
        <Sprite start={0} end={2.3}><Scene1 /></Sprite>
        <Sprite start={2.0} end={5.9}><Scene2 /></Sprite>
        <Sprite start={5.6} end={9.5}><Scene3 /></Sprite>
        <Sprite start={9.2} end={13.1}><Scene4 /></Sprite>
        <Sprite start={12.8} end={16.8}><Scene5 /></Sprite>
        <Sprite start={16.5} end={20.3}><Scene6 /></Sprite>
      </TimeLabel>
    </Stage>
  );
}
