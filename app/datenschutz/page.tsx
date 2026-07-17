import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Wie Velquor Ihre Daten erhebt, verwendet und schützt.',
  alternates: { canonical: '/datenschutz' },
}

const P = ({ children }: { children: React.ReactNode }) => <p style={{ margin: '0 0 12px' }}>{children}</p>
const UL = ({ children }: { children: React.ReactNode }) => <ul style={{ margin: '0 0 12px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</ul>

export default function DatenschutzPage() {
  return (
    <LegalPage
      title="Datenschutzerklärung"
      subtitle="Stand: 17. Juli 2026 · Gilt für velquor.app und alle Velquor-Dienste"
      altLang={{ href: '/privacy', label: 'Read in English (Privacy Policy)' }}
    >

      <LegalSection heading="1. Verantwortlicher">
        <P>
          Marco Brini, Ägydygasse 14, 8020 Graz, Österreich (&quot;Velquor&quot;, &quot;wir&quot;) ist
          Verantwortlicher für die Verarbeitung Ihrer personenbezogenen Daten im Sinne der
          Datenschutz-Grundverordnung (DSGVO). Kontakt:{' '}
          <a href="mailto:support@velquor.app" style={{ color: 'var(--ac)', textDecoration: 'none' }}>support@velquor.app</a>.
        </P>
      </LegalSection>

      <LegalSection heading="2. Welche Daten wir verarbeiten">
        <UL>
          <li><strong style={{ color: 'var(--t1)' }}>Kontodaten</strong> — E-Mail-Adresse, Anzeigename, Avatar und Authentifizierungsdaten bei der Registrierung (Art. 6 Abs. 1 lit. b DSGVO — Vertrag).</li>
          <li><strong style={{ color: 'var(--t1)' }}>Trading-Daten</strong> — Trades, Positionen, Kontostände und Journal-Einträge, die Sie aus MetaTrader 5 synchronisieren oder manuell erfassen. Das ist der Kern des Dienstes (Art. 6 Abs. 1 lit. b).</li>
          <li><strong style={{ color: 'var(--t1)' }}>MT5-Zugangsdaten</strong> — bei Nutzung von Instant Connect Ihre MT5-Kontonummer, das Investor-Passwort und der Broker-Server. Diese werden mit AES-256-GCM verschlüsselt und ausschließlich auf unseren eigenen EU-Servern (Hetzner, Finnland) gespeichert — nie in unserer Hauptdatenbank (Art. 6 Abs. 1 lit. b).</li>
          <li><strong style={{ color: 'var(--t1)' }}>Portfolio-Daten</strong> — Positionen, die Sie anlegen oder per CSV importieren (Art. 6 Abs. 1 lit. b).</li>
          <li><strong style={{ color: 'var(--t1)' }}>Technische Daten</strong> — IP-Adresse und Request-Metadaten in Server-Logs, kurzfristig gespeichert für Sicherheit und Rate-Limiting (Art. 6 Abs. 1 lit. f — berechtigtes Interesse).</li>
        </UL>
        <P>Wir erfassen keine Werbe-IDs und verkaufen keine personenbezogenen Daten.</P>
      </LegalSection>

      <LegalSection heading="3. KI-Funktionen">
        <P>
          Wenn Sie die KI-Funktionen von Velquor nutzen (Chat, Weekly Review, Trade-Feedback,
          Trader DNA), werden relevante Ausschnitte Ihrer Trading-Daten an Anthropic (Claude API)
          übermittelt, um die Analyse zu erstellen. Anthropic verarbeitet diese Daten als unser
          Auftragsverarbeiter und verwendet API-Daten nicht zum Training seiner Modelle.
          KI-Funktionen laufen nur, wenn Sie sie aktiv aufrufen.
        </P>
      </LegalSection>

      <LegalSection heading="4. Auftragsverarbeiter und Hosting">
        <UL>
          <li><strong style={{ color: 'var(--t1)' }}>Vercel</strong> — Hosting und Auslieferung der Anwendung.</li>
          <li><strong style={{ color: 'var(--t1)' }}>Supabase</strong> — Datenbank und Authentifizierung.</li>
          <li><strong style={{ color: 'var(--t1)' }}>Hetzner Online GmbH</strong> — Sync-Bridge und Cloud-Terminals (Server in Finnland, EU).</li>
          <li><strong style={{ color: 'var(--t1)' }}>Anthropic</strong> — KI-Verarbeitung (siehe Abschnitt 3).</li>
        </UL>
        <P>
          Marktpreise (z. B. von Yahoo Finance und der Europäischen Zentralbank) werden von unseren
          Servern abgerufen — Ihre personenbezogenen Daten werden nicht an diese Quellen weitergegeben.
        </P>
        <P>
          Soweit Auftragsverarbeiter außerhalb des EWR sitzen, sind Übermittlungen durch
          EU-Standardvertragsklauseln oder einen Angemessenheitsbeschluss (z. B. das EU–US Data
          Privacy Framework) abgesichert.
        </P>
      </LegalSection>

      <LegalSection heading="5. Cookies">
        <P>
          Velquor verwendet ausschließlich technisch notwendige Cookies: Session-Cookies für den
          Login (Supabase Auth) und einen Eintrag zur Speicherung Ihrer Cookie-Auswahl. Es gibt
          keine Werbe- oder Tracking-Cookies. Eingebettete TradingView-Marktwidgets im Dashboard
          sind Inhalte Dritter, die eigene Cookies setzen — sie werden erst nach Ihrer Zustimmung
          geladen, und Sie können diese Auswahl jederzeit über &quot;Cookie settings&quot; im Footer
          widerrufen (Art. 7 Abs. 3 DSGVO). Für die Verarbeitung durch TradingView gilt deren
          Datenschutzerklärung.
        </P>
      </LegalSection>

      <LegalSection heading="6. Speicherdauer">
        <P>
          Ihre Daten bleiben gespeichert, solange Ihr Konto besteht. Wenn Sie Ihr Konto löschen
          oder uns dazu auffordern, werden Konto- und Trading-Daten gelöscht. Beim Trennen eines
          Instant-Connect-Terminals werden die gespeicherten MT5-Zugangsdaten gelöscht. Server-Logs
          werden automatisch rotiert.
        </P>
      </LegalSection>

      <LegalSection heading="7. Ihre Rechte">
        <P>
          Nach der DSGVO haben Sie das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16),
          Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit
          (Art. 20) und Widerspruch (Art. 21). Zur Ausübung genügt eine E-Mail an{' '}
          <a href="mailto:support@velquor.app" style={{ color: 'var(--ac)', textDecoration: 'none' }}>support@velquor.app</a>.
          Außerdem haben Sie das Recht auf Beschwerde bei einer Aufsichtsbehörde — in Österreich
          ist das die Datenschutzbehörde (dsb.gv.at).
        </P>
      </LegalSection>

      <LegalSection heading="8. Änderungen">
        <P>
          Wir können diese Erklärung anpassen, wenn sich der Dienst weiterentwickelt. Über
          wesentliche Änderungen informieren wir in der App. Die aktuelle Fassung finden Sie immer
          unter velquor.app/datenschutz.
        </P>
      </LegalSection>

    </LegalPage>
  )
}
