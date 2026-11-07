# Flikkables — Neon Arcade

Subject: flikking little creatures to real cities, finding ones that land near you. Players: casual mobile gamers, one-handed, in short bursts. Core action: the swipe-up flikk and the flight across the map.

Directions considered:
1. Airmail (cream paper, red/navy stripes): the previous look; the owner wanted high-energy gaming, so it lost.
2. Candy pop (bright pastels, rounded type): friendly but reads as a kids' toy.
3. **Neon Arcade (chosen):** a deep violet-black night with glowing electric purple and neon green, Chakra Petch display type. It fits the owner's brief for "premium dark, neon purple + green, bold gaming type".

Palette (src/global.css, identical in light and dark: the app is dark-only):
- Night `#0B0716` background · Panel `#160F2B` surface · Rim `#3A2A73` border
- Volt purple `#B44CFF` accent and glow · Neon green `#39FF88` neon/success/flight arc · Coin gold `#FFD23F` stamps

Type: Chakra Petch 700 (`Fonts.display`) for titles, numbers, section labels and buttons. SF Pro / Roboto for body text.
Art: flat vector with a soft neon glow, all on the Night background (assets/images/game/*): heroes, empty states, coin/flame/globe/trophy/crown icons.
Cards: dark panel, violet rim, soft purple outer glow (src/components/card.tsx).

Signature moment: the flikk. Swipe up and the Flikkable shouts one of the 20 travel sayings (features/game/utils/sayings.ts). It then rides the neon arc across the map in one unbroken 1.5 s glide (`durations.flight`), wind streaks fluttering behind it and its speech bubble flying alongside. A postmark thump and a success haptic follow on landing.
