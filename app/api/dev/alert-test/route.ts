import { NextRequest, NextResponse } from 'next/server'
import { sendAlert, alertingConfigured } from '@/lib/alerts'

function isAuthed(req: NextRequest) {
  const secret = process.env.DEV_SECRET
  if (!secret) return false
  const cookie = req.cookies.get('__dev_session')
  return !!cookie?.value && cookie.value === secret
}

/** Is alerting wired up at all? Answered without sending anything. */
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({
    configured: alertingConfigured(),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    webhook:  Boolean(process.env.ALERT_WEBHOOK_URL),
  })
}

/**
 * Fire a real alert down the real path.
 *
 * The point of a test button is to find a typo in a token now, on a quiet
 * afternoon, rather than during the outage it was meant to warn about — so this
 * deliberately reports the transport error verbatim instead of a generic
 * failure.
 */
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await sendAlert(
    '✅ VELQUOR test alert\n\n' +
    'Sent from the /dev console. Alerting is wired up correctly.\n' +
    'Real messages arrive when the bridge goes down, and again when it recovers.',
  )
  return NextResponse.json(result, { status: result.sent ? 200 : 500 })
}
