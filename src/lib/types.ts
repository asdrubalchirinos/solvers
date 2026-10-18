export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type AppPost = {
  id: string;
  user_id: string;
  name: string;
  screenshot_url: string;
  motivo: string;
  texto: string | null;
  repo_url: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
  previous_count: number;
  author: Profile;
  tags: string[];
  liked: boolean;
};

export type CommentRow = {
  id: string;
  app_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: Profile;
};

export type ProfileStats = {
  apps: number;
  followers: number;
  following: number;
};
