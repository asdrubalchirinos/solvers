"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFollow } from "@/lib/actions";
import { cx } from "@/lib/utils";

export function FollowButton({
  userId,
  initialFollowing,
  canFollow,
}: {
  userId: string;
  initialFollowing: boolean;
  canFollow: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [following, setFollowing] = useState(initialFollowing);

  function onClick() {
    if (!canFollow) {
      router.push("/login");
      return;
    }
    const next = !following;
    setFollowing(next);
    start(async () => {
      const result = await toggleFollow(userId);
      if (result?.error) setFollowing(!next);
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cx(
        "rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
        following
          ? "border border-neutral-300 bg-white text-neutral-900 hover:border-rose-300 hover:text-rose-600"
          : "bg-neutral-900 text-white hover:bg-neutral-700",
      )}
    >
      {following ? "Siguiendo" : "Seguir"}
    </button>
  );
}
