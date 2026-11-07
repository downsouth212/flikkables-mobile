# Flikkables: design plan

## Ground
- **Subject:** small collectible creatures you fling across the planet. They land in real cities, strangers pick them up and pass them on, and they come home with postcards.
- **Who:** casual players, kids to adults, who like collecting, travel and a little chaos. Many check in a few times a day.
- **Core action:** the flick. Hold a Flikkable on your launch pad and swipe it off the screen.
- **Moment of use:** one-handed and standing up. On the sofa between other apps, or walking outside hunting for a Flikkable that landed nearby. It needs big thumb targets and big type, and every result should read in a glance.

## Three directions
1. **Airmail**: paper white, airmail red and airmail navy, with the red/blue chevron stripe of an envelope edge. Postmarks, passport stamps and coordinates in SF Mono. Big numbers in SF Rounded heavy.
2. **Arcade sky**: saturated sky blue, cloud white and sun yellow, with chunky rounded cards and confetti.
3. **Night radar**: deep navy with phosphor green, a sonar sweep and a cockpit feel.

**Picked: Airmail.** It's the game's own vocabulary: stamps, postcards, passports, "returned to sender". It gives every screen something to draw on (postmarks, envelope stripes, stamp edges) without inventing decoration. Arcade sky lost because it's generic kids-game. Night radar lost because it's cold and only fits Explore.

## Palette (tokens in src/global.css)
| Name | Light | Dark | Token |
|---|---|---|---|
| Airmail red | #E0393E | #FF5A5F | `accent` |
| Airmail navy | #22336B | #9DB4FF | `navy` (custom) and `link` |
| Envelope paper | #F6F3EC | #0E1426 (night flight) | `background` |
| Letter white | #FFFFFF | #18203A | `surface` |
| Stamp gold | #E3A23A | #F1B955 | `warning` / `gold` (custom) |
| Ocean | #CFE6F5 | #1B2B4D | `ocean` (custom), map water |

Ink is #1B1E2B on light and #F2EEE4 on dark. Rarity colours: common is navy at 40%, uncommon is the teal stamp ink #2A9D8F, rare is navy, epic is purple stamp ink #7B4BB7, and legendary is gold.

## Type voice
- SF Pro for body text and controls.
- **SF Rounded, heavy** for the big numbers (km flown, stamps) and the Flikkable's name. It's friendly and fat-fingered.
- **SF Mono, uppercase, wide tracking** for postmarks, coordinates and place stamps (`TOKYO · 35.68°N 139.65°E`). This is the airmail voice.

## Imagery
- The creatures are the emoji themselves. Here they are the content, as in the original game. Each sits on a round paper "stamp" with a perforated edge.
- **The world map** is drawn in vector from bundled Natural Earth land shapes: paper land on an ocean-blue sea, with dashed flight arcs in airmail red. No map tiles and no API keys.
- **Postcards** are AI-drawn per landing in a risograph travel-postcard style: airmail red, navy and sky on cream paper, with the creature posing in front of the city's landmark.

## Shell
```
┌────────────────────────────────┐
│ (content scrolls under bar)    │
│                                │
│                                │
│ ╭──────────────────────────╮   │
│ │ Launch   Explore  Passport│  ← Liquid Glass native tabs
│ ╰──────────────────────────╯   │
└────────────────────────────────┘
tabs: paperplane.fill / location.north.circle.fill / book.closed.fill
```
- There are no headers on tab screens: a large title, then content.
- Pushed screens (a Flikkable's detail page) draw their own back chevron.
- Creating a Flikkable is a form sheet.

## Screens
**Launch (first screen), drawn two ways:**
```
A: list first                     B: launch pad first  ← kept
┌───────────────────┐             ┌──────────────────────┐
│ My Flikkables     │             │ Launch      ✉ 128 ⓢ  │
│ [🦊 Pip  home  >] │             │ ╱╲╱╲ airmail stripe ╱╲│
│ [🐙 Ink  Tokyo >] │             │                      │
│ [+ New]           │             │      ( 🦊 )  ← stamp │
│ map               │             │     PIP · RARE       │
└───────────────────┘             │  swipe up to flick ↑ │
                                  │ ─────────────────────│
                                  │ at home ○○ ●  carousel│
                                  │ [🦊][🐼][＋]          │
                                  │ Out in the world      │
                                  │ ▢ world map + pins    │
                                  │ 🐙 Ink · TOKYO · 6h   │
                                  └──────────────────────┘
```
B wins because the first thing on screen is the thing you do. A is the settings-page layout.

**Explore:** a radar of Flikkables that landed within 25 km of you, each placed by bearing and distance. Tap one to see how far it is and to pick it up when you're within 50 m. Below is a world map of everything roaming right now. Flikkables you're holding sit on top with "Flick onward" and "Send home".

**Passport:** the stamp count in big SF Rounded beside its own "stamps" label, and the daily stamp with its streak as a stamp you press. Then a journal of postmark rows (flicked / picked up / returned), and the leaderboard as a numbered ranking (rank is a sequence, so numbers are right there).

**Flikkable detail:** a big stamp, name and rarity; km and cities next to their labels; a map with that creature's whole route as arcs; its postcards, horizontally; and its timeline.

## Signature moment: the flick and the postmark
Drag the creature's stamp. It follows the thumb and tilts with the drag. Release fast and it flies off along the swipe with spin. A dashed arc then draws across the mini world map from home to the landing spot. A postcard slides up, and a round SF Mono postmark (`TOKYO · 9,182 KM`) **stamps** onto it: it scales from 1.4 to 1 and rotates, with a success haptic. Stamps earned count up. Motion dial: **lively** (critically damped springs for the drag release and the stamp settle).

**Celebration (fired once):** the first time a Flikkable earns a distance star (20,000 km bronze), the postcard gets a gold star seal.

## Unmistakable because
Every screen carries the envelope: a chevron stripe, a perforated stamp, SF Mono postmarks. The app's main control is a creature you physically throw off the screen.

## Plan check
- First draft of Launch was "My Flikkables" as list rows with chevrons (default look 1 and 3). Changed to launch pad first.
- Passport first draft opened on a stat-tile grid (default look 4). Changed so the stamp count sits beside its label with the daily stamp, and the rest is a journal.
- Accent is airmail red, not the starter magenta. Paper is a cool grey-white, not cream with terracotta.
