import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Velquor collects, uses, and protects your data.',
  alternates: { canonical: '/privacy' },
}

const P = ({ children }: { children: React.ReactNode }) => <p style={{ margin: '0 0 12px' }}>{children}</p>
const UL = ({ children }: { children: React.ReactNode }) => <ul style={{ margin: '0 0 12px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</ul>

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="Last updated: 17 July 2026 · Applies to velquor.app and all Velquor services"
      altLang={{ href: '/datenschutz', label: 'Auf Deutsch lesen (Datenschutzerklärung)' }}
    >

      <LegalSection heading="1. Controller">
        <P>
          Marco Brini, Ägydygasse 14, 8020 Graz, Austria (&quot;Velquor&quot;, &quot;we&quot;) is the controller
          responsible for processing your personal data under the EU General Data Protection
          Regulation (GDPR). Contact: <a href="mailto:support@velquor.app" style={{ color: 'var(--ac)', textDecoration: 'none' }}>support@velquor.app</a>.
        </P>
      </LegalSection>

      <LegalSection heading="2. Data we collect">
        <UL>
          <li><strong style={{ color: 'var(--t1)' }}>Account data</strong> — email address, display name, avatar, and authentication data when you sign up (Art. 6(1)(b) GDPR — contract).</li>
          <li><strong style={{ color: 'var(--t1)' }}>Trading data</strong> — trades, positions, account balances, and journal entries you sync from MetaTrader 5 or enter manually. This is the core of the service (Art. 6(1)(b)).</li>
          <li><strong style={{ color: 'var(--t1)' }}>MT5 connection credentials</strong> — if you use Instant Connect, your MT5 account number, investor password, and broker server. These are encrypted with AES-256-GCM and stored only on our own EU servers (Hetzner, Finland) — never in our main database (Art. 6(1)(b)).</li>
          <li><strong style={{ color: 'var(--t1)' }}>Portfolio data</strong> — holdings you add or import via CSV (Art. 6(1)(b)).</li>
          <li><strong style={{ color: 'var(--t1)' }}>Technical data</strong> — IP address and request metadata in server logs, kept short-term for security and rate limiting (Art. 6(1)(f) — legitimate interest).</li>
        </UL>
        <P>We do not collect advertising identifiers and we do not sell personal data.</P>
      </LegalSection>

      <LegalSection heading="3. AI features">
        <P>
          When you use Velquor&apos;s AI features (chat, weekly review, trade feedback, Trader DNA),
          relevant excerpts of your trading data are sent to Anthropic (Claude API) to generate the
          analysis. Anthropic processes this data as our processor and does not use API data to
          train its models. AI features run only when you invoke them.
        </P>
      </LegalSection>

      <LegalSection heading="4. Processors and hosting">
        <UL>
          <li><strong style={{ color: 'var(--t1)' }}>Vercel</strong> — application hosting and delivery.</li>
          <li><strong style={{ color: 'var(--t1)' }}>Supabase</strong> — database and authentication.</li>
          <li><strong style={{ color: 'var(--t1)' }}>Hetzner Online GmbH</strong> — sync bridge and cloud terminals (servers in Finland, EU).</li>
          <li><strong style={{ color: 'var(--t1)' }}>Anthropic</strong> — AI processing (see section 3).</li>
        </UL>
        <P>
          Market prices (e.g. from Yahoo Finance and the European Central Bank) are fetched by our
          servers — your personal data is not shared with these sources.
        </P>
        <P>
          Where processors are located outside the EEA, transfers are safeguarded by EU Standard
          Contractual Clauses or an adequacy decision (e.g. the EU–US Data Privacy Framework).
        </P>
      </LegalSection>

      <LegalSection heading="5. Cookies">
        <P>
          Velquor uses only strictly necessary cookies: session cookies for login (Supabase Auth)
          and a preference entry storing your cookie choice. We run no advertising or tracking
          cookies. Embedded TradingView market widgets inside the dashboard are third-party content
          that sets its own cookies — they load only after you accept them, and you can withdraw
          that choice at any time via &quot;Cookie settings&quot; in the footer (Art. 7(3) GDPR).
          See TradingView&apos;s privacy policy for their processing.
        </P>
      </LegalSection>

      <LegalSection heading="6. Retention">
        <P>
          Your data is kept for as long as your account exists. If you delete your account, or ask
          us to, your account and trading data are deleted. Disconnecting an Instant Connect
          terminal deletes the stored MT5 credentials. Server logs are rotated automatically.
        </P>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <P>
          Under the GDPR you have the right of access (Art. 15), rectification (Art. 16), erasure
          (Art. 17), restriction (Art. 18), data portability (Art. 20), and objection (Art. 21).
          To exercise any of these, email <a href="mailto:support@velquor.app" style={{ color: 'var(--ac)', textDecoration: 'none' }}>support@velquor.app</a>.
          You also have the right to lodge a complaint with a supervisory authority — in Austria,
          the Datenschutzbehörde (dsb.gv.at).
        </P>
      </LegalSection>

      <LegalSection heading="8. Changes">
        <P>
          We may update this policy as the service evolves. Material changes will be announced in
          the app. The current version always lives at velquor.app/privacy.
        </P>
      </LegalSection>

    </LegalPage>
  )
}
