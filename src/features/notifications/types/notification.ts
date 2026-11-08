export interface GameNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  related_user_name: string | null;
  read: boolean;
  created_at: string;
}
