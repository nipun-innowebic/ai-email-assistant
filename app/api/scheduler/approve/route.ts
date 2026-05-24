import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const TZ = 'Asia/Colombo'
const BUSINESS_START = 8  // 08:00 inclusive
const BUSINESS_END = 17   // 17:00 exclusive (5 PM)

// Returns the local date/time parts of a UTC Date in the given timezone.
function getLocalParts(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  })
  const p = Object.fromEntries(fmt.formatToParts(date).map(({ type, value }) => [type, value]))
  const hour = parseInt(p.hour)
  return {
    year: parseInt(p.year),
    month: parseInt(p.month),
    day: parseInt(p.day),
    // Some Intl implementations emit '24' for midnight with hour12:false
    hour: hour === 24 ? 0 : hour,
    minute: parseInt(p.minute),
    weekday: p.weekday, // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  }
}

// Converts a local wall-clock time (year/month/day/hour, on the hour) in the
// given timezone to a UTC Date, accounting for the timezone offset.
function localToUTC(year: number, month: number, day: number, hour: number, tz: string): Date {
  // Treat the local time as if it were UTC to build a reference point.
  const asIfUTC = new Date(Date.UTC(year, month - 1, day, hour, 0, 0))

  // Find what local time asIfUTC corresponds to in the target TZ.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const p = Object.fromEntries(fmt.formatToParts(asIfUTC).map(({ type, value }) => [type, value]))
  const tzHour = parseInt(p.hour) === 24 ? 0 : parseInt(p.hour)
  const tzAsUTC = new Date(Date.UTC(
    parseInt(p.year), parseInt(p.month) - 1, parseInt(p.day),
    tzHour, parseInt(p.minute), parseInt(p.second),
  ))

  // offsetMs = (local-time-as-UTC) - asIfUTC  →  actual UTC = asIfUTC - offsetMs
  const offsetMs = tzAsUTC.getTime() - asIfUTC.getTime()
  return new Date(asIfUTC.getTime() - offsetMs)
}

// Returns the next UTC instant that falls on a whole business hour
// (08:00–16:59, Mon–Fri) in the given timezone.
function nextBusinessHour(now: Date, tz: string = TZ): Date {
  const parts = getLocalParts(now, tz)
  let { year, month, day } = parts
  // If we're mid-hour, the current hour is already in progress — move to the next.
  let hour = parts.minute > 0 ? parts.hour + 1 : parts.hour

  for (let attempt = 0; attempt < 10; attempt++) {
    // Past end of business day → advance to next calendar day at 8 AM.
    if (hour >= BUSINESS_END) {
      const next = new Date(Date.UTC(year, month - 1, day + 1, 12)) // noon UTC avoids DST edge
      const np = getLocalParts(next, tz)
      ;({ year, month, day } = np)
      hour = BUSINESS_START
      continue
    }

    // Before business hours start → jump to 8 AM on the same day.
    if (hour < BUSINESS_START) {
      hour = BUSINESS_START
    }

    // Weekday check using the midday anchor to avoid date-boundary surprises.
    const midday = new Date(Date.UTC(year, month - 1, day, 12))
    const { weekday } = getLocalParts(midday, tz)
    if (weekday === 'Sat' || weekday === 'Sun') {
      const next = new Date(Date.UTC(year, month - 1, day + 1, 12))
      const np = getLocalParts(next, tz)
      ;({ year, month, day } = np)
      hour = BUSINESS_START
      continue
    }

    return localToUTC(year, month, day, hour, tz)
  }

  throw new Error('nextBusinessHour: failed to converge — check TZ or BUSINESS_* constants')
}

// ---------------------------------------------------------------------------
// PATCH /api/scheduler/approve
// Approves a pending draft: sets status → 'approved', schedules at the next
// business hour, and optionally updates the body if the user edited the draft.
// ---------------------------------------------------------------------------
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id, body } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const scheduledAt = nextBusinessHour(new Date())

    const updatePayload: Record<string, unknown> = {
      status: 'approved',
      scheduled_at: scheduledAt.toISOString(),
    }
    if (body !== undefined) {
      updatePayload.body = body
    }

    const { data, error } = await supabaseAdmin
      .from('scheduled_emails')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', session.user.email)
      .select()
      .single()

    if (error) {
      // PGRST116: .single() found no rows → record missing or owned by someone else
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Email not found or access denied' }, { status: 404 })
      }
      console.error('Approve PATCH error:', error)
      return NextResponse.json({ error: 'Failed to approve email' }, { status: 500 })
    }

    return NextResponse.json({ email: data, scheduledAt: scheduledAt.toISOString() })
  } catch (error) {
    console.error('Approve PATCH error:', error)
    return NextResponse.json({ error: 'Failed to approve email' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/scheduler/approve
// Rejects a draft by permanently deleting the record.
// Note: the DB status constraint only allows 'pending' | 'approved' | 'sent' |
// 'failed', so a soft 'rejected' status cannot be stored — physical deletion is
// the correct implementation for a rejection action.
// ---------------------------------------------------------------------------
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error, count } = await supabaseAdmin
      .from('scheduled_emails')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', session.user.email)

    if (error) {
      console.error('Approve DELETE error:', error)
      return NextResponse.json({ error: 'Failed to reject email' }, { status: 500 })
    }

    if (count === 0) {
      return NextResponse.json({ error: 'Email not found or access denied' }, { status: 404 })
    }

    return NextResponse.json({ id })
  } catch (error) {
    console.error('Approve DELETE error:', error)
    return NextResponse.json({ error: 'Failed to reject email' }, { status: 500 })
  }
}
