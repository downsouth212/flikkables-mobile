import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { userEmail, questType } = await req.json();

  if (!userEmail || !questType) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];

  // Get or create today's quest
  let quest = await base44.asServiceRole.entities.DailyQuest.filter({
    user_email: userEmail,
    quest_date: today
  });

  if (quest.length === 0) {
    quest = await base44.asServiceRole.entities.DailyQuest.create({
      user_email: userEmail,
      quest_date: today,
      flikkables_flicked: questType === 'flicked' ? 1 : 0,
      flikkables_returned: questType === 'returned' ? 1 : 0,
      flikk_quest_claimed: false,
      return_quest_claimed: false
    });
  } else {
    quest = quest[0];
    const updateData = {};
    
    if (questType === 'flicked') {
      updateData.flikkables_flicked = (quest.flikkables_flicked || 0) + 1;
    } else if (questType === 'returned') {
      updateData.flikkables_returned = (quest.flikkables_returned || 0) + 1;
    }

    await base44.asServiceRole.entities.DailyQuest.update(quest.id, updateData);
  }

  return Response.json({ success: true });
});