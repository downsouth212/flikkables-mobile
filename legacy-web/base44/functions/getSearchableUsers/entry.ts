import { base44 } from '@/api/base44Client';

export async function getSearchableUsers(currentUserEmail) {
  try {
    // Get all users
    const allUsers = await base44.entities.User.list();
    
    // Get current user's existing friendships
    const friendships = await base44.entities.Friend.filter({});
    
    // Create a set of users the current user has existing relationships with
    const existingFriendships = new Set();
    friendships.forEach(f => {
      if (f.user_email === currentUserEmail) {
        existingFriendships.add(f.friend_email);
      } else if (f.friend_email === currentUserEmail) {
        existingFriendships.add(f.user_email);
      }
    });
    
    // Filter users: exclude current user and users with pending/accepted requests
    return allUsers
      .filter(u => u.email !== currentUserEmail && !existingFriendships.has(u.email))
      .map(u => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name || u.full_name,
      }));
  } catch (error) {
    console.error('Error getting searchable users:', error);
    return [];
  }
}