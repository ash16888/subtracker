-- Remove google_calendar_event_id column from subscriptions table
ALTER TABLE subscriptions 
DROP COLUMN IF EXISTS google_calendar_event_id;