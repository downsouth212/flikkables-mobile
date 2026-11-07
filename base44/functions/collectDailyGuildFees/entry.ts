import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    const guilds = await base44.asServiceRole.entities.Guild.filter({});
    
    let processed = 0;
    let failed = 0;

    for (const guild of guilds) {
      if (guild.daily_fee <= 0) continue;

      const members = await base44.asServiceRole.entities.GuildMember.filter({ 
        guild_id: guild.id 
      });

      for (const member of members) {
        // Skip if already paid today
        if (member.last_daily_fee_paid === today) continue;

        // Get user's current stamps
        const users = await base44.asServiceRole.entities.User.filter({ 
          email: member.user_email 
        });
        const userData = users[0];

        if (!userData) {
          failed++;
          continue;
        }

        const currentStamps = userData.passport_stamps || 0;

        if (currentStamps >= guild.daily_fee) {
          // Deduct fee and add to treasury
          await base44.asServiceRole.entities.User.update(userData.id, {
            passport_stamps: currentStamps - guild.daily_fee
          });

          await base44.asServiceRole.entities.Guild.update(guild.id, {
            treasury: (guild.treasury || 0) + guild.daily_fee
          });

          await base44.asServiceRole.entities.GuildMember.update(member.id, {
            last_daily_fee_paid: today
          });

          // Log activity
          await base44.asServiceRole.entities.GuildActivity.create({
            guild_id: guild.id,
            user_email: member.user_email,
            user_name: member.user_name,
            activity_type: 'donation',
            description: `Daily fee: ${guild.daily_fee} stamps`,
            metadata: JSON.stringify({ amount: guild.daily_fee, type: 'daily_fee' })
          });

          processed++;
        } else {
          // Not enough stamps - remove from guild
          await base44.asServiceRole.entities.GuildMember.delete(member.id);
          await base44.asServiceRole.entities.Guild.update(guild.id, {
            member_count: Math.max((guild.member_count || 1) - 1, 0)
          });

          // Notify user
          await base44.asServiceRole.entities.Notification.create({
            user_email: member.user_email,
            type: 'stamps_earned',
            title: 'Removed from Guild',
            message: `You were removed from ${guild.name} due to insufficient stamps for daily fee`,
          });

          failed++;
        }
      }
    }

    return Response.json({ 
      success: true, 
      processed,
      failed,
      date: today
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});