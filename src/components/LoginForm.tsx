"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ siguiente = "/" }: { siguiente?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function oauth(provider: "github" | "google") {
    setError(null);
    setPending(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback?siguiente=${encodeURIComponent(siguiente)}`,
      },
    });
    if (err) {
      setError(err.message);
      setPending(false);
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setPending(false);
    if (err) setError(err.message);
    else setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setPending(false);
    if (err) setError(err.message);
    else {
      router.push(siguiente);
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => oauth("github")}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white py-2.5 text-sm font-bold hover:bg-neutral-50"
      >
        Continuar con GitHub
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => oauth("google")}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white py-2.5 text-sm font-bold hover:bg-neutral-50"
      >
        Continuar con Google
      </button>

      <div className="flex items-center gap-3 py-2 text-sm text-neutral-500">
        <span className="h-px flex-1 bg-neutral-200" />
        o con tu correo
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-3">
          <label className="block text-sm font-medium">
            Correo
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:border-sky-500"
              placeholder="tu@correo.com"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white hover:bg-neutral-800"
          >
            {pending ? "Enviando…" : "Enviar código"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-3">
          <p className="text-sm text-neutral-600">
            Te enviamos un código de 6 dígitos a <strong>{email}</strong>.
            Pégalo aquí (sirve aunque abras el correo en otro aparato).
          </p>
          <label className="block text-sm font-medium">
            Código
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-center text-2xl tracking-[0.4em] outline-none focus:border-sky-500"
              placeholder="000000"
            />
          </label>
          <button
            type="submit"
            disabled={pending || code.length < 6}
            className="w-full rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-sky-600 hover:underline"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            Usar otro correo
          </button>
        </form>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
