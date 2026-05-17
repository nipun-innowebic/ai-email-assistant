'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CalendarClock, Send, Clock, XCircle,
  Mail, AlertCircle, CheckCircle, RefreshCcw, Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScheduledEmail {
  id: string
  to: string
  subject: string
  body: string
  scheduledAt: string
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  createdAt: string
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    className: 'text-warning bg-warning/10',
    icon: Clock,
  },
  sent: {
    label: 'Sent',
    className: 'text-success bg-success/10',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'text-muted-foreground bg-muted',
    icon: XCircle,
  },
  failed: {
    label: 'Failed',
    className: 'text-destructive bg-destructive/10',
    icon: AlertCircle,
  },
} as const

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function nowLocalISO() {
  const d = new Date()
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

export default function SchedulerPage() {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const fetchScheduled = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduler')
      const data = await res.json()
      setScheduled(data.emails ?? [])
    } catch {
      // network error — keep existing list
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    const checkAndSend = async () => {
      try {
        await fetch("/api/scheduler/cron")
        const res = await fetch("/api/scheduler")
        const data = await res.json()
        setScheduled(data.emails ?? [])
      } catch {
        // ignore
      } finally {
        setLoadingList(false)
      }
    }

    checkAndSend()
    const interval = setInterval(checkAndSend, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSchedule = async () => {
    setFormError('')
    setFormSuccess('')

    if (!to.trim() || !subject.trim() || !body.trim() || !scheduledAt) {
      setFormError('Please fill in all fields before scheduling.')
      return
    }

    if (new Date(scheduledAt) <= new Date()) {
      setFormError('Scheduled time must be in the future.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body, scheduledAt }),
      })
      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error ?? 'Failed to schedule email.')
      } else {
        setFormSuccess('Email scheduled successfully!')
        setTo('')
        setSubject('')
        setBody('')
        setScheduledAt('')
        await fetchScheduled()
      }
    } catch {
      setFormError('Network error — please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (id: string) => {
    setCancelling(id)
    try {
      await fetch('/api/scheduler', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'cancelled' }),
      })
      await fetchScheduled()
    } catch {
      // ignore — list will resync on next refresh
    } finally {
      setCancelling(null)
    }
  }

  const pendingCount = scheduled.filter((e) => e.status === 'pending').length

  return (
    <div className="flex flex-col gap-6 p-8 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <CalendarClock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Send Scheduler</h1>
          <p className="text-sm text-muted-foreground">
            Compose an email and choose the perfect moment to send it
          </p>
        </div>
      </div>

      {/* Compose form */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="mb-4 font-semibold text-foreground">Compose Email</h2>

        <div className="space-y-3">
          {/* To */}
          <div>
            <label htmlFor="to" className="mb-1 block text-sm font-medium text-foreground">
              To
            </label>
            <input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="mb-1 block text-sm font-medium text-foreground">
              Subject
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Body */}
          <div>
            <label htmlFor="body" className="mb-1 block text-sm font-medium text-foreground">
              Body
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here…"
              rows={5}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Datetime picker */}
          <div>
            <label htmlFor="scheduledAt" className="mb-1 block text-sm font-medium text-foreground">
              Schedule For
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={nowLocalISO()}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Feedback banners */}
        {formError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}
        {formSuccess && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {formSuccess}
          </div>
        )}

        <button
          onClick={handleSchedule}
          disabled={submitting}
          className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarClock className="h-4 w-4" />
          {submitting ? 'Scheduling…' : 'Schedule Email'}
        </button>
      </div>

      {/* Scheduled emails list */}
      <div className="rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Scheduled Emails</h2>
            {pendingCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {pendingCount} pending
              </span>
            )}
          </div>
          <button
            onClick={fetchScheduled}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {loadingList ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Loading scheduled emails…
          </div>
        ) : scheduled.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12">
            <Inbox className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No scheduled emails yet</p>
            <p className="text-xs text-muted-foreground">
              Fill in the form above to schedule your first email.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {[...scheduled].reverse().map((email) => {
              const cfg = STATUS_CONFIG[email.status]
              const StatusIcon = cfg.icon
              const isCancelling = cancelling === email.id

              return (
                <li key={email.id} className="flex items-start gap-4 px-5 py-4">
                  {/* Avatar */}
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Top row: subject + status badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {email.subject}
                        </p>
                        <p className="text-[11px] text-muted-foreground">To: {email.to}</p>
                      </div>
                      <span
                        className={cn(
                          'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          cfg.className
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Bottom row: scheduled time + cancel button */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(email.scheduledAt)}
                      </div>
                      {email.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(email.id)}
                          disabled={isCancelling}
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {isCancelling ? 'Cancelling…' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
