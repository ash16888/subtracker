-- Mark existing subscriptions that already have Google Calendar events as synced.
UPDATE public.subscriptions
SET
  calendar_sync_status = 'synced',
  calendar_sync_error = NULL,
  calendar_sync_attempted_at = COALESCE(calendar_sync_attempted_at, NOW())
WHERE google_calendar_event_id IS NOT NULL
  AND calendar_sync_status IN ('not_connected', 'pending', 'error');

-- Keep rows without event IDs out of a false-positive synced state.
UPDATE public.subscriptions
SET
  calendar_sync_status = 'not_connected',
  calendar_sync_error = NULL
WHERE google_calendar_event_id IS NULL
  AND calendar_sync_status = 'synced';

