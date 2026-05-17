'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail, Tag, RefreshCcw, ArrowLeft, Send,
  CalendarClock, Sparkles, AlertCircle, Loader2,
  User, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

interface Email {
  id: string
  subject: string
  from: string
  date: string
}

interface FullEmail {
  id: string
  subject: string
  from: string
  to: string
  date: string
  body: string
  bodyType: 'plain' | 'html'
}

// ── Category colours (matches dashboard/page.tsx) ──────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Important: 'text-destructive bg-destructive/10',
  Work: 'text-primary bg-primary/10',
  Finance: 'text-warning bg-warning/10',
  Newsletter: 'text-muted-foreground bg-muted',
  Spam: 'text-muted-foreground bg-muted',
  Personal: 'text-success bg-success/10',
  Automated: 'text-muted-foreground bg-muted',
  Uncategorized: 'text-muted-foreground bg-muted',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function senderName(raw: string) {
  // "John Doe <john@example.com>" → "John Doe"
  const match = raw.match(/^([^<]+)</)
  return match ? match[1].trim() : raw.split('@')[0]
}

function formatDate(raw: string) {
  try {
    return new Date(raw).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return raw
  }
}

// ── Skeleton helpers ───────────────────────────────────────────────────────

function SkeletonEmailRow() {
  return (
    <div className="flex items-start gap-3 border-b border-border px-4 py-3 animate-pulse">
      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-muted" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="flex justify-between gap-2">
          <div className="h-3 w-28 rounded bg-muted" />
          <div className="h-3 w-10 rounded bg-muted" />
        </div>
        <div className="h-3 w-44 rounded bg-muted" />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function InboxPage() {
  const router = useRouter()

  // Left panel state
  const [emails, setEmails] = useState<Email[]>([])
  const [loadingEmails, setLoadingEmails] = useState(true)
  const [emailsError, setEmailsError] = useState('')
  const [categories, setCategories] = useState<Record<string, string>>({})
  const [categorizing, setCategorizing] = useState(false)

  // Right panel state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<FullEmail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState('')

  // Reply state
  const [replyDraft, setReplyDraft] = useState('')
  const [loadingReply, setLoadingReply] = useState(false)
  const [replyError, setReplyError] = useState('')

  // Send state
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendSuccess, setSendSuccess] = useState(false)

  // ── Fetch email list ──────────────────────────────────────────────────────

  const fetchEmails = useCallback(async () => {
    setLoadingEmails(true)
    setEmailsError('')
    try {
      const res = await fetch('/api/gmail/inbox')
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data = await res.json()
      setEmails(data.emails ?? [])
    } catch {
      setEmailsError('Could not load inbox. Are you signed in with Gmail access?')
    } finally {
      setLoadingEmails(false)
    }
  }, [])

  useEffect(() => { fetchEmails() }, [fetchEmails])

  // ── AI Categorise all ─────────────────────────────────────────────────────

  const categorizeAll = async () => {
    if (emails.length === 0) return
    setCategorizing(true)
    const results = await Promise.all(
      emails.map(async (e) => {
        try {
          const res = await fetch('/api/ai/categorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject: e.subject, from: e.from }),
          })
          const data = await res.json()
          return [e.id, data.category ?? 'Uncategorized'] as const
        } catch {
          return [e.id, 'Uncategorized'] as const
        }
      })
    )
    setCategories(Object.fromEntries(results))
    setCategorizing(false)
  }

  // ── Select email → fetch detail + generate reply ──────────────────────────

  const selectEmail = async (id: string) => {
    if (id === selectedId) return
    setSelectedId(id)
    setSelectedEmail(null)
    setReplyDraft('')
    setReplyError('')
    setSendError('')
    setSendSuccess(false)
    setLoadingDetail(true)
    setDetailError('')

    try {
      const res = await fetch(`/api/gmail/message/${id}`)
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data: FullEmail = await res.json()
      setSelectedEmail(data)
    } catch {
      setDetailError('Could not load this email. Please try again.')
      setLoadingDetail(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Auto-generate reply whenever selectedEmail changes
  useEffect(() => {
    if (!selectedEmail) return
    let cancelled = false

    const generate = async () => {
      setLoadingReply(true)
      setReplyError('')
      setReplyDraft('')
      try {
        const res = await fetch('/api/ai/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailBody: selectedEmail.body,
            emailFrom: selectedEmail.from,
            emailSubject: selectedEmail.subject,
          }),
        })
        const data = await res.json()
        if (!cancelled) {
          if (!res.ok) setReplyError(data.error ?? 'Failed to generate reply.')
          else setReplyDraft(data.reply ?? '')
        }
      } catch {
        if (!cancelled) setReplyError('Network error while generating reply.')
      } finally {
        if (!cancelled) setLoadingReply(false)
      }
    }

    generate()
    return () => { cancelled = true }
  }, [selectedEmail])

  // ── Send Now ──────────────────────────────────────────────────────────────

  const sendNow = async () => {
    if (!selectedEmail || !replyDraft.trim()) return
    setSending(true)
    setSendError('')
    setSendSuccess(false)
    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedEmail.from,
          subject: selectedEmail.subject.startsWith('Re:')
            ? selectedEmail.subject
            : `Re: ${selectedEmail.subject}`,
          body: replyDraft,
        }),
      })
      const data = await res.json()
      if (!res.ok) setSendError(data.error ?? 'Failed to send.')
      else setSendSuccess(true)
    } catch {
      setSendError('Network error — please try again.')
    } finally {
      setSending(false)
    }
  }

  // ── Schedule Send (prefill via sessionStorage) ────────────────────────────

  const scheduleSend = () => {
    if (!selectedEmail) return
    sessionStorage.setItem(
      'scheduler_prefill',
      JSON.stringify({
        to: selectedEmail.from,
        subject: selectedEmail.subject.startsWith('Re:')
          ? selectedEmail.subject
          : `Re: ${selectedEmail.subject}`,
        body: replyDraft,
      })
    )
    router.push('/dashboard/scheduler')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT PANEL ── */}
      <div className={cn(
        'flex flex-col border-r border-border bg-sidebar',
        'w-full md:w-80 lg:w-96 shrink-0',
        selectedId ? 'hidden md:flex' : 'flex',
      )}>
        {/* Left header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Inbox</span>
            {!loadingEmails && emails.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {emails.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={categorizeAll}
              disabled={categorizing || emails.length === 0 || loadingEmails}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
            >
              {categorizing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Tag className="h-3.5 w-3.5" />}
              AI Categorize
            </button>
            <button
              onClick={fetchEmails}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-auto">
          {loadingEmails ? (
            [...Array(8)].map((_, i) => <SkeletonEmailRow key={i} />)
          ) : emailsError ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-destructive/50" />
              <p className="text-sm text-muted-foreground">{emailsError}</p>
              <button
                onClick={fetchEmails}
                className="mt-1 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
              >
                <RefreshCcw className="h-3.5 w-3.5" />Retry
              </button>
            </div>
          ) : emails.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Your inbox is empty.
            </div>
          ) : (
            emails.map((email) => {
              const isSelected = email.id === selectedId
              const name = senderName(email.from)
              const category = categories[email.id]
              return (
                <button
                  key={email.id}
                  onClick={() => selectEmail(email.id)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors',
                    isSelected
                      ? 'bg-primary/10'
                      : 'hover:bg-muted/60',
                  )}
                >
                  <div className={cn(
                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                  )}>
                    {name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        'truncate text-sm',
                        isSelected ? 'font-bold text-primary' : 'font-semibold text-foreground',
                      )}>
                        {name}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatDate(email.date)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{email.subject}</p>
                    {category && (
                      <span className={cn(
                        'mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold',
                        CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Uncategorized,
                      )}>
                        {category}
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className={cn(
        'flex flex-1 flex-col overflow-hidden',
        selectedId ? 'flex' : 'hidden md:flex',
      )}>
        {/* Mobile back button */}
        <div className="flex items-center border-b border-border px-4 py-2 md:hidden">
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            <ArrowLeft className="h-4 w-4" />Back to inbox
          </button>
        </div>

        {/* No-selection placeholder */}
        {!selectedId && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Mail className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-medium text-foreground">Select an email</p>
            <p className="text-sm text-muted-foreground">
              Choose an email from the list to read it and generate an AI reply.
            </p>
          </div>
        )}

        {/* Loading detail */}
        {selectedId && loadingDetail && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Detail error */}
        {selectedId && detailError && !loadingDetail && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive/50" />
            <p className="text-sm text-muted-foreground">{detailError}</p>
          </div>
        )}

        {/* Loaded email detail */}
        {selectedEmail && !loadingDetail && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Email metadata header */}
            <div className="shrink-0 border-b border-border bg-card px-6 py-4">
              <h2 className="text-base font-bold text-foreground leading-snug">
                {selectedEmail.subject}
              </h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="font-medium text-foreground">From:</span>&nbsp;{selectedEmail.from}
                </span>
                {selectedEmail.to && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span className="font-medium text-foreground">To:</span>&nbsp;{selectedEmail.to}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(selectedEmail.date)}
                </span>
              </div>
            </div>

            {/* Scrollable body + reply area */}
            <div className="flex-1 overflow-auto">
              {/* Email body */}
              <div className="px-6 py-5">
                {selectedEmail.bodyType === 'html' ? (
                  <div
                    className="prose prose-sm max-w-none text-sm text-foreground"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {selectedEmail.body || <span className="text-muted-foreground italic">(No content)</span>}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="mx-6 flex items-center gap-3 border-t border-border py-4">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm font-semibold text-foreground">AI Reply Draft</span>
                {loadingReply && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />generating…
                  </span>
                )}
              </div>

              {/* Reply area */}
              <div className="px-6 pb-6 space-y-3">
                {replyError && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{replyError}
                  </div>
                )}

                {loadingReply ? (
                  <div className="h-32 animate-pulse rounded-lg bg-muted" />
                ) : (
                  <textarea
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder="AI reply will appear here…"
                    rows={8}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}

                {/* Send feedback */}
                {sendError && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{sendError}
                  </div>
                )}
                {sendSuccess && (
                  <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                    Email sent successfully!
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={sendNow}
                    disabled={sending || loadingReply || !replyDraft.trim() || sendSuccess}
                    className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />}
                    {sending ? 'Sending…' : 'Send Now'}
                  </button>

                  <button
                    onClick={scheduleSend}
                    disabled={loadingReply || !replyDraft.trim()}
                    className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CalendarClock className="h-4 w-4" />
                    Schedule Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
