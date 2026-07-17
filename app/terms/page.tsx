import type { Metadata } from 'next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of Velquor.',
  alternates: { canonical: '/terms' },
}

const P = ({ children }: { children: React.ReactNode }) => <p style={{ margin: '0 0 12px' }}>{children}</p>
const UL = ({ children }: { children: React.ReactNode }) => <ul style={{ margin: '0 0 12px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>{children}</ul>

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="Last updated: 17 July 2026 · Applies to velquor.app and all Velquor services"
      altLang={{ href: '/agb', label: 'Auf Deutsch lesen (AGB)' }}
    >

      <LegalSection heading="1. The service">
        <P>
          Velquor is a trading dashboard operated by Marco Brini, Ägydygasse 14, 8020 Graz, Austria.
          It lets you sync and journal MetaTrader 5 trades, analyse your trading with AI, track
          portfolios and prop-firm rules, and copy trades between your own accounts. By creating an
          account you accept these terms.
        </P>
      </LegalSection>

      <LegalSection heading="2. Not financial advice">
        <P>
          Velquor is an analytics and journaling tool. Nothing in the service — including AI
          analysis, statistics, market data, or any generated text — constitutes investment advice,
          a recommendation, or a solicitation to buy or sell any financial instrument. Trading
          leveraged products involves substantial risk of loss. You alone are responsible for your
          trading decisions.
        </P>
      </LegalSection>

      <LegalSection heading="3. Your account">
        <UL>
          <li>You must provide accurate information and keep your login credentials confidential.</li>
          <li>You may only connect trading accounts that you own or are authorised to manage.</li>
          <li>For Instant Connect we strongly recommend using your broker&apos;s read-only investor password. Trade copying between your accounts requires trade-enabled access, which you grant at your own discretion.</li>
          <li>You are responsible for complying with your broker&apos;s and prop firm&apos;s terms when using auto-sync or the trade copier.</li>
        </UL>
      </LegalSection>

      <LegalSection heading="4. Plans and payment">
        <P>
          Velquor offers a free plan and paid plans (Pro, Ultra) with additional features. Prices
          are shown in EUR at velquor.app/pricing. Paid plans renew automatically until cancelled;
          you can cancel at any time with effect from the end of the current billing period.
          Feature limits per plan may evolve — material reductions to a paid plan will be
          communicated in advance.
        </P>
      </LegalSection>

      <LegalSection heading="5. Right of withdrawal (consumers)">
        <P>
          If you are a consumer in the EU, you may withdraw from a paid subscription within 14 days
          of purchase without giving any reason (§ 11 FAGG / Directive 2011/83/EU). To exercise
          this right, send a clear statement to{' '}
          <a href="mailto:support@velquor.app" style={{ color: 'var(--ac)', textDecoration: 'none' }}>support@velquor.app</a>{' '}
          before the deadline — you may use the model text below, but you don&apos;t have to.
        </P>
        <P>
          If you ask us to start the service immediately, you acknowledge that you owe payment for
          the period until withdrawal, and that the withdrawal right expires once the service has
          been fully performed. Refunds are made using the original payment method within 14 days.
        </P>
        <P>
          <em>Model withdrawal form: &quot;I hereby withdraw from my contract for the Velquor
          subscription purchased on [date]. Name, email used for the account, date.&quot;</em>
        </P>
      </LegalSection>

      <LegalSection heading="6. Acceptable use">
        <UL>
          <li>No attempts to breach, probe, or overload the service or other users&apos; data.</li>
          <li>No reselling or providing the service to third parties without our consent.</li>
          <li>No use of the trade copier to operate an unlicensed asset-management or signal-selling business where that requires regulatory authorisation.</li>
          <li>We may suspend accounts that violate these terms or put the platform at risk.</li>
        </UL>
      </LegalSection>

      <LegalSection heading="7. Availability and liability">
        <P>
          We operate the service with care but provide it &quot;as is&quot;, without warranty of
          uninterrupted availability. Market data and broker connections depend on third parties
          and may be delayed, incomplete, or unavailable. Trade copying is executed on a
          best-effort basis; slippage, requotes, rejected orders, and connection outages can occur.
        </P>
        <P>
          To the extent permitted by law, we are liable only for damage caused intentionally or by
          gross negligence. Liability for slight negligence is excluded, except for injury to life,
          body, or health. We are not liable for trading losses, lost profits, or losses caused by
          broker or prop-firm actions.
        </P>
      </LegalSection>

      <LegalSection heading="8. Data">
        <P>
          Your trading data remains yours. How we process personal data is described in the{' '}
          <a href="/privacy" style={{ color: 'var(--ac)', textDecoration: 'none' }}>Privacy Policy</a>.
          You can export your data (CSV/PDF reports) and delete your account at any time.
        </P>
      </LegalSection>

      <LegalSection heading="9. Termination">
        <P>
          You may stop using Velquor and delete your account at any time. We may terminate free
          accounts with reasonable notice and paid accounts with effect from the end of the paid
          period, or immediately for serious breaches of these terms.
        </P>
      </LegalSection>

      <LegalSection heading="10. Dispute resolution">
        <P>
          We are neither obliged nor willing to participate in dispute resolution proceedings
          before a consumer arbitration board (Alternative-Streitbeilegung-Gesetz, AStG). You can
          always reach us directly at support@velquor.app — we try to resolve any issue informally
          first.
        </P>
      </LegalSection>

      <LegalSection heading="11. Governing law">
        <P>
          These terms are governed by Austrian law, excluding its conflict-of-law rules and the UN
          Convention on Contracts for the International Sale of Goods. For consumers residing in
          the EU, mandatory consumer-protection provisions of your country of residence remain
          unaffected. Place of jurisdiction for business customers is Graz, Austria.
        </P>
      </LegalSection>

      <LegalSection heading="12. Changes">
        <P>
          We may amend these terms as the service evolves. You will be informed of material changes
          in the app; continued use after the effective date constitutes acceptance. The current
          version always lives at velquor.app/terms.
        </P>
      </LegalSection>

    </LegalPage>
  )
}
