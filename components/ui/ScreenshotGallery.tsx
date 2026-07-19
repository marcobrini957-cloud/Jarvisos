'use client'

import { useState } from 'react'
import type { Trade } from '@/types'

interface ScreenshotGalleryProps {
  trades: Trade[]
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-AT', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'Europe/Vienna',
  })
}

function fmtPnl(n: number | null): string {
  if (n === null) return '—'
  return `${n >= 0 ? '+' : '-'}€${Math.abs(n).toFixed(2)}`
}

// Close shot first — it has both entry and exit marked.
export function bestShot(t: Trade): string | null {
  return t.screenshot_close_url || t.screenshot_open_url || t.screenshot_user_url || null
}

export default function ScreenshotGallery({ trades }: ScreenshotGalleryProps) {
  const [lightbox, setLightbox] = useState<Trade | null>(null)

  const withScreenshots = trades.filter(t => bestShot(t))

  if (withScreenshots.length === 0) {
    return (
      <div style={{
        padding: '32px', textAlign: 'center',
        background: 'var(--s2)', borderRadius: '10px', border: '1px dashed var(--bd2)',
      }}>
        <p style={{ color: 'var(--t3)', fontSize: '13px' }}>No chart screenshots yet.</p>
        <p style={{ color: 'var(--t3)', fontSize: '11px', marginTop: '4px' }}>
          New trades are captured automatically from MT5 — or upload your own in the trade journal.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '10px',
      }}>
        {withScreenshots.map(trade => {
          const pnl    = trade.net_profit ?? 0
          const pnlCol = pnl > 10 ? 'var(--gr2)' : pnl < -10 ? 'var(--re)' : 'var(--ac)'
          return (
            <div
              key={trade.id}
              onClick={() => setLightbox(trade)}
              style={{
                cursor: 'pointer', borderRadius: '8px', overflow: 'hidden',
                border: '1px solid var(--bd2)', background: 'var(--s2)',
                transition: 'all 0.12s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--bd3)'
                e.currentTarget.style.transform = 'scale(1.02)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--bd2)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              {/* Thumbnail */}
              <div style={{ position: 'relative', paddingTop: '56.25%', background: 'var(--s3)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bestShot(trade)!}
                  alt={`${trade.symbol} chart`}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover',
                  }}
                  loading="lazy"
                />
              </div>
              {/* Info */}
              <div style={{ padding: '7px 9px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--t1)' }}>
                    {trade.symbol}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: pnlCol }}>
                    {fmtPnl(trade.net_profit)}
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--t3)' }}>
                  {fmtDate(trade.open_time)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
            onClick={() => setLightbox(null)}
          />
          <div
            className="fixed z-50"
            style={{
              top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: '90vw', maxWidth: '1100px', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bestShot(lightbox)!}
              alt={`${lightbox.symbol} chart`}
              style={{
                width: '100%', maxHeight: 'calc(90vh - 80px)',
                objectFit: 'contain', borderRadius: '10px',
                border: '1px solid var(--bd2)',
              }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--s1)', borderRadius: '8px', padding: '10px 16px',
              border: '1px solid var(--bd2)',
            }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--t1)' }}>
                  {lightbox.symbol} {lightbox.trade_type?.toUpperCase()}
                </span>
                <span style={{
                  fontSize: '14px', fontWeight: 700,
                  color: (lightbox.net_profit ?? 0) > 10 ? 'var(--gr2)' : (lightbox.net_profit ?? 0) < -10 ? 'var(--re)' : 'var(--ac)',
                }}>
                  {fmtPnl(lightbox.net_profit)}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--t3)' }}>
                  {fmtDate(lightbox.open_time)}
                </span>
                {lightbox.setup_type && (
                  <span style={{ fontSize: '11px', color: 'var(--t2)', background: 'var(--s3)', padding: '2px 8px', borderRadius: '4px' }}>
                    {lightbox.setup_type}
                  </span>
                )}
              </div>
              <button
                onClick={() => setLightbox(null)}
                style={{
                  background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '6px',
                  color: 'var(--t2)', cursor: 'pointer', fontSize: '13px', padding: '4px 12px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
