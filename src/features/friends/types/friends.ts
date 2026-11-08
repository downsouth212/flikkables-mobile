export interface FriendRow {
  id: string;
  user_id: string;
  display_name: string;
  home_name: string;
  created_at: string;
}

export interface FriendsList {
  friends: FriendRow[];
  incoming: FriendRow[];
  sent: FriendRow[];
  blocked: FriendRow[];
  allow_friend_requests: boolean;
}

export interface FriendSearchResult {
  user_id: string;
  display_name: string;
  home_name: string;
}

export type FriendRequestStatus = 'pending' | 'accepted';
