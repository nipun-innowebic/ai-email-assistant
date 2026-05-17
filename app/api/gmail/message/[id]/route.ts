import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { google } from 'googleapis'
import type { gmail_v1 } from 'googleapis'
import { NextResponse } from 'next/server'

type BodyResult = { text: string; isHtml: boolean }

function extractBody(part: gmail_v1.Schema$MessagePart): BodyResult | null {
  const mime = part.mimeType ?? ''

  if (mime === 'text/plain' && part.body?.data) {
    return { text: Buffer.from(part.body.data, 'base64url').toString('utf-8'), isHtml: false }
  }
  if (mime === 'text/html' && part.body?.data) {
    return { text: Buffer.from(part.body.data, 'base64url').toString('utf-8'), isHtml: true }
  }

  if (part.parts) {
    // Prefer text/plain within any multipart container
    for (const sub of part.parts) {
      if (sub.mimeType === 'text/plain') {
        const r = extractBody(sub)
        if (r) return r
      }
    }
    // Fall back to any part recursively
    for (const sub of part.parts) {
      const r = extractBody(sub)
      if (r) return r
    }
  }

  return null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params

  try {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.accessToken })
    const gmail = google.gmail({ version: 'v1', auth })

    const msg = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    })

    const headers = msg.data.payload?.headers ?? []
    const header = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

    const subject = header('Subject') || '(no subject)'
    const from = header('From')
    const to = header('To')
    const date = header('Date')

    const extracted = msg.data.payload ? extractBody(msg.data.payload) : null
    const body = extracted?.text ?? ''
    const bodyType = extracted?.isHtml ? 'html' : 'plain'

    return NextResponse.json({ id, subject, from, to, date, body, bodyType })
  } catch (error) {
    console.error('Gmail message fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch message' }, { status: 500 })
  }
}
