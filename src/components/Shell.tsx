import Link from "next/link";
import { signOut } from "@/lib/actions";
import type { Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { cx } from "@/lib/utils";

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "block rounded-full px-4 py-2.5 text-lg hover:bg-neutral-100",
        active && "font-bold",
      )}
    >
      {children}
    </Link>
  );
}

export function Shell({
  me,
  children,
  title,
  backHref,
}: {
  me: Profile | null;
  children: React.ReactNode;
  title?: string;
  backHref?: string;
}) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto flex min-h-screen max-w-[920px]">
        <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col justify-between py-3 pr-4 md:flex">
          <div>
            <Link href="/" className="mb-4 block px-4 text-2xl font-black tracking-tight">
              Solvers
            </Link>
            <nav>
              <NavLink href="/">Inicio</NavLink>
              {me ? (
                <>
                  <NavLink href="/publicar">Publicar</NavLink>
                  <NavLink href={`/${me.username}`}>Perfil</NavLink>
                  <NavLink href="/ajustes">Ajustes</NavLink>
                </>
              ) : (
                <NavLink href="/login">Entrar</NavLink>
              )}
            </nav>
            {me && (
              <Link
                href="/publicar"
                className="mt-4 block rounded-full bg-sky-500 py-3 text-center text-sm font-bold text-white hover:bg-sky-600"
              >
                Publicar app
              </Link>
            )}
          </div>
          {me && (
            <div className="flex items-center gap-2 px-2">
              <Avatar name={me.display_name} url={me.avatar_url} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{me.display_name}</p>
                <p className="truncate text-xs text-neutral-500">@{me.username}</p>
              </div>
              <form action={signOut}>
                <button type="submit" className="text-xs text-neutral-500 hover:underline">
                  Salir
                </button>
              </form>
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1 border-x border-neutral-200">
          <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-200 bg-white/85 px-4 py-3 backdrop-blur">
            {backHref && (
              <Link href={backHref} className="text-xl" aria-label="Volver">
                ←
              </Link>
            )}
            <div className="flex-1">
              <Link href="/" className="text-xl font-black md:hidden">
                Solvers
              </Link>
              {title && <h1 className="hidden text-xl font-bold md:block">{title}</h1>}
            </div>
            {me ? (
              <Link
                href="/publicar"
                className="rounded-full bg-sky-500 px-3 py-1.5 text-sm font-bold text-white md:hidden"
              >
                Publicar
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-bold text-sky-600 md:hidden">
                Entrar
              </Link>
            )}
          </header>
          {children}
        </div>
      </div>

      {me && (
        <Link
          href="/publicar"
          className="fixed bottom-5 right-5 rounded-full bg-sky-500 px-5 py-3 text-sm font-bold text-white shadow-lg md:hidden"
        >
          Publicar app
        </Link>
      )}
    </div>
  );
}
