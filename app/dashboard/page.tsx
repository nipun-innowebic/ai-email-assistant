'use client'

import { useEffect, useState } from 'react'
import {
  Mail, MailOpen, PenLine, CalendarClock,
  TrendingUp, TrendingDown, Star, Clock,
  AlertCircle, Tag, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Email {
  id: string
  subject: string
  from: string
  date: string
  category?: string
}

const categoryColors: Record<string, string> = {
  Important: 'text-destructive bg-destructive/10',
  Work: 'text-primary bg-primary/10',
  Finance: 'text-warning bg-warning/10',
  Newsletter: 'text-muted-foreground bg-muted',
  Spam: 'text-muted-foreground bg-muted',
  Personal: 'text-success bg-success/10',
  Automated: 'text-muted-foreground bg-muted',
  Uncategorized: 'text-muted-foreground bg-muted',
}

const quickActions = [
  {
    href: '/dashboard/drafter',
    icon: PenLine,
    label: 'Draft with AI',
    description: 'Compose a reply or new email using AI',
    color: 'text-primary',
    bg: 'bg-primary/10 hover:bg-primary/20',
  },
  {
    href: '/dashboard/scheduler',
    icon: CalendarClock,
    label: 'Schedule Send',
    description: 'Queue an email for the perfect moment',
    color: 'text-success',
    bg: 'bg-success/10 hover:bg-success/20',
  },
  {
    href: '/dashboard',
    icon: Tag,
    label: 'Auto-Categorize',
    description: 'Let AI sort your inbox for you',
    color: 'text-warning',
    bg: 'bg-warning/10 hover:bg-warning/20',
  },
]

export default function DashboardPage() {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [categorizing, setCategorizing] = useState(false)

  useEffect(() => {
    fetch('/api/gmail/inbox')
      .then(res => res.json())
      .then(data => {
        setEmails(data.emails || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const categorizeEmails = async () => {
    setCategorizing(true)
    const updated = await Promise.all(
      emails.map(async (email) => {
        const res = await fetch('/api/ai/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: email.subject,
            from: email.from,
          }),
        })
        const data = await res.json()
        return { ...email, category: data.category }
      })
    )
    setEmails(updated)
    setCategorizing(false)
  }

  const unreadCount = emails.length

  const stats = [
    {
      label: 'Total Emails',
      value: emails.length.toString(),
      delta: 'Live',
      trend: 'up',
      icon: Mail,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Unread',
      value: unreadCount.toString(),
      delta: 'Live',
      trend: 'down',
      icon: MailOpen,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'AI Drafts',
      value: '23',
      delta: '+31%',
      trend: 'up',
      icon: PenLine,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Scheduled',
      value: '8',
      delta: '+2',
      trend: 'up',
      icon: CalendarClock,
      color: 'text-accent-foreground',
      bg: 'bg-accent',
    },
  ]

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric',
    month: 'long', day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good morning 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">{today}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-xs">
          <AlertCircle className="h-4 w-4 text-warning" />
          <span>{unreadCount} emails in your inbox</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, delta, trend, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', bg)}>
                <Icon className={cn('h-5 w-5', color)} />
              </div>
              <span className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trend === 'up' ? 'text-success' : 'text-destructive'
              )}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Emails */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-foreground">Recent Inbox</h2>
              </div>
              <button
                onClick={categorizeEmails}
                disabled={categorizing || emails.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
              >
                <Tag className="h-3 w-3" />
                {categorizing ? 'Categorizing...' : 'AI Categorize'}
              </button>
            </div>

            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Loading emails...
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {emails.map((email) => (
                  <li key={email.id}
                    className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {email.from?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {email.from}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {email.date}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {email.subject}
                        </p>
                        {email.category && (
                          <span className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                            categoryColors[email.category] || 'text-muted-foreground bg-muted'
                          )}>
                            {email.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Star className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Quick Actions</h2>
            </div>
            <div className="space-y-2 p-4">
              {quickActions.map(({ href, icon: Icon, label, description, color, bg }) => (
                <Link key={href + label} href={href}
                  className={cn('flex items-center gap-3 rounded-lg p-3 transition-colors', bg)}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background">
                    <Icon className={cn('h-4 w-4', color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{description}</p>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-xs">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Scheduled Sends</h2>
            </div>
            <ul className="divide-y divide-border">
              {[
                { to: 'alex@client.io', subject: 'Follow-up on proposal', when: 'Today, 2:00 PM' },
                { to: 'team@acme.com', subject: 'Weekly status update', when: 'Mon, 9:00 AM' },
                { to: 'cto@startup.io', subject: 'Demo request confirmation', when: 'Tue, 11:30 AM' },
              ].map((item, i) => (
                <li key={i} className="px-5 py-3">
                  <p className="text-sm font-medium text-foreground">{item.subject}</p>
                  <p className="text-[11px] text-muted-foreground">To: {item.to}</p>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-warning">
                    <Clock className="h-3 w-3" />{item.when}
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-5 py-3">
              <Link href="/dashboard/scheduler"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
                Manage all schedules <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}