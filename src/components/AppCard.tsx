import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { LikeButton } from "@/components/LikeButton";
import { PostMenu } from "@/components/PostMenu";
import { TextWithLinks } from "@/components/TextWithLinks";
import type { AppPost, Profile } from "@/lib/types";
import { repoDomain, timeAgo } from "@/lib/utils";

export function AppCard({
  post,
  me,
  compact = false,
}: {
  post: AppPost;
  me: Profile | null;
  compact?: boolean;
}) {
  const isOwner = me?.id === post.user_id;

  return (
    <article className="border-b border-neutral-200 px-4 py-3 hover:bg-neutral-50/80">
      <div className="flex gap-3">
        <Link href={`/${post.author.username}`} className="shrink-0">
          <Avatar name={post.author.display_name} url={post.author.avatar_url} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-[15px] leading-5">
              <Link href={`/${post.author.username}`} className="font-bold hover:underline">
                {post.author.display_name}
              </Link>{" "}
              <Link
                href={`/${post.author.username}`}
                className="text-neutral-500 hover:underline"
              >
                @{post.author.username}
              </Link>
              <span className="text-neutral-500"> · {timeAgo(post.created_at)}</span>
            </div>
            <PostMenu appId={post.id} isOwner={isOwner} canReport={Boolean(me) && !isOwner} />
          </div>

          {post.texto && (
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-5">
              <TextWithLinks text={post.texto} />
            </p>
          )}

          <Link href={`/p/${post.id}`} className="mt-2 block">
            <h2 className="text-xl font-bold tracking-tight">{post.name}</h2>
            <p className="mt-1 text-[17px] leading-6 text-neutral-800">
              “{post.motivo}”
            </p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.screenshot_url}
                alt={`Captura de ${post.name}`}
                className="aspect-video w-full object-cover"
              />
            </div>
          </Link>

          {post.tags.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-x-3 text-[15px] text-sky-600">
              {post.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </p>
          )}

          {post.previous_count > 0 && (
            <Link
              href={`/p/${post.id}#anteriores`}
              className="mt-2 inline-block text-[13px] text-neutral-500 hover:underline"
            >
              ↺ Publicada antes · ver {post.previous_count}{" "}
              {post.previous_count === 1 ? "anterior" : "anteriores"}
            </Link>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LikeButton
                appId={post.id}
                liked={post.liked}
                count={post.likes_count}
                canLike={Boolean(me)}
              />
              <Link
                href={`/p/${post.id}#comentarios`}
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] text-neutral-500 hover:bg-sky-50 hover:text-sky-600"
              >
                <span aria-hidden>💬</span>
                <span>{post.comments_count}</span>
              </Link>
            </div>
            {!compact && (
              <a
                href={post.repo_url}
                target="_blank"
                rel="nofollow ugc noopener noreferrer"
                className="text-[12px] text-neutral-400 hover:underline"
                title={post.repo_url}
              >
                ↗ {repoDomain(post.repo_url)}
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
