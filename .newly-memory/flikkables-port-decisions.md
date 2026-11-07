---
name: flikkables-port-decisions
description: "Flikkables is a full native port of the user's Base44 web game; backend, scope and website decisions"
metadata:
  node_type: memory
  type: project
  originSessionId: 4b9fd4bf-3b23-4542-8a08-683b4834953b
  modified: 2026-11-07T15:02:45.522Z
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

Overhaul (2026-11-07): user asked for a premium dark "Neon Arcade" gaming look (neon purple #B44CFF + green #39FF88, Chakra Petch display font, generated art in assets/images/game/). User-facing words are Pikk/Flikk/Clikk (code identifiers unchanged). The flight shows one of 20 user-approved sayings (features/game/utils/sayings.ts), so don't rewrite them without asking. Email verification stays off until the user has a domain. Postcards use a "modern 3D animated family film" prompt; the word Disney is left out on purpose. Dark is the default; the user asked for a light/dark toggle (sun/moon by the Passport title, saved in the settings store). The user plans to list more missing Base44 features later.

Reset decision (2026-11-07): the user was unhappy that rounds 1-3 ported only the core loop and invented things they never asked for: the Passport tab, AI postcards (the web uses camera photos), the journal, and the 3-tab layout. They chose "None, match the web version". Rebuild page for page from commit 91a6bc5 (src/pages, src/components, base44/entities, base44/functions), using the web nav: Home, Explore, Map, Friends, Guilds, Trade, Admin. Keep only what they requested: the Neon look, the 20 sayings, Pikk/Flikk/Clikk, sign-in first, admin access, the light/dark toggle, keyboard bindings. Phase order: 1 Home and collection, 2 Map, 3 Friends/notifications/trade, 4 Guilds, 5 Battles/races, 6 the remaining admin tools.
**Why:** the user said the app should have been built correctly from the web version in the first place, and they're worried about credits.
**How to apply:** never add features that aren't in the web source. Work in big, focused phases with one device check per phase, and don't re-explore.
