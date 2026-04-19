import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if profile already exists
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!existing) {
          // Use upsert to avoid type conflicts with insert
          await supabase.from("profiles").upsert(
            {
              id: user.id,
              email: user.email ?? "",
              full_name:
                user.user_metadata?.full_name ??
                user.user_metadata?.name ??
                null,
              avatar_url: user.user_metadata?.avatar_url ?? null,
              native_language: "en",
              preferred_language: "en",
              languages: ["en"],
              plan: "free" as const,
            },
            { onConflict: "id" }
          );
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
