"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
import {
  LIMITS,
  friendlyError,
  isValidUsername,
  normalizeRepoUrl,
  normalizeTags,
} from "@/lib/utils";

async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

async function syncTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  appId: string,
  tags: string[],
) {
  await supabase.from("app_tags").delete().eq("app_id", appId);
  if (tags.length === 0) return;

  const ids: string[] = [];
  for (const name of tags) {
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .eq("name", name)
      .maybeSingle();
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const { data: created, error } = await supabase
      .from("tags")
      .insert({ name })
      .select("id")
      .single();
    if (error) {
      const { data: again } = await supabase
        .from("tags")
        .select("id")
        .eq("name", name)
        .maybeSingle();
      if (!again) throw error;
      ids.push(again.id);
    } else if (created) {
      ids.push(created.id);
    }
  }

  const { error } = await supabase
    .from("app_tags")
    .insert(ids.map((tag_id) => ({ app_id: appId, tag_id })));
  if (error) throw error;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function publishApp(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const motivo = String(formData.get("motivo") ?? "").trim();
  const textoRaw = String(formData.get("texto") ?? "").trim();
  const repoRaw = String(formData.get("repo_url") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "");
  const file = formData.get("screenshot");

  if (name.length < LIMITS.name.min || name.length > LIMITS.name.max) {
    return { error: `El nombre debe tener entre ${LIMITS.name.min} y ${LIMITS.name.max} caracteres.` };
  }
  if (motivo.length < LIMITS.motivo.min || motivo.length > LIMITS.motivo.max) {
    return {
      error: `El motivo debe tener entre ${LIMITS.motivo.min} y ${LIMITS.motivo.max} caracteres.`,
    };
  }
  if (textoRaw.length > LIMITS.texto.max) {
    return { error: `El texto no puede pasar de ${LIMITS.texto.max} caracteres.` };
  }

  let repo_url: string;
  try {
    repo_url = normalizeRepoUrl(repoRaw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Repo no válido." };
  }

  let tags: string[];
  try {
    tags = normalizeTags(
      tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tags no válidos." };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "La captura es obligatoria." };
  }
  if (file.size > LIMITS.screenshotBytes) {
    return { error: "La captura no puede pesar más de 2 MB." };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "La captura debe ser JPG, PNG o WebP." };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("screenshots")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: friendlyError(uploadError.message) };

  const {
    data: { publicUrl },
  } = supabase.storage.from("screenshots").getPublicUrl(path);

  const { data: app, error } = await supabase
    .from("apps")
    .insert({
      user_id: profile.id,
      name,
      motivo,
      texto: textoRaw || null,
      repo_url,
      screenshot_url: publicUrl,
    })
    .select("id")
    .single();

  if (error || !app) {
    return { error: friendlyError(error?.message ?? "No se pudo publicar.") };
  }

  try {
    await syncTags(supabase, app.id, tags);
  } catch (err) {
    return {
      error: friendlyError(err instanceof Error ? err.message : "No se pudieron guardar los tags."),
    };
  }

  revalidatePath("/");
  revalidatePath(`/${profile.username}`);
  redirect(`/p/${app.id}`);
}

export async function editApp(appId: string, formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: app } = await supabase
    .from("apps")
    .select("id, user_id")
    .eq("id", appId)
    .maybeSingle();
  if (!app || app.user_id !== profile.id) {
    return { error: "No puedes editar esta publicación." };
  }

  const motivo = String(formData.get("motivo") ?? "").trim();
  const textoRaw = String(formData.get("texto") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "");

  if (motivo.length < LIMITS.motivo.min || motivo.length > LIMITS.motivo.max) {
    return {
      error: `El motivo debe tener entre ${LIMITS.motivo.min} y ${LIMITS.motivo.max} caracteres.`,
    };
  }
  if (textoRaw.length > LIMITS.texto.max) {
    return { error: `El texto no puede pasar de ${LIMITS.texto.max} caracteres.` };
  }

  let tags: string[];
  try {
    tags = normalizeTags(
      tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Tags no válidos." };
  }

  const { error } = await supabase
    .from("apps")
    .update({ motivo, texto: textoRaw || null })
    .eq("id", appId);
  if (error) return { error: friendlyError(error.message) };

  try {
    await syncTags(supabase, appId, tags);
  } catch (err) {
    return {
      error: friendlyError(err instanceof Error ? err.message : "No se pudieron guardar los tags."),
    };
  }

  revalidatePath("/");
  revalidatePath(`/p/${appId}`);
  redirect(`/p/${appId}`);
}

export async function deleteApp(appId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("apps")
    .delete()
    .eq("id", appId)
    .eq("user_id", profile.id);
  if (error) return { error: friendlyError(error.message) };
  revalidatePath("/");
  revalidatePath(`/${profile.username}`);
  redirect("/");
}

export async function toggleLike(appId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("likes")
    .select("app_id")
    .eq("user_id", profile.id)
    .eq("app_id", appId)
    .maybeSingle();

  if (existing) {
    await supabase.from("likes").delete().eq("user_id", profile.id).eq("app_id", appId);
  } else {
    await supabase.from("likes").insert({ user_id: profile.id, app_id: appId });
  }
  revalidatePath("/");
  revalidatePath(`/p/${appId}`);
}

export async function toggleFollow(userId: string) {
  const profile = await requireProfile();
  if (profile.id === userId) return { error: "No puedes seguirte a ti mismo." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", profile.id)
    .eq("following_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", profile.id)
      .eq("following_id", userId);
  } else {
    await supabase.from("follows").insert({
      follower_id: profile.id,
      following_id: userId,
    });
  }
  revalidatePath("/");
  return { ok: true };
}

export async function addComment(appId: string, formData: FormData) {
  const profile = await requireProfile();
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 1 || body.length > LIMITS.comment.max) {
    return { error: `El comentario debe tener entre 1 y ${LIMITS.comment.max} caracteres.` };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    app_id: appId,
    user_id: profile.id,
    body,
  });
  if (error) return { error: friendlyError(error.message) };
  revalidatePath(`/p/${appId}`);
  return { ok: true };
}

export async function deleteComment(commentId: string, appId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", profile.id);
  if (error) return { error: friendlyError(error.message) };
  revalidatePath(`/p/${appId}`);
}

export async function reportApp(appId: string, reason: string) {
  const profile = await requireProfile();
  const text = reason.trim();
  if (text.length < 3) return { error: "Escribe un motivo para el reporte." };
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    app_id: appId,
    reporter_id: profile.id,
    reason: text.slice(0, 280),
  });
  if (error) return { error: friendlyError(error.message) };
  return { ok: true };
}

export async function reportComment(commentId: string, reason: string) {
  const profile = await requireProfile();
  const text = reason.trim();
  if (text.length < 3) return { error: "Escribe un motivo para el reporte." };
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    comment_id: commentId,
    reporter_id: profile.id,
    reason: text.slice(0, 280),
  });
  if (error) return { error: friendlyError(error.message) };
  return { ok: true };
}

export async function updateProfile(formData: FormData) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const display_name = String(formData.get("display_name") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const bio = String(formData.get("bio") ?? "").trim();
  const file = formData.get("avatar");

  if (
    display_name.length < LIMITS.displayName.min ||
    display_name.length > LIMITS.displayName.max
  ) {
    return { error: "El nombre debe tener entre 1 y 50 caracteres." };
  }
  if (!isValidUsername(username)) {
    return {
      error: "El usuario debe tener 3–20 caracteres: minúsculas, números o _.",
    };
  }
  if (bio.length > LIMITS.bio.max) {
    return { error: "La bio no puede pasar de 160 caracteres." };
  }

  let avatar_url = profile.avatar_url;
  if (file instanceof File && file.size > 0) {
    if (file.size > LIMITS.screenshotBytes) {
      return { error: "La foto no puede pesar más de 2 MB." };
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return { error: "La foto debe ser JPG, PNG o WebP." };
    }
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("screenshots")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) return { error: friendlyError(uploadError.message) };
    avatar_url = supabase.storage.from("screenshots").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name, username, bio: bio || null, avatar_url })
    .eq("id", profile.id);
  if (error) return { error: friendlyError(error.message) };

  revalidatePath("/");
  revalidatePath("/ajustes");
  revalidatePath(`/${username}`);
  redirect(`/${username}`);
}
