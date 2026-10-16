import { createClient } from "@/lib/supabase/server";
import type { AppPost, CommentRow, Profile, ProfileStats } from "@/lib/types";

type AppRow = {
  id: string;
  user_id: string;
  name: string;
  screenshot_url: string;
  motivo: string;
  texto: string | null;
  repo_url: string;
  created_at: string;
  updated_at: string;
  likes: Array<{ count: number }> | null;
  comments: Array<{ count: number }> | null;
  author: Profile | Profile[] | null;
  app_tags: Array<{ tags: { name: string } | { name: string }[] | null }> | null;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapApp(
  row: AppRow,
  likedIds: Set<string>,
  previousCounts: Map<string, number>,
): AppPost | null {
  const author = asOne(row.author);
  if (!author) return null;
  const tags = (row.app_tags ?? [])
    .map((item) => asOne(item.tags)?.name)
    .filter((name): name is string => Boolean(name));
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    screenshot_url: row.screenshot_url,
    motivo: row.motivo,
    texto: row.texto,
    repo_url: row.repo_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    likes_count: row.likes?.[0]?.count ?? 0,
    comments_count: row.comments?.[0]?.count ?? 0,
    previous_count: previousCounts.get(row.id) ?? 0,
    author,
    tags,
    liked: likedIds.has(row.id),
  };
}

const APP_SELECT = `
  *,
  author:profiles!user_id(*),
  app_tags(tags(name)),
  likes(count),
  comments(count)
`;

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return data as Profile | null;
}

export async function getProfileByUsername(username: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  return data as Profile | null;
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = await createClient();
  const [apps, followers, following] = await Promise.all([
    supabase
      .from("apps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);
  return {
    apps: apps.count ?? 0,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

export async function isFollowing(followerId: string, followingId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return Boolean(data);
}

async function likedSet(userId: string | undefined, appIds: string[]) {
  if (!userId || appIds.length === 0) return new Set<string>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("likes")
    .select("app_id")
    .eq("user_id", userId)
    .in("app_id", appIds);
  return new Set((data ?? []).map((row) => row.app_id as string));
}

async function previousCountMap(rows: AppRow[]) {
  const map = new Map<string, number>();
  if (rows.length === 0) return map;
  const supabase = await createClient();
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const repoUrls = [...new Set(rows.map((r) => r.repo_url))];
  const { data } = await supabase
    .from("apps")
    .select("id, user_id, repo_url, created_at")
    .in("user_id", userIds)
    .in("repo_url", repoUrls);
  const siblings = data ?? [];
  for (const row of rows) {
    const count = siblings.filter(
      (s) =>
        s.user_id === row.user_id &&
        s.repo_url === row.repo_url &&
        s.created_at < row.created_at,
    ).length;
    map.set(row.id, count);
  }
  return map;
}

async function hydrateApps(rows: AppRow[], viewerId?: string) {
  const [liked, previous] = await Promise.all([
    likedSet(
      viewerId,
      rows.map((row) => row.id),
    ),
    previousCountMap(rows),
  ]);
  return rows.map((row) => mapApp(row, liked, previous)).filter((x): x is AppPost => Boolean(x));
}

export async function getFeed(tab: "todos" | "siguiendo", viewerId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("apps")
    .select(APP_SELECT)
    .order("created_at", { ascending: false })
    .limit(50);

  if (tab === "siguiendo") {
    if (!viewerId) return [];
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewerId);
    const ids = (follows ?? []).map((f) => f.following_id as string);
    if (ids.length === 0) return [];
    query = query.in("user_id", ids);
  }

  const { data, error } = await query;
  if (error) throw error;
  return hydrateApps((data ?? []) as unknown as AppRow[], viewerId);
}

export async function getAppById(id: string, viewerId?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("apps")
    .select(APP_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [post] = await hydrateApps([data as unknown as AppRow], viewerId);
  return post ?? null;
}

export async function getPreviousApps(
  userId: string,
  repoUrl: string,
  before: string,
  excludeId: string,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("apps")
    .select("id, name, motivo, created_at, texto")
    .eq("user_id", userId)
    .eq("repo_url", repoUrl)
    .neq("id", excludeId)
    .lt("created_at", before)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as Array<{
    id: string;
    name: string;
    motivo: string;
    created_at: string;
    texto: string | null;
  }>;
}

export async function getProfileApps(userId: string, viewerId?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("apps")
    .select(APP_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return hydrateApps((data ?? []) as unknown as AppRow[], viewerId);
}

export async function getComments(appId: string): Promise<CommentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:profiles!user_id(*)")
    .eq("app_id", appId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Array<CommentRow & { author: Profile | Profile[] }>)
    .map((row) => {
      const author = asOne(row.author);
      if (!author) return null;
      return { ...row, author };
    })
    .filter((x): x is CommentRow => Boolean(x));
}
