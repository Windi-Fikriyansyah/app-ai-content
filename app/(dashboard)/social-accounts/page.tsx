"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Share2,
  CheckCircle2,
  AlertCircle,
  X,
  Key,
  Check,
  ExternalLink,
  RotateCcw,
  BadgeCheck,
  Lock,
  Info,
  Save,
  Unlink,
  Link2,
} from "lucide-react";
import {
  getSocialAccountsData,
  saveZernioApiKey,
  getInstagramConnectUrlAction,
  getThreadsConnectUrlAction,
  disconnectSocialAccount,
  removeZernioApiKey,
  SocialAccountsData,
  ConnectedAccount,
} from "./actions";

export default function SocialAccountsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto p-8 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-2 text-outline">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="font-label-md text-sm">Memuat Social Accounts...</span>
          </div>
        </div>
      }
    >
      <SocialAccountsContent />
    </Suspense>
  );
}

function SocialAccountsContent() {
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SocialAccountsData | null>(null);

  // API Key Form State
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
  }>({ type: null, message: "" });

  // Connect Instagram Flow State
  const [isConnectingInstagram, setIsConnectingInstagram] = useState(false);
  // Connect Threads Flow State
  const [isConnectingThreads, setIsConnectingThreads] = useState(false);

  const [connectFeedback, setConnectFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Disconnect State
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getSocialAccountsData();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const accountId = searchParams.get("accountId");
    const status = searchParams.get("status");

    if (justConnected === "instagram" || (accountId && searchParams.get("provider") === "instagram") || (status === "success" && justConnected === "instagram")) {
      setConnectFeedback({
        type: "success",
        message: "Selamat! Akun Instagram Bisnis berhasil diotorisasi dan terhubung melalui Zernio.",
      });
    } else if (justConnected === "threads" || (status === "success" && justConnected === "threads")) {
      setConnectFeedback({
        type: "success",
        message: "Selamat! Akun Threads berhasil diotorisasi dan terhubung melalui Zernio.",
      });
    }
  }, [justConnected, searchParams]);

  // Handle Save API Key
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setKeyFeedback({
        type: "error",
        message: "Silakan masukkan API Key Zernio Anda.",
      });
      return;
    }

    setIsSavingKey(true);
    setKeyFeedback({ type: null, message: "" });

    try {
      const res = await saveZernioApiKey(apiKeyInput.trim());
      if (res.success) {
        setKeyFeedback({
          type: "success",
          message: "API Key Zernio berhasil divalidasi dan disimpan!",
        });
        setApiKeyInput("");
        await loadData();
      } else {
        setKeyFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan API Key Zernio.",
        });
      }
    } catch {
      setKeyFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menyimpan API Key.",
      });
    } finally {
      setIsSavingKey(false);
    }
  };

  // Handle Reset API Key
  const handleResetApiKey = async () => {
    if (!confirm("Apakah Anda yakin ingin mengganti API Key Zernio?")) return;
    try {
      await removeZernioApiKey();
      await loadData();
      setApiKeyInput("");
      setKeyFeedback({
        type: "info",
        message: "API Key telah direset. Silakan masukkan API Key yang baru.",
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Connect Instagram
  const handleConnectInstagram = async () => {
    setIsConnectingInstagram(true);
    setConnectFeedback({ type: null, message: "" });

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : undefined;
      const res = await getInstagramConnectUrlAction(origin);
      if (res.success && res.authUrl) {
        window.location.href = res.authUrl;
      } else {
        setConnectFeedback({
          type: "error",
          message: res.error || "Gagal memulai sesi otorisasi Instagram Zernio.",
        });
        setIsConnectingInstagram(false);
      }
    } catch {
      setConnectFeedback({
        type: "error",
        message: "Terjadi kesalahan saat menghubungi server.",
      });
      setIsConnectingInstagram(false);
    }
  };

  // Handle Connect Threads
  const handleConnectThreads = async () => {
    setIsConnectingThreads(true);
    setConnectFeedback({ type: null, message: "" });

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : undefined;
      const res = await getThreadsConnectUrlAction(origin);
      if (res.success && res.authUrl) {
        window.location.href = res.authUrl;
      } else {
        setConnectFeedback({
          type: "error",
          message: res.error || "Gagal memulai sesi otorisasi Threads Zernio.",
        });
        setIsConnectingThreads(false);
      }
    } catch {
      setConnectFeedback({
        type: "error",
        message: "Terjadi kesalahan saat menghubungi server.",
      });
      setIsConnectingThreads(false);
    }
  };

  // Handle Disconnect Account
  const handleDisconnect = async (accountId: string) => {
    if (!confirm("Apakah Anda yakin ingin memutuskan koneksi akun ini?")) return;

    setDisconnectingId(accountId);
    try {
      const res = await disconnectSocialAccount(accountId);
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || "Gagal memutuskan koneksi.");
      }
    } finally {
      setDisconnectingId(null);
    }
  };

  const isConfigured = data?.workspace?.isApiKeyConfigured;
  const connectedInstagram = data?.connectedAccounts.filter(
    (a) => a.provider.toLowerCase() === "instagram"
  );
  const connectedThreads = data?.connectedAccounts.filter(
    (a) => a.provider.toLowerCase() === "threads"
  );

  return (
    <div className="max-w-6xl mx-auto space-y-space-xl pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-space-lg">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <Share2 className="w-4 h-4" />
            <span>Integrasi & Saluran Publikasi</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
            Social Accounts
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Kelola saluran media sosial dan hubungkan infrastruktur penerbitan otomatis via Zernio.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-surface-container-lowest border border-outline-variant/40 px-3 py-1.5 rounded-full shadow-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className="font-label-sm text-label-sm font-medium text-on-surface">
            {isConfigured ? "Zernio API Aktif" : "API Key Belum Dikonfigurasi"}
          </span>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {connectFeedback.message && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            connectFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          {connectFeedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium">
            {connectFeedback.message}
          </div>
          <button
            onClick={() => setConnectFeedback({ type: null, message: "" })}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Step 1 Card: Konfigurasi Zernio API Key */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-space-lg lg:p-space-xl border-b border-outline-variant/20 bg-gradient-to-r from-surface-container-lowest via-surface-container-low/40 to-surface-container-lowest">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-primary/20">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-headline-sm text-base sm:text-headline-sm font-bold text-on-surface">
                    1. Pengaturan Kunci API Zernio
                  </h2>
                  {isConfigured && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Check className="w-3 h-3" />
                      Terhubung
                    </span>
                  )}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-2xl">
                  Zernio bertindak sebagai engine publishing resmi untuk Instagram, Facebook, dan platform sosial lainnya. Dapatkan API Key Anda di{" "}
                  <a
                    href="https://zernio.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    Dashboard Zernio
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  .
                </p>
              </div>
            </div>

            {isConfigured && (
              <button
                type="button"
                onClick={handleResetApiKey}
                className="text-xs text-error hover:bg-error-container/30 px-2.5 py-1 rounded-lg transition-colors font-medium shrink-0 flex items-center gap-1 cursor-pointer self-start"
                title="Reset API Key"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ganti Key</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-space-lg lg:p-space-xl">
          {/* Key Status or Input Form */}
          {isConfigured && !apiKeyInput ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-mono text-xs">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-label-md text-label-md font-semibold text-on-surface">
                    API Key Tersimpan & Terverifikasi
                  </p>
                  <p className="font-code-sm text-xs text-outline mt-0.5">
                    {data?.workspace?.zernioApiKey || "••••••••••••••••••••"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApiKeyInput(" ")}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Ubah Kunci API
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block font-label-md text-label-md font-semibold text-on-surface mb-2">
                  Zernio API Secret Key
                </label>
                <div className="relative max-w-2xl">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Contoh: zn_live_abcdef1234567890..."
                    disabled={isSavingKey}
                    className="w-full pl-10 pr-24 py-2.5 bg-surface rounded-xl border border-outline-variant/40 text-body-md font-code-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-xs font-medium px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    {showApiKey ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                <p className="text-xs text-outline mt-2">
                  Kunci API Anda dienkripsi dan digunakan untuk memvalidasi token posting Instagram ke Zernio API.
                </p>
              </div>

              {/* Feedback Alert */}
              {keyFeedback.message && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 max-w-2xl ${
                    keyFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : keyFeedback.type === "info"
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {keyFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : keyFeedback.type === "info" ? (
                    <Info className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{keyFeedback.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSavingKey || !apiKeyInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer text-xs sm:text-sm"
                >
                  {isSavingKey ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi dengan Zernio...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan & Verifikasi API Key</span>
                    </>
                  )}
                </button>

                {isConfigured && apiKeyInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setApiKeyInput("");
                      setKeyFeedback({ type: null, message: "" });
                    }}
                    className="px-3.5 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface text-xs font-medium transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 3. Step 2 Section: Hubungkan Saluran Media Sosial */}
      {isConfigured ? (
        <div className="space-y-space-lg animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                2. Hubungkan Saluran Media Sosial
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Pilih platform media sosial untuk mulai menerbitkan postingan otomatis.
              </p>
            </div>
          </div>

          {/* Social Channels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-base">
            {/* 1. INSTAGRAM (ACTIVE / PRIMARY) */}
            <div className="bg-surface-container-lowest rounded-2xl border-2 border-primary/30 p-space-lg shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
              {/* Background gradient accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />

              <div>
                <div className="flex items-start justify-between">
                  {/* Instagram Logo / Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Prioritas MVP
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Instagram Business
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Hubungkan akun Instagram Creator atau Business Anda untuk auto-publish Feed, Carousel, dan Story.
                  </p>
                </div>

                {/* Requirements Bullet Points */}
                <div className="mt-3 p-2.5 rounded-lg bg-surface border border-outline-variant/30 text-[11px] text-outline space-y-1">
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-medium">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    <span>Persyaratan Akun:</span>
                  </div>
                  <p>• Wajib Instagram Business / Creator</p>
                  <p>• Terkoneksi via Zernio OAuth (Instagram Login)</p>
                </div>
              </div>

              {/* Action Button & Card Feedback */}
              <div className="mt-5 pt-3 border-t border-outline-variant/30 space-y-2">
                {connectFeedback.message && connectFeedback.type === "error" && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="flex-1">{connectFeedback.message}</span>
                  </div>
                )}

                {connectedInstagram && connectedInstagram.length > 0 ? (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold">
                          @{connectedInstagram[0].username} (Terhubung)
                        </span>
                      </div>
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDisconnect(connectedInstagram[0].providerAccountId || connectedInstagram[0].id)}
                      disabled={disconnectingId === (connectedInstagram[0].providerAccountId || connectedInstagram[0].id)}
                      className="w-full py-2 px-3 rounded-xl border border-error/30 text-error hover:bg-error-container/30 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Putuskan Akun Instagram</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectInstagram}
                    disabled={isConnectingInstagram}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:opacity-95 text-white font-label-md text-label-md font-semibold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer text-xs sm:text-sm"
                  >
                    {isConnectingInstagram ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menghubungkan ke Zernio...</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        <span>Hubungkan Akun Instagram</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 2. THREADS BY META (ACTIVE / CONNECTABLE) */}
            <div className="bg-surface-container-lowest rounded-2xl border-2 border-black/20 dark:border-white/20 p-space-lg shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
              {/* Background subtle accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-black/5 via-zinc-500/10 to-transparent rounded-bl-full pointer-events-none" />

              <div>
                <div className="flex items-start justify-between">
                  {/* Threads Logo */}
                  <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 192 192">
                      <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.745C75.2536 44.745 57.6534 59.8804 53.6499 82.2608C49.6464 104.641 60.3344 126.969 80.127 137.545C97.8099 146.992 119.985 144.137 134.428 130.485L120.73 117.078C110.849 126.417 95.8078 128.261 83.7431 121.815C70.2526 114.608 62.9734 99.3789 65.7011 84.126C68.4288 68.8732 80.4288 58.5583 95.3995 58.5583C95.4764 58.5583 95.554 58.5583 95.631 58.5587C112.592 58.6669 122.846 69.4586 123.87 88.3582C106.942 86.8837 89.3776 90.7937 77.0395 101.444C60.9161 115.361 58.5135 137.525 71.6661 150.963C84.8188 164.402 107.013 162.597 122.384 148.067C130.82 140.092 136.009 129.475 138.358 117.848C148.966 123.864 159.208 127.351 168.971 128.243C174.636 128.761 180.207 128.283 185.642 126.814L182.115 113.805C178.411 114.806 174.613 115.132 170.757 114.779C162.616 114.035 153.844 110.741 144.532 104.935C144.757 99.5108 143.754 94.1843 141.537 88.9883ZM114.341 135.539C102.871 146.381 86.2925 147.728 76.4719 137.695C66.6513 127.661 68.4452 111.112 80.4839 100.72C89.7042 92.7601 103.266 89.6587 116.326 90.6725C115.827 106.331 113.252 122.253 114.341 135.539Z" />
                    </svg>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-on-surface border border-black/15">
                    Aktif & Terintegrasi
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Threads by Meta
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Hubungkan akun Threads Anda untuk publikasi otomatis postingan teks, gambar, dan rangkaian threads terjadwal.
                  </p>
                </div>

                {/* Requirements Bullet Points */}
                <div className="mt-3 p-2.5 rounded-lg bg-surface border border-outline-variant/30 text-[11px] text-outline space-y-1">
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-medium">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    <span>Fitur & Dukungan:</span>
                  </div>
                  <p>• Auto-publish teks micro-blogging & multi-media</p>
                  <p>• Otorisasi resmi via Zernio OAuth (Meta Login)</p>
                </div>
              </div>

              {/* Action Button & Card Feedback */}
              <div className="mt-5 pt-3 border-t border-outline-variant/30 space-y-2">
                {connectedThreads && connectedThreads.length > 0 ? (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold">
                          @{connectedThreads[0].username} (Terhubung)
                        </span>
                      </div>
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDisconnect(connectedThreads[0].providerAccountId || connectedThreads[0].id)}
                      disabled={disconnectingId === (connectedThreads[0].providerAccountId || connectedThreads[0].id)}
                      className="w-full py-2 px-3 rounded-xl border border-error/30 text-error hover:bg-error-container/30 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Putuskan Akun Threads</span>
                    </button>
                  </div>
                ) : (
                    <button
                      type="button"
                      onClick={handleConnectThreads}
                      disabled={isConnectingThreads}
                      className="w-full py-2.5 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white font-label-md text-label-md font-semibold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer text-xs sm:text-sm"
                    >
                      {isConnectingThreads ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menghubungkan ke Zernio...</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4" />
                          <span>Hubungkan Akun Threads</span>
                        </>
                      )}
                    </button>
                )}
              </div>
            </div>

            {/* 2. FACEBOOK PAGE (COMING SOON) */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-space-lg shadow-xs opacity-75 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">
                    Segera Hadir
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Facebook Page
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Sinkronisasi postingan ke Halaman Bisnis Facebook langsung dari Content Calendar.
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-outline-variant/30">
                <button
                  disabled
                  className="w-full py-2 px-3 rounded-xl bg-surface text-outline font-label-sm text-label-sm cursor-not-allowed border border-outline-variant/40"
                >
                  Tersedia di Tahap Berikutnya
                </button>
              </div>
            </div>

            {/* 3. LINKEDIN (COMING SOON) */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-space-lg shadow-xs opacity-75 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#0A66C2] text-white flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </div>
                  <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">
                    Segera Hadir
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    LinkedIn
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Distribusi otomatis artikel, carousels, dan company updates ke profil atau Company Page.
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-outline-variant/30">
                <button
                  disabled
                  className="w-full py-2 px-3 rounded-xl bg-surface text-outline font-label-sm text-label-sm cursor-not-allowed border border-outline-variant/40"
                >
                  Tersedia di Tahap Berikutnya
                </button>
              </div>
            </div>

            {/* 4. X / TWITTER (COMING SOON) */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-space-lg shadow-xs opacity-75 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">
                    Segera Hadir
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    X (Twitter)
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Auto-publish micro-blogging threads dan pengumuman singkat secara terjadwal.
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-outline-variant/30">
                <button
                  disabled
                  className="w-full py-2 px-3 rounded-xl bg-surface text-outline font-label-sm text-label-sm cursor-not-allowed border border-outline-variant/40"
                >
                  Tersedia di Tahap Berikutnya
                </button>
              </div>
            </div>

            {/* 5. TIKTOK (COMING SOON) */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-space-lg shadow-xs opacity-75 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#010101] text-white flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                    </svg>
                  </div>
                  <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">
                    Segera Hadir
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    TikTok
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Auto-publish video Reels dan Shorts ke platform video pendek TikTok.
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-outline-variant/30">
                <button
                  disabled
                  className="w-full py-2 px-3 rounded-xl bg-surface text-outline font-label-sm text-label-sm cursor-not-allowed border border-outline-variant/40"
                >
                  Tersedia di Tahap Berikutnya
                </button>
              </div>
            </div>
          </div>

          {/* 4. Daftar Akun Terhubung */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4 sm:p-space-lg lg:p-space-xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-variant/20 pb-4 mb-5 gap-2">
              <div>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Daftar Akun Terhubung
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Akun yang aktif akan dijadikan tujuan penerbitan konten otomatis oleh AI Content Planner.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => loadData()}
                  disabled={loading}
                  className="text-xs font-medium text-primary hover:bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Sinkronkan akun terbaru dari server Zernio"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Sinkronkan Zernio</span>
                </button>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-variant text-on-surface-variant">
                  {data?.connectedAccounts.length || 0} Terhubung
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-outline gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs font-medium">Memuat data akun...</span>
              </div>
            ) : data && data.connectedAccounts.length > 0 ? (
              <div className="divide-y divide-outline-variant/20">
                {data.connectedAccounts.map((account) => (
                  <div
                    key={account.id || account.providerAccountId}
                    className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Avatar */}
                      <div className="relative w-12 h-12 rounded-full ring-2 ring-primary/20 overflow-hidden bg-surface-container flex items-center justify-center text-primary font-bold shrink-0">
                        {account.profilePictureUrl ? (
                          <img
                            src={account.profilePictureUrl}
                            alt={account.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{account.username.slice(0, 2).toUpperCase()}</span>
                        )}
                        {/* Channel provider mini badge */}
                        <div
                          className={`absolute bottom-0 right-0 w-4 h-4 rounded-full text-white flex items-center justify-center text-[8px] ring-1 ring-white ${
                            account.provider.toLowerCase() === "threads"
                              ? "bg-black"
                              : "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600"
                          }`}
                        >
                          {account.provider.toLowerCase() === "threads" ? "@" : "IG"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-headline-sm text-base font-bold text-on-surface truncate">
                            {account.displayName || account.username}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Aktif
                          </span>
                        </div>
                        <p className="font-code-sm text-xs text-outline mt-0.5 truncate">
                          @{account.username} ·{" "}
                          {account.provider.toLowerCase() === "threads"
                            ? "Threads by Meta"
                            : "Instagram Business"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleDisconnect(account.providerAccountId || account.id)}
                        disabled={disconnectingId === (account.providerAccountId || account.id)}
                        className="px-3 py-1.5 rounded-lg border border-outline-variant/40 hover:border-error/40 hover:bg-error-container/30 text-outline hover:text-error text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {disconnectingId === (account.providerAccountId || account.id) ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Memutuskan...</span>
                          </>
                        ) : (
                          <>
                            <Unlink className="w-3.5 h-3.5" />
                            <span>Putuskan Koneksi</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 border-2 border-dashed border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-surface">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Link2 className="w-6 h-6" />
                </div>
                <h4 className="font-headline-sm text-base font-bold text-on-surface">
                  Belum Ada Akun Terhubung
                </h4>
                <p className="font-body-sm text-xs text-on-surface-variant max-w-sm mt-1">
                  Klik tombol <strong>Hubungkan Akun Instagram</strong> di atas untuk mengotentikasi akun Instagram Bisnis Anda melalui portal Zernio.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty state guidance when API Key not yet saved */
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-space-xl text-center flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-secondary-container/40 text-primary flex items-center justify-center mb-4 ring-4 ring-primary/10">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
            Koneksi Media Sosial Terkunci
          </h3>
          <p className="font-body-sm text-sm text-on-surface-variant max-w-md mt-2">
            Silakan masukkan dan simpan <strong>Zernio API Key</strong> pada Langkah 1 di atas. Setelah tersimpan, opsi koneksi Instagram dan platform media sosial lainnya akan langsung terbuka.
          </p>
        </div>
      )}
    </div>
  );
}
