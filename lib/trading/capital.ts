// Broker credit is not the trader's money.
//
// MT5 keeps three figures: BALANCE (settled cash), CREDIT (a bonus or credit
// line the broker lends you) and EQUITY (balance + credit + floating P&L).
// Because credit sits inside equity, answering "how much money do I have" with
// raw equity overstates the trader's own capital by exactly the credit — on a
// €2,679 account with a €140 bonus, every net-worth figure read €2,819.
//
// The rule this file encodes:
//   • where the app MIRRORS the terminal (an "Equity" field, the account pill)
//     show raw equity, because that is the number in MT5;
//   • where the app answers "how much is MINE" (net worth, capital base, what
//     the Analyst is told) use ownCapital().

/**
 * The trader's own capital: equity minus whatever the broker lent.
 *
 * `credit` of `null`/`undefined` means we never recorded it — snapshots written
 * before the column existed, or by an EA older than 2.24. Unknown is not the
 * same as zero, so those rows are passed through untouched rather than being
 * silently "corrected" by a number we do not have.
 */
export function ownCapital(
  equity: number | null | undefined,
  credit: number | null | undefined,
): number {
  // No equity means no figure to correct. Subtracting a known credit from a
  // missing equity would render a negative net worth out of nothing.
  if (equity == null || !Number.isFinite(Number(equity))) return 0
  const eq = Number(equity)
  if (credit == null) return eq
  const cr = Number(credit)
  if (!Number.isFinite(cr)) return eq
  // Credit is never negative in MT5; a negative would only ever inflate the
  // figure, so clamp rather than trust it.
  return eq - Math.max(0, cr)
}

/** True when the broker is lending this account money worth disclosing. */
export function hasCredit(credit: number | null | undefined): boolean {
  return credit != null && Number.isFinite(Number(credit)) && Number(credit) > 0
}
