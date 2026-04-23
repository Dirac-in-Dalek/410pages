export type ProfileSessionLike = {
  user?: {
    id?: string;
    user_metadata?: {
      username?: unknown;
    };
  };
} | null;

export type ProfileRecord = {
  username?: unknown;
  avatar_path?: string | null;
  avatar_url?: string | null;
} | null;

export type ProfileSnapshot = {
  username: string;
  avatarUrl: string | null;
};

export type DisplayNameSaveResult = {
  ok: boolean;
  changed: boolean;
  username: string | null;
};
