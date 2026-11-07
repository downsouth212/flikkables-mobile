// AI logic for battle moves
export const AI_DIFFICULTY = {
  easy: { name: 'Easy AI', successRate: 0.5, speedMultiplier: 1.5, smartness: 0.3 },
  medium: { name: 'Medium AI', successRate: 0.65, speedMultiplier: 1.0, smartness: 0.6 },
  hard: { name: 'Hard AI', successRate: 0.8, speedMultiplier: 0.7, smartness: 0.9 }
};

const majorCities = [
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 }
];

export const aiFlickDuel = (difficulty = 'medium', targetCity) => {
  const config = AI_DIFFICULTY[difficulty];
  const success = Math.random() < config.successRate;
  const distance = success ? Math.floor(Math.random() * 5000 * config.smartness) + 100 : 0;
  return { success, distance };
};

export const aiDistanceDerby = (difficulty = 'medium') => {
  const config = AI_DIFFICULTY[difficulty];
  const baseDistance = Math.floor(Math.random() * 10000) + 100;
  return Math.floor(baseDistance * config.smartness);
};

export const aiHeadToHead = (difficulty = 'medium', aiCharacter) => {
  const config = AI_DIFFICULTY[difficulty];
  const rarityMult = {
    common: 1,
    uncommon: 1.1,
    rare: 1.2,
    epic: 1.4,
    legendary: 1.5
  }[aiCharacter?.rarity] || 1;
  
  const baseDistance = Math.floor(Math.random() * 5000);
  return Math.floor(baseDistance * rarityMult * config.smartness);
};

export const aiPickupRace = (difficulty = 'medium') => {
  const config = AI_DIFFICULTY[difficulty];
  // AI takes longer to "travel" to pickup location
  const timeSeconds = Math.floor(Math.random() * 30) + (10 * config.speedMultiplier);
  return timeSeconds;
};

export const aiTimedChallenge = (difficulty = 'medium') => {
  const config = AI_DIFFICULTY[difficulty];
  const completed = Math.random() < config.successRate;
  const time = completed ? Math.floor(Math.random() * 50) + 20 : null;
  return { completed, time };
};

export const aiLocationChain = (difficulty = 'medium') => {
  const config = AI_DIFFICULTY[difficulty];
  // AI randomly selects cities
  const shuffled = [...majorCities].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
};

export const aiSurvivalSprint = (difficulty = 'medium') => {
  const config = AI_DIFFICULTY[difficulty];
  const roundsSurvived = Math.floor(Math.random() * 10 * config.smartness) + 1;
  return roundsSurvived;
};

export const aiLandmarkHunt = (difficulty = 'medium') => {
  const config = AI_DIFFICULTY[difficulty];
  const landmarksFound = Math.floor(Math.random() * 5 * config.smartness) + 1;
  return landmarksFound;
};

export const getAIDelay = (difficulty = 'medium') => {
  const config = AI_DIFFICULTY[difficulty];
  // AI responds after a delay (in seconds)
  return Math.floor(Math.random() * 3 * config.speedMultiplier) + 1;
};