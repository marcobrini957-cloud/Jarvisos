// ── Trades ──────────────────────────────────────────────────────────────────

export type TradeStatus = 'open' | 'closed' | 'pending'
export type TradeType   = 'buy' | 'sell'
export type Session     = 'london' | 'new_york' | 'asian' | 'overlap'
export type Emotion     = 'confident' | 'anxious' | 'neutral' | 'tired' | 'fomo'

export interface Trade {
  id: string
  created_at: string
  updated_at: string
  mt5_ticket: number | null
  symbol: string
  trade_type: TradeType
  lot_size: number | null
  open_price: number | null
  close_price: number | null
  stop_loss: number | null
  take_profit: number | null
  open_time: string | null
  close_time: string | null
  duration_minutes: number | null
  pips: number | null
  profit_usd: number | null
  commission: number
  swap: number
  net_profit: number | null
  status: TradeStatus
  session: Session | null
  setup_type: string | null
  timeframe: string | null
  indicators_used: string[] | null
  trade_rationale: string | null
  emotion_pre: Emotion | null
  discipline_score: number | null
  followed_plan: boolean | null
  notes: string | null
  tags: string[] | null
  voice_note_url: string | null
  screenshot_open_url: string | null
  screenshot_close_url: string | null
  screenshot_missing: boolean
}

// ── Account ──────────────────────────────────────────────────────────────────

export interface AccountSnapshot {
  id: string
  snapshot_at: string
  balance: number | null
  equity: number | null
  margin_used: number | null
  free_margin: number | null
  margin_level_pct: number | null
  open_trades_count: number
  daily_pnl: number | null
  weekly_pnl: number | null
  monthly_pnl: number | null
}

// ── Portfolio ────────────────────────────────────────────────────────────────

export type AssetType = 'stock' | 'etf' | 'crypto' | 'cash' | 'metal'

export interface PortfolioHolding {
  id: string
  created_at: string
  updated_at: string
  ticker: string
  name: string | null
  asset_type: AssetType
  quantity: number
  avg_buy_price: number | null
  currency: string
  sector: string | null
  notes: string | null
  is_active: boolean
  target_pct: number | null
}

export interface PortfolioSnapshot {
  id: string
  snapshot_at: string
  holding_id: string
  ticker: string
  price: number | null
  price_currency: string
  current_value_eur: number | null
  pnl_eur: number | null
  pnl_pct: number | null
  change_1d_pct: number | null
  change_1w_pct: number | null
}

// ── Journal ──────────────────────────────────────────────────────────────────

export type Mood       = 'great' | 'good' | 'neutral' | 'low' | 'bad'
export type EntryType  = 'daily' | 'trade_review' | 'weekly'

export interface JournalEntry {
  id: string
  created_at: string
  entry_date: string
  entry_type: EntryType
  mood: Mood | null
  energy_level: number | null
  body_text: string | null
  voice_note_url: string | null
  transcription: string | null
  ai_summary: string | null
  tags: string[] | null
  is_trading_day: boolean
  linked_trade_ids: string[] | null
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export type TaskCategory = 'trading' | 'portfolio' | 'life' | 'general'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskStatus   = 'todo' | 'in_progress' | 'done' | 'cancelled'

export interface Task {
  id: string
  created_at: string
  updated_at: string
  title: string
  description: string | null
  category: TaskCategory
  priority: TaskPriority
  status: TaskStatus
  due_date: string | null
  completed_at: string | null
  source: string
  is_recurring: boolean
  recurrence: string | null
  tags: string[] | null
}

// ── Macro ────────────────────────────────────────────────────────────────────

export type MacroBias    = 'bullish' | 'bearish' | 'neutral'
export type BriefingType = 'morning' | 'weekly' | 'opportunity_alert'

export interface MacroBriefing {
  id: string
  created_at: string
  briefing_date: string
  briefing_type: BriefingType
  gold_bias: MacroBias | null
  nasdaq_bias: MacroBias | null
  dollar_outlook: MacroBias | null
  key_events: Record<string, unknown> | null
  portfolio_notes: string | null
  rebalance_needed: boolean
  macro_summary: string | null
  opportunities: Record<string, unknown> | null
  risks: Record<string, unknown> | null
  full_briefing_text: string | null
  sent_to_telegram: boolean
  telegram_sent_at: string | null
}

// ── Calendar ─────────────────────────────────────────────────────────────────

export type EventImpact = 'high' | 'medium' | 'low'

export interface CalendarEvent {
  id: string
  event_datetime: string
  event_name: string
  currency: string | null
  impact: EventImpact | null
  forecast: string | null
  previous: string | null
  actual: string | null
  affects_gold: boolean
  affects_nasdaq: boolean
  notes: string | null
}

// ── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  created_at: string
  display_name: string
  timezone: string
  base_currency: string
  telegram_chat_id: string | null
  mt5_account_id: string | null
  mt5_investor_pw: string | null
  mt5_server: string
  mt5_platform: string
  onboarding_done: boolean
  widget_layout: unknown[]
}

// ── UI helpers ───────────────────────────────────────────────────────────────

export type TabId = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface TabConfig {
  id: TabId
  label: string
  icon: string
  isGold?: boolean
}
