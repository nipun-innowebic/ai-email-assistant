import { createClient } from '@supabase/supabase-js'

// ── Database types ─────────────────────────────────────────────────────────

export type EmailStatus = 'pending' | 'approved' | 'sent' | 'failed'

export interface ScheduledEmail {
  id: string
  user_id: string
  /** Legacy field referenced in older routes — not a column in the current schema. */
  user_email?: string
  to_email: string
  subject: string
  body: string
  original_email_id: string | null
  status: EmailStatus
  timezone: string
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
}

export interface UserToken {
  user_id: string
  refresh_token: string
  updated_at: string
}

// Database generic must satisfy Supabase's internal GenericSchema / GenericTable
// shapes or TypeScript resolves Insert types to `never`, breaking .insert() calls.
// Each table needs Relationships: [], and the schema needs Views/Functions/Enums/
// CompositeTypes (even when empty) to match the generated-types contract.
export type Database = {
  public: {
    Tables: {
      scheduled_emails: {
        Row: ScheduledEmail
        Insert: {
          id?: string
          user_id: string
          user_email?: string | null
          to_email: string
          subject: string
          body: string
          original_email_id?: string | null
          status?: EmailStatus
          timezone?: string
          scheduled_at?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: Partial<{
          user_id: string
          user_email: string | null
          to_email: string
          subject: string
          body: string
          original_email_id: string | null
          status: EmailStatus
          timezone: string
          scheduled_at: string | null
          sent_at: string | null
        }>
        Relationships: []
      }
      user_tokens: {
        Row: UserToken
        Insert: UserToken
        Update: Partial<UserToken>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// ── Anon client (browser-safe) ─────────────────────────────────────────────
// Use for public-facing operations. Subject to Row Level Security.

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// ── Admin client (server-side only) ───────────────────────────────────────
// Uses the service-role key — bypasses RLS. Never import this in client
// components or expose it to the browser. Only use in API routes and cron jobs
// that have already verified the caller's identity (e.g. via next-auth session
// or the x-cron-secret / Authorization header check).

// Admin client intentionally untyped — security comes from service-role key
// and session checks in each route, not from TypeScript generics.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
