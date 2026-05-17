'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Settings, User, FileText, MessageSquare, Save, CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal', description: 'Professional and structured' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
] as const

type Tone = (typeof TONE_OPTIONS)[number]['value']

export default function SettingsPage() {
  const { data: session } = useSession()
  const [signature, setSignature] = useState('')
  const [tone, setTone] = useState<Tone>('formal')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSignature(localStorage.getItem('email_signature') ?? '')
    setTone((localStorage.getItem('email_tone') as Tone | null) ?? 'formal')
  }, [])

  const handleSave = () => {
    localStorage.setItem('email_signature', signature)
    localStorage.setItem('email_tone', tone)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? 'U'

  return (
    <div className="flex flex-col gap-6 p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile and email preferences</p>
        </div>
      </div>

      {/* Profile */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Profile</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {userInitial}
          </div>
          <div>
            <p className="font-medium text-foreground">{session?.user?.name ?? '—'}</p>
            <p className="text-sm text-muted-foreground">{session?.user?.email ?? '—'}</p>
            <span className="mt-1.5 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Signed in with Google
            </span>
          </div>
        </div>
      </div>

      {/* Email Signature */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Email Signature</h2>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Appended by the AI Email Drafter when composing emails.
        </p>
        <textarea
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="e.g. Best regards,&#10;Nipun Anupama&#10;AI Email Assistant"
          rows={4}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Default Tone */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Default Email Tone</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Sets the writing style used by the AI Email Drafter.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {TONE_OPTIONS.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => setTone(value)}
              className={cn(
                'flex flex-col rounded-xl border p-4 text-left transition-all',
                tone === value
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
              )}
            >
              <span className={cn(
                'text-sm font-semibold',
                tone === value ? 'text-primary' : 'text-foreground'
              )}>
                {label}
              </span>
              <span className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {saved
            ? <CheckCircle className="h-4 w-4" />
            : <Save className="h-4 w-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
