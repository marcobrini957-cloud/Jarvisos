'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { Surface, Label, Button, Num } from '@/components/ui/vq'

/**
 * What a new account meets first.
 *
 * What it replaces, and why: a four-screen /onboarding flow followed by a
 * spotlight tour that started itself on the dashboard. Both were scripts. They
 * ran the same way whether the account was connected or empty, they described
 * panels rather than telling anyone what to *do*, and the honest response to
 * both was to press Skip until they stopped. Worse, the first sentence a new
 * user read said "Install the VELQUOR EA" — an acronym for a MetaTrader concept
 * that means nothing to someone who has never automated anything, used before
 * we had said a single word about what the product does for them.
 *
 * This is not a script. Every step reads the account and is already ticked if
 * it is true, so the list is about *their* setup rather than a tour of ours: it
 * completes itself as they use the product, and it disappears when there is
 * nothing left to do. A step that is already done on day one is a step nobody
 * has to be walked through.
 *
 * Rules for the copy here:
 *  · No acronyms. Not EA, not MT5 in the first line, not "sync".
 *  · Say what happens, not what a thing is called: "your trades appear here by
 *    themselves" beats "auto-sync".
 *  · One sentence per step. Anything longer is a manual, and this is not one.
 */

const HIDDEN_KEY = 'vq-getting-started-hidden'

export interface SetupCounts {
  trades:  number
  entries: number
  habits:  number
  loading: boolean
}

interface Step {
  id:    string
  title: string
  body:  string
  done:  boolean
  /** Shown only while the step is the current one. */
  cta?:  { label: string; href?: string; tab?: number }
}

export default function GettingStarted({ counts }: { counts: SetupCounts }) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [hidden, setHidden] = useState(true)   // assume hidden until we've read localStorage, so it never flashes

  useEffect(() => {
    setHidden(localStorage.getItem(HIDDEN_KEY) === '1')
    const onShow = () => { localStorage.removeItem(HIDDEN_KEY); setHidden(false) }
    window.addEventListener('vq-show-getting-started', onShow)
    return () => window.removeEventListener('vq-show-getting-started', onShow)
  }, [])

  // The one piece of state the Overview does not already hold.
  useEffect(() => {
    let live = true
    const read = () => fetch('/api/user/api-key')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (live && d) setConnected(Boolean(d.ea_connected)) })
      .catch(() => {})
    read()
    // While someone is mid-setup in another window, this is the thing that
    // ticks — worth watching, and cheap.
    const iv = setInterval(read, 15000)
    return () => { live = false; clearInterval(iv) }
  }, [])

  // A connected account is the point of step one, but trades arriving proves it
  // better than a flag does — an account that has already synced is connected
  // whatever the heartbeat says this second.
  const isConnected = Boolean(connected) || counts.trades > 0

  const steps: Step[] = [
    {
      id: 'connect',
      title: 'Connect your trading account',
      body: 'VELQUOR reads your trades straight out of MetaTrader, so you never type a trade in by hand.',
      done: isConnected,
      cta: { label: 'Connect MetaTrader', href: '/connect' },
    },
    {
      id: 'trades',
      title: 'Close a trade',
      body: 'Your next closed position shows up here on its own, with a screenshot of the chart at the moment you were in it.',
      done: counts.trades > 0,
    },
    {
      id: 'journal',
      title: 'Write one line about a session',
      body: 'How you felt and what you saw. This is what turns a list of numbers into a pattern you can do something about.',
      done: counts.entries > 0,
      cta: { label: 'Open the journal', tab: 3 },
    },
    {
      id: 'rule',
      title: 'Set one rule you want to keep',
      body: 'Something like "no trading after two losses". VELQUOR tracks whether you keep it, so your discipline gets measured like your P&L.',
      done: counts.habits > 0,
      cta: { label: 'Add a rule', tab: 5 },
    },
  ]

  const doneCount = steps.filter(s => s.done).length
  const allDone   = doneCount === steps.length
  const current   = steps.find(s => !s.done)

  // Nothing to show: everything done, dismissed, or still loading the counts
  // that decide it. Loading matters — a card that appears and then vanishes a
  // moment later is worse than one that waits.
  if (hidden || allDone || counts.loading) return null

  function hide() {
    localStorage.setItem(HIDDEN_KEY, '1')
    setHidden(true)
  }

  function go(step: Step) {
    if (step.cta?.tab !== undefined) {
      window.dispatchEvent(new CustomEvent('vq-switch-tab', { detail: step.cta.tab }))
    }
  }

  return (
    <Surface
      title="Getting started"
      action={
        <>
          <Label>
            <Num size="2xs">{doneCount}</Num> of <Num size="2xs">{steps.length}</Num>
          </Label>
          <Button size="sm" variant="ghost" onClick={hide}>Hide</Button>
        </>
      }
      padded
    >
      <p style={{
        margin: '0 0 16px', maxWidth: '64ch',
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
        color: 'var(--color-ink-3)', lineHeight: 1.55,
      }}>
        VELQUOR watches how you actually trade and tells you what is costing you money.
        For that it needs your trades and a little of your own read on them — four things,
        and the first is the only one that takes any setup.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {steps.map(step => {
          const isCurrent = step.id === current?.id
          return (
            <div
              key={step.id}
              style={{
                display: 'flex', gap: '13px', alignItems: 'flex-start',
                padding: '11px 12px', borderRadius: 'var(--radius-lg)',
                background: isCurrent ? 'var(--color-surface-1)' : 'transparent',
                border: `1px solid ${isCurrent ? 'var(--color-line-1)' : 'transparent'}`,
              }}
            >
              {/* Done, or the next thing to do. Nothing in between needs a state. */}
              <span
                aria-hidden
                style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step.done ? 'var(--color-ink-1)' : 'transparent',
                  border: step.done ? 'none' : `1px solid ${isCurrent ? 'var(--color-line-3)' : 'var(--color-line-1)'}`,
                  color: 'var(--color-void)',
                }}
              >
                {step.done && <Icon name="check" size={11} strokeWidth={2.5} />}
              </span>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
                  color: step.done ? 'var(--color-ink-3)' : 'var(--color-ink-1)',
                  textDecoration: step.done ? 'line-through' : 'none',
                }}>
                  {step.title}
                </div>
                {!step.done && (
                  <div style={{
                    marginTop: '3px', maxWidth: '62ch',
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                    color: 'var(--color-ink-3)', lineHeight: 1.5,
                  }}>
                    {step.body}
                  </div>
                )}
              </div>

              {isCurrent && step.cta && (
                step.cta.href
                  ? <Link href={step.cta.href} style={{ textDecoration: 'none', flexShrink: 0 }}>
                      <Button size="sm" variant="primary">{step.cta.label}</Button>
                    </Link>
                  : <Button size="sm" variant="primary" style={{ flexShrink: 0 }} onClick={() => go(step)}>
                      {step.cta.label}
                    </Button>
              )}
            </div>
          )
        })}
      </div>
    </Surface>
  )
}
