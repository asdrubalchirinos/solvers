"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleLike } from "@/lib/actions";
import { cx } from "@/lib/utils";

export function LikeButton({
  appId,
  liked,
  count,
  canLike,
}: {
  appId: string;
  liked: boolean;
  count: number;
  canLike: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [localLiked, setLocalLiked] = useState(liked);
  const [localCount, setLocalCount] = useState(count);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!canLike) {
      router.push("/login");
      return;
    }
    const next = !localLiked;
    setLocalLiked(next);
    setLocalCount((n) => n + (next ? 1 : -1));
    start(async () => {
      await toggleLike(appId);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] transition-colors",
        localLiked
          ? "text-rose-500 hover:bg-rose-50"
          : "text-neutral-500 hover:bg-rose-50 hover:text-rose-500",
      )}
      aria-label={localLiked ? "Quitar like" : "Dar like"}
    >
      <span aria-hidden>{localLiked ? "♥" : "♡"}</span>
      <span>{localCount}</span>
    </button>
  );
}
