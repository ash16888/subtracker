-- Restore the calendar event reference required by the application.
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;
