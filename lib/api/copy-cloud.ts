// Shared helpers for cloud-hosted copy-trading terminals.
// Slot naming is deterministic from the copy_accounts row id, so "is this
// account cloud-hosted?" is answered by the provisioner — no DB column needed.

const BRIDGE_URL = process.env.BRIDGE_URL
const ADMIN_TOKEN = process.env.BRIDGE_ADMIN_TOKEN

export const bridgeConfigured = () => Boolean(BRIDGE_URL && ADMIN_TOKEN)

export const accountSlot = (accountId: string) => `c${accountId.replace(/-/g, '').slice(0, 8)}`

export async function provisioner(path: string, init?: RequestInit) {
  return fetch(`${BRIDGE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    signal: AbortSignal.timeout(65_000),
  })
}

export async function userSlots(userId: string): Promise<{ count: number; slots: string[] }> {
  const res = await provisioner(`/provision/${userId}/slots`).catch(() => null)
  if (!res?.ok) return { count: 0, slots: [] }
  return res.json()
}
