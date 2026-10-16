import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { Shell } from "@/components/Shell";
import { getCurrentProfile } from "@/lib/queries";

export default async function SettingsPage() {
  const me = await getCurrentProfile();
  if (!me) redirect("/login?siguiente=/ajustes");

  return (
    <Shell me={me} title="Ajustes" backHref={`/${me.username}`}>
      <ProfileForm profile={me} />
    </Shell>
  );
}
