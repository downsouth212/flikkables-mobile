import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userEmail, searchQuery } = await req.json();
    
    // Get all users with elevated permissions
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Get friendships for current user
    const friendships = await base44.asServiceRole.entities.Friend.filter({});
    
    // Get blocked users (both ways)
    const blockedUsers = await base44.asServiceRole.entities.BlockedUser.filter({});
    
    // Create set of friend emails
    const friendEmails = new Set();
    friendships.forEach(f => {
      if (f.user_email === userEmail) friendEmails.add(f.friend_email);
      if (f.friend_email === userEmail) friendEmails.add(f.user_email);
    });
    
    // Create set of blocked emails (users blocked by current user or who blocked current user)
    const blockedEmails = new Set();
    blockedUsers.forEach(b => {
      if (b.blocker_email === userEmail) blockedEmails.add(b.blocked_email);
      if (b.blocked_email === userEmail) blockedEmails.add(b.blocker_email);
    });
    
    // Filter users: exclude self, exclude friends, exclude blocked, filter by display_name
    const filtered = allUsers
      .filter(user => user.email !== userEmail)
      .filter(user => !friendEmails.has(user.email))
      .filter(user => !blockedEmails.has(user.email))
      .filter(user => 
        user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map(user => ({
        email: user.email,
        display_name: user.display_name
      }));
    
    return Response.json({ users: filtered });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});