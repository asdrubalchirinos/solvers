"use client";

import { useState } from "react";
import { editApp } from "@/lib/actions";
import type { AppPost } from "@/lib/types";
import { LIMITS, repoDomain } from "@/lib/utils";

export function EditForm({ post }: { post: AppPost }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [motivo, setMotivo] = useState(post.motivo);
  const [texto, setTexto] = useState(post.texto ?? "");
  const [tags, setTags] = useState(post.tags);
  const [tagDraft, setTagDraft] = useState("");

  function addTag() {
    const value = tagDraft.trim().toLowerCase().replace(/^#/, "");
    if (!value) return;
    if (tags.length >= LIMITS.tags.max) {
      setError("Máximo 3 tags.");
      return;
    }
    if (!/^[a-z0-9áéíóúüñ]{2,20}$/.test(value)) {
      setError("Cada tag: 2–20 letras o números, sin espacios.");
      return;
    }
    if (!tags.includes(value)) setTags([...tags, value]);
    setTagDraft("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData();
    fd.set("motivo", motivo);
    fd.set("texto", texto);
    fd.set("tags", tags.join(","));
    const result = await editApp(post.id, fd);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 px-4 py-4">
      <p className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
        Solo puedes cambiar motivo, texto y tags. El nombre (
        <strong>{post.name}</strong>), la captura y el repo (
        {repoDomain(post.repo_url)}) quedan fijos.
      </p>

      <label className="block">
        <span className="text-sm font-semibold">Motivo</span>
        <textarea
          required
          minLength={LIMITS.motivo.min}
          maxLength={LIMITS.motivo.max}
          rows={3}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-sky-500"
        />
        <span className="text-xs text-neutral-500">
          {motivo.length}/{LIMITS.motivo.max}
        </span>
      </label>

      <div>
        <span className="text-sm font-semibold">Tags</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-full bg-sky-50 px-3 py-1 text-sm text-sky-700"
              onClick={() => setTags(tags.filter((t) => t !== tag))}
            >
              #{tag} ×
            </button>
          ))}
        </div>
        {tags.length < LIMITS.tags.max && (
          <div className="mt-2 flex gap-2">
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={addTag}
              className="rounded-full border border-neutral-300 px-3 text-sm"
            >
              Añadir
            </button>
          </div>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-semibold">Texto</span>
        <textarea
          maxLength={LIMITS.texto.max}
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-sky-500"
        />
        <span className="text-xs text-neutral-500">
          {texto.length}/{LIMITS.texto.max}
        </span>
      </label>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
