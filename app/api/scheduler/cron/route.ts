// Background cron route — authenticated via x-cron-secret header, not user sessions.
//
// Prerequisites (one-time setup):
//   1. Run the user_tokens migration so refresh tokens can be persisted:
//        CREATE TABLE IF NOT EXISTS public.user_tokens (
//          user_id    TEXT PRIMARY KEY,
//          refresh_token TEXT NOT NULL,
//          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
//        );
//        ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
//        GRANT SELECT, INSERT, UPDATE ON public.user_tokens TO service_role;
//
//   2. In lib/authOptions.ts add a signIn callback that upserts the refresh token.
//      user_id MUST be the user's email address — that is what scheduled_emails.user_id stores:
//        async signIn({ user, account }) {
//          if (account?.refresh_token && user?.email) {
//            await supabaseAdmin.from('user_tokens').upsert({
//              user_id: user.email,
//              refresh_token: account.refresh_token,
//              updated_at: new Date().toISOString(),
//            }, { onConflict: 'user_id' })
//          }
//          return true
//        }
//
//   3. Add SUPABASE_SERVICE_ROLE_KEY and CRON_SECRET to your .env.local / hosting env vars.
//      To call this endpoint from Vercel Cron or an external scheduler:
//        GET /api/scheduler/cron   with header   x-cron-secret: <CRON_SECRET>

import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const TZ = 'Asia/Colombo'
const BUSINESS_START = 8   // 08:00 inclusive
const BUSINESS_END = 17    // 17:00 exclusive

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isWithinBusinessHours(now: Date, tz: string): boolean {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map(({ type, value }) => [type, value]),
  )
  const hour = parseInt(parts.hour) === 24 ? 0 : parseInt(parts.hour)
  const isWeekday = parts.weekday !== 'Sat' && parts.weekday !== 'Sun'
  return isWeekday && hour >= BUSINESS_START && hour < BUSINESS_END
}

function buildRawMessage(to: string, subject: string, body: string): string {
  return [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\r\n')
}

function encodeBase64Url(raw: string): string {
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// ---------------------------------------------------------------------------
// GET /api/scheduler/cron
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  // 1. Secret guard — accept either:
  //    • x-cron-secret: <secret>          (external schedulers: cron-job.org, GitHub Actions)
  //    • Authorization: Bearer <secret>   (Vercel Cron — injected automatically from CRON_SECRET env var)
  const secret = process.env.CRON_SECRET
  const xHeader = req.headers.get('x-cron-secret')
  const authHeader = req.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!secret || (xHeader !== secret && bearerToken !== secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Business-hours gate — silently no-op outside 08:00–17:00 Mon–Fri (Colombo).
  const now = new Date()
  if (!isWithinBusinessHours(now, TZ)) {
    return NextResponse.json({ message: 'Outside business hours', sent: 0, total: 0 })
  }

  // 3. Fetch all approved emails whose scheduled_at has passed.
  const { data: due, error: fetchError } = await supabaseAdmin
    .from('scheduled_emails')
    .select('id, user_id, to_email, subject, body')
    .eq('status', 'approved')
    .lte('scheduled_at', now.toISOString())

  if (fetchError) {
    console.error('[cron] fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch due emails' }, { status: 500 })
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0 })
  }

  // 4. Group by user_id so we refresh OAuth exactly once per user.
  const byUser = new Map<string, typeof due>()
  for (const email of due) {
    const bucket = byUser.get(email.user_id) ?? []
    bucket.push(email)
    byUser.set(email.user_id, bucket)
  }

  let sentCount = 0
  let failedCount = 0

  for (const [userId, emails] of byUser) {
    // Look up the stored refresh token for this user.
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('user_tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .single()

    if (tokenError || !tokenRow?.refresh_token) {
      console.error(`[cron] no token for user ${userId}:`, tokenError?.message)
      await markAll(emails.map((e) => e.id), 'failed')
      failedCount += emails.length
      continue
    }

    // Obtain a fresh access token via the stored refresh token.
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    )
    auth.setCredentials({ refresh_token: tokenRow.refresh_token })

    let accessToken: string | null | undefined
    try {
      const { credentials } = await auth.refreshAccessToken()
      accessToken = credentials.access_token
    } catch (err) {
      console.error(`[cron] token refresh failed for user ${userId}:`, err)
      await markAll(emails.map((e) => e.id), 'failed')
      failedCount += emails.length
      continue
    }

    if (!accessToken) {
      await markAll(emails.map((e) => e.id), 'failed')
      failedCount += emails.length
      continue
    }

    // Build a Gmail client with the refreshed access token.
    auth.setCredentials({ access_token: accessToken })
    const gmail = google.gmail({ version: 'v1', auth })

    // 5. Send each email, then update status.
    for (const email of emails) {
      try {
        const raw = encodeBase64Url(
          buildRawMessage(email.to_email, email.subject, email.body),
        )
        await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })

        await supabaseAdmin
          .from('scheduled_emails')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', email.id)

        sentCount++
      } catch (err) {
        console.error(`[cron] send failed for email ${email.id}:`, err)
        await supabaseAdmin
          .from('scheduled_emails')
          .update({ status: 'failed' })
          .eq('id', email.id)
        failedCount++
      }
    }
  }

  return NextResponse.json({ sent: sentCount, failed: failedCount, total: due.length })
}

// ---------------------------------------------------------------------------
// Internal helper — bulk-mark a list of email IDs with a terminal status.
// Runs updates in parallel; individual failures are logged but not thrown.
// ---------------------------------------------------------------------------

async function markAll(ids: string[], status: 'sent' | 'failed'): Promise<void> {
  await Promise.all(
    ids.map((id) =>
      supabaseAdmin
        .from('scheduled_emails')
        .update({ status })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error(`[cron] markAll(${status}) failed for ${id}:`, error)
        }),
    ),
  )
}
