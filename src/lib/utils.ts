export const LIMITS = {
  name: { min: 3, max: 50 },
  motivo: { min: 20, max: 280 },
  texto: { max: 280 },
  comment: { max: 280 },
  bio: { max: 160 },
  displayName: { min: 1, max: 50 },
  username: { min: 3, max: 20 },
  tags: { max: 3, minLen: 2, maxLen: 20 },
  screenshotBytes: 2 * 1024 * 1024,
  appsPerDay: 5,
} as const;

export const SHORTENERS = [
  "bit.ly",
  "bitly.com",
  "t.co",
  "tinyurl.com",
  "tiny.cc",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "rb.gy",
  "s.id",
  "v.gd",
  "soo.gd",
  "short.io",
  "adf.ly",
  "clck.ru",
];

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  if (sec < 60) return "ahora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d`;
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function repoDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function normalizeRepoUrl(raw: string) {
  const trimmed = raw.trim();
  const url = new URL(trimmed);
  if (url.protocol !== "https:") {
    throw new Error("El repo debe ser una URL https://");
  }
  const host = url.hostname.toLowerCase();
  if (SHORTENERS.some((s) => host === s || host.endsWith(`.${s}`))) {
    throw new Error("No se aceptan acortadores. Usa el enlace real del repo.");
  }
  const path = url.pathname.replace(/\/+$/, "");
  return `https://${host}${path}${url.search}`;
}

export function isValidRepoUrl(raw: string) {
  try {
    normalizeRepoUrl(raw);
    return true;
  } catch {
    return false;
  }
}

export function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const tag = item.trim().toLowerCase().replace(/^#/, "");
    if (!tag || seen.has(tag)) continue;
    if (!/^[a-z0-9áéíóúüñ]{2,20}$/.test(tag)) {
      throw new Error(
        `Tag no válido: "${item}". Usa 2–20 letras o números, sin espacios.`,
      );
    }
    seen.add(tag);
    out.push(tag);
    if (out.length > LIMITS.tags.max) {
      throw new Error("Máximo 3 tags.");
    }
  }
  return out;
}

export function parseTagsInput(value: string) {
  return normalizeTags(
    value
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean),
  );
}

export const RESERVED_USERNAMES = [
  "login",
  "publicar",
  "ajustes",
  "auth",
  "p",
  "api",
  "admin",
  "solvers",
  "ayuda",
  "privacidad",
  "terminos",
];

export function isValidUsername(value: string) {
  return /^[a-z0-9_]{3,20}$/.test(value) && !RESERVED_USERNAMES.includes(value);
}

export function friendlyError(message: string) {
  if (message.includes("5 apps")) return "Llegaste al límite de 5 apps por día.";
  if (message.includes("republicar")) {
    return "Ya republicaste esta app hoy. Mañana puedes de nuevo.";
  }
  if (message.includes("nombre, captura")) {
    return "No se pueden cambiar el nombre, la captura ni el repo.";
  }
  if (message.includes("duplicate key") && message.includes("username")) {
    return "Ese @usuario ya está en uso.";
  }
  if (message.includes("duplicate key") && message.includes("reports")) {
    return "Ya reportaste esto.";
  }
  return message;
}

export function isSafeNextPath(value: string | null | undefined) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}
