'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Mail, User, FileText } from 'lucide-react'

interface OriginalEmail {
  from: string
  subject: string
  body: string
}

interface ApprovalCardProps {
  id: string
  originalEmail: OriginalEmail
  draft: string
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

export default function ApprovalCard({
  id,
  originalEmail,
  draft: initialDraft,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const [editedDraft, setEditedDraft] = useState(initialDraft)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [error, setError] = useState('')

  const handleApprove = async () => {
    setError('')
    setApproving(true)
    try {
      const res = await fetch('/api/scheduler/approve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, body: editedDraft }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to approve.')
        return
      }
      onApprove?.(id)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    setError('')
    setRejecting(true)
    try {
      const res = await fetch('/api/scheduler/approve', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to reject.')
        return
      }
      onReject?.(id)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setRejecting(false)
    }
  }

  const busy = approving || rejecting

  return (
    /* Card wrapper — same token pattern as the rest of the project */
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      {/* Split view */}
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">

        {/* Left — original email */}
        <div className="flex-1 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Original Email</h3>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">From: </span>
                <span className="font-medium text-foreground">{originalEmail.from}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Subject: </span>
                <span className="font-medium text-foreground">{originalEmail.subject}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 border border-border p-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap min-h-[140px]">
            {originalEmail.body}
          </div>
        </div>

        {/* Right — AI draft (editable) */}
        <div className="flex-1 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <svg
                className="h-4 w-4 text-primary"
                viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 2a10 10 0 1 0 10 10" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-foreground">AI Draft</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Editable
            </span>
          </div>

          <textarea
            value={editedDraft}
            onChange={(e) => setEditedDraft(e.target.value)}
            rows={8}
            className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm text-foreground leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="AI draft will appear here…"
          />
        </div>
      </div>

      {/* Footer — error + action buttons */}
      <div className="border-t border-border bg-muted/20 px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 min-h-[20px]">
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleReject}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            {rejecting ? 'Rejecting…' : 'Reject ✗'}
          </button>

          <button
            onClick={handleApprove}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {approving ? 'Approving…' : 'Approve ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
