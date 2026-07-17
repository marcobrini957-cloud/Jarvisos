'use client'

import { LogoMark } from '@/components/ui/LogoMark'
import { useLocale } from '@/hooks/useLocale'
import { openCookieSettings } from '@/components/CookieConsent'

const LINK_HREFS = ['/privacy', '/terms', 'mailto:support@velquor.app']
const LINK_HREFS_DE = ['/datenschutz', '/agb', 'mailto:support@velquor.app']

export function Footer() {
  const { locale, t } = useLocale()
  const fo = t.footer
  const hrefs = locale === 'de' ? LINK_HREFS_DE : LINK_HREFS

  return (
    <footer style={{
      borderTop: '1px solid var(--bd)',
      padding: 'clamp(24px, 4vw, 36px) clamp(16px, 5vw, 48px)',
      display: 'flex', flexDirection: 'column', gap: '20px',
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogoMark size={20} />
          <span style={{ color: 'var(--t3)', fontSize: '12px' }}>{fo.copyright}</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* hrefs by index — locale files keep links in Privacy/Terms/Contact order */}
          {fo.links.map((l, i) => (
            <a key={l} href={hrefs[i] ?? '/'} style={{ color: 'var(--t3)', fontSize: '12px', textDecoration: 'none' }}>{l}</a>
          ))}
          <button
            onClick={openCookieSettings}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--t3)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {locale === 'de' ? 'Cookie-Einstellungen' : 'Cookie settings'}
          </button>
        </div>
      </div>

      {/* Impressum — legally required in Austria (§ 25 MedienG / § 5 ECG) */}
      <div style={{ borderTop: '1px solid var(--bd)', paddingTop: '16px', color: 'var(--t3)', fontSize: '11px', lineHeight: 1.8 }}>
        <p style={{ margin: '0 0 2px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '10px' }}>{fo.impressumLabel}</p>
        <p style={{ margin: 0 }}>
          Medieninhaber &amp; Herausgeber: Marco Brini · Ägydygasse 14, 8020 Graz, Austria · E-Mail:{' '}
          <a href="mailto:support@velquor.app" style={{ color: 'var(--t3)', textDecoration: 'none' }}>support@velquor.app</a>
          {' '}· Angaben gemäß § 25 MedienG und § 5 ECG
        </p>
      </div>
    </footer>
  )
}

