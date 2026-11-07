import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all moods
    const moods = await base44.asServiceRole.entities.CharacterMood.list('-created_date', 1000);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const mood of moods) {
      const lastFedDate = new Date(mood.last_fed_date);
      let newLevel = mood.happiness_level;

      // Check if fed in last 24 hours
      if (lastFedDate > oneDayAgo) {
        // Fed recently, increase happiness (max 5)
        newLevel = Math.min(mood.happiness_level + 1, 5);
      } else {
        // Not fed, decrease happiness (min 1)
        newLevel = Math.max(mood.happiness_level - 1, 1);
      }

      // Update mood
      await base44.asServiceRole.entities.CharacterMood.update(mood.id, {
        happiness_level: newLevel
      });

      // If happiness drops to 2 AND character is in airport, return to garden
      if (newLevel === 2) {
        const character = await base44.asServiceRole.entities.Character.read(mood.character_id);
        if (character && character.status === 'traveling') {
          // Return to home
          await base44.asServiceRole.entities.Character.update(mood.character_id, {
            status: 'home',
            current_lat: character.home_lat,
            current_lng: character.home_lng,
            current_location_name: 'Home'
          });

          // Create notification
          await base44.asServiceRole.entities.Notification.create({
            user_email: character.owner_email,
            type: 'character_returned',
            title: 'Character Returned Home',
            message: `${character.name} was feeling sad and returned home unhappy. Feed them to cheer them up!`,
            metadata: JSON.stringify({ character_id: mood.character_id, character_name: character.name })
          });
        }
      }
    }

    return Response.json({ success: true, updated: moods.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});