/**
 * The walkthrough, as data.
 *
 * Kept separate from the machinery so the script can be rewritten without
 * touching any rendering code — the wording of a tutorial gets revised far more
 * often than the thing that draws it.
 *
 * Two rules the copy follows. It says what a panel is *for*, not what it is
 * called: "Trade log" on screen and "Trade log — this is your trade log" in a
 * tooltip teaches nothing. And it never promises data the account does not have
 * — every step that describes numbers has an `emptyBody` for the very common
 * case of a brand-new account with nothing in it yet.
 */

export interface TourStep {
  id: string
  /** Dashboard tab to switch to first. Omit to stay wherever we are. */
  tab?: number
  /** `data-tour` value of the element to spotlight. Omit for a centred card. */
  anchor?: string
  title: string
  body: string
  /** Shown instead of `body` when the account has no trades yet. */
  emptyBody?: string
  /** Skip this step entirely unless the account is empty. */
  onlyWhenEmpty?: boolean
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    tab: 0,
    title: 'Let me show you around',
    body: 'About a minute. You can leave at any point — the tour is in Settings if you want it again.',
  },
  {
    id: 'strip',
    tab: 0,
    anchor: 'stat-strip',
    title: 'Where you stand, right now',
    body: 'Balance, this month, today, and your win rate. These follow your MT5 account by themselves — you never type a number into VELQUOR.',
    emptyBody: 'Balance, this month, today, and your win rate. They fill in on their own once you connect MetaTrader — you never type a number into VELQUOR.',
  },
  {
    id: 'calendar',
    tab: 0,
    anchor: 'calendar',
    title: 'Every trading day, coloured',
    body: 'Green made money, red lost it, amber means nothing was decided — a few pips of spread is not a losing day. Click any day to see the trades behind it.',
    emptyBody: 'Once trades arrive, each day is coloured: green made money, red lost it, amber means nothing was decided. A few pips of spread is not a losing day.',
  },
  {
    id: 'streaks',
    tab: 0,
    anchor: 'streaks',
    title: 'The habits, not just the money',
    body: 'Trades without a loss, days journalled in a row, habits kept. The part of trading that is behaviour rather than P&L.',
  },
  {
    id: 'trading',
    tab: 1,
    anchor: 'trade-log',
    title: 'Every fill, pulled in automatically',
    body: 'Entry, exit, pips, P&L and the session it happened in — synced from MetaTrader within seconds of closing. Click a row to add why you took it.',
    emptyBody: 'Nothing here yet. Once MetaTrader is connected, every trade you close lands in this tab by itself — entry, exit, pips, P&L and session. Nothing to log by hand, ever.',
  },
  {
    id: 'chart',
    tab: 1,
    anchor: 'equity',
    title: 'Your curve, with funding kept out',
    body: 'Deposits and withdrawals move your balance but are not performance, so they are shown separately. What you see here is trading.',
    emptyBody: 'Three steps and you are done. A small VELQUOR add-on sits inside MetaTrader and sends each fill here as it happens — you never leave your platform or copy anything by hand.',
  },
  {
    id: 'portfolio',
    tab: 2,
    anchor: 'portfolio-add',
    title: 'What you hold outside MT5',
    body: 'Stocks, ETFs and crypto you own elsewhere. Add them here and your net worth stops being just the trading account — prices update on their own.',
  },
  {
    id: 'journal',
    tab: 3,
    anchor: 'journal',
    title: 'Why, not just what',
    body: 'A line a day on how you felt and what you were thinking. It is what turns a list of trades into a reason they went that way — and the Analyst reads it.',
  },
  {
    id: 'analyst',
    tab: 6,
    anchor: 'analyst',
    title: 'Ask it about your own trading',
    body: '"Why am I losing on gold?" — it answers from your actual fills and journal, not from generic advice. Every figure it quotes is computed, never guessed.',
  },
  {
    id: 'connect',
    tab: 0,
    anchor: 'connect-mt5',
    title: 'One thing left',
    body: 'Connect MetaTrader and everything above starts filling in. It takes about two minutes and you never have to log a trade by hand again.',
    onlyWhenEmpty: true,
  },
  {
    id: 'done',
    tab: 0,
    title: 'That is the tour',
    body: 'Press ? at any time for keyboard shortcuts, and use the Feedback button if something is broken or confusing — it goes straight to Marco.',
  },
]
