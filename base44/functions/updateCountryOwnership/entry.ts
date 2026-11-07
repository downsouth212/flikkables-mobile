import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { countryName, countryCode } = await req.json();

    if (!countryName) {
      return Response.json({ error: 'Country name required' }, { status: 400 });
    }

    // Get all flikkables currently landed in this country
    const flikkables = await base44.asServiceRole.entities.Flikkable.filter({
      status: 'landed'
    });

    const countryFlikkables = flikkables.filter(f => 
      f.current_location_name?.includes(countryName)
    );

    if (countryFlikkables.length === 0) {
      // No flikkables in country - remove ownership
      const existing = await base44.asServiceRole.entities.CountryOwnership.filter({ country_name: countryName });
      for (const ownership of existing) {
        await base44.asServiceRole.entities.CountryOwnership.delete(ownership.id);
      }
      return Response.json({ country: countryName, owner: null });
    }

    // Get all guild members to map users to guilds
    const allGuildMembers = await base44.asServiceRole.entities.GuildMember.filter({});
    const userToGuild = {};
    allGuildMembers.forEach(m => {
      userToGuild[m.user_email] = { guild_id: m.guild_id, guild_name: m.guild_name };
    });

    // Count by individual and guild
    const individualCounts = {};
    const guildCounts = {};

    countryFlikkables.forEach(f => {
      const ownerEmail = f.owner_email;
      
      // Individual count
      individualCounts[ownerEmail] = (individualCounts[ownerEmail] || 0) + 1;
      
      // Guild count
      const guild = userToGuild[ownerEmail];
      if (guild) {
        guildCounts[guild.guild_id] = {
          count: (guildCounts[guild.guild_id]?.count || 0) + 1,
          name: guild.guild_name
        };
      }
    });

    // Find top individual
    let topIndividual = null;
    let topIndividualCount = 0;
    for (const [email, count] of Object.entries(individualCounts)) {
      if (count > topIndividualCount) {
        topIndividualCount = count;
        topIndividual = email;
      }
    }

    // Find top guild
    let topGuild = null;
    let topGuildCount = 0;
    let topGuildName = '';
    for (const [guildId, data] of Object.entries(guildCounts)) {
      if (data.count > topGuildCount) {
        topGuildCount = data.count;
        topGuild = guildId;
        topGuildName = data.name;
      }
    }

    // Determine overall winner (guild takes precedence if tied)
    let ownerType, ownerId, ownerName, count;
    if (topGuildCount >= topIndividualCount && topGuild) {
      ownerType = 'guild';
      ownerId = topGuild;
      ownerName = topGuildName;
      count = topGuildCount;
    } else if (topIndividual) {
      const users = await base44.asServiceRole.entities.User.filter({ email: topIndividual });
      ownerType = 'individual';
      ownerId = topIndividual;
      ownerName = users[0]?.display_name || users[0]?.full_name || topIndividual;
      count = topIndividualCount;
    } else {
      return Response.json({ country: countryName, owner: null });
    }

    // Update or create ownership
    const existing = await base44.asServiceRole.entities.CountryOwnership.filter({ country_name: countryName });
    
    if (existing.length > 0) {
      const current = existing[0];
      
      // Check if owner changed
      if (current.owner_id !== ownerId || current.owner_type !== ownerType) {
        // Ownership changed!
        await base44.asServiceRole.entities.CountryOwnership.update(current.id, {
          owner_type: ownerType,
          owner_id: ownerId,
          owner_name: ownerName,
          flikkable_count: count,
          claimed_date: new Date().toISOString(),
          total_flikkables_in_country: countryFlikkables.length
        });

        // Notify new owner
        if (ownerType === 'individual') {
          await base44.asServiceRole.entities.Notification.create({
            user_email: ownerId,
            type: 'achievement',
            title: '🏆 Country Claimed!',
            message: `You now own ${countryName} with ${count} flikkables!`,
          });
        } else {
          // Notify guild members
          const guildMembers = allGuildMembers.filter(m => m.guild_id === ownerId);
          for (const member of guildMembers.slice(0, 20)) {
            await base44.asServiceRole.entities.Notification.create({
              user_email: member.user_email,
              type: 'achievement',
              title: '🏆 Guild Claimed Country!',
              message: `${ownerName} now owns ${countryName}!`,
            });
          }
        }

        // Log activity if guild
        if (ownerType === 'guild') {
          await base44.asServiceRole.entities.GuildActivity.create({
            guild_id: ownerId,
            activity_type: 'achievement',
            description: `Claimed ownership of ${countryName}!`,
            metadata: JSON.stringify({ country: countryName, count })
          });
        }
      } else {
        // Just update counts
        await base44.asServiceRole.entities.CountryOwnership.update(current.id, {
          flikkable_count: count,
          total_flikkables_in_country: countryFlikkables.length
        });
      }
    } else {
      // New ownership
      await base44.asServiceRole.entities.CountryOwnership.create({
        country_name: countryName,
        country_code: countryCode || '',
        owner_type: ownerType,
        owner_id: ownerId,
        owner_name: ownerName,
        flikkable_count: count,
        claimed_date: new Date().toISOString(),
        total_flikkables_in_country: countryFlikkables.length
      });

      // Notify
      if (ownerType === 'individual') {
        await base44.asServiceRole.entities.Notification.create({
          user_email: ownerId,
          type: 'achievement',
          title: '🏆 Country Claimed!',
          message: `You now own ${countryName} with ${count} flikkables!`,
        });
      }
    }

    return Response.json({ 
      success: true, 
      country: countryName,
      owner: { type: ownerType, id: ownerId, name: ownerName, count }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});