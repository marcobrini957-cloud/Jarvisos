import type { Trade, JournalEntry, Task } from '@/types'
import type { HoldingWithPrice } from '@/hooks/usePortfolio'

export interface JarvisInsight {
  id:        string
  category:  'trading' | 'portfolio' | 'journal' | 'habits' | 'warning' | 'opportunity'
  priority:  'high' | 'medium' | 'low'
  message:   string
  valueEur?: number
  valuePct?: number
  action?:   string
}

export interface JarvisData {
  trades:         Trade[]
  holdings:       HoldingWithPrice[]
  journal:        JournalEntry[]
  tasks:          Task[]
  accountBalance: number
  portfolioValue: number
}

const MOOD_SCORE: Record<string, number> = {
  great: 9, good: 7, neutral: 5, low: 3, bad: 1,
}

function dayKey(iso: string): string {
  return iso.split('T')[0]
}

function startOf(unit: 'month' | 'prevMonth' | 'week' | 'year'): Date {
  const now = new Date()
  if (unit === 'month')     return new Date(now.getFullYear(), now.getMonth(), 1)
  if (unit === 'prevMonth') return new Date(now.getFullYear(), now.getMonth() - 1, 1)
  if (unit === 'week') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))
    return d
  }
  return new Date(now.getFullYear(), 0, 1)
}

function endOf(unit: 'prevMonth'): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
}

function realTrades(trades: Trade[]): Trade[] {
  return trades.filter(t => t.symbol !== 'BALANCE' && !!t.symbol && (t.lot_size ?? 0) > 0)
}

export function generateInsights(data: JarvisData): JarvisInsight[] {
  const insights: JarvisInsight[] = []
  const push = (i: Omit<JarvisInsight, 'id'>) =>
    insights.push({ ...i, id: `${i.category}-${insights.length}` })

  const closed = realTrades(data.trades).filter(t => t.net_profit !== null)
  const today  = new Date().toISOString().split('T')[0]

  // ── TRADING INSIGHTS ──────────────────────────────────────────────────────

  // Win rate (monthly)
  const monthStart = startOf('month')
  const monthTrades = closed.filter(t => t.close_time && new Date(t.close_time) >= monthStart)
  if (monthTrades.length >= 5) {
    const wins    = monthTrades.filter(t => (t.net_profit ?? 0) > 0).length
    const winRate = (wins / monthTrades.length) * 100

    if (winRate >= 65) {
      push({ category: 'trading', priority: 'low',
        message: `Strong month. Win rate at ${winRate.toFixed(1)}% — above your 60% target.`,
        valuePct: winRate })
    } else if (winRate >= 50) {
      push({ category: 'trading', priority: 'medium',
        message: `Win rate at ${winRate.toFixed(1)}% this month. Gold is your stronger instrument.`,
        valuePct: winRate })
    } else {
      push({ category: 'trading', priority: 'high',
        message: `Difficult month at ${winRate.toFixed(1)}%. Review your last 5 losses for common patterns.`,
        valuePct: winRate, action: 'Review trade log' })
    }
  }

  // Instrument comparison (all closed trades)
  if (closed.length >= 5) {
    const gold   = closed.filter(t => t.symbol?.includes('XAU'))
    const nasdaq = closed.filter(t => t.symbol?.includes('NAS') || t.symbol?.includes('US100'))
    if (gold.length >= 3 && nasdaq.length >= 3) {
      const goldWR   = (gold.filter(t => (t.net_profit ?? 0) > 0).length   / gold.length)   * 100
      const nasdaqWR = (nasdaq.filter(t => (t.net_profit ?? 0) > 0).length / nasdaq.length) * 100

      if (goldWR > nasdaqWR + 15) {
        push({ category: 'trading', priority: 'medium',
          message: `Gold is your edge at ${goldWR.toFixed(1)}% win rate vs Nasdaq at ${nasdaqWR.toFixed(1)}%. Consider reducing Nasdaq position size.`,
          valuePct: goldWR })
      } else if (nasdaqWR > goldWR + 15) {
        push({ category: 'trading', priority: 'low',
          message: `Nasdaq outperforming Gold this month — ${nasdaqWR.toFixed(1)}% vs ${goldWR.toFixed(1)}%.`,
          valuePct: nasdaqWR })
      }
    }
  }

  // Session performance
  if (closed.length >= 5) {
    const london = closed.filter(t => t.session === 'london')
    const ny     = closed.filter(t => t.session === 'new_york')
    if (london.length >= 3 && ny.length >= 3) {
      const londonWR = (london.filter(t => (t.net_profit ?? 0) > 0).length / london.length) * 100
      const nyWR     = (ny.filter(t => (t.net_profit ?? 0) > 0).length     / ny.length)     * 100

      if (londonWR > nyWR + 15) {
        push({ category: 'trading', priority: 'medium',
          message: `London session win rate ${londonWR.toFixed(1)}% vs NY ${nyWR.toFixed(1)}%. Your edge is in London open — protect those trades.`,
          valuePct: londonWR })
      } else if (nyWR > londonWR + 15) {
        push({ category: 'trading', priority: 'low',
          message: `NY session outperforming London — ${nyWR.toFixed(1)}% vs ${londonWR.toFixed(1)}%.`,
          valuePct: nyWR })
      }
    }
  }

  // Daily loss limit warning (default €500)
  const dailyLimit = 500
  const todayTrades = closed.filter(t => t.close_time && dayKey(t.close_time) === today)
  const todayPnL    = todayTrades.reduce((s, t) => s + (t.net_profit ?? 0), 0)

  if (todayPnL <= -dailyLimit) {
    push({ category: 'warning', priority: 'high',
      message: `🔴 Daily loss limit reached (€${dailyLimit}). No more trades today. Come back tomorrow with a fresh mindset.`,
      valueEur: todayPnL, action: 'Stop trading for today' })
  } else if (todayPnL < -(dailyLimit * 0.8)) {
    push({ category: 'warning', priority: 'high',
      message: `⚠️ You are 80% of your daily loss limit (€${dailyLimit}). One more losing trade triggers a lock for today.`,
      valueEur: todayPnL })
  }

  // Loss streak detection
  const recent = closed
    .filter(t => t.close_time)
    .sort((a, b) => new Date(b.close_time!).getTime() - new Date(a.close_time!).getTime())
  const last3 = recent.slice(0, 3)
  const last5 = recent.slice(0, 5)

  if (last3.length === 3 && last3.every(t => (t.net_profit ?? 0) < 0)) {
    push({ category: 'warning', priority: 'high',
      message: '3 losses in a row detected. Step away for at least 30 minutes before considering another trade. Revenge trading costs you.',
      action: 'Take a break' })
  } else if (last5.length === 5 && last5.filter(t => (t.net_profit ?? 0) < 0).length >= 4) {
    push({ category: 'warning', priority: 'high',
      message: '4 of your last 5 trades are losses. Today is not your day. Protect your capital — consider stopping for the day.',
      action: 'Stop trading for today' })
  }

  // Monthly comparison
  if (monthTrades.length >= 3) {
    const prevStart  = startOf('prevMonth')
    const prevEnd    = endOf('prevMonth')
    const prevTrades = closed.filter(t => t.close_time &&
      new Date(t.close_time) >= prevStart && new Date(t.close_time) <= prevEnd)

    const thisMonthPnL = monthTrades.reduce((s, t) => s + (t.net_profit ?? 0), 0)
    const lastMonthPnL = prevTrades.reduce((s,  t) => s + (t.net_profit ?? 0), 0)
    const diff         = thisMonthPnL - lastMonthPnL

    if (thisMonthPnL > lastMonthPnL && lastMonthPnL > 0) {
      push({ category: 'trading', priority: 'low',
        message: `Up €${diff.toFixed(2)} vs last month. Best performance in recent months.`,
        valueEur: diff })
    } else if (lastMonthPnL !== 0 && thisMonthPnL < lastMonthPnL * 0.5) {
      push({ category: 'trading', priority: 'medium',
        message: `This month is tracking 50% below last month. Review what changed.`,
        valueEur: thisMonthPnL })
    }
  }

  // Best/worst trading day of week
  if (closed.length >= 10) {
    const dayMap: Record<number, { wins: number; total: number }> = {}
    for (const t of closed) {
      if (!t.close_time) continue
      const d = new Date(t.close_time).getDay() // 0=Sun
      if (d === 0 || d === 6) continue          // skip weekends
      if (!dayMap[d]) dayMap[d] = { wins: 0, total: 0 }
      dayMap[d].total++
      if ((t.net_profit ?? 0) > 0) dayMap[d].wins++
    }
    const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    const eligible = Object.entries(dayMap).filter(([, v]) => v.total >= 3)
    if (eligible.length >= 2) {
      const sorted  = eligible.sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))
      const best    = sorted[0]
      const worst   = sorted[sorted.length - 1]
      const bestPct  = (best[1].wins  / best[1].total)  * 100
      const worstPct = (worst[1].wins / worst[1].total) * 100
      push({ category: 'trading', priority: 'low',
        message: `Your best trading day is ${days[+best[0]]} at ${bestPct.toFixed(0)}% win rate. Your worst is ${days[+worst[0]]} at ${worstPct.toFixed(0)}%.`,
        valuePct: bestPct })
    }
  }

  // Average R:R
  const rrTrades = closed.filter(t => t.stop_loss && t.open_price && (t.net_profit ?? 0) !== 0)
  if (rrTrades.length >= 5) {
    const avgRR = rrTrades.reduce((s, t) => {
      const risk   = Math.abs((t.open_price ?? 0) - (t.stop_loss ?? 0))
      const reward = Math.abs(t.net_profit ?? 0)
      return s + (risk > 0 ? reward / risk : 0)
    }, 0) / rrTrades.length

    if (avgRR < 1.5) {
      push({ category: 'trading', priority: 'medium',
        message: `Average R:R is ${avgRR.toFixed(2)}. Target is 2.0 — you are leaving money on the table by closing winners too early or setting stops too tight.`,
        valuePct: avgRR })
    } else if (avgRR >= 2.0) {
      push({ category: 'trading', priority: 'low',
        message: `R:R ratio at ${avgRR.toFixed(2)} — above your 2.0 target. Good trade management.`,
        valuePct: avgRR })
    }
  }

  // ── TRADE JOURNAL CORRELATIONS ───────────────────────────────────────────
  // These only activate as you fill in trade annotations (emotion, plan, setup).
  // Minimum 5 annotated trades needed per group before showing a result.

  // Emotion vs win rate
  const annotatedEmotions = closed.filter(t => t.emotion_pre)
  if (annotatedEmotions.length >= 5) {
    const emotionMap = new Map<string, { wins: number; total: number; pnl: number }>()
    for (const t of annotatedEmotions) {
      const e = t.emotion_pre!
      const s = emotionMap.get(e) ?? { wins: 0, total: 0, pnl: 0 }
      s.total++
      s.pnl += t.net_profit ?? 0
      if ((t.net_profit ?? 0) > 0) s.wins++
      emotionMap.set(e, s)
    }
    const eligible = [...emotionMap.entries()].filter(([, v]) => v.total >= 3)
    if (eligible.length >= 2) {
      const sorted  = eligible.sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))
      const best    = sorted[0]
      const worst   = sorted[sorted.length - 1]
      const bestWR  = (best[1].wins  / best[1].total)  * 100
      const worstWR = (worst[1].wins / worst[1].total) * 100

      if (bestWR - worstWR >= 20) {
        push({ category: 'habits', priority: 'high',
          message: `Emotion matters: you win ${bestWR.toFixed(0)}% of trades when feeling "${best[0]}" vs ${worstWR.toFixed(0)}% when "${worst[0]}". Protect your mindset before every session.`,
          valuePct: bestWR, action: 'Log emotion before every trade' })
      } else {
        push({ category: 'habits', priority: 'low',
          message: `Emotion correlation (${annotatedEmotions.length} annotated trades): best state "${best[0]}" at ${bestWR.toFixed(0)}%, worst "${worst[0]}" at ${worstWR.toFixed(0)}%.`,
          valuePct: bestWR })
      }
    }
  }

  // Followed plan vs win rate
  const planAnnotated = closed.filter(t => t.followed_plan !== null && t.followed_plan !== undefined)
  if (planAnnotated.length >= 5) {
    const followed    = planAnnotated.filter(t => t.followed_plan === true)
    const notFollowed = planAnnotated.filter(t => t.followed_plan === false)
    if (followed.length >= 3 && notFollowed.length >= 3) {
      const followedWR    = (followed.filter(t => (t.net_profit ?? 0) > 0).length    / followed.length)    * 100
      const notFollowedWR = (notFollowed.filter(t => (t.net_profit ?? 0) > 0).length / notFollowed.length) * 100
      const followedAvg   = followed.reduce((s, t) => s + (t.net_profit ?? 0), 0) / followed.length
      const notFollowedAvg = notFollowed.reduce((s, t) => s + (t.net_profit ?? 0), 0) / notFollowed.length

      if (followedWR > notFollowedWR + 10) {
        push({ category: 'habits', priority: 'high',
          message: `Following your plan pays off: ${followedWR.toFixed(0)}% win rate (avg €${followedAvg.toFixed(2)}/trade) vs ${notFollowedWR.toFixed(0)}% (avg €${notFollowedAvg.toFixed(2)}/trade) when you deviate. Trust the process.`,
          valuePct: followedWR - notFollowedWR })
      } else if (notFollowedWR > followedWR + 10) {
        push({ category: 'habits', priority: 'medium',
          message: `Interesting: your off-plan trades are winning ${notFollowedWR.toFixed(0)}% vs ${followedWR.toFixed(0)}% on-plan. Worth reviewing whether your plan needs updating.`,
          valuePct: notFollowedWR })
      }
    }
  }

  // Setup type win rates
  const setupAnnotated = closed.filter(t => t.setup_type)
  if (setupAnnotated.length >= 5) {
    const setupMap = new Map<string, { wins: number; total: number; pnl: number }>()
    for (const t of setupAnnotated) {
      const s = t.setup_type!
      const v = setupMap.get(s) ?? { wins: 0, total: 0, pnl: 0 }
      v.total++
      v.pnl += t.net_profit ?? 0
      if ((t.net_profit ?? 0) > 0) v.wins++
      setupMap.set(s, v)
    }
    const eligible = [...setupMap.entries()].filter(([, v]) => v.total >= 3)
    if (eligible.length >= 1) {
      const sorted   = eligible.sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))
      const bestS    = sorted[0]
      const bestSWR  = (bestS[1].wins / bestS[1].total) * 100
      const bestSAvg = bestS[1].pnl / bestS[1].total

      push({ category: 'trading', priority: bestSWR >= 65 ? 'low' : 'medium',
        message: `Best setup: "${bestS[0]}" at ${bestSWR.toFixed(0)}% win rate across ${bestS[1].total} trades (avg €${bestSAvg.toFixed(2)}/trade).${sorted.length > 1 ? ` Worst: "${sorted[sorted.length-1][0]}" at ${((sorted[sorted.length-1][1].wins / sorted[sorted.length-1][1].total) * 100).toFixed(0)}%.` : ''}`,
        valuePct: bestSWR, valueEur: bestSAvg })
    }
  }

  // ── PORTFOLIO INSIGHTS ────────────────────────────────────────────────────

  const activeHoldings = data.holdings.filter(h => h.pnlPct !== null && h.currentValueEur !== null)

  if (activeHoldings.length > 0) {
    // Best performer
    const best = [...activeHoldings].sort((a, b) => (b.pnlPct ?? 0) - (a.pnlPct ?? 0))[0]
    if ((best.pnlPct ?? 0) > 0) {
      push({ category: 'portfolio', priority: 'low',
        message: `Best performer: ${best.name ?? best.ticker} up ${best.pnlPct?.toFixed(2)}% (+€${best.pnlEur?.toFixed(2)}) since you bought.`,
        valuePct: best.pnlPct ?? 0, valueEur: best.pnlEur ?? 0 })
    }

    // Worst performer
    const worst = [...activeHoldings].sort((a, b) => (a.pnlPct ?? 0) - (b.pnlPct ?? 0))[0]
    if ((worst.pnlPct ?? 0) < -30) {
      const breakeven = ((1 / (1 + (worst.pnlPct ?? 0) / 100)) - 1) * 100
      push({ category: 'warning', priority: 'high',
        message: `⚠️ ${worst.name ?? worst.ticker} is down ${Math.abs(worst.pnlPct ?? 0).toFixed(1)}% (-€${Math.abs(worst.pnlEur ?? 0).toFixed(2)}). Needs +${breakeven.toFixed(1)}% just to break even.`,
        valuePct: worst.pnlPct ?? 0, valueEur: worst.pnlEur ?? 0, action: 'Review position' })
    } else if ((worst.pnlPct ?? 0) < -10) {
      push({ category: 'portfolio', priority: 'medium',
        message: `${worst.name ?? worst.ticker} is your weakest position at ${worst.pnlPct?.toFixed(1)}% (-€${Math.abs(worst.pnlEur ?? 0).toFixed(2)}).`,
        valuePct: worst.pnlPct ?? 0, valueEur: worst.pnlEur ?? 0 })
    }

    // Tech concentration
    const techTickers = ['NVDA', 'MSFT', 'NAS100', 'QQQ', 'TQQQ']
    const techValue   = activeHoldings
      .filter(h => techTickers.some(t => h.ticker.toUpperCase().includes(t)))
      .reduce((s, h) => s + (h.currentValueEur ?? 0), 0)
    const techPct     = data.portfolioValue > 0 ? (techValue / data.portfolioValue) * 100 : 0
    if (techPct > 65) {
      push({ category: 'warning', priority: 'medium',
        message: `⚠️ Tech concentration at ${techPct.toFixed(1)}% of portfolio. A Nasdaq selloff hits multiple positions simultaneously.`,
        valuePct: techPct })
    }

    // Leveraged ETF decay
    const leveraged = activeHoldings.find(h =>
      h.ticker.toUpperCase().includes('3X') ||
      h.ticker.toUpperCase().includes('LEVERAG') ||
      (h.name ?? '').toLowerCase().includes('3x') ||
      (h.name ?? '').toLowerCase().includes('lever')
    )
    if (leveraged && (leveraged.pnlPct ?? 0) < -30) {
      const breakeven = ((1 / (1 + (leveraged.pnlPct ?? 0) / 100)) - 1) * 100
      push({ category: 'warning', priority: 'high',
        message: `${leveraged.name ?? leveraged.ticker} is down ${Math.abs(leveraged.pnlPct ?? 0).toFixed(1)}% (-€${Math.abs(leveraged.pnlEur ?? 0).toFixed(2)}). Needs +${breakeven.toFixed(1)}% to break even. Leveraged ETFs lose value through volatility decay.`,
        valuePct: leveraged.pnlPct ?? 0, action: 'Review position' })
    }

    // Portfolio overall
    const totalPnlEur = activeHoldings.reduce((s, h) => s + (h.pnlEur ?? 0), 0)
    const totalCost   = activeHoldings.reduce((s, h) => s + (h.costBasisEur ?? 0), 0)
    const totalPnlPct = totalCost > 0 ? (totalPnlEur / totalCost) * 100 : 0

    if (totalPnlEur > 0) {
      push({ category: 'portfolio', priority: 'low',
        message: `Portfolio up €${totalPnlEur.toFixed(2)} (+${totalPnlPct.toFixed(2)}%) overall. Winners are offsetting losers.`,
        valueEur: totalPnlEur, valuePct: totalPnlPct })
    }

    // Wealth split
    const total          = data.portfolioValue + data.accountBalance
    const portfolioPct   = total > 0 ? (data.portfolioValue / total) * 100 : 0
    const tradingPct     = 100 - portfolioPct
    push({ category: 'portfolio', priority: 'low',
      message: `Your wealth split: ${portfolioPct.toFixed(0)}% long-term portfolio, ${tradingPct.toFixed(0)}% trading capital.`,
      valuePct: portfolioPct })
  }

  // ── JOURNAL & HABITS INSIGHTS ─────────────────────────────────────────────

  if (data.journal.length > 0) {
    const sorted      = [...data.journal].sort((a, b) => b.entry_date.localeCompare(a.entry_date))
    const lastEntry   = sorted[0]
    const lastDate    = new Date(lastEntry.entry_date)
    const todayDate   = new Date(today)
    const daysSince   = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000)

    // Journal streak
    let streak = 0
    const d    = new Date(today)
    for (let i = 0; i < 60; i++) {
      const key = d.toISOString().split('T')[0]
      if (data.journal.some(e => e.entry_date === key)) {
        streak++
        d.setDate(d.getDate() - 1)
      } else break
    }

    if (daysSince > 7) {
      push({ category: 'habits', priority: 'high',
        message: `⚠️ No journal entries in ${daysSince} days. Journaling is directly linked to your trading discipline.`,
        action: 'Write a journal entry' })
    } else if (daysSince > 3) {
      push({ category: 'journal', priority: 'medium',
        message: `You haven't journaled in ${daysSince} days. Your last entry was ${lastEntry.entry_date}.`,
        action: 'Write a journal entry' })
    } else if (streak >= 30) {
      push({ category: 'journal', priority: 'low',
        message: `30-day journal streak. Exceptional discipline.` })
    } else if (streak >= 7) {
      push({ category: 'journal', priority: 'low',
        message: `${streak}-day journal streak. Consistency builds self-awareness.` })
    }

    // Mood / energy vs P&L correlation
    const tradingDays = sorted.filter(e => e.is_trading_day && e.energy_level !== null)
    if (tradingDays.length >= 5) {
      const withPnl = tradingDays.map(e => {
        const dayTrades = closed.filter(t => t.close_time && dayKey(t.close_time) === e.entry_date)
        const pnl       = dayTrades.reduce((s, t) => s + (t.net_profit ?? 0), 0)
        return { energy: e.energy_level!, pnl, hasTrades: dayTrades.length > 0 }
      }).filter(x => x.hasTrades)

      if (withPnl.length >= 5) {
        const highEnergy = withPnl.filter(x => x.energy >= 7)
        const lowEnergy  = withPnl.filter(x => x.energy <= 4)

        if (highEnergy.length >= 3 && lowEnergy.length >= 3) {
          const highAvg = highEnergy.reduce((s, x) => s + x.pnl, 0) / highEnergy.length
          const lowAvg  = lowEnergy.reduce((s,  x) => s + x.pnl, 0) / lowEnergy.length

          if (highAvg > lowAvg * 1.3 && highAvg > 0) {
            const pct = ((highAvg - lowAvg) / Math.abs(lowAvg)) * 100
            push({ category: 'habits', priority: 'high',
              message: `You perform ${pct.toFixed(0)}% better on high energy days. On days rated 7+, avg P&L is €${highAvg.toFixed(2)}. On low energy days (4 or below), avg P&L is €${lowAvg.toFixed(2)}. Log your energy before every session.`,
              valueEur: highAvg - lowAvg })
          }
        }
      }
    }
  }

  // ── TASK INSIGHTS ─────────────────────────────────────────────────────────

  const overdue = data.tasks.filter(t =>
    t.due_date && t.due_date < today && t.status !== 'done' && t.status !== 'cancelled'
  )
  if (overdue.length > 0) {
    const oldest = overdue.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))[0]
    push({ category: 'habits', priority: 'medium',
      message: `You have ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}. Oldest: "${oldest.title}" from ${oldest.due_date}.`,
      action: 'Open Tasks tab' })
  }

  // Sort: high → medium → low
  const order = { high: 0, medium: 1, low: 2 }
  return insights.sort((a, b) => order[a.priority] - order[b.priority])
}
