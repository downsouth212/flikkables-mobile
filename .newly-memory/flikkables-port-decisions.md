---
name: flikkables-port-decisions
description: Flikkables is a full native port of the user's Base44 web game; backend, scope and website decisions
metadata:
  type: project
---

The repo was a Base44 web app (React/Vite, Leaflet, framer-motion) for Flikkables: a multiplayer location game where you flick collectible characters to real places, others pick them up nearby, they return home with postcards. Plus streaks, quests, spin wheel, garden/airport decor, moods/feeding, friends, guilds, trading, battles/races, country map, leaderboard, admin.

User decisions (2026-11-07):
- Accounts and data: start fresh on Newly Backend (no Base44 data migration).
- Scope: port everything, screen by screen.
- The phone app replaces the Base44 website; it need not keep working.

**Why:** user chose these explicitly when asked.
**How to apply:** build on Newly Backend + Newly AI; original web source (git HEAD on dev, src/pages, src/components, base44/entities, base44/functions) is the spec to port from. Port in phases, core loop first.
