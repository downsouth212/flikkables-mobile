import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const ownerships = await base44.asServiceRole.entities.CountryOwnership.filter({});
    
    let individualRewards = 0;
    let guildRewards = 0;

    for (const ownership of ownerships) {
      // Award stamps based on country size/flikkable count
      const baseReward = 10;
      const sizeBonus = Math.floor(ownership.total_flikkables_in_country / 5) * 5; // 5 stamps per 5 flikkables
      const totalReward = baseReward + sizeBonus;

      if (ownership.owner_type === 'individual') {
        // Award to individual
        const users = await base44.asServiceRole.entities.User.filter({ email: ownership.owner_id });
        if (users.length > 0) {
          const currentStamps = users[0].passport_stamps || 0;
          await base44.asServiceRole.entities.User.update(users[0].id, {
            passport_stamps: currentStamps + totalReward
          });

          await base44.asServiceRole.entities.Notification.create({
            user_email: ownership.owner_id,
            type: 'stamps_earned',
            title: 'Country Benefits',
            message: `You earned ${totalReward} stamps from owning ${ownership.country_name}!`,
          });

          individualRewards++;
        }
      } else {
        // Award to guild treasury
        const guilds = await base44.asServiceRole.entities.Guild.filter({ id: ownership.owner_id });
        if (guilds.length > 0) {
          await base44.asServiceRole.entities.Guild.update(guilds[0].id, {
            treasury: (guilds[0].treasury || 0) + totalReward
          });

          await base44.asServiceRole.entities.GuildActivity.create({
            guild_id: ownership.owner_id,
            activity_type: 'donation',
            description: `Country ownership benefit: ${totalReward} stamps from ${ownership.country_name}`,
            metadata: JSON.stringify({ country: ownership.country_name, amount: totalReward })
          });

          guildRewards++;
        }
      }

      // Update benefits earned
      await base44.asServiceRole.entities.CountryOwnership.update(ownership.id, {
        benefits_earned: (ownership.benefits_earned || 0) + totalReward
      });
    }

    return Response.json({ 
      success: true, 
      individualRewards,
      guildRewards,
      totalCountries: ownerships.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});