"use client";

import React, { useState, useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Bot,
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Shield,
} from "lucide-react";
import { loginWithEmail, loginWithGoogle } from "./actions";

function LoginErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  let message = "";
  if (error === "oauth_failed") {
    message = "Gagal login dengan Google. Pastikan Google provider sudah aktif di Supabase.";
  } else if (error === "not_configured") {
    message = "Supabase belum dikonfigurasi. Harap isi NEXT_PUBLIC_SUPABASE_URL dan KEY di .env.local.";
  } else if (error === "auth_callback_failed") {
    message = "Gagal memproses sesi login dari Google. Silakan coba lagi.";
  }

  if (!message) return null;

  return (
    <div className="mb-space-md p-space-sm rounded-lg bg-error-container border border-error/30 flex items-center gap-2">
      <AlertCircle className="w-[18px] h-[18px] text-on-error-container shrink-0" />
      <span className="font-body-sm text-body-sm text-on-error-container">
        {message}
      </span>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [emailState, emailAction, emailPending] = useActionState(loginWithEmail, {
    error: null as string | null,
  });

  return (
    <main className="w-full max-w-[420px] flex flex-col items-center">
      {/* Authentication Card */}
      <div className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-space-xl md:p-space-2xl shadow-sm transition-all duration-200">
        {/* Brand Anchor: Logo & Identity */}
        <div className="flex flex-col items-center text-center mb-space-lg">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary mb-space-sm shadow-sm">
            <Bot className="w-6 h-6" />
          </div>
          <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
            AutoContent AI
          </span>
          <div className="flex items-center gap-1.5 mt-space-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>
            <span className="font-code-sm text-code-sm text-on-surface-variant font-medium">
              v2.4 Production Engine
            </span>
          </div>
        </div>

        {/* Section Title */}
        <div className="text-center mb-space-lg">
          <h1 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
            Masuk ke Akun Anda
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Akses workspace orkestrasi konten dan agen AI
          </p>
        </div>

        {/* Fast Auth Actions: Google & SSO */}
        <div className="grid grid-cols-2 gap-space-sm mb-space-lg">
          {/* Google Auth */}
          <form action={loginWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2 px-space-sm bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/60 hover:border-outline rounded-lg text-on-surface transition-all duration-150 active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              <span className="font-label-md text-label-md text-on-surface">Google</span>
            </button>
          </form>

          {/* Business SSO Auth */}
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-2 px-space-sm bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/60 hover:border-outline rounded-lg text-on-surface transition-all duration-150 active:scale-[0.99] cursor-pointer"
          >
            <Building2 className="w-[18px] h-[18px] text-on-surface-variant" />
            <span className="font-label-md text-label-md text-on-surface">SSO / Bisnis</span>
          </button>
        </div>

        {/* Visual Rule Divider */}
        <div className="relative flex items-center justify-center mb-space-lg">
          <div className="w-full border-t border-outline-variant/40"></div>
          <span className="absolute bg-surface-container-lowest px-space-sm font-label-sm text-label-sm text-outline tracking-wider uppercase">
            atau
          </span>
        </div>

        {/* OAuth / Query Errors */}
        <LoginErrorBanner />

        {/* Error Message */}
        {emailState?.error && (
          <div className="mb-space-md p-space-sm rounded-lg bg-error-container border border-error/30 flex items-center gap-2">
            <AlertCircle className="w-[18px] h-[18px] text-on-error-container shrink-0" />
            <span className="font-body-sm text-body-sm text-on-error-container">
              {emailState.error}
            </span>
          </div>
        )}

        {/* Credential Form */}
        <form action={emailAction} className="space-y-space-md">
          {/* Work Email Field */}
          <div>
            <label
              className="block font-label-md text-label-md text-on-surface mb-1"
              htmlFor="email"
            >
              Alamat Email Kerja
            </label>
            <div className="relative rounded-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                <Mail className="w-[18px] h-[18px]" />
              </div>
              <input
                autoComplete="email"
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-outline-variant/70 bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline/70 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                id="email"
                name="email"
                placeholder="nama@perusahaan.com"
                required
                type="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                className="block font-label-md text-label-md text-on-surface"
                htmlFor="password"
              >
                Kata Sandi
              </label>
              <a
                className="font-label-sm text-label-sm text-primary hover:text-primary-container hover:underline transition-colors"
                href="#"
              >
                Lupa kata sandi?
              </a>
            </div>
            <div className="relative rounded-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                <Lock className="w-[18px] h-[18px]" />
              </div>
              <input
                autoComplete="current-password"
                className="w-full h-10 pl-9 pr-10 rounded-lg border border-outline-variant/70 bg-surface-container-lowest text-on-surface font-body-md text-body-md placeholder:text-outline/70 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                id="password"
                name="password"
                placeholder="••••••••••••"
                required
                type={showPassword ? "text" : "password"}
              />
              <button
                aria-label="Tampilkan atau sembunyikan kata sandi"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface transition-colors cursor-pointer"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-[18px] h-[18px]" />
                ) : (
                  <Eye className="w-[18px] h-[18px]" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center pt-space-2xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                className="w-4 h-4 rounded text-primary-container border-outline-variant/80 focus:ring-primary-container focus:ring-offset-0 transition"
                id="remember-me"
                name="remember-me"
                type="checkbox"
              />
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Ingat saya di perangkat ini
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-space-xs">
            <button
              type="submit"
              disabled={emailPending}
              className="w-full h-10 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-container focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
            >
              {emailPending ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-[18px] h-[18px]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Small Discrete Footer Prompt */}
      <div className="mt-space-lg text-center">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Belum punya akun?{" "}
          <a
            className="text-primary font-semibold hover:underline hover:text-primary-container transition-colors"
            href="#"
          >
            Mulai Uji Coba Gratis
          </a>
        </p>
        {/* Minimal Security & Compliance Indicator */}
        <div className="flex items-center justify-center gap-4 mt-space-md text-outline font-label-sm text-label-sm">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            SOC-2 Certified
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            256-bit SSL
          </span>
        </div>
      </div>
    </main>
  );
}
