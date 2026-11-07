import { base44 } from '@/api/base44Client';
import { QUEST_CONFIG, CAPITAL_CITIES } from './QuestConfig';

export class QuestTracker {
  static async updateQuestProgress(userEmail, questId, progressData) {
    try {
      // Get or create quest
      const quests = await base44.entities.Quest.filter({
        user_email: userEmail,
        quest_id: questId
      });

      let quest = quests[0];
      const questConfig = QUEST_CONFIG[questId];

      if (!quest) {
        quest = await base44.entities.Quest.create({
          user_email: userEmail,
          quest_id: questId,
          target: questConfig.target,
          progress: 0,
          completed: false,
          trophy_claimed: false
        });
      }

      // Update progress
      const newProgress = Math.min(
        quest.progress + progressData.increment,
        questConfig.target
      );

      const isCompleted = newProgress >= questConfig.target;

      const updated = await base44.entities.Quest.update(quest.id, {
        progress: newProgress,
        completed: isCompleted,
        trophy_claimed: isCompleted && quest.completed ? true : quest.trophy_claimed
      });

      // If newly completed, create trophy
      if (isCompleted && !quest.completed) {
        await base44.entities.Trophy.create({
          user_email: userEmail,
          quest_id: questId,
          name: questConfig.name,
          description: questConfig.description,
          icon: questConfig.icon,
          rarity: questConfig.rarity,
          stamps_value: 100
        });
      }

      return updated;
    } catch (error) {
      console.error('Error updating quest:', error);
    }
  }

  static async checkAndUpdateQuests(userEmail, character, eventType) {
    if (!eventType) return;

    try {
      if (eventType === 'flicked') {
        // Speed Flicker - track daily flicks
        await this.updateQuestProgress(userEmail, 'speed_flicker', { increment: 1 });
      }

      if (eventType === 'landed') {
        // Check if landed in capital city
        const isCapital = this.isCapitalCity(character.current_location_name);
        if (isCapital) {
          await this.updateQuestProgress(userEmail, 'lucky_landing', { increment: 1 });
        }

        // Check continent
        const continent = this.getContinent(character.current_lat, character.current_lng);
        if (continent) {
          await this.updateQuestProgress(userEmail, 'continental_tour', { increment: 1 });
        }

        // Check distance
        if (character.total_distance_traveled >= 5000) {
          const quests = await base44.entities.Quest.filter({
            user_email: userEmail,
            quest_id: 'distance_champion'
          });
          if (!quests[0] || !quests[0].completed) {
            await this.updateQuestProgress(userEmail, 'distance_champion', { increment: 5000 });
          }
        }
      }

      if (eventType === 'returned') {
        // Homecoming
        await this.updateQuestProgress(userEmail, 'homecoming', { increment: 1 });
      }

      if (eventType === 'picked_up') {
        // Social Butterfly
        await this.updateQuestProgress(userEmail, 'social_butterfly', { increment: 1 });
      }

      if (eventType === 'rare_encounter') {
        // Check if picked up legendary
        if (character.rarity === 'legendary') {
          await this.updateQuestProgress(userEmail, 'rare_encounter', { increment: 1 });
        }
      }
    } catch (error) {
      console.error('Error checking quests:', error);
    }
  }

  static isCapitalCity(locationName) {
    if (!locationName) return false;
    return Object.keys(CAPITAL_CITIES).some(capital =>
      locationName.toLowerCase().includes(capital.split(',')[0].toLowerCase())
    );
  }

  static getContinent(lat, lng) {
    // Simple continent detection based on coordinates
    if (lat > 15 && lat < 55 && lng > -10 && lng < 40) return 'europe';
    if (lat > -35 && lat < 37 && lng > -20 && lng < 55) return 'africa';
    if (lat > 10 && lat < 55 && lng > 60 && lng < 140) return 'asia';
    if (lat > -50 && lat < 0 && lng > 113 && lng < 180) return 'australia';
    if (lat > -56 && lat < 13 && lng > -82 && lng < -35) return 'south_america';
    if (lat > 15 && lat < 72 && lng > -170 && lng < -55) return 'north_america';
    return null;
  }
}