// ── Types ─────────────────────────────────────────────────────────────────────
export interface CopyAccount {
  id:           string
  role:         'leader' | 'follower'
  nickname:     string
  mt5_login:    string
  mt5_server:   string
  status:       'pending' | 'active' | 'paused' | 'error'
  last_seen_at: string | null
}

export interface CopyGroup {
  id:             string
  name:           string
  lot_mode:       'fixed' | 'proportional'
  lot_fixed:      number
  lot_multiplier: number
  max_lot:        number
  active:         boolean
  created_at:     string
  copy_accounts:  CopyAccount[]
}

export interface CopyLogEntry {
  id:            string
  status:        'success' | 'failed' | 'pending'
  follower_ticket:  string | null
  follower_lots:    number | null
  error_message: string | null
  executed_at:   string | null
  created_at:    string
  copy_accounts: { nickname: string; mt5_login: string; role: string }
  copy_signals:  {
    signal_type:   'OPEN' | 'CLOSE'
    leader_ticket: number
    symbol:        string
    trade_type:    string
    lot_size:      number
    open_price:    number
  }
}
