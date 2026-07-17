import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Impressum',
  alternates: { canonical: '/impressum' },
}

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" subtitle="Angaben gemäß § 25 MedienG und § 5 ECG (Österreich)">

      <LegalSection heading="Medieninhaber & Herausgeber">
        <div style={{ color: 'var(--t1)', fontSize: '15px', lineHeight: 2 }}>
          <p style={{ margin: 0 }}>Marco Brini</p>
          <p style={{ margin: 0 }}>Ägydygasse 14</p>
          <p style={{ margin: 0 }}>8020 Graz</p>
          <p style={{ margin: 0 }}>Österreich (Austria)</p>
        </div>
      </LegalSection>

      <LegalSection heading="Kontakt">
        <p style={{ margin: 0, color: 'var(--t1)', fontSize: '15px' }}>
          E-Mail:{' '}
          <a href="mailto:support@velquor.app" style={{ color: 'var(--ac)', textDecoration: 'none' }}>
            support@velquor.app
          </a>
        </p>
      </LegalSection>

      <LegalSection heading="Unternehmensgegenstand">
        <p style={{ margin: 0 }}>
          Betrieb der Online-Plattform Velquor — ein Trading-Dashboard für MT5-Händler.
        </p>
      </LegalSection>

      <LegalSection heading="Haftungsausschluss">
        <p style={{ margin: 0 }}>
          Die Inhalte dieser Website dienen ausschließlich zu Informationszwecken und stellen keine Anlageberatung dar.
          Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links.
          Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
        </p>
      </LegalSection>

    </LegalPage>
  )
}
