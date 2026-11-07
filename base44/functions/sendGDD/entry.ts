import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const gddContent = `
# Flikkables — Game Design Document (GDD)
Version: 1.0 | Date: March 2026

## 1. Game Overview
Title: Flikkables
Genre: Location-Based Collectible Adventure (Mobile/Web)
Platform: Mobile Web App (iOS & Android via browser)
Tagline: "Send them on adventures!"

Flikkables is a real-world location-based game where players create digital collectible characters called Flikkables, launch ("flikk") them to cities around the world, and rely on other players to physically travel to those locations to pick them up and return them home — earning stamps and rewards along the way.

## 2. Core Game Loop
CREATE Flikkable → FLIKK it to a city → OTHER players PIKK it UP → They RETURN it home → Everyone earns STAMPS

1. Create – Player creates a named Flikkable with an emoji or custom AI avatar
2. Flikk – Player launches it to a random (or targeted) city worldwide
3. Explore – Nearby players discover it on the map and can pick it up
4. Carry – The picker carries it until they return it home
5. Return – Returning earns stamps for both the carrier and the owner
6. Repeat – Flikkable goes back home, ready for another adventure

## 3. Player Actions

### 3.1 Flikkable Owner
- Create Flikkable: Create a new collectible character
- Flikk: Launch Flikkable to a city → Stamps (distance + city bonus)
- Return Home: Recall your own Flikkable (cooldown applies)
- View Journey: See where it's been and who carried it

### 3.2 Explorer (any player)
- Pikk Up: Pick up a nearby Flikkable (within ~50m)
- Return to Owner: Bring it back to its home coordinates → Stamps
- Take Postcard: Selfie photo turned into AI travel postcard

## 4. Flikkables (Characters)

### 4.1 Types
- Standard Flikkables — Emoji-based, created by any player
- Flikkstars — AI-generated cartoon avatar from selfie photo; faster cooldown (4h vs 8h)

### 4.2 Rarity Tiers
- Common: +0 stamp bonus | 20% drop chance
- Uncommon: +0 stamp bonus | 20% drop chance
- Rare: +2 stamp bonus | 20% drop chance
- Epic: +5 stamp bonus | 20% drop chance
- Legendary: +10 stamp bonus | 20% drop chance

Rarity is assigned randomly at creation (equal 20% chance each).

### 4.3 Character Stats
- Total Distance Traveled (km)
- Unique Cities Visited
- Times Returned
- Status: Home / Traveling / Landed / Picked Up

### 4.4 Achievement Stars
- Bronze: 20,000 km distance | 10 cities
- Silver: 50,000 km distance | 20 cities
- Gold: 100,000 km distance | 50 cities

## 5. Stamp Economy

### 5.1 Earning Stamps
- Per city flikkd to: +1 stamp
- Per 1,000 km traveled: +1 stamp
- City population ≥ 1M: +3 bonus stamps
- Rare bonus: +2 | Epic: +5 | Legendary: +10
- Flikkstar bonus: +20% total
- Returning a Flikkable: 1 stamp per 200 km traveled
- Daily streak rewards: Variable
- Daily spin wheel: Variable
- Daily quests: Variable
- Trade with players: Player-set

### 5.2 Spending Stamps
- Garden decorations
- Airport decorations
- Trade offers
- Guild treasury contributions
- Race entry fees (5 stamps)

## 6. Locations & Map

### 6.1 Flikk Destinations
- 30 major world cities, weighted by population
- ±50 km random variance
- Small 50–100m random offset per character

### 6.2 Pickup Radius
- Default: 50 meters from Flikkable's coordinates
- Configurable by admin

### 6.3 Map Views
- Nearby Map — Leaflet map showing landed Flikkables near the player
- Global Map — World view of all landed Flikkables
- Country Map — Country ownership/territory view

## 7. Social & Multiplayer Features

### 7.1 Friends
- Add friends, view their stats and Flikkables

### 7.2 Guilds
- Create or join guilds (up to 20 members)
- Collaborative quests, guild events, leaderboards
- Guild treasury funded by member contributions
- Alliance system between guilds
- Territory claiming on the world map

### 7.3 Trading
- Direct Flikkable-for-Flikkable trade offers between players
- Pending trade notifications with badge indicator

### 7.4 Races (Pick Up Races)
- Host a timed race to pick up a specific Flikkable
- Entry fee: 5 stamps
- Winner takes all entry stamps

### 7.5 Battles
- Head-to-head challenges (Distance Derby, Flikk Duel, etc.)

## 8. Progression & Rewards

### 8.1 Daily Login Streak
- 7-day reward cycle
- 30-day milestone bonuses
- Streak resets if player misses a day

### 8.2 Daily Quests
- Flikk Quest: Flikk X Flikkables today → Stamps
- Return Quest: Return X Flikkables today → Stamps

### 8.3 Daily Spin Wheel
- Spin once per day
- Prizes: Stamps, garden features, template unlocks

### 8.4 Trophies & Achievements
- Milestone celebrations at 100k, 500k, 1M+ km
- Character achievement stars (Bronze/Silver/Gold)

### 8.5 Leaderboard
- Global rankings by stamps, distance, returns

## 9. Postcards Feature
When a player picks up a Flikkable, they can take a selfie postcard:
1. Camera opens, player takes a selfie
2. AI transforms the face into a 3D Pixar-style caricature
3. Postcard is framed with the location name and character emoji
4. Saved to the player's postcard gallery
5. Optionally sent to the Flikkable's owner upon return

## 10. Garden & Airport (Home Base)

### Garden
- Relaxing area for Flikkables at home
- Decoratable with items from the Garden Shop
- Liked by other players

### Airport
- Departure lounge for Flikkables ready to be flikkd
- Decoratable with airport furniture/items
- Characters here are selectable for flicking

## 11. Country Ownership
- Players/guilds can "own" countries by having the most Flikkables there
- Ownership earns passive stamp benefits
- Updated automatically when Flikkables land or return

## 12. Admin Features
- Set pickup radius
- Toggle races, guilds, map visibility
- Drop Flikkables near any location
- Manage templates and character creation

## 13. Technical Notes
- Frontend: React + Tailwind CSS + Framer Motion
- Backend: Base44 BaaS (entities, functions, automations)
- Maps: React Leaflet
- AI: Base44 InvokeLLM + GenerateImage integrations
- Real-time: Base44 entity subscriptions

---
For the source code, please use GitHub Sync in Base44 Dashboard → Settings → GitHub Sync to export the full codebase to a GitHub repository.
`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'david.mcmillan0212@gmail.com',
      subject: 'Flikkables — Game Design Document (GDD)',
      body: gddContent,
      from_name: 'Flikkables'
    });

    return Response.json({ success: true, message: 'GDD sent successfully!' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});