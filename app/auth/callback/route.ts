import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const authError = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");

  if (authError) {
    const redirectUrl = new URL("/", requestUrl.origin);
    redirectUrl.searchParams.set("auth_error", authError);
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const redirectUrl = new URL("/", requestUrl.origin);
      redirectUrl.searchParams.set("auth_error", error.message);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
