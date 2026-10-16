import Link from "next/link";
import { notFound } from "next/navigation";
import { AppCard } from "@/components/AppCard";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { Shell } from "@/components/Shell";
import {
  getCurrentProfile,
  getProfileApps,
  getProfileByUsername,
  getProfileStats,
  isFollowing,
} from "@/lib/queries";
import { RESERVED_USERNAMES } from "@/lib/utils";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) notFound();

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const me = await getCurrentProfile();
  const [stats, posts, following] = await Promise.all([
    getProfileStats(profile.id),
    getProfileApps(profile.id, me?.id),
    me && me.id !== profile.id ? isFollowing(me.id, profile.id) : Promise.resolve(false),
  ]);

  return (
    <Shell me={me} title={profile.display_name} backHref="/">
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <Avatar name={profile.display_name} url={profile.avatar_url} size={72} />
          {me?.id === profile.id ? (
            <Link
              href="/ajustes"
              className="rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-bold hover:bg-neutral-50"
            >
              Editar perfil
            </Link>
          ) : (
            <FollowButton
              userId={profile.id}
              initialFollowing={following}
              canFollow={Boolean(me)}
            />
          )}
        </div>
        <h1 className="mt-3 text-xl font-black">{profile.display_name}</h1>
        <p className="text-neutral-500">@{profile.username}</p>
        {profile.bio && <p className="mt-3 whitespace-pre-wrap text-[15px]">{profile.bio}</p>}
        <p className="mt-3 text-sm text-neutral-600">
          <strong className="text-neutral-900">{stats.apps}</strong> apps ·{" "}
          <strong className="text-neutral-900">{stats.followers}</strong> seguidores ·{" "}
          <strong className="text-neutral-900">{stats.following}</strong> siguiendo
        </p>
      </div>
      <h2 className="border-y border-neutral-200 px-4 py-3 text-lg font-bold">Apps</h2>
      {posts.length === 0 ? (
        <p className="px-4 py-10 text-center text-neutral-500">Todavía no ha publicado apps.</p>
      ) : (
        posts.map((post) => <AppCard key={post.id} post={post} me={me} />)
      )}
    </Shell>
  );
}
