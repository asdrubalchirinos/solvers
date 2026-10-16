import Link from "next/link";
import { notFound } from "next/navigation";
import { AppCard } from "@/components/AppCard";
import { CommentForm, CommentList } from "@/components/CommentForm";
import { Shell } from "@/components/Shell";
import { getAppById, getComments, getCurrentProfile, getPreviousApps } from "@/lib/queries";
import { timeAgo } from "@/lib/utils";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentProfile();
  const post = await getAppById(id, me?.id);
  if (!post) notFound();

  const [comments, previous] = await Promise.all([
    getComments(post.id),
    getPreviousApps(post.user_id, post.repo_url, post.created_at, post.id),
  ]);

  return (
    <Shell me={me} title="Publicación" backHref="/">
      <AppCard post={post} me={me} />

      <section id="comentarios">
        <h2 className="border-b border-neutral-200 px-4 py-3 text-lg font-bold">Comentarios</h2>
        {me ? (
          <CommentForm appId={post.id} />
        ) : (
          <p className="border-b border-neutral-200 px-4 py-4 text-sm text-neutral-600">
            <Link href={`/login?siguiente=/p/${post.id}`} className="font-bold text-sky-600">
              Inicia sesión
            </Link>{" "}
            para comentar.
          </p>
        )}
        <CommentList comments={comments} me={me} appId={post.id} />
      </section>

      <section id="anteriores" className="border-t border-neutral-200">
        <h2 className="px-4 py-3 text-lg font-bold">Publicaciones anteriores de esta app</h2>
        {previous.length === 0 ? (
          <p className="px-4 pb-8 text-sm text-neutral-500">
            Esta es la primera publicación de esta app.
          </p>
        ) : (
          <ul>
            {previous.map((item) => (
              <li key={item.id} className="border-t border-neutral-100">
                <Link href={`/p/${item.id}`} className="block px-4 py-3 hover:bg-neutral-50">
                  <p className="text-sm text-neutral-500">{timeAgo(item.created_at)}</p>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-[15px] text-neutral-700">“{item.motivo}”</p>
                  {item.texto && (
                    <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{item.texto}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Shell>
  );
}
