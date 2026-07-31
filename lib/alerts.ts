/**
 * Operational alerting — one place that knows how to reach Marco.
 *
 * Telegram first (a push on his phone), with the Discord/Slack webhook kept as
 * an alternative so the choice of channel is config, not code. Both are
 * optional and the whole thing no-ops when neither is set: there is no value in
 * a monitoring system that pretends to work.
 *
 * Note the division of labour. Fast detection lives on the bridge box itself
 * (`bridge/watchdog.sh`, a systemd timer every minute) because that is where
 * the failures happen and where they can be seen in ~2 minutes. This module
 * serves the one case the box cannot report — the box being gone — from a
 * daily Vercel cron.
 */

export type AlertResult = { sent: boolean; channels: string[]; errors: string[] }

export function alertingConfigured(): boolean {
  return Boolean(
    (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) ||
    process.env.ALERT_WEBHOOK_URL,
  )
}

async function post(url: string, body: unknown, init: RequestInit = {}): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`)
}

export async function sendAlert(message: string): Promise<AlertResult> {
  const channels: string[] = []
  const errors: string[] = []

  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (token && chatId) {
    try {
      await post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      })
      channels.push('telegram')
    } catch (e) {
      errors.push(`telegram: ${e instanceof Error ? e.message : 'failed'}`)
    }
  }

  // Discord and Slack accept the same shape, so one field pair serves both.
  const webhook = process.env.ALERT_WEBHOOK_URL
  if (webhook) {
    try {
      await post(webhook, { content: message, text: message })
      channels.push('webhook')
    } catch (e) {
      errors.push(`webhook: ${e instanceof Error ? e.message : 'failed'}`)
    }
  }

  if (!token && !webhook) errors.push('no alert channel configured')
  return { sent: channels.length > 0, channels, errors }
}
