"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addComment, deleteComment, reportComment } from "@/lib/actions";
import { Avatar } from "@/components/Avatar";
import type { CommentRow, Profile } from "@/lib/types";
import { LIMITS, timeAgo } from "@/lib/utils";

export function CommentForm({ appId }: { appId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData();
    fd.set("body", body);
    const result = await addComment(appId, fd);
    setPending(false);
    if (result?.error) setError(result.error);
    else {
      setBody("");
      setError(null);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="border-b border-neutral-200 px-4 py-3">
      <textarea
        required
        maxLength={LIMITS.comment.max}
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Escribe un comentario"
        className="w-full resize-none text-[15px] outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-neutral-500">
          {body.length}/{LIMITS.comment.max}
        </span>
        <button
          type="submit"
          disabled={pending || body.trim().length === 0}
          className="rounded-full bg-sky-500 px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50"
        >
          Comentar
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </form>
  );
}

export function CommentList({
  comments,
  me,
  appId,
}: {
  comments: CommentRow[];
  me: Profile | null;
  appId: string;
}) {
  const router = useRouter();

  if (comments.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-neutral-500">
        Todavía no hay comentarios. Sé el primero.
      </p>
    );
  }

  return (
    <ul>
      {comments.map((comment) => (
        <li key={comment.id} className="flex gap-3 border-b border-neutral-200 px-4 py-3">
          <Avatar
            name={comment.author.display_name}
            url={comment.author.avatar_url}
            size={36}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px]">
              <a href={`/${comment.author.username}`} className="font-bold hover:underline">
                {comment.author.display_name}
              </a>{" "}
              <span className="text-neutral-500">
                @{comment.author.username} · {timeAgo(comment.created_at)}
              </span>
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-[15px]">{comment.body}</p>
            <div className="mt-1 flex gap-3 text-xs text-neutral-500">
              {me && me.id !== comment.user_id && (
                <button
                  type="button"
                  className="hover:underline"
                  onClick={async () => {
                    const reason = prompt("¿Por qué reportas este comentario?");
                    if (!reason) return;
                    const result = await reportComment(comment.id, reason);
                    alert(result?.error ?? "Gracias. Revisaremos el reporte.");
                  }}
                >
                  Reportar
                </button>
              )}
              {me?.id === comment.user_id && (
                <button
                  type="button"
                  className="text-rose-600 hover:underline"
                  onClick={async () => {
                    if (!confirm("¿Borrar este comentario?")) return;
                    await deleteComment(comment.id, appId);
                    router.refresh();
                  }}
                >
                  Borrar
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
