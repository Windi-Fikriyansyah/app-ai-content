import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isConfigured =
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== "your-supabase-url-here" &&
    supabaseUrl.startsWith("http");

  if (!isConfigured) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT remove this — refreshes the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === "/login";
  const isOnboardingPage = request.nextUrl.pathname === "/onboarding";
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/callback");

  // Allow auth callback through
  if (isAuthCallback) {
    return supabaseResponse;
  }

  // If no user and not on login page → redirect to login
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is logged in
  if (user) {
    const isOnboarded = Boolean(user.user_metadata?.onboarding_completed);

    // If on login page → redirect appropriately
    if (isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = isOnboarded ? "/" : "/onboarding";
      return NextResponse.redirect(url);
    }

    // If not onboarded yet and not on onboarding page → force redirect to /onboarding
    if (!isOnboarded && !isOnboardingPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    // If already onboarded and visits /onboarding → redirect to dashboard
    if (isOnboarded && isOnboardingPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
