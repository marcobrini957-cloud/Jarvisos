'use client'

import { useState, useEffect } from 'react'
import { useUserProfile } from '@/context/UserProfileContext'

const AFFIRMATIONS = [
  "Discipline over impulse. Every single time.",
  "The market rewards patience — and you are patient.",
  "Your edge works over hundreds of trades, not one.",
  "A missed trade is better than a bad one.",
  "Risk management is the job. Everything else is noise.",
  "Consistency compounds. Keep showing up.",
  "Cut losses fast. Let winners breathe.",
  "One trade at a time. One good decision at a time.",
  "You are not your last trade.",
  "Protect your capital like it's your last.",
  "Emotions are data. Don't trade them.",
  "A planned loss is a professional trade.",
  "No FOMO. Your setup either exists or it doesn't.",
  "Elite traders wait. Amateurs chase.",
  "Patience is the most underrated edge in trading.",
  "You control risk. You cannot control outcome.",
  "The plan is sacred. Execute the plan.",
  "Think in probabilities, not certainties.",
  "Quality over quantity. One great trade beats five average ones.",
  "Your consistency is your competitive advantage.",
  "Stay humble. The market is always right.",
  "Execute with confidence. Accept the outcome with peace.",
  "You have an edge. Trust it.",
  "Process over outcome. Always.",
  "Small consistent gains beat large inconsistent wins.",
  "Preparation before the market opens is where trades are won.",
  "Losing is part of the process. Manage it well.",
  "Think long-term. Every session is just one data point.",
  "The best traders are the most disciplined, not the most clever.",
  "Calm is a weapon. Use it today.",
]

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getDailyAffirmation(): string {
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  return AFFIRMATIONS[dayIndex % AFFIRMATIONS.length]
}

const KEY_DATE    = 'vq_greeting_date'
const KEY_ENABLED = 'vq_greeting_enabled'

export default function WelcomeGreeting() {
  const { profile, loading } = useUserProfile()
  const [visible, setVisible]   = useState(false)
  const [rendered, setRendered] = useState(false)
  // No greeting has ever been dismissed here, so this is a first arrival —
  // "Welcome back" to someone who has never been back reads like the product
  // has mistaken them for somebody else.
  const [returning, setReturning] = useState(true)

  useEffect(() => {
    if (loading) return
    const enabled = localStorage.getItem(KEY_ENABLED)
    if (enabled === 'false') return
    // Not on a phone. On a laptop this is a pleasant half-second; on a 390px
    // screen it is a full-screen blocker between someone and their account,
    // every day, on top of a cookie banner and a feedback button. A phone has
    // room for the product or for overlays, and it should be the product.
    if (window.matchMedia('(max-width: 639px)').matches) return
    const today    = new Date().toDateString()
    const lastSeen = localStorage.getItem(KEY_DATE)
    if (lastSeen === today) return
    setReturning(lastSeen !== null)
    setVisible(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setRendered(true)))
  }, [loading])

  function dismiss() {
    setRendered(false)
    setTimeout(() => {
      setVisible(false)
      localStorage.setItem(KEY_DATE, new Date().toDateString())
    }, 350)
  }

  if (!visible) return null

  const firstName = profile.display_name && profile.display_name !== 'Trader'
    ? profile.display_name.split(' ')[0]
    : null

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        opacity: rendered ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '460px', width: '100%',
          background: 'var(--s1)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(28px, 5vw, 44px) clamp(24px, 5vw, 40px)',
          textAlign: 'center',
          transform: rendered ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
          transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Time of day */}
        <p style={{
          color: 'var(--t3)', fontSize: 'var(--text-sm)',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: '12px', fontWeight: 500,
        }}>
          {getTimeOfDay()}
        </p>

        {/* Name headline */}
        <h1 style={{
          color: 'var(--t1)',
          fontSize: 'clamp(21px, 5vw, 30px)',
          fontWeight: 700, lineHeight: 1.25,
          marginBottom: '24px',
        }}>
          {firstName
            ? <>{returning ? 'Welcome back' : 'Welcome'},{' '}<span style={{ color: 'var(--go2)' }}>{firstName}</span>.</>
            : returning ? 'Welcome back.' : 'Welcome.'
          }
        </h1>

        {/* Gold rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.18)' }} />
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,0.55)' }} />
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* Daily affirmation */}
        <p style={{
          color: 'var(--t1)',
          fontSize: 'clamp(13px, 3vw, 17px)',
          fontWeight: 400, lineHeight: 1.65,
          marginBottom: '32px',
          fontStyle: 'italic',
          letterSpacing: '0.01em',
        }}>
          &ldquo;{getDailyAffirmation()}&rdquo;
        </p>

        {/* CTA */}
        <button
          onClick={dismiss}
          style={{
            width: '100%', padding: '13px 0',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.32)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--go2)', fontSize: 'var(--text-base)', fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.04em',
            textTransform: 'uppercase',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
        >
          Let&apos;s win
        </button>

        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)', marginTop: '14px' }}>
          Click anywhere to dismiss &middot; Toggle in Settings
        </p>
      </div>
    </div>
  )
}
