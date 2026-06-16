-- Add subscription lifecycle and Google Calendar synchronization state.
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS calendar_sync_status TEXT NOT NULL DEFAULT 'not_connected',
ADD COLUMN IF NOT EXISTS calendar_sync_error TEXT,
ADD COLUMN IF NOT EXISTS calendar_sync_attempted_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_status_check'
      AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('active', 'trial', 'paused', 'canceled', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_calendar_sync_status_check'
      AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_calendar_sync_status_check
    CHECK (calendar_sync_status IN ('not_connected', 'pending', 'synced', 'error', 'disabled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
ON public.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_calendar_sync_status
ON public.subscriptions(calendar_sync_status);
