'use client'

import { useState } from 'react'
import { PenLine, Sparkles, Copy, RotateCcw, AlertCircle } from 'lucide-react'

export default function DrafterPage() {
  const [prompt, setPrompt] = useState('')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const generateDraft = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setDraft('')
    setError('')

    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
      } else {
        setDraft(data.draft ?? '')
      }
    } catch {
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <PenLine className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Email Drafter</h1>
          <p className="text-sm text-muted-foreground">
            Describe what you want to say — AI writes it for you
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <label
          htmlFor="prompt"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          What do you want to write?
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Write a follow-up email to a client about the proposal we sent last week..."
          rows={5}
          className="w-full resize-none rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={generateDraft}
          disabled={loading || !prompt.trim()}
          className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {loading ? 'Generating…' : 'Generate Draft'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Output */}
      {draft && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Generated Draft</h2>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={generateDraft}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Regenerate
              </button>
            </div>
          </div>
          <div className="whitespace-pre-wrap rounded-lg bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
            {draft}
          </div>
        </div>
      )}
    </div>
  )
}
