-- Enable Realtime for the meetings table
-- This allows WebRTC signaling via Supabase Realtime channels

-- Allow anyone (authenticated or anon) to subscribe to broadcast channels
-- This is needed for WebRTC signaling without requiring DB rows

-- Grant realtime access
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;

-- Allow public broadcast channels for WebRTC signaling
-- No DB changes needed — Supabase Realtime Broadcast works out of the box
-- Just make sure in your Supabase Dashboard:
-- Realtime → Settings → Enable "Broadcast" and "Presence"

COMMENT ON TABLE meetings IS 'WebRTC signaling uses Supabase Realtime Broadcast channels (not DB rows). No extra config needed.';
