-- Add google_calendar_event_id column to subscriptions table to store Google Calendar event IDs
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;