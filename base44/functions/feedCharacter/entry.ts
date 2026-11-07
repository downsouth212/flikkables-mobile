import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { character_id } = body;

    if (!character_id) {
      return Response.json({ error: 'Missing character_id' }, { status: 400 });
    }

    // Check if user has stamps
    if (!user.passport_stamps || user.passport_stamps < 1) {
      return Response.json({ error: 'Insufficient stamps' }, { status: 400 });
    }

    // Deduct 1 stamp
    await base44.auth.updateMe({
      passport_stamps: (user.passport_stamps || 0) - 1
    });

    // Update mood - set happiness to 5 and update last_fed_date
    const moods = await base44.entities.CharacterMood.filter(
      { character_id },
      '-created_date',
      1
    );

    const mood = moods[0];
    if (mood) {
      await base44.entities.CharacterMood.update(mood.id, {
        happiness_level: 5,
        last_fed_date: new Date().toISOString()
      });
    } else {
      // Create mood if it doesn't exist
      const character = await base44.entities.Character.list();
      const char = character.find(c => c.id === character_id);
      if (char) {
        await base44.entities.CharacterMood.create({
          character_id,
          character_name: char.name,
          owner_email: user.email,
          happiness_level: 5,
          last_fed_date: new Date().toISOString()
        });
      }
    }

    return Response.json({ success: true, stampsRemaining: user.passport_stamps - 1 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});