import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { to, subject, body: emailBody } = body

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      )
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.accessToken })

    const gmail = google.gmail({ version: 'v1', auth })

    const rawMessage = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      emailBody,
    ].join('\r\n')

    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Gmail send error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
