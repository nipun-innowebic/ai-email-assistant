import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('scheduled_emails')
    .select('id, subject, body, to_email, original_email_id, created_at')
    .eq('status', 'pending')
    .eq('user_id', session.user.email)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Pending GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch pending emails' }, { status: 500 })
  }

  return NextResponse.json({ emails: data ?? [] })
}
