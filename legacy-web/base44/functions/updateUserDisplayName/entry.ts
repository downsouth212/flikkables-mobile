import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userEmail, displayName } = await req.json();

    if (!userEmail || !displayName) {
      return Response.json({ error: 'Missing userEmail or displayName' }, { status: 400 });
    }

    // Update user data with display_name
    const updated = await base44.asServiceRole.entities.User.update(userEmail, {
      data: { display_name: displayName }
    });

    return Response.json({ success: true, user: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});