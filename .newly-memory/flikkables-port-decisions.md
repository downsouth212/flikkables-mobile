---
name: flikkables-port-decisions
description: "Flikkables is a full native port of the user's Base44 web game; backend, scope and website decisions"
metadata:
  node_type: memory
  type: project
  originSessionId: 4b9fd4bf-3b23-4542-8a08-683b4834953b
  modified: 2026-11-07T10:53:34.400Z
---

The repo was a Base44 web app (React/Vite, Leaflet, framer-motion) for Flikkables: a multiplayer location game where you flick collectible characters to real places, others pick them up nearby, they return home with postcards. Plus streaks, quests, spin wheel, garden/airport decor, moods/feeding, friends, guilds, trading, battles/races, country map, leaderboard, admin.

User decisions (2026-11-07):
- Accounts and data: start fresh on Newly Backend (no Base44 data migration).
- Scope: port everything, screen by screen.
- The phone app replaces the Base44 website; it need not keep working.

**Why:** user chose these explicitly when asked.
**How to apply:** build on Newly Backend + Newly AI; original web source (git HEAD on dev, src/pages, src/components, base44/entities, base44/functions) is the spec to port from. Port in phases, core loop first.

Round 1 shipped (2026-11-07): sign-up, onboarding (location or city picker), Launch flick, landing postcard overlay, flikkable detail + AI postcards, Explore radar/pickup/send home, Passport (daily stamp, streak, journal, leaderboard, delete account). Still to port: quests, spin wheel, garden/airport decor, moods/feeding, friends, guilds, trading, battles/races, country map, admin. After round 1's last fix (landing haptic crash), the flick wasn't re-checked on device.

Admin (2026-11-07): Dave (the user) is master admin via email david.mcmillan0212@gmail.com, in dev and prod (user said "Both for now"). Seeded by migration 0003_seed_master_admin; the api.admins row binds to the first account that signs in with that email (sign-up emails are NOT verified, no email domain set up). Admin panel at src/app/admin.tsx (Passport "Admin panel" row, admins only): game rules (pickup m, radar km, max owned), drop team Flikkables (owner_id 'flikkables-team'), master adds/removes admins, players: pause, move home, reset. Not ported yet: character creator/templates, page toggles, battle toggle, dummy users.
