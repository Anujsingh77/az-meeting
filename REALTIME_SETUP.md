# Enable Realtime for Video Calls

For your friends to see and hear you, you must enable Supabase Realtime.

## Steps (takes 2 minutes):

1. Go to https://supabase.com → your project
2. Click **Realtime** in the left sidebar
3. Click **Settings** (or "Configure")
4. Make sure these are ENABLED:
   - ✅ Broadcast
   - ✅ Presence  
5. Click Save

That's it! Now when you and your friend join the same meeting code,
WebRTC will connect you automatically for live video and audio.

## How it works:
- Both users join the same meeting page with the same code
- They connect to a Supabase Realtime broadcast channel named `room:YOURCODE`
- WebRTC offer/answer/ICE signals are exchanged through this channel
- Once signaling completes, video and audio flow directly P2P (peer-to-peer)
- No video passes through any server — it goes directly between browsers

## Troubleshooting:
- Make sure BOTH users allowed camera and microphone in their browser
- Make sure both are using HTTPS (not HTTP) — required for WebRTC
- If still not connecting, try a different network (some corporate firewalls block WebRTC)
- The TURN servers included handle most NAT/firewall situations automatically
