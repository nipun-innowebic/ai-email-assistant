import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

export interface ScheduledEmail {
  id: string
  to: string
  subject: string
  body: string
  scheduledAt: string
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  createdAt: string
}

const DATA_DIR = join(process.cwd(), 'data')
const DATA_FILE = join(DATA_DIR, 'scheduled.json')

function readScheduled(): ScheduledEmail[] {
  if (!existsSync(DATA_FILE)) return []
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8')) as ScheduledEmail[]
  } catch {
    return []
  }
}

function writeScheduled(emails: ScheduledEmail[]): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
  writeFileSync(DATA_FILE, JSON.stringify(emails, null, 2), 'utf-8')
}

export async function GET() {
  const emails = readScheduled()
  return NextResponse.json({ emails })
}

export async function POST(req: Request) {
  try {
    const { to, subject, body, scheduledAt } = await req.json()

    if (!to || !subject || !body || !scheduledAt) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body, scheduledAt' },
        { status: 400 }
      )
    }

    const newEmail: ScheduledEmail = {
      id: randomUUID(),
      to,
      subject,
      body,
      scheduledAt,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    const emails = readScheduled()
    emails.push(newEmail)
    writeScheduled(emails)

    return NextResponse.json({ email: newEmail }, { status: 201 })
  } catch (error) {
    console.error('Scheduler POST error:', error)
    return NextResponse.json({ error: 'Failed to schedule email' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    const emails = readScheduled()
    const idx = emails.findIndex((e) => e.id === id)

    if (idx === -1) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    }

    emails[idx].status = status as ScheduledEmail['status']
    writeScheduled(emails)

    return NextResponse.json({ email: emails[idx] })
  } catch (error) {
    console.error('Scheduler PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 })
  }
}
