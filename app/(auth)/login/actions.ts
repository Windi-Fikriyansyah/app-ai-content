"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function loginWithEmail(
  _prevState: { error: string | null },
  formData: FormData
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl === "your-supabase-url-here" ||
    !supabaseUrl.startsWith("http")
  ) {
    return {
      error:
        "Konfigurasi Supabase belum diisi. Masukkan URL dan anon key di .env.local terlebih dahulu.",
    };
  }

  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Map common Supabase error messages to Indonesian
    if (error.message === "Invalid login credentials") {
      return { error: "Email atau kata sandi salah. Silakan coba lagi." };
    }
    if (error.message === "Email not confirmed") {
      return { error: "Email belum diverifikasi. Periksa inbox Anda." };
    }
    return { error: error.message };
  }

  redirect("/");
}

export async function loginWithGoogle() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl === "your-supabase-url-here" ||
    !supabaseUrl.startsWith("http")
  ) {
    redirect("/login?error=not_configured");
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") || "";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect("/login?error=oauth_failed");
  }

  if (data?.url) {
    redirect(data.url);
  }
}
