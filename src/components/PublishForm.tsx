"use client";

import { useState } from "react";
import { publishApp } from "@/lib/actions";
import { LIMITS } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";

async function cropTo16x9(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const target = 16 / 9;
  const ratio = bitmap.width / bitmap.height;
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (ratio > target) {
    sw = bitmap.height * target;
    sx = (bitmap.width - sw) / 2;
  } else {
    sh = bitmap.width / target;
    sy = (bitmap.height - sh) / 2;
  }
  const outW = Math.min(1280, Math.round(sw));
  const outH = Math.round(outW / target);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo recortar la imagen.");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);

  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo recortar la imagen."))),
      type,
      0.86,
    );
  });
  if (blob.size > LIMITS.screenshotBytes) {
    throw new Error("La captura recortada sigue pesando más de 2 MB. Usa otra imagen.");
  }
  const name = file.name.replace(/\.[^.]+$/, type === "image/png" ? ".png" : ".jpg");
  return new File([blob], name, { type });
}

export function PublishForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cropped, setCropped] = useState<File | null>(null);
  const [motivo, setMotivo] = useState("");
  const [texto, setTexto] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");

  async function onFile(file: File | undefined) {
    setError(null);
    setPreview(null);
    setCropped(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("La captura debe ser JPG, PNG o WebP.");
      return;
    }
    if (file.size > LIMITS.screenshotBytes) {
      setError("La captura no puede pesar más de 2 MB.");
      return;
    }
    try {
      const next = await cropTo16x9(file);
      setCropped(next);
      setPreview(URL.createObjectURL(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer la imagen.");
    }
  }

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
    if (tags.includes(value)) {
      setTagDraft("");
      return;
    }
    setTags([...tags, value]);
    setTagDraft("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!cropped) {
      setError("La captura es obligatoria.");
      return;
    }
    setPending(true);
    const fd = new FormData(e.currentTarget);
    fd.set("screenshot", cropped);
    fd.set("tags", tags.join(","));
    const result = await publishApp(fd);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 px-4 py-4">
      <label className="block">
        <span className="text-sm font-semibold">Nombre de la app</span>
        <input
          name="name"
          required
          minLength={LIMITS.name.min}
          maxLength={LIMITS.name.max}
          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-sky-500"
          placeholder="DriverFlag"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold">Captura (16:9, máx. 2 MB)</span>
        <input
          type="file"
          accept={ACCEPT}
          required={!cropped}
          className="mt-1 block w-full text-sm"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <div className="mt-2 overflow-hidden rounded-2xl border border-dashed border-neutral-300 bg-neutral-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vista previa" className="aspect-video w-full object-cover" />
          ) : (
            <div className="flex aspect-video items-center justify-center text-sm text-neutral-400">
              Se recorta al centro en 16:9
            </div>
          )}
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-semibold">Motivo (qué problema resuelve)</span>
        <textarea
          name="motivo"
          required
          minLength={LIMITS.motivo.min}
          maxLength={LIMITS.motivo.max}
          rows={3}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-sky-500"
          placeholder="Quería ver de un vistazo la nacionalidad de cada piloto…"
        />
        <span className="text-xs text-neutral-500">
          {motivo.length}/{LIMITS.motivo.max} (mín. {LIMITS.motivo.min})
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-semibold">Link al repo</span>
        <input
          name="repo_url"
          type="url"
          required
          placeholder="https://github.com/tu-usuario/tu-app"
          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-sky-500"
        />
      </label>

      <div>
        <span className="text-sm font-semibold">Tags (opcional, máx. 3)</span>
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
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
              placeholder="f1"
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
        <span className="text-sm font-semibold">Texto (opcional)</span>
        <textarea
          name="texto"
          maxLength={LIMITS.texto.max}
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-sky-500"
          placeholder="¡Ya salió la v2! Pruébenla: https://…"
        />
        <span className="text-xs text-neutral-500">
          {texto.length}/{LIMITS.texto.max}. Aquí va tu voz, novedades o el link de la demo.
        </span>
      </label>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-sky-500 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60"
      >
        {pending ? "Publicando…" : "Publicar app"}
      </button>
    </form>
  );
}
