"use client";

import { useState } from "react";
import { updateProfile } from "@/lib/actions";
import type { Profile } from "@/lib/types";
import { LIMITS } from "@/lib/utils";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [bio, setBio] = useState(profile.bio ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const result = await updateProfile(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 px-4 py-4">
      <label className="block">
        <span className="text-sm font-semibold">Nombre</span>
        <input
          name="display_name"
          required
          maxLength={LIMITS.displayName.max}
          defaultValue={profile.display_name}
          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-sky-500"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Usuario</span>
        <div className="mt-1 flex items-center rounded-xl border border-neutral-300 focus-within:border-sky-500">
          <span className="pl-3 text-neutral-400">@</span>
          <input
            name="username"
            required
            minLength={3}
            maxLength={20}
            defaultValue={profile.username}
            pattern="[a-z0-9_]+"
            className="w-full rounded-xl px-2 py-2 outline-none"
          />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Bio</span>
        <textarea
          name="bio"
          maxLength={LIMITS.bio.max}
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-sky-500"
        />
        <span className="text-xs text-neutral-500">
          {bio.length}/{LIMITS.bio.max}
        </span>
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Foto (opcional)</span>
        <input
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="mt-1 block w-full text-sm"
        />
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar perfil"}
      </button>
    </form>
  );
}
