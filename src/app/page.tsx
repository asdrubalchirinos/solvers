import Link from "next/link";
import { AppCard } from "@/components/AppCard";
import { Shell } from "@/components/Shell";
import { getCurrentProfile, getFeed } from "@/lib/queries";
import { cx } from "@/lib/utils";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const me = await getCurrentProfile();
  const tab = tabParam === "todos" || tabParam === "siguiendo" ? tabParam : me ? "siguiendo" : "todos";
  const posts = await getFeed(tab, me?.id);

  return (
    <Shell me={me} title="Inicio">
      <div className="flex border-b border-neutral-200">
        <Tab href="/?tab=siguiendo" active={tab === "siguiendo"}>
          Siguiendo
        </Tab>
        <Tab href="/?tab=todos" active={tab === "todos"}>
          Todos
        </Tab>
      </div>

      {tab === "siguiendo" && !me && (
        <p className="px-4 py-10 text-center text-neutral-600">
          <Link href="/login?siguiente=/?tab=siguiendo" className="font-bold text-sky-600">
            Inicia sesión
          </Link>{" "}
          para ver a quienes sigues.
        </p>
      )}

      {tab === "siguiendo" && me && posts.length === 0 && (
        <p className="px-4 py-10 text-center text-neutral-600">
          Sigue a gente para ver sus apps aquí. Mientras tanto, mira{" "}
          <Link href="/?tab=todos" className="font-bold text-sky-600">
            Todos
          </Link>
          .
        </p>
      )}

      {tab === "todos" && posts.length === 0 && (
        <p className="px-4 py-10 text-center text-neutral-600">
          Aún no hay apps. {me ? "¡Sé el primero en publicar!" : "Entra y publica la tuya."}
        </p>
      )}

      {posts.map((post) => (
        <AppCard key={post.id} post={post} me={me} />
      ))}
    </Shell>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "flex-1 py-3 text-center text-[15px] hover:bg-neutral-50",
        active ? "font-bold" : "text-neutral-500",
      )}
    >
      <span className={cx("inline-block pb-2", active && "border-b-4 border-sky-500")}>
        {children}
      </span>
    </Link>
  );
}
