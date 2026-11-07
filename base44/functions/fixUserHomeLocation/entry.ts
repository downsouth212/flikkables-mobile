import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userEmail, lat, lng } = await req.json();

    const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];
    const updatedData = {
      ...targetUser.data,
      home_location_lat: lat,
      home_location_lng: lng,
    };

    await base44.asServiceRole.entities.User.update(targetUser.id, { data: updatedData });

    return Response.json({ success: true, updated: { lat, lng } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});