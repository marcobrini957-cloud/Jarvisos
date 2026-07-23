import Link from 'next/link'
import { LogoMark } from '@/components/ui/LogoMark'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--t1)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '20px', textAlign: 'center', padding: '24px',
    }}>
      <LogoMark size={48} />
      <div>
        <h1 style={{ fontSize: 'clamp(48px,10vw,80px)', fontWeight: 800, letterSpacing: '-0.04em', margin: 0, lineHeight: 1 }}>404</h1>
        <p style={{ color: 'var(--t3)', fontSize: '15px', marginTop: '10px' }}>This page doesn&apos;t exist.</p>
      </div>
      <Link href="/" style={{
        padding: '12px 20px', background: 'var(--ac)', color: '#fff',
        borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: 600,
      }}>Back to home</Link>
    </div>
  )
}
