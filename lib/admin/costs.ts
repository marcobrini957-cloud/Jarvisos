/**
 * What a user actually costs.
 *
 * Almost every cost here is **fixed**: the Hetzner box, hosting, the database
 * plan and the domain are paid whether one person signs up or a hundred do.
 * So "what does this user cost me" has two honest answers, and showing only one
 * of them misleads:
 *
 *   · **Marginal** — what genuinely goes away if this user leaves. For most
 *     users that is close to zero, because they run the EA on their own
 *     MetaTrader and consume nothing of ours.
 *   · **Allocated** — their share of the fixed bill, i.e. total ÷ active users.
 *     This is the number that matters for pricing, and it *falls* as users are
 *     added. It is not a cost the user causes.
 *
 * The one genuinely per-user resource is a **cloud terminal**: a container on
 * the bridge box that occupies a real slice of a machine with a fixed capacity.
 * That is the "percentage of the server" idea made concrete — a user holding
 * one of N slots is consuming 1/N of the box, so 1/N of its monthly price is
 * theirs.
 *
 * Pure — tested in tests/costs.test.ts.
 */

export interface CostSettings {
  /** The bridge box (cloud terminals live here). */
  serverMonthlyEur:   number
  /** Hosting the web app. */
  hostingMonthlyEur:  number
  /** Managed database + storage plan. */
  databaseMonthlyEur: number
  domainMonthlyEur:   number
  /** How many cloud terminals the box holds — the denominator for a slot. */
  terminalCapacity:   number
  /** Blended cost of one AI request; 0 while on a free tier. */
  aiCostPerCallEur:   number
  pricePro:           number
  priceUltra:         number
}

export const DEFAULT_COST_SETTINGS: CostSettings = {
  serverMonthlyEur:   4.35,
  hostingMonthlyEur:  0,
  databaseMonthlyEur: 0,
  domainMonthlyEur:   1.0,
  terminalCapacity:   4,
  aiCostPerCallEur:   0,
  pricePro:           15.99,
  priceUltra:         30.99,
}

export interface UserUsage {
  id:        string
  email:     string | null
  tier:      'free' | 'pro' | 'ultra'
  /** Cloud terminal containers this user holds on the bridge box. */
  terminals: number
  /** AI requests in the window. */
  aiCalls:   number
  /** Rows this user owns across the data tables — drives the storage share. */
  rows:      number
  /** Chart screenshots stored for them. */
  screenshots: number
  lastSeen:  string | null
}

export interface UserCost {
  id:    string
  email: string | null
  tier:  UserUsage['tier']
  terminals:   number
  aiCalls:     number
  rows:        number
  screenshots: number
  lastSeen:    string | null
  /** Their slice of the bridge box, from slots held ÷ capacity. */
  serverEur:  number
  aiEur:      number
  /** Their share of the database plan, by proportion of stored rows. */
  storageEur: number
  /** serverEur + aiEur + storageEur — what leaving would actually save. */
  marginalEur: number
  /** Share of the fixed bill that is not attributable to anyone in particular. */
  allocatedEur: number
  /** marginal + allocated. */
  totalEur:   number
  revenueEur: number
  marginEur:  number
}

export interface CostReport {
  users: UserCost[]
  totals: {
    fixedEur:      number
    attributedEur: number
    unattributedEur: number
    marginalEur:   number
    revenueEur:    number
    marginEur:     number
    activeUsers:   number
    terminalsUsed: number
    terminalCapacity: number
    /** Share of the bridge box in use — Marco's "percentage of the server". */
    serverUtilisationPct: number
    /** Blended cost of one user: fixed ÷ active users. */
    costPerUserEur: number
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function tierPrice(tier: UserUsage['tier'], s: CostSettings): number {
  if (tier === 'pro')   return s.pricePro
  if (tier === 'ultra') return s.priceUltra
  return 0
}

export function buildCostReport(usage: UserUsage[], s: CostSettings): CostReport {
  const fixedEur =
    s.serverMonthlyEur + s.hostingMonthlyEur + s.databaseMonthlyEur + s.domainMonthlyEur

  const capacity      = Math.max(1, s.terminalCapacity)
  const slotPriceEur  = s.serverMonthlyEur / capacity
  const terminalsUsed = usage.reduce((n, u) => n + u.terminals, 0)
  const totalRows     = usage.reduce((n, u) => n + u.rows, 0)

  // Unattributed fixed cost is spread over everyone. A user with no activity at
  // all still occupies an account, so "active" here means every account —
  // dividing by a smaller number would flatter the per-user figure.
  const activeUsers = Math.max(1, usage.length)

  const priced = usage.map(u => {
    const serverEur  = round(u.terminals * slotPriceEur)
    const aiEur      = round(u.aiCalls * s.aiCostPerCallEur)
    const storageEur = totalRows > 0
      ? round((u.rows / totalRows) * s.databaseMonthlyEur)
      : 0
    const marginalEur = round(serverEur + aiEur + storageEur)
    return { u, serverEur, aiEur, storageEur, marginalEur }
  })

  const attributedEur   = round(priced.reduce((n, p) => n + p.marginalEur, 0))
  const unattributedEur = round(Math.max(0, fixedEur - attributedEur))
  const allocatedEach   = round(unattributedEur / activeUsers)

  const users: UserCost[] = priced.map(({ u, serverEur, aiEur, storageEur, marginalEur }) => {
    const revenueEur = tierPrice(u.tier, s)
    const totalEur   = round(marginalEur + allocatedEach)
    return {
      id: u.id, email: u.email, tier: u.tier,
      terminals: u.terminals, aiCalls: u.aiCalls, rows: u.rows,
      screenshots: u.screenshots, lastSeen: u.lastSeen,
      serverEur, aiEur, storageEur, marginalEur,
      allocatedEur: allocatedEach,
      totalEur,
      revenueEur: round(revenueEur),
      marginEur:  round(revenueEur - totalEur),
    }
  })

  const revenueEur = round(users.reduce((n, u) => n + u.revenueEur, 0))

  return {
    users: users.sort((a, b) => b.totalEur - a.totalEur),
    totals: {
      fixedEur:        round(fixedEur),
      attributedEur,
      unattributedEur,
      marginalEur:     attributedEur,
      revenueEur,
      marginEur:       round(revenueEur - fixedEur),
      activeUsers:     usage.length,
      terminalsUsed,
      terminalCapacity: capacity,
      serverUtilisationPct: round((terminalsUsed / capacity) * 100),
      costPerUserEur:  round(fixedEur / activeUsers),
    },
  }
}
