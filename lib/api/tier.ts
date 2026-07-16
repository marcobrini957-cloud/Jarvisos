// Single source of truth for what each subscription tier unlocks.
// Reads user_profiles.subscription_tier + tier_expires_at with LAZY DOWNGRADE:
// an expired reward silently resolves to 'free' without a cron.

import { createClient as createServiceClient } from '@supabase/supabase-js'

export type Tier = 'free' | 'pro' | 'ultra'

export interface TierPlan {
  tier:            Tier
  // AI coaching
  aiProvider:      'groq' | 'anthropic'
  aiModel:         string
  // Cloud terminals (Instant Connect) — 0 means EA-path only
  cloudTerminals:  number
  // Copy trading
  copyGroups:      number
  copySlavesEach:  number
  // Feature flags
  aiCoaching:      boolean   // AI "Coach's Notes" (deterministic stats are always free)
  weeklyReviewAi:  boolean
}

export const PLANS: Record<Tier, TierPlan> = {
  free: {
    tier: 'free',
    aiProvider: 'groq',   aiModel: 'llama-3.1-8b-instant',
    cloudTerminals: 0,    copyGroups: 0, copySlavesEach: 0,
    aiCoaching: false,    weeklyReviewAi: true, // free keeps the existing Groq weekly review
  },
  pro: {
    tier: 'pro',
    aiProvider: 'anthropic', aiModel: 'claude-haiku-4-5',
    cloudTerminals: 1,       copyGroups: 1, copySlavesEach: 1,
    aiCoaching: true,        weeklyReviewAi: true,
  },
  ultra: {
    tier: 'ultra',
    aiProvider: 'anthropic', aiModel: 'claude-sonnet-4-6',
    cloudTerminals: 3,       copyGroups: 3, copySlavesEach: 5,
    aiCoaching: true,        weeklyReviewAi: true,
  },
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
