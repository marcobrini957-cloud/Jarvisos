'use client'

import Panel from '@/components/ui/Panel'

export default function SettingsTab() {
  const row = (label: string, value: string, color = 'var(--t2)') => (
    <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--bd)' }}>
      <span style={{ color: 'var(--t2)', fontSize: '12px' }}>{label}</span>
      <span style={{ color, fontSize: '12px', fontWeight: 500 }}>{value}</span>
    </div>
  )

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h1 style={{ color: 'var(--t1)', fontSize: '18px', fontWeight: 600 }}>Settings</h1>
        <p style={{ color: 'var(--t2)', fontSize: '12px', marginTop: '4px' }}>Integrations and connected services</p>
      </div>

      {/* ── Connected Services ── */}
      <Panel title="Connected Services">
        <div className="flex flex-col">
          {row('Supabase (database)',       'Connected',  'var(--gr2)')}
          {row('Anthropic Claude',          'Active',     'var(--gr2)')}
          {row('MetaAPI (MT5 sync)',         'Configured', 'var(--ac)')}
          {row('Yahoo Finance (portfolio)', 'Active',     'var(--gr2)')}
          {row('gold-api.com (metals)',     'Active',     'var(--gr2)')}
          {row('open.er-api.com (FX)',      'Active',     'var(--gr2)')}
          {row('Forex Factory (calendar)',  'Active',     'var(--gr2)')}
        </div>
      </Panel>

      {/* ── Screenshot Storage ── */}
      <Panel title="Screenshot Storage">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gr2)', display: 'inline-block' }} />
            <span style={{ color: 'var(--t2)', fontSize: '12px' }}>
              Supabase Storage — bucket: <code style={{ color: 'var(--ac)', fontSize: '11px' }}>trade-screenshots</code>
            </span>
          </div>
          <p style={{ color: 'var(--t3)', fontSize: '11px', lineHeight: '1.6' }}>
            Screenshots are auto-uploaded when you annotate a trade. Files are stored as PNG/JPG and served via public CDN URLs.
          </p>
        </div>
      </Panel>
    </div>
  )
}
