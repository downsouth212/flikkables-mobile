export const QUEST_CONFIG = {
  world_traveler: {
    name: "World Traveler",
    description: "Have a character visit 10 different countries",
    target: 10,
    icon: "🌍",
    rarity: "epic",
    category: "location"
  },
  distance_champion: {
    name: "Distance Champion",
    description: "Travel 5,000 km total with one character",
    target: 5000,
    icon: "🚀",
    rarity: "epic",
    category: "distance"
  },
  homecoming: {
    name: "Homecoming",
    description: "Return the same character home 5 times",
    target: 5,
    icon: "🏠",
    rarity: "uncommon",
    category: "returns"
  },
  social_butterfly: {
    name: "Social Butterfly",
    description: "Get picked up by 3 different players",
    target: 3,
    icon: "🦋",
    rarity: "rare",
    category: "pickups"
  },
  trade_master: {
    name: "Trade Master",
    description: "Complete 3 successful trades",
    target: 3,
    icon: "💱",
    rarity: "rare",
    category: "trades"
  },
  rarity_collector: {
    name: "Rarity Collector",
    description: "Own one character of each rarity tier",
    target: 5,
    icon: "💎",
    rarity: "legendary",
    category: "rarities"
  },
  continental_tour: {
    name: "Continental Tour",
    description: "Land characters on all 6 continents",
    target: 6,
    icon: "🗺️",
    rarity: "legendary",
    category: "continents"
  },
  lucky_landing: {
    name: "Lucky Landing",
    description: "Land in capital cities - visit 5 different capitals",
    target: 5,
    icon: "⭐",
    rarity: "rare",
    category: "capitals"
  },
  speed_flicker: {
    name: "Speed Flicker",
    description: "Flick 5 characters in one day",
    target: 5,
    icon: "⚡",
    rarity: "uncommon",
    category: "flicks_per_day"
  },
  rare_encounter: {
    name: "Rare Encounter",
    description: "Find and pick up a legendary character",
    target: 1,
    icon: "🌟",
    rarity: "legendary",
    category: "legendary_pickup"
  }
};

export const CAPITAL_CITIES = {
  "Paris, France": { lat: 48.8566, lng: 2.3522 },
  "London, United Kingdom": { lat: 51.5074, lng: -0.1278 },
  "Tokyo, Japan": { lat: 35.6762, lng: 139.6503 },
  "Sydney, Australia": { lat: -33.8688, lng: 151.2093 },
  "New York, United States": { lat: 40.7128, lng: -74.0060 },
  "Beijing, China": { lat: 39.9042, lng: 116.4074 },
  "Berlin, Germany": { lat: 52.5200, lng: 13.4050 },
  "Moscow, Russia": { lat: 55.7558, lng: 37.6173 },
  "Cairo, Egypt": { lat: 30.0444, lng: 31.2357 },
  "Dubai, United Arab Emirates": { lat: 25.2048, lng: 55.2708 },
  "Singapore, Singapore": { lat: 1.3521, lng: 103.8198 },
  "Bangkok, Thailand": { lat: 13.7563, lng: 100.5018 },
  "Toronto, Canada": { lat: 43.6629, lng: -79.3957 },
  "São Paulo, Brazil": { lat: -23.5505, lng: -46.6333 },
  "Mumbai, India": { lat: 19.0760, lng: 72.8777 }
};