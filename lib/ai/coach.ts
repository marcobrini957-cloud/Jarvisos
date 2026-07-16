// AI coaching layer — reads the deterministic stats/breakdowns and writes the
// "Coach's Notes". It NEVER computes a number; every figure comes pre-computed
// from lib/trading/stats + lib/trading/breakdowns. This keeps the money-facing
// numbers correct (no LLM arithmetic) and makes the AI's job pure synthesis.
//
// Model by tier (see lib/api/tier.ts): free→Groq Llama, pro→Haiku, ultra→Sonnet.

import Anthropic from '@anthropic-ai/sdk'
import Groq from 'groq-sdk'
import type { TradeStats } from '@/lib/trading/stats'
import type { Breakdowns, Segment } from '@/lib/trading/breakdowns'
import type { TraderDna } from '@/lib/trading/traderDna'
import type { TierPlan } from '@/lib/api/tier'

const SYSTEM = `You are VELQUOR, an elite trading performance coach.
You are given a trader's PRE-COMPUTED statistics — win rates, expectancy, and
behavioral breakdowns. These numbers are ground truth: never recompute, contradict,
or invent figures. Your job is to find the story across the numbers and turn it into
sharp, honest coaching.

Rules:
- Reference specific numbers from the data (win rate, €, R) — quote them exactly.
- Find the cross-pattern: how emotion / setup / session / discipline interact.
- Lead with the single most important, most actionable finding.
- Be direct and honest. Do not sugarcoat. This trader wants to improve, not be flattered.
- No generic advice ("manage risk", "be disciplined"). Everything must be grounded in THIS data.
- Never fabricate a statistic the data doesn't contain.`

function fmtSeg(title: string, segs: Segment[]): string {
  if (!segs.length) return `${title}: (no data)`
  const lines = segs.map(s =>
    `  ${s.key}: ${s.trades} trades, ${s.winRate}% win, €${s.netPnl} net, exp €${s.expectancy}/trade` +
    (s.avgR ? `, ${s.avgR}R avg` : ''))
  return `${title}:\n${lines.join('\n')}`
}

// The single stable "facts" block. Shared verbatim by the report and chat so
// prompt caching can reuse it across follow-up questions.
export function buildFacts(stats: TradeStats, b: Breakdowns): string {
  return [
    `OVERALL: ${stats.totalTrades} trades | ${stats.winRate}% win | PF ${stats.profitFactor} | ` +
    `expectancy €${stats.expectancy}/trade | avg win €${stats.avgWin} / avg loss €${stats.avgLoss} | ` +
    `avg R ${stats.avgRR} | max drawdown €${stats.maxDrawdown} | ` +
    `streaks: ${stats.maxConsecWins}W / ${stats.maxConsecLosses}L`,
    ``,
    fmtSeg('BY SETUP', b.bySetup),
    fmtSeg('BY EMOTION (pre-trade)', b.byEmotion),
    fmtSeg('BY SESSION', b.bySession),
    fmtSeg('BY DAY OF WEEK', b.byDayOfWeek),
    fmtSeg('BY SYMBOL', b.bySymbol),
    fmtSeg('PLAN ADHERENCE', b.byPlan),
    fmtSeg('DISCIPLINE SCORE', b.byDiscipline),
    b.worstCombo ? `\nWORST COMBO: ${b.worstCombo.label} — ${b.worstCombo.winRate}% win, €${b.worstCombo.netPnl} over ${b.worstCombo.trades} trades` : '',
    b.bestCombo  ? `BEST COMBO:  ${b.bestCombo.label} — ${b.bestCombo.winRate}% win, €${b.bestCombo.netPnl} over ${b.bestCombo.trades} trades` : '',
  ].filter(Boolean).join('\n')
}

const REPORT_TASK = `Write the trader's Coach's Notes (3-5 tight paragraphs):
1. The single biggest thing costing them money right now — name the exact numbers.
2. Their genuine edge — the setup/context where they actually make money.
3. The behavioral pattern (emotion/discipline/plan) the data reveals.
4. Two or three specific changes for next week, each tied to a number above.
Open with the most important finding in one sentence.`

// Trader DNA focus — one sharp paragraph naming the single biggest behavioral
// opportunity, in the spirit of "your biggest opportunity isn't a new strategy,
// it's X". Reads the scored DNA; never invents figures.
const DNA_SYSTEM = `You are VELQUOR's behavioral trading coach.
You are given a trader's DNA profile: behavioral scores (0-100), labels, and the
data-derived best window / worst condition. These are ground truth.
Write ONE short, punchy paragraph (3-4 sentences) that names the single biggest
opportunity to improve — the one behavior change that would move the needle most.
Be specific to the scores. Contrast it with chasing a new strategy. Do not list
every score; zero in on the weakest, highest-leverage one. No fluff, no fabrication.`

export function dnaFacts(dna: TraderDna): string {
  const dims = dna.dimensions.map(d => `${d.label}: ${d.score}/100`).join(' | ')
  return [
    `Overall DNA: ${dna.overall}/100 (from ${dna.sampleSize} trades)`,
    dims,
    `Impulsiveness: ${dna.impulsiveness}`,
    `Recovery after losses: ${dna.recoveryAfterLoss}`,
    dna.bestWindow ? `Best trading window: ${dna.bestWindow}` : '',
    dna.worstCondition ? `Worst condition: ${dna.worstCondition}` : '',
  ].filter(Boolean).join('\n')
}

export async function generateDnaFocus(plan: TierPlan, dna: TraderDna): Promise<string> {
  const facts = dnaFacts(dna)
  const task  = `TRADER DNA:\n${facts}\n\nWrite the single biggest-opportunity focus paragraph.`
  try {
    if (plan.aiProvider === 'anthropic') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const msg = await client.messages.create({
        model: plan.aiModel, max_tokens: 400,
        system: DNA_SYSTEM,
        messages: [{ role: 'user', content: task }],
      })
      return msg.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('')
    }
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const r = await groq.chat.completions.create({
      model: plan.aiModel, max_tokens: 400, temperature: 0.5,
      messages: [{ role: 'user', content: `${DNA_SYSTEM}\n\n${task}` }],
    })
    return r.choices[0]?.message?.content ?? ''
  } catch {
    return ''
  }
}

// Non-streaming Coach's Notes — used by the PDF report where we need the full
// text before rendering. Returns '' on any failure so the report still renders.
export async function generateCoachNotes(
  plan: TierPlan,
  facts: string,
  extraContext = '',
): Promise<string> {
  const userContent = extraContext
    ? `${facts}\n\nTRADER CONTEXT:\n${extraContext}\n\n${REPORT_TASK}`
    : `${facts}\n\n${REPORT_TASK}`
  try {
    if (plan.aiProvider === 'anthropic') {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const msg = await client.messages.create({
        model: plan.aiModel,
        max_tokens: 1400,
        system: [
          { type: 'text', text: SYSTEM },
          { type: 'text', text: `TRADER STATISTICS (ground truth):\n${facts}`, cache_control: { type: 'ephemeral' } },
        ],
        messages: [{ role: 'user', content: userContent }],
      })
      return msg.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('')
    }
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const r = await groq.chat.completions.create({
      model: plan.aiModel, max_tokens: 1200, temperature: 0.4,
      messages: [{ role: 'user', content: `${SYSTEM}\n\n${userContent}` }],
    })
    return r.choices[0]?.message?.content ?? ''
  } catch {
    return ''
  }
}

// Stream Coach's Notes as plain text. Returns a ReadableStream<Uint8Array>.
export async function streamCoachNotes(
  plan: TierPlan,
  facts: string,
  extraContext = '',
): Promise<ReadableStream<Uint8Array>> {
  const userContent = extraContext
    ? `${facts}\n\nTRADER CONTEXT:\n${extraContext}\n\n${REPORT_TASK}`
    : `${facts}\n\n${REPORT_TASK}`

  if (plan.aiProvider === 'anthropic') {
    return streamAnthropic(plan.aiModel, facts, userContent)
  }
  return streamGroq(plan.aiModel, `${SYSTEM}\n\n${userContent}`)
}

function streamAnthropic(model: string, facts: string, userContent: string): ReadableStream<Uint8Array> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      try {
        // cache_control on the facts-bearing system block: repeated questions
        // over the same stats (chat follow-ups) read the prefix at ~0.1x.
        const stream = client.messages.stream({
          model,
          max_tokens: 1400,
          system: [
            { type: 'text', text: SYSTEM },
            { type: 'text', text: `TRADER STATISTICS (ground truth):\n${facts}`, cache_control: { type: 'ephemeral' } },
          ],
          messages: [{ role: 'user', content: userContent }],
        })
        stream.on('text', (t) => controller.enqueue(encoder.encode(t)))
        await stream.finalMessage()
        controller.close()
      } catch (e) {
        controller.enqueue(encoder.encode(`\n[coach error: ${e instanceof Error ? e.message : 'failed'}]`))
        controller.close()
      }
    },
  })
}

function streamGroq(model: string, prompt: string): ReadableStream<Uint8Array> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await groq.chat.completions.create({
          model, max_tokens: 1200, temperature: 0.4,
          messages: [{ role: 'user', content: prompt }], stream: true,
        })
        for await (const chunk of stream) {
          const t = chunk.choices[0]?.delta?.content ?? ''
          if (t) controller.enqueue(encoder.encode(t))
        }
        controller.close()
      } catch (e) {
        controller.enqueue(encoder.encode(`\n[coach error: ${e instanceof Error ? e.message : 'failed'}]`))
        controller.close()
      }
    },
  })
}
