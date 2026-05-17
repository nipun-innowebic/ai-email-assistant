import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { google } from 'googleapis'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken || !session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const userEmail = session.user.email
  const now = new Date().toISOString()

  const { data: due, error } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('status', 'pending')
    .eq('user_email', userEmail)
    .lte('scheduled_at', now)

  if (error) {
    console.error('Cron query error:', error)
    return NextResponse.json({ error: 'Failed to query scheduled emails' }, { status: 500 })
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ sent: 0, total: 0 })
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ access_token: session.accessToken })
  const gmail = google.gmail({ version: 'v1', auth })

  const results = await Promise.all(
    due.map(async (email) => {
      let newStatus: 'sent' | 'failed'

      try {
        const rawMessage = [
          `To: ${email.to_email}`,
          `Subject: ${email.subject}`,
          'Content-Type: text/plain; charset=utf-8',
          'MIME-Version: 1.0',
          '',
          email.body,
        ].join('\r\n')

        const encoded = Buffer.from(rawMessage)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: encoded },
        })

        newStatus = 'sent'
      } catch (err) {
        console.error(`Failed to send scheduled email ${email.id}:`, err)
        newStatus = 'failed'
      }

      await supabase
        .from('scheduled_emails')
        .update({ status: newStatus })
        .eq('id', email.id)
        .eq('user_email', userEmail)

      return newStatus
    })
  )

  const sentCount = results.filter((s) => s === 'sent').length
  return NextResponse.json({ sent: sentCount, total: due.length })
}
