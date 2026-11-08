export interface Postcard {
  id: string;
  flikkable_id: string;
  user_id: string;
  user_name: string;
  owner_id: string | null;
  character_name: string;
  character_emoji: string;
  place: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  error: string | null;
  sent_to_owner: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface CharacterTemplate {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  error: string | null;
  is_published: boolean;
  is_locked: boolean;
  stamp_cost: number;
  created_at: string;
  unlocked?: boolean;
}
