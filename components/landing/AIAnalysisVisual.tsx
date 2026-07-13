import { LogoMark } from '@/components/ui/LogoMark'

export function AIAnalysisVisual() {
  const dims = [
    {
      label: 'BEHAVIOR', color: '#4B8FFF', rgb: '75,143,255',
      tags: ['Mood: Confident', 'Energy: High', 'Focus: Sharp'],
    },
    {
      label: 'STRATEGY', color: '#E040FB', rgb: '224,64,251',
      tags: ['Setup: Order Block', 'Session: London', 'Pair: XAUUSD'],
    },
    {
      label: 'HABITS', color: '#FFB830', rgb: '255,184,48',
      tags: ['Time: 08:00–11:00', 'Trades/day: 2', 'Risk: 1%'],
    },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {dims.map(d => (
        <div key={d.label} style={{
          padding: '13px 15px', borderRadius: '11px',
          background: `rgba(${d.rgb},0.04)`,
          border: `1px solid rgba(${d.rgb},0.14)`,
          display: 'flex', alignItems: 'flex-start', gap: '11px',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `rgba(${d.rgb},0.12)`, border: `1px solid rgba(${d.rgb},0.25)`,
          }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: d.color }}>◆</span>
          </div>
          <div>
            <p style={{ margin: '0 0 7px', color: d.color, fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>{d.label}</p>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {d.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                  background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontSize: '16px', margin: '2px 0' }}>↓</div>
      <div style={{
        padding: '14px 15px', borderRadius: '11px',
        background: 'linear-gradient(135deg, rgba(75,143,255,0.07), rgba(224,64,251,0.05))',
        border: '1px solid rgba(75,143,255,0.22)',
        display: 'flex', gap: '10px', alignItems: 'flex-start',
      }}>
        <LogoMark size={20} />
        <div>
          <p style={{ margin: '0 0 5px', color: '#4B8FFF', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em' }}>VELQUOR FOUND A PATTERN</p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', fontSize: '12px', lineHeight: 1.6 }}>
            Confident + London + Order Block = <strong style={{ color: '#00FF85' }}>78% win rate</strong>, avg +€142/trade. This exact combination drives 64% of your total profit this month.
          </p>
        </div>
      </div>
    </div>
  )
}
