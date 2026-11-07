import type { FlikkableRow, ProfileRow } from './db/schema'

// Ported from the web app (commit 91a6bc5): QuestConfig, UserStatusBar, StreakTracker,
// DailyQuests, SpinTheWheel and dailyMoodUpdate.

export type QuestState = ProfileRow['quests']

export const QUESTS: Record<string, { name: string; description: string; icon: string; target: number; rarity: string }> = {
  world_traveler: { name: 'World Traveler', description: 'Have a character visit 10 different countries', icon: '🌍', target: 10, rarity: 'epic' },
  distance_champion: { name: 'Distance Champion', description: 'Travel 5,000 km total with one character', icon: '🚀', target: 5000, rarity: 'epic' },
  homecoming: { name: 'Homecoming', description: 'Return the same character home 5 times', icon: '🏠', target: 5, rarity: 'uncommon' },
  social_butterfly: { name: 'Social Butterfly', description: 'Get picked up by 3 different players', icon: '🦋', target: 3, rarity: 'rare' },
  rarity_collector: { name: 'Rarity Collector', description: 'Own one character of each rarity tier', icon: '💎', target: 5, rarity: 'legendary' },
  continental_tour: { name: 'Continental Tour', description: 'Land characters on all 6 continents', icon: '🗺️', target: 6, rarity: 'legendary' },
  lucky_landing: { name: 'Lucky Landing', description: 'Land in capital cities - visit 5 different capitals', icon: '⭐', target: 5, rarity: 'rare' },
  speed_flicker: { name: 'Speed Flicker', description: 'Flick 5 characters in one day', icon: '⚡', target: 5, rarity: 'uncommon' },
  rare_encounter: { name: 'Rare Encounter', description: 'Find and pick up a legendary character', icon: '🌟', target: 1, rarity: 'legendary' },
}

export interface NewTrophy {
  quest_id: string
  name: string
  description: string
  icon: string
  rarity: string
}

// Progress either counts up by one or is set to a measured value; a quest
// completes once and then stops changing.
export function progressQuest(state: QuestState, id: string, update: { add?: number; atLeast?: number; seen?: string }) {
  const quest = QUESTS[id]
  const current = state[id] ?? { progress: 0, completed: false, seen: [] }
  if (!quest || current.completed) return { state, trophy: null as NewTrophy | null }
  const next = { ...current, seen: [...(current.seen ?? [])] }
  if (update.seen) {
    if (!next.seen.includes(update.seen)) next.seen.push(update.seen)
    next.progress = next.seen.length
  }
  if (update.add) next.progress += update.add
  if (update.atLeast !== undefined) next.progress = Math.max(next.progress, update.atLeast)
  next.completed = next.progress >= quest.target
  const trophy = next.completed ? { quest_id: id, name: quest.name, description: quest.description, icon: quest.icon, rarity: quest.rarity } : null
  return { state: { ...state, [id]: next }, trophy }
}

const LEVEL_THRESHOLDS = [0, 10000, 20000, 30000, 50000, 70000, 100000, 150000]

export function levelThreshold(level: number) {
  if (level <= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level - 1]!
  let current = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]!
  for (let i = LEVEL_THRESHOLDS.length; i < level; i++) current = current + 50000 + Math.floor(current * 0.1)
  return current
}

export function levelFor(km: number) {
  let level = 1
  while (levelThreshold(level + 1) <= km) level++
  return level
}

export const MILESTONES = [100000, 500000, 1000000, 2000000, 3000000, 4000000]

export const DAILY_REWARDS = [5, 10, 15, 20, 25, 30, 50]

export const SPIN_SEGMENTS = [
  { type: 'stamps', value: 5, weight: 25 },
  { type: 'garden', value: 0, weight: 10 },
  { type: 'stamps', value: 10, weight: 25 },
  { type: 'garden', value: 0, weight: 10 },
  { type: 'stamps', value: 20, weight: 20 },
  { type: 'garden', value: 0, weight: 5 },
  { type: 'flikkstar', value: 0, weight: 5 },
] as const

export function rollSpin() {
  let roll = Math.random() * SPIN_SEGMENTS.reduce((sum, s) => sum + s.weight, 0)
  for (let i = 0; i < SPIN_SEGMENTS.length; i++) {
    roll -= SPIN_SEGMENTS[i]!.weight
    if (roll <= 0) return i
  }
  return 0
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function daysBetween(fromDay: string, toDay: string) {
  return Math.round((Date.parse(toDay) - Date.parse(fromDay)) / 86400_000)
}

// The web ran dailyMoodUpdate on a schedule; here it catches up whenever the
// owner's state loads. Fed in the last 24 h: +1 that day; otherwise -1.
export function catchUpMood(f: FlikkableRow, today: string) {
  if (!f.mood_day) return { happiness: f.happiness, mood_day: today, sad: false }
  const days = daysBetween(f.mood_day, today)
  if (days <= 0) return null
  let happiness = f.happiness
  const fedRecently = f.last_fed_at ? f.last_fed_at.getTime() >= Date.parse(f.mood_day) : false
  happiness = fedRecently ? Math.min(happiness + 1, 5) : Math.max(happiness - 1, 1)
  happiness = Math.max(happiness - (days - 1), 1)
  return { happiness, mood_day: today, sad: happiness <= 2 }
}

const CAPITALS = new Set([
  'Tokyo', 'Delhi', 'Mexico City', 'Cairo', 'Beijing', 'Dhaka', 'London', 'Paris', 'Singapore', 'Rome', 'Berlin',
  'Moscow', 'Bangkok', 'Seoul', 'Jakarta', 'Manila', 'Buenos Aires',
])

export function isCapital(city: string) {
  return CAPITALS.has(city)
}

export function continentFor(lat: number, lng: number) {
  if (lat < -60) return 'Antarctica'
  if (lat >= -35 && lat <= 37 && lng >= -18 && lng <= 52) return 'Africa'
  if (lat >= 36 && lat <= 71 && lng >= -25 && lng <= 40) return 'Europe'
  if (lat >= -47 && lat <= 81 && lng >= 25 && lng <= 180) return lat < 0 && lng >= 110 ? 'Oceania' : 'Asia'
  if (lat >= 15 && lat <= 72 && lng >= -170 && lng <= -52) return 'North America'
  if (lat >= -56 && lat <= 13 && lng >= -82 && lng <= -34) return 'South America'
  if (lat >= -47 && lat <= 0 && lng >= 110 && lng <= 180) return 'Oceania'
  return 'Other'
}
