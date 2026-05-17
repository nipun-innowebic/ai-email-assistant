import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabase } from '@/lib/supabaseClient'

export interface ScheduledEmail {
  id: string
  to: string
  subject: string
  body: string
  scheduledAt: string
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  createdAt: string
}

function toScheduledEmail(row: Record<string, unknown>): ScheduledEmail {
  return {
    id: row.id as string,
    to: row.to_email as string,
    subject: row.subject as string,
    body: row.body as string,
    scheduledAt: row.scheduled_at as string,
    status: row.status as ScheduledEmail['status'],
    createdAt: row.created_at as string,
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('scheduled_emails')
    .select('*')
    .eq('user_email', session.user.email)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Scheduler GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch scheduled emails' }, { status: 500 })
  }

  return NextResponse.json({ emails: (data ?? []).map(toScheduledEmail) })
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { to, subject, body, scheduledAt } = await req.json()

    if (!to || !subject || !body || !scheduledAt) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body, scheduledAt' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('scheduled_emails')
      .insert({
        user_email: session.user.email,
        to_email: to,
        subject,
        body,
        scheduled_at: scheduledAt,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Scheduler POST error:', error)
      return NextResponse.json({ error: 'Failed to schedule email' }, { status: 500 })
    }

    return NextResponse.json({ email: toScheduledEmail(data) }, { status: 201 })
  } catch (error) {
    console.error('Scheduler POST error:', error)
    return NextResponse.json({ error: 'Failed to schedule email' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id, status } = await req.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('scheduled_emails')
      .update({ status })
      .eq('id', id)
      .eq('user_email', session.user.email)
      .select()
      .single()

    if (error) {
      console.error('Scheduler PATCH error:', error)
      return NextResponse.json({ error: 'Failed to update email' }, { status: 500 })
    }

    return NextResponse.json({ email: toScheduledEmail(data) })
  } catch (error) {
    console.error('Scheduler PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 })
  }
}
