-- Add google_calendar_event_id column to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN google_calendar_event_id TEXT;