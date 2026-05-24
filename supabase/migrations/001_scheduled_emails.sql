-- Create scheduled_emails table
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  original_email_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'sent', 'failed')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Colombo',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT scheduled_emails_user_id_check CHECK (user_id != '')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_user_id ON public.scheduled_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON public.scheduled_emails(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_at ON public.scheduled_emails(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_user_status ON public.scheduled_emails(user_id, status);

-- Enable Row Level Security
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for SELECT: users can only see their own emails
CREATE POLICY "Users can view their own scheduled emails" 
  ON public.scheduled_emails 
  FOR SELECT 
  USING (auth.uid()::TEXT = user_id);

-- Create RLS policy for INSERT: users can only insert their own emails
CREATE POLICY "Users can create their own scheduled emails" 
  ON public.scheduled_emails 
  FOR INSERT 
  WITH CHECK (auth.uid()::TEXT = user_id);

-- Create RLS policy for UPDATE: users can only update their own emails
CREATE POLICY "Users can update their own scheduled emails" 
  ON public.scheduled_emails 
  FOR UPDATE 
  USING (auth.uid()::TEXT = user_id)
  WITH CHECK (auth.uid()::TEXT = user_id);

-- Create RLS policy for DELETE: users can only delete their own emails
CREATE POLICY "Users can delete their own scheduled emails" 
  ON public.scheduled_emails 
  FOR DELETE 
  USING (auth.uid()::TEXT = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_emails TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
