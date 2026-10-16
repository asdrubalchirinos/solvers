import { notFound, redirect } from "next/navigation";
import { EditForm } from "@/components/EditForm";
import { Shell } from "@/components/Shell";
import { getAppById, getCurrentProfile } from "@/lib/queries";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentProfile();
  if (!me) redirect(`/login?siguiente=/p/${id}/editar`);

  const post = await getAppById(id, me.id);
  if (!post) notFound();
  if (post.user_id !== me.id) redirect(`/p/${id}`);

  return (
    <Shell me={me} title="Editar" backHref={`/p/${id}`}>
      <EditForm post={post} />
    </Shell>
  );
}
