import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'AGB',
  description: 'Allgemeine Geschäftsbedingungen für die Nutzung von Velquor.',
  alternates: { canonical: '/agb' },
}

const P = ({ children }: { children: React.ReactNode }) => <p style={{ margin: '0 0 12px' }}>{children}</p>
const UL = ({ children }: { children: React.ReactNode }) => <ul style={{ margin: '0 0 12px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</ul>

export default function AgbPage() {
  return (
    <LegalPage
      title="Allgemeine Geschäftsbedingungen"
      subtitle="Stand: 17. Juli 2026 · Gilt für velquor.app und alle Velquor-Dienste"
      altLang={{ href: '/terms', label: 'Read in English (Terms of Service)' }}
    >

      <LegalSection heading="1. Der Dienst">
        <P>
          Velquor ist ein Trading-Dashboard, betrieben von Marco Brini, Ägydygasse 14, 8020 Graz,
          Österreich. Sie können damit MetaTrader-5-Trades synchronisieren und journalieren, Ihr
          Trading mit KI analysieren, Portfolios und Prop-Firm-Regeln verfolgen und Trades zwischen
          Ihren eigenen Konten kopieren. Mit der Registrierung akzeptieren Sie diese Bedingungen.
        </P>
      </LegalSection>

      <LegalSection heading="2. Keine Anlageberatung">
        <P>
          Velquor ist ein Analyse- und Journal-Werkzeug. Keine Inhalte des Dienstes — einschließlich
          KI-Analysen, Statistiken, Marktdaten oder generierter Texte — stellen Anlageberatung, eine
          Empfehlung oder eine Aufforderung zum Kauf oder Verkauf von Finanzinstrumenten dar. Der
          Handel mit gehebelten Produkten birgt ein erhebliches Verlustrisiko. Für Ihre
          Handelsentscheidungen sind Sie allein verantwortlich.
        </P>
      </LegalSection>

      <LegalSection heading="3. Ihr Konto">
        <UL>
          <li>Sie müssen zutreffende Angaben machen und Ihre Zugangsdaten geheim halten.</li>
          <li>Sie dürfen nur Handelskonten verbinden, die Ihnen gehören oder für deren Verwaltung Sie berechtigt sind.</li>
          <li>Für Instant Connect empfehlen wir dringend das schreibgeschützte Investor-Passwort Ihres Brokers. Das Kopieren von Trades zwischen Ihren Konten erfordert handelsberechtigten Zugang, den Sie nach eigenem Ermessen erteilen.</li>
          <li>Bei Nutzung von Auto-Sync oder Trade-Copier sind Sie für die Einhaltung der Bedingungen Ihres Brokers bzw. Ihrer Prop Firm verantwortlich.</li>
        </UL>
      </LegalSection>

      <LegalSection heading="4. Tarife und Zahlung">
        <P>
          Velquor bietet einen kostenlosen Tarif sowie kostenpflichtige Tarife (Pro, Ultra) mit
          zusätzlichen Funktionen. Die Preise in EUR finden Sie unter velquor.app/pricing.
          Kostenpflichtige Tarife verlängern sich automatisch bis zur Kündigung; Sie können
          jederzeit zum Ende der laufenden Abrechnungsperiode kündigen. Funktionsumfänge können sich
          weiterentwickeln — wesentliche Einschränkungen eines bezahlten Tarifs kündigen wir vorab an.
        </P>
      </LegalSection>

      <LegalSection heading="5. Widerrufsrecht (Verbraucher)">
        <P>
          Als Verbraucher in der EU können Sie ein kostenpflichtiges Abo binnen 14 Tagen ab
          Vertragsabschluss ohne Angabe von Gründen widerrufen (§ 11 FAGG / Richtlinie 2011/83/EU).
          Dazu genügt eine eindeutige Erklärung an{' '}
          <a href="mailto:support@velquor.app" style={{ color: 'var(--ac)', textDecoration: 'none' }}>support@velquor.app</a>{' '}
          vor Fristablauf — Sie können das Muster unten verwenden, müssen aber nicht.
        </P>
        <P>
          Wenn Sie verlangen, dass der Dienst sofort beginnt, schulden Sie bei Widerruf ein Entgelt
          für den Zeitraum bis zum Widerruf; das Widerrufsrecht erlischt, sobald der Dienst
          vollständig erbracht wurde. Rückerstattungen erfolgen binnen 14 Tagen über das
          ursprüngliche Zahlungsmittel.
        </P>
        <P>
          <em>Muster-Widerrufsformular: &quot;Hiermit widerrufe ich den von mir abgeschlossenen
          Vertrag über das Velquor-Abo vom [Datum]. Name, Konto-E-Mail-Adresse, Datum.&quot;</em>
        </P>
      </LegalSection>

      <LegalSection heading="6. Zulässige Nutzung">
        <UL>
          <li>Keine Versuche, den Dienst oder Daten anderer Nutzer anzugreifen, auszuspähen oder zu überlasten.</li>
          <li>Kein Weiterverkauf und keine Überlassung des Dienstes an Dritte ohne unsere Zustimmung.</li>
          <li>Keine Nutzung des Trade-Copiers für konzessionspflichtige Vermögensverwaltung oder gewerblichen Signalverkauf ohne entsprechende Berechtigung.</li>
          <li>Konten, die gegen diese Bedingungen verstoßen oder die Plattform gefährden, können wir sperren.</li>
        </UL>
      </LegalSection>

      <LegalSection heading="7. Verfügbarkeit und Haftung">
        <P>
          Wir betreiben den Dienst sorgfältig, stellen ihn aber ohne Gewähr ununterbrochener
          Verfügbarkeit bereit. Marktdaten und Broker-Verbindungen hängen von Dritten ab und können
          verzögert, unvollständig oder nicht verfügbar sein. Trade-Kopien werden nach bestem
          Bemühen ausgeführt; Slippage, Requotes, abgelehnte Orders und Verbindungsausfälle sind
          möglich.
        </P>
        <P>
          Soweit gesetzlich zulässig, haften wir nur für Vorsatz und grobe Fahrlässigkeit. Die
          Haftung für leichte Fahrlässigkeit ist ausgeschlossen, ausgenommen Schäden an Leben,
          Körper oder Gesundheit. Wir haften nicht für Handelsverluste, entgangenen Gewinn oder
          Schäden durch Maßnahmen von Brokern oder Prop Firms.
        </P>
      </LegalSection>

      <LegalSection heading="8. Daten">
        <P>
          Ihre Trading-Daten bleiben Ihre. Wie wir personenbezogene Daten verarbeiten, beschreibt
          die <a href="/datenschutz" style={{ color: 'var(--ac)', textDecoration: 'none' }}>Datenschutzerklärung</a>.
          Sie können Ihre Daten jederzeit exportieren (CSV-/PDF-Reports) und Ihr Konto löschen.
        </P>
      </LegalSection>

      <LegalSection heading="9. Beendigung">
        <P>
          Sie können Velquor jederzeit verlassen und Ihr Konto löschen. Wir können kostenlose Konten
          mit angemessener Frist und bezahlte Konten zum Ende des bezahlten Zeitraums beenden — bei
          schweren Verstößen gegen diese Bedingungen auch sofort.
        </P>
      </LegalSection>

      <LegalSection heading="10. Streitbeilegung">
        <P>
          Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle (AStG) teilzunehmen. Sie erreichen uns jederzeit direkt
          unter support@velquor.app — wir versuchen, jedes Anliegen zuerst informell zu lösen.
        </P>
      </LegalSection>

      <LegalSection heading="11. Anwendbares Recht">
        <P>
          Es gilt österreichisches Recht unter Ausschluss der Verweisungsnormen und des
          UN-Kaufrechts. Für Verbraucher mit Wohnsitz in der EU bleiben zwingende
          Verbraucherschutzvorschriften ihres Wohnsitzstaats unberührt. Gerichtsstand für
          Unternehmer ist Graz, Österreich.
        </P>
      </LegalSection>

      <LegalSection heading="12. Änderungen">
        <P>
          Wir können diese Bedingungen anpassen, wenn sich der Dienst weiterentwickelt. Über
          wesentliche Änderungen informieren wir in der App; die weitere Nutzung nach dem
          Wirksamkeitsdatum gilt als Zustimmung. Die aktuelle Fassung finden Sie immer unter
          velquor.app/agb.
        </P>
      </LegalSection>

    </LegalPage>
  )
}
