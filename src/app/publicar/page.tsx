import { redirect } from "next/navigation";
import { PublishForm } from "@/components/PublishForm";
import { Shell } from "@/components/Shell";
import { getCurrentProfile } from "@/lib/queries";

export default async function PublishPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login?siguiente=/publicar");

  return (
    <Shell me={me} title="Publicar app" backHref="/">
      <PublishForm />
    </Shell>
  );
}
