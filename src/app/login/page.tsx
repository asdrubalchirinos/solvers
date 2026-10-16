import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/queries";
import { isSafeNextPath } from "@/lib/utils";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ siguiente?: string }>;
}) {
  const user = await getCurrentUser();
  const { siguiente } = await searchParams;
  const next = isSafeNextPath(siguiente) ? (siguiente as string) : "/";
  if (user) redirect(next);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="text-3xl font-black tracking-tight">
        Solvers
      </Link>
      <h1 className="mt-6 text-2xl font-bold">Entra para publicar tu app</h1>
      <p className="mt-2 text-neutral-600">
        Cada post es una app personal: el motivo importa más que el código.
      </p>
      <div className="mt-8">
        <LoginForm siguiente={next} />
      </div>
    </div>
  );
}
