// Single source of truth for what each subscription tier unlocks.
// Reads user_profiles.subscription_tier + tier_expires_at with LAZY DOWNGRADE:
// an expired reward silently resolves to 'free' without a cron.

import { createClient as createServiceClient } from '@supabase/supabase-js'

export type Tier = 'free' | 'pro' | 'ultra'

/**
 * Every capability the pricing page names, as a flag.
 *
 * The page used to hardcode its own list of strings while this file held the
 * flags, and nothing joined them — so the page could promise that session
 * analytics were Pro-only while the app handed them to everyone, and neither
 * side would ever notice. `capabilityLabel` below closes that loop: the page is
 * rendered FROM these, so an advertised feature and an enforced feature are the
 * same declaration.
 */
export type Capability =
  | 'sessionAnalytics'      // London / NY / Asia breakdowns
  | 'setupAnalytics'        // per-setup and per-emotion win rates
  | 'analyst'               // the Ask VELQUOR chat
  | 'behaviorCorrelations'  // mood, discipline and streak correlations
  | 'pdfReports'
  | 'propFirmTracker'
  | 'copyTrading'
  | 'cloudTerminal'
  | 'prioritySupport'

export interface TierPlan {
  tier:            Tier
  // AI coaching
  aiProvider:      'groq' | 'anthropic'
  aiModel:         string
  // Cloud terminals (Instant Connect) — 0 means EA-path only
  cloudTerminals:  number
  // Copy trading
  copyGroups:      number
  copyFollowersEach:  number
  // Feature flags
  aiCoaching:      boolean   // AI "Coach's Notes" (deterministic stats are always free)
  weeklyReviewAi:  boolean
  /** What this plan may reach. The pricing page renders from exactly this. */
  can:             Record<Capability, boolean>
  /** Days of trade history the app will show. null = everything. */
  historyDays:     number | null
  /** Journal entries the account may hold. null = unlimited. */
  journalLimit:    number | null
}

/**
 * The words the pricing page prints. Kept beside the flags so a capability
 * cannot be added without deciding how it is described to someone paying.
 */
export const CAPABILITY_LABEL: Record<Capability, string> = {
  sessionAnalytics:     'Session analytics (London / NY / Asia)',
  setupAnalytics:       'Setup analytics (per-setup win rate)',
  analyst:              'VELQUOR Analyst',
  behaviorCorrelations: 'Behavior correlations',
  pdfReports:           'PDF trade reports',
  propFirmTracker:      'Prop firm tracker',
  copyTrading:          'Trade copier',
  cloudTerminal:        'Zero-setup cloud connection',
  prioritySupport:      'Priority support',
}

const NONE: Record<Capability, boolean> = {
  sessionAnalytics: false, setupAnalytics: false, analyst: false,
  behaviorCorrelations: false, pdfReports: false, propFirmTracker: false,
  copyTrading: false, cloudTerminal: false, prioritySupport: false,
}
const ALL: Record<Capability, boolean> = {
  sessionAnalytics: true, setupAnalytics: true, analyst: true,
  behaviorCorrelations: true, pdfReports: true, propFirmTracker: true,
  copyTrading: true, cloudTerminal: true, prioritySupport: true,
}

export const PLANS: Record<Tier, TierPlan> = {
  free: {
    tier: 'free',
    aiProvider: 'groq',   aiModel: 'llama-3.1-8b-instant',
    cloudTerminals: 0,    copyGroups: 0, copyFollowersEach: 0,
    aiCoaching: false,    weeklyReviewAi: true, // free keeps the existing Groq weekly review
    can: { ...NONE },
    historyDays: 30, journalLimit: 100,
  },
  pro: {
    tier: 'pro',
    aiProvider: 'anthropic', aiModel: 'claude-haiku-4-5',
    cloudTerminals: 1,       copyGroups: 1, copyFollowersEach: 1,
    aiCoaching: true,        weeklyReviewAi: true,
    can: { ...ALL, prioritySupport: false },
    historyDays: null, journalLimit: null,
  },
  ultra: {
    tier: 'ultra',
    aiProvider: 'anthropic', aiModel: 'claude-sonnet-5',
    cloudTerminals: 3,       copyGroups: 3, copyFollowersEach: 5,
    aiCoaching: true,        weeklyReviewAi: true,
    can: { ...ALL },
    historyDays: null, journalLimit: null,
  },
}

/**
 * The strongest model Groq serves us. Paid tiers fall back to this when there
 * is no Anthropic key — it is the same model the Analyst chat already runs on,
 * so a beta tester gets real coaching rather than a blank panel.
 */
export const GROQ_FALLBACK_MODEL = 'llama-3.3-70b-versatile'

/** A real key, not the `your_anthropic_key_here` placeholder in .env.local. */
export function hasAnthropicKey(): boolean {
  return process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant') === true
}

/**
 * What the AI calls should ACTUALLY use, given what is configured right now.
 *
 * The plans above describe the product we are selling; this describes the
 * product we can currently deliver. Paid tiers asked for Anthropic while
 * ANTHROPIC_API_KEY was a placeholder, so every paid coaching call threw and
 * was swallowed into '' — the panels rendered empty and nothing said why.
 *
 * Now the absence of a key routes to Groq instead of to silence, and adding a
 * real key upgrades every paid tier on the next request with no code change.
 */
export function resolveAi(plan: TierPlan): { provider: 'groq' | 'anthropic'; model: string } {
  if (plan.aiProvider === 'anthropic' && !hasAnthropicKey()) {
    return { provider: 'groq', model: GROQ_FALLBACK_MODEL }
  }
  return { provider: plan.aiProvider, model: plan.aiModel }
}

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// Resolve the effective tier for a user, honoring reward expiry (lazy downgrade).
export async function getUserTier(userId: string): Promise<Tier> {
  const { data } = await service()
    .from('user_profiles')
    .select('subscription_tier, tier_expires_at')
    .eq('id', userId)
    .maybeSingle()

  const raw = (data?.subscription_tier ?? 'free') as string
  if (raw !== 'pro' && raw !== 'ultra') return 'free'

  // Expired reward → treat as free until a real renewal writes a new expiry.
  if (data?.tier_expires_at && new Date(data.tier_expires_at).getTime() < Date.now()) {
    return 'free'
  }
  return raw
}

export async function getUserPlan(userId: string): Promise<TierPlan> {
  return PLANS[await getUserTier(userId)]
}

/** Does this tier reach that capability? The one question every gate asks. */
export function tierCan(tier: Tier, cap: Capability): boolean {
  return PLANS[tier].can[cap]
}
