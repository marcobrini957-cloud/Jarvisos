import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { sendAlert, alertingConfigured } from '@/lib/alerts'

// The alerting layer is only exercised for real during an outage, which is
// exactly the wrong moment to discover it posts the wrong shape or swallows a
// failure. These pin the contract instead.

const ENV_KEYS = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'ALERT_WEBHOOK_URL'] as const
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k] }
})
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
  vi.unstubAllGlobals()
})

function mockFetch(impl?: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; body: unknown }[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init.body)) })
    return impl?.(String(url), init) ?? new Response('ok', { status: 200 })
  }))
  return calls
}

describe('alertingConfigured', () => {
  it('is false when nothing is set — no false sense of monitoring', () => {
    expect(alertingConfigured()).toBe(false)
  })

  it('needs BOTH halves of the Telegram pair', () => {
    process.env.TELEGRAM_BOT_TOKEN = '123:abc'
    expect(alertingConfigured()).toBe(false)
    process.env.TELEGRAM_CHAT_ID = '456'
    expect(alertingConfigured()).toBe(true)
  })

  it('a webhook alone is enough', () => {
    process.env.ALERT_WEBHOOK_URL = 'https://discord.com/api/webhooks/x/y'
    expect(alertingConfigured()).toBe(true)
  })
})

describe('sendAlert', () => {
  it('reports failure rather than pretending, when unconfigured', async () => {
    const calls = mockFetch()
    const r = await sendAlert('anything')
    expect(r.sent).toBe(false)
    expect(r.errors).toContain('no alert channel configured')
    expect(calls).toHaveLength(0)
  })

  it('posts to the Telegram bot API with chat_id and text', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123:abc'
    process.env.TELEGRAM_CHAT_ID = '456'
    const calls = mockFetch()

    const r = await sendAlert('bridge is down')

    expect(r.sent).toBe(true)
    expect(r.channels).toEqual(['telegram'])
    expect(calls[0].url).toBe('https://api.telegram.org/bot123:abc/sendMessage')
    expect(calls[0].body).toMatchObject({ chat_id: '456', text: 'bridge is down' })
  })

  it('sends both content and text so one body serves Discord and Slack', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://hooks.slack.com/services/x'
    const calls = mockFetch()

    await sendAlert('bridge is down')

    expect(calls[0].body).toEqual({ content: 'bridge is down', text: 'bridge is down' })
  })

  it('uses every configured channel, not just the first', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123:abc'
    process.env.TELEGRAM_CHAT_ID = '456'
    process.env.ALERT_WEBHOOK_URL = 'https://discord.com/api/webhooks/x/y'
    const calls = mockFetch()

    const r = await sendAlert('down')

    expect(r.channels).toEqual(['telegram', 'webhook'])
    expect(calls).toHaveLength(2)
  })

  it('a dead channel does not silence a working one', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '123:abc'
    process.env.TELEGRAM_CHAT_ID = '456'
    process.env.ALERT_WEBHOOK_URL = 'https://discord.com/api/webhooks/x/y'
    const calls = mockFetch(url =>
      url.includes('telegram')
        ? new Response('Unauthorized', { status: 401 })
        : new Response('ok', { status: 200 }))

    const r = await sendAlert('down')

    expect(r.sent).toBe(true)               // the webhook still got through
    expect(r.channels).toEqual(['webhook'])
    expect(r.errors[0]).toContain('telegram')
    expect(calls).toHaveLength(2)
  })

  it('surfaces the transport error verbatim — a bad token must be findable', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bad'
    process.env.TELEGRAM_CHAT_ID = '456'
    mockFetch(() => new Response('chat not found', { status: 400 }))

    const r = await sendAlert('down')

    expect(r.sent).toBe(false)
    expect(r.errors[0]).toContain('400')
    expect(r.errors[0]).toContain('chat not found')
  })

  it('never throws — an alerting failure must not break the caller', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://example.invalid/hook'
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ENOTFOUND') }))

    await expect(sendAlert('down')).resolves.toMatchObject({ sent: false })
  })
})
