import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeNextPath } from "@/lib/utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const siguiente = url.searchParams.get("siguiente");
  const next = isSafeNextPath(siguiente) ? (siguiente as string) : "/";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
