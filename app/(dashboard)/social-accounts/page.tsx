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
  Plus,
  Trash2,
  ShieldCheck,
  Layers,
  Sparkles,
  Video,
} from "lucide-react";
import {
  getSocialAccountsData,
  saveZernioApiKey,
  addZernioApiKeyAction,
  deleteZernioApiKeyAction,
  getInstagramConnectUrlAction,
  getThreadsConnectUrlAction,
  getTikTokConnectUrlAction,
  getLinkedInConnectUrlAction,
  disconnectSocialAccount,
  removeZernioApiKey,
  SocialAccountsData,
  ConnectedAccount,
  ZernioKeyItem,
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

  // Initial Single Key Form State (when no keys registered yet)
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
  }>({ type: null, message: "" });

  // Add Additional API Key Modal / Drawer State
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState("");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Connect Channels Flow States
  const [isConnectingInstagram, setIsConnectingInstagram] = useState(false);
  const [isConnectingThreads, setIsConnectingThreads] = useState(false);
  const [isConnectingTikTok, setIsConnectingTikTok] = useState(false);
  const [isConnectingLinkedIn, setIsConnectingLinkedIn] = useState(false);

  const [connectFeedback, setConnectFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Disconnect Account & Delete Key States
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

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

    if (
      justConnected === "instagram" ||
      (accountId && searchParams.get("provider") === "instagram") ||
      (status === "success" && justConnected === "instagram")
    ) {
      setConnectFeedback({
        type: "success",
        message: "Selamat! Akun Instagram Bisnis berhasil diotorisasi dan terhubung melalui Zernio.",
      });
    } else if (
      justConnected === "threads" ||
      (status === "success" && justConnected === "threads")
    ) {
      setConnectFeedback({
        type: "success",
        message: "Selamat! Akun Threads berhasil diotorisasi dan terhubung melalui Zernio.",
      });
    } else if (
      justConnected === "tiktok" ||
      (status === "success" && justConnected === "tiktok")
    ) {
      setConnectFeedback({
        type: "success",
        message: "Selamat! Akun TikTok berhasil diotorisasi dan terhubung melalui Zernio.",
      });
    } else if (
      justConnected === "linkedin" ||
      (status === "success" && justConnected === "linkedin")
    ) {
      setConnectFeedback({
        type: "success",
        message: "Selamat! Akun LinkedIn berhasil diotorisasi dan terhubung melalui Zernio.",
      });
    }
  }, [justConnected, searchParams]);

  // Handle Save Initial API Key
  const handleSaveInitialApiKey = async (e: React.FormEvent) => {
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
          message: res.message || "API Key Zernio berhasil divalidasi dan disimpan!",
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

  // Handle Add Additional API Key
  const handleAddNewApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyInput.trim()) {
      setModalFeedback({
        type: "error",
        message: "Silakan masukkan API Key Zernio.",
      });
      return;
    }

    setIsAddingKey(true);
    setModalFeedback({ type: null, message: "" });

    try {
      const res = await addZernioApiKeyAction(newKeyInput.trim(), newKeyLabel.trim() || undefined);
      if (res.success) {
        setModalFeedback({
          type: "success",
          message: res.message || "API Key baru berhasil ditambahkan!",
        });
        setNewKeyInput("");
        setNewKeyLabel("");
        await loadData();
        setTimeout(() => {
          setShowAddKeyModal(false);
          setModalFeedback({ type: null, message: "" });
        }, 1500);
      } else {
        setModalFeedback({
          type: "error",
          message: res.error || "Gagal menambahkan API Key.",
        });
      }
    } catch {
      setModalFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menambahkan API Key.",
      });
    } finally {
      setIsAddingKey(false);
    }
  };

  // Handle Delete API Key
  const handleDeleteApiKey = async (keyId: string, label: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${label}"?`)) return;

    setDeletingKeyId(keyId);
    try {
      const res = await deleteZernioApiKeyAction(keyId);
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || "Gagal menghapus API Key.");
      }
    } catch (err: any) {
      alert(err.message || "Gagal menghapus API Key.");
    } finally {
      setDeletingKeyId(null);
    }
  };

  // Handle Reset All Keys
  const handleResetAllKeys = async () => {
    if (!confirm("Apakah Anda yakin ingin mereset seluruh API Key Zernio dari workspace ini?")) return;
    try {
      await removeZernioApiKey();
      await loadData();
      setApiKeyInput("");
      setKeyFeedback({
        type: "info",
        message: "Semua API Key Zernio telah direset.",
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

  // Handle Connect TikTok
  const handleConnectTikTok = async () => {
    setIsConnectingTikTok(true);
    setConnectFeedback({ type: null, message: "" });

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : undefined;
      const res = await getTikTokConnectUrlAction(origin);
      if (res.success && res.authUrl) {
        window.location.href = res.authUrl;
      } else {
        setConnectFeedback({
          type: "error",
          message: res.error || "Gagal memulai sesi otorisasi TikTok Zernio.",
        });
        setIsConnectingTikTok(false);
      }
    } catch {
      setConnectFeedback({
        type: "error",
        message: "Terjadi kesalahan saat menghubungi server.",
      });
      setIsConnectingTikTok(false);
    }
  };

  // Handle Connect LinkedIn
  const handleConnectLinkedIn = async () => {
    setIsConnectingLinkedIn(true);
    setConnectFeedback({ type: null, message: "" });

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : undefined;
      const res = await getLinkedInConnectUrlAction(origin);
      if (res.success && res.authUrl) {
        window.location.href = res.authUrl;
      } else {
        setConnectFeedback({
          type: "error",
          message: res.error || "Gagal memulai sesi otorisasi LinkedIn Zernio.",
        });
        setIsConnectingLinkedIn(false);
      }
    } catch {
      setConnectFeedback({
        type: "error",
        message: "Terjadi kesalahan saat menghubungi server.",
      });
      setIsConnectingLinkedIn(false);
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

  const hasKeys = (data?.apiKeys && data.apiKeys.length > 0) || Boolean(data?.workspace?.isApiKeyConfigured);
  const totalCapacity = data?.totalCapacity || (hasKeys ? 2 : 0);
  const totalUsed = data?.totalUsed || 0;
  const isAtCapacity = totalCapacity > 0 && totalUsed >= totalCapacity;

  const connectedInstagram = data?.connectedAccounts.filter(
    (a) => a.provider.toLowerCase() === "instagram"
  );
  const connectedThreads = data?.connectedAccounts.filter(
    (a) => a.provider.toLowerCase() === "threads"
  );
  const connectedTikTok = data?.connectedAccounts.filter(
    (a) => a.provider.toLowerCase() === "tiktok"
  );
  const connectedLinkedIn = data?.connectedAccounts.filter(
    (a) => a.provider.toLowerCase() === "linkedin"
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
            Kelola saluran Instagram, Threads, TikTok, & LinkedIn dengan pool API Key Zernio (maks 2 akun/key).
          </p>
        </div>

        {/* Global Capacity Badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto bg-surface-container-lowest border border-outline-variant/40 px-3.5 py-2 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hasKeys
                  ? isAtCapacity
                    ? "bg-amber-500"
                    : "bg-emerald-500 animate-pulse"
                  : "bg-red-400"
              }`}
            />
            <div className="text-left">
              <p className="font-label-sm text-xs font-semibold text-on-surface">
                {hasKeys
                  ? `${totalUsed} / ${totalCapacity} Slot Akun Terpakai`
                  : "Belum Ada API Key"}
              </p>
              <p className="text-[10px] text-on-surface-variant">
                {hasKeys ? `${data?.apiKeys.length || 1} API Key Terdaftar` : "Maks 2 akun per API key"}
              </p>
            </div>
          </div>
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

      {/* 2. Step 1: Pool Kunci API Zernio (Multi-Key Management) */}
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
                    1. Pool Kunci API Zernio (Multi-Key)
                  </h2>
                  {hasKeys && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Check className="w-3 h-3" />
                      {data?.apiKeys.length || 1} Key Aktif
                    </span>
                  )}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-2xl">
                  <strong>Aturan Kapasitas Zernio:</strong> 1 API Key Zernio hanya dapat menangani maksimal <strong>2 akun media sosial</strong>. Tambahkan API Key baru untuk menghubungkan akun ke-3, ke-4, dst. Sistem otomatis membagi akun dan menjadwalkan postingan ke masing-masing API Key.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start">
              {hasKeys && (
                <button
                  type="button"
                  onClick={() => setShowAddKeyModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah API Key Baru</span>
                </button>
              )}

              {hasKeys && (
                <button
                  type="button"
                  onClick={handleResetAllKeys}
                  className="text-xs text-error hover:bg-error-container/30 px-2.5 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1 cursor-pointer"
                  title="Reset Semua API Key"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Quota Progress Bar */}
          {hasKeys && (
            <div className="mt-4 pt-3 border-t border-outline-variant/20">
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="text-on-surface-variant">
                  Kapasitas Total: <strong>{totalUsed} dari {totalCapacity} Akun Digunakan</strong>
                </span>
                <span className={isAtCapacity ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
                  {isAtCapacity
                    ? "Kapasitas Penuh (Perlu Key Tambahan untuk Akun Baru)"
                    : `${totalCapacity - totalUsed} Slot Tersedia`}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isAtCapacity
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-space-lg lg:p-space-xl">
          {/* If No Keys Registered Yet: Show Initial Setup Form */}
          {!hasKeys ? (
            <form onSubmit={handleSaveInitialApiKey} className="space-y-4 max-w-2xl">
              <div>
                <label className="block font-label-md text-label-md font-semibold text-on-surface mb-1.5">
                  Zernio API Secret Key Pertama
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Contoh: zernio_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/40 bg-surface text-on-surface font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-xs font-semibold cursor-pointer px-1"
                  >
                    {showApiKey ? "Sembunyikan" : "Lihat"}
                  </button>
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant mt-1.5">
                  Dapatkan API Key di menu Dashboard Akun Zernio Anda (zernio.com).
                </p>
              </div>

              {keyFeedback.message && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                    keyFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {keyFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{keyFeedback.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingKey || !apiKeyInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
              >
                {isSavingKey ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memvalidasi dengan Zernio...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan & Verifikasi API Key Pertama</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Multi-Key Pool Cards Grid */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.apiKeys.map((keyItem, idx) => {
                  const keyAccounts = data.connectedAccounts.filter(
                    (acc) => acc.zernioKeyId === keyItem.id
                  );
                  const isKeyFull = (keyItem.connectedCount || 0) >= (keyItem.maxAccounts || 2);

                  return (
                    <div
                      key={keyItem.id || idx}
                      className="p-4 rounded-2xl bg-surface border border-outline-variant/30 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              #{idx + 1}
                            </div>
                            <div>
                              <h3 className="font-label-lg font-bold text-on-surface text-sm">
                                {keyItem.label || `API Key #${idx + 1}`}
                              </h3>
                              <p className="font-mono text-[11px] text-outline">
                                {keyItem.maskedApiKey}
                              </p>
                            </div>
                          </div>

                          {/* Slot Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isKeyFull
                                ? "bg-amber-100 text-amber-900 border-amber-300"
                                : "bg-emerald-100 text-emerald-900 border-emerald-300"
                            }`}
                          >
                            {isKeyFull
                              ? `🔴 2/2 Penuh`
                              : `🟢 ${keyItem.connectedCount || 0}/${keyItem.maxAccounts || 2} Terpakai`}
                          </span>
                        </div>

                        {/* Associated Accounts under this key */}
                        <div className="mt-3 pt-2.5 border-t border-outline-variant/20">
                          <p className="text-[11px] font-semibold text-on-surface-variant mb-1.5">
                            Akun Tertaut pada Key ini:
                          </p>
                          {keyAccounts.length > 0 ? (
                            <div className="space-y-1">
                              {keyAccounts.map((acc) => (
                                <div
                                  key={acc.id}
                                  className="flex items-center justify-between text-xs px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/20"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="font-semibold text-on-surface">
                                      @{acc.username}
                                    </span>
                                    <span className="text-[10px] text-outline capitalize">
                                      ({acc.provider})
                                    </span>
                                  </div>
                                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-outline italic bg-surface-container-lowest/50 px-2 py-1 rounded-lg">
                              Belum ada akun yang tertaut. Siap menerima hingga 2 akun baru.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Key Footer Action */}
                      <div className="mt-4 pt-2 flex items-center justify-between">
                        <span className="text-[10px] text-outline">
                          Maks: 2 akun media sosial
                        </span>

                        {data.apiKeys.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteApiKey(keyItem.id, keyItem.label)}
                            disabled={deletingKeyId === keyItem.id}
                            className="text-[11px] text-error hover:bg-error-container/30 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Hapus API Key ini"
                          >
                            {deletingKeyId === keyItem.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            <span>Hapus Key</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informative Auto-Balancing Callout */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Penyesuaian Otomatis Aktif:</strong> Saat Anda menghubungkan akun Instagram, Threads, TikTok, atau LinkedIn baru, sistem akan otomatis memilih API Key yang slotnya masih kosong. Saat jadwal postingan tiba, sistem otomatis membagi dan mengirim postingan ke masing-masing API Key tanpa perlu pengaturan manual.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Tambah API Key Zernio Baru */}
      {showAddKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-headline-sm font-bold text-base text-on-surface">
                  Tambah API Key Zernio Baru
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddKeyModal(false);
                  setModalFeedback({ type: null, message: "" });
                }}
                className="text-outline hover:text-on-surface cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Label / Nama API Key
                </label>
                <input
                  type="text"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  placeholder={`Contoh: API Key #${(data?.apiKeys.length || 0) + 1}`}
                  className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Zernio API Secret Key *
                </label>
                <input
                  type="password"
                  value={newKeyInput}
                  onChange={(e) => setNewKeyInput(e.target.value)}
                  placeholder="zernio_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/40 bg-surface text-on-surface font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
                <p className="text-[11px] text-outline mt-1">
                  Penambahan API Key ini akan menambah kapasitas hingga <strong>2 akun media sosial baru</strong>.
                </p>
              </div>

              {modalFeedback.message && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                    modalFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {modalFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{modalFeedback.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setShowAddKeyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-on-surface-variant hover:bg-surface cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingKey || !newKeyInput.trim()}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isAddingKey ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan API Key</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Step 2 Section: Hubungkan Saluran Media Sosial */}
      {hasKeys ? (
        <div className="space-y-space-lg animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                2. Hubungkan Saluran Media Sosial
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                Akun akan otomatis dialokasikan ke API Key yang masih memiliki kuota (<span className="text-primary font-bold">maks 2 akun per key</span>).
              </p>
            </div>
          </div>

          {/* Social Channels Grid - 4 Active Platforms */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-base">
            {/* 1. INSTAGRAM */}
            <div className="bg-surface-container-lowest rounded-2xl border-2 border-primary/30 p-space-base shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />

              <div>
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Instagram
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                    Instagram Business
                  </h3>
                  <p className="font-body-sm text-[11px] text-on-surface-variant mt-1 line-clamp-2">
                    Auto-publish Feed, Carousel, dan Story ke akun Instagram Business.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant/30 space-y-2">
                {connectedInstagram && connectedInstagram.length > 0 ? (
                  <div className="space-y-1.5">
                    {connectedInstagram.map((igAcc) => (
                      <div
                        key={igAcc.id}
                        className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[11px] font-semibold truncate">
                            @{igAcc.username}
                          </span>
                        </div>
                        <span className="text-[9px] font-medium bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700 shrink-0">
                          {igAcc.zernioKeyLabel || "Key #1"}
                        </span>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleConnectInstagram}
                      disabled={isConnectingInstagram || isAtCapacity}
                      className="w-full py-1.5 px-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Akun IG</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectInstagram}
                    disabled={isConnectingInstagram || isAtCapacity}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:opacity-95 text-white font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all text-xs disabled:opacity-60 cursor-pointer"
                  >
                    {isConnectingInstagram ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    <span>Hubungkan IG</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. THREADS */}
            <div className="bg-surface-container-lowest rounded-2xl border-2 border-black/20 dark:border-white/20 p-space-base shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-black/5 via-zinc-500/10 to-transparent rounded-bl-full pointer-events-none" />

              <div>
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 192 192">
                      <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.745C75.2536 44.745 57.6534 59.8804 53.6499 82.2608C49.6464 104.641 60.3344 126.969 80.127 137.545C97.8099 146.992 119.985 144.137 134.428 130.485L120.73 117.078C110.849 126.417 95.8078 128.261 83.7431 121.815C70.2526 114.608 62.9734 99.3789 65.7011 84.126C68.4288 68.8732 80.4288 58.5583 95.3995 58.5583C95.4764 58.5583 95.554 58.5583 95.631 58.5587C112.592 58.6669 122.846 69.4586 123.87 88.3582C106.942 86.8837 89.3776 90.7937 77.0395 101.444C60.9161 115.361 58.5135 137.525 71.6661 150.963C84.8188 164.402 107.013 162.597 122.384 148.067C130.82 140.092 136.009 129.475 138.358 117.848C148.966 123.864 159.208 127.351 168.971 128.243C174.636 128.761 180.207 128.283 185.642 126.814L182.115 113.805C178.411 114.806 174.613 115.132 170.757 114.779C162.616 114.035 153.844 110.741 144.532 104.935C144.757 99.5108 143.754 94.1843 141.537 88.9883ZM114.341 135.539C102.871 146.381 86.2925 147.728 76.4719 137.695C66.6513 127.661 68.4452 111.112 80.4839 100.72C89.7042 92.7601 103.266 89.6587 116.326 90.6725C115.827 106.331 113.252 122.253 114.341 135.539Z" />
                    </svg>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-on-surface border border-black/15">
                    Threads
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                    Threads by Meta
                  </h3>
                  <p className="font-body-sm text-[11px] text-on-surface-variant mt-1 line-clamp-2">
                    Auto-publish caption khusus singkat (≤ 500 karakter) ke Threads.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant/30 space-y-2">
                {connectedThreads && connectedThreads.length > 0 ? (
                  <div className="space-y-1.5">
                    {connectedThreads.map((thAcc) => (
                      <div
                        key={thAcc.id}
                        className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[11px] font-semibold truncate">
                            @{thAcc.username}
                          </span>
                        </div>
                        <span className="text-[9px] font-medium bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700 shrink-0">
                          {thAcc.zernioKeyLabel || "Key #1"}
                        </span>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleConnectThreads}
                      disabled={isConnectingThreads || isAtCapacity}
                      className="w-full py-1.5 px-2 rounded-lg border border-black/30 dark:border-white/30 text-on-surface hover:bg-surface text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Akun Threads</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectThreads}
                    disabled={isConnectingThreads || isAtCapacity}
                    className="w-full py-2 px-3 rounded-xl bg-black hover:bg-zinc-800 text-white font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all text-xs disabled:opacity-60 cursor-pointer"
                  >
                    {isConnectingThreads ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    <span>Hubungkan Threads</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. TIKTOK */}
            <div className="bg-surface-container-lowest rounded-2xl border-2 border-cyan-500/30 p-space-base shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[#00F2FE]/10 via-[#FF004F]/10 to-transparent rounded-bl-full pointer-events-none" />

              <div>
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-[#010101] text-white flex items-center justify-center shadow-sm ring-1 ring-cyan-500/30">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                    </svg>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                    TikTok Video
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                    TikTok Official
                  </h3>
                  <p className="font-body-sm text-[11px] text-on-surface-variant mt-1 line-clamp-2">
                    Auto-publish konten video Shorts dan promosi visual langsung ke akun TikTok.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant/30 space-y-2">
                {connectedTikTok && connectedTikTok.length > 0 ? (
                  <div className="space-y-1.5">
                    {connectedTikTok.map((ttAcc) => (
                      <div
                        key={ttAcc.id}
                        className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[11px] font-semibold truncate">
                            @{ttAcc.username}
                          </span>
                        </div>
                        <span className="text-[9px] font-medium bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700 shrink-0">
                          {ttAcc.zernioKeyLabel || "Key #1"}
                        </span>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleConnectTikTok}
                      disabled={isConnectingTikTok || isAtCapacity}
                      className="w-full py-1.5 px-2 rounded-lg border border-cyan-500/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Akun TikTok</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectTikTok}
                    disabled={isConnectingTikTok || isAtCapacity}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-zinc-900 via-neutral-900 to-black text-white hover:opacity-95 font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all text-xs disabled:opacity-60 cursor-pointer border border-cyan-500/40"
                  >
                    {isConnectingTikTok ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span>Hubungkan TikTok</span>
                  </button>
                )}
              </div>
            </div>

            {/* 4. LINKEDIN */}
            <div className="bg-surface-container-lowest rounded-2xl border-2 border-[#0A66C2]/30 p-space-base shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[#0A66C2]/10 via-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />

              <div>
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-[#0A66C2] text-white flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    LinkedIn
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                    LinkedIn Network
                  </h3>
                  <p className="font-body-sm text-[11px] text-on-surface-variant mt-1 line-clamp-2">
                    Auto-publish konten profesional, company update, dan carousels edukasi ke LinkedIn.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant/30 space-y-2">
                {connectedLinkedIn && connectedLinkedIn.length > 0 ? (
                  <div className="space-y-1.5">
                    {connectedLinkedIn.map((liAcc) => (
                      <div
                        key={liAcc.id}
                        className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[11px] font-semibold truncate">
                            @{liAcc.username}
                          </span>
                        </div>
                        <span className="text-[9px] font-medium bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700 shrink-0">
                          {liAcc.zernioKeyLabel || "Key #1"}
                        </span>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleConnectLinkedIn}
                      disabled={isConnectingLinkedIn || isAtCapacity}
                      className="w-full py-1.5 px-2 rounded-lg border border-[#0A66C2]/30 text-[#0A66C2] hover:bg-blue-50 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Akun LinkedIn</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectLinkedIn}
                    disabled={isConnectingLinkedIn || isAtCapacity}
                    className="w-full py-2 px-3 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all text-xs disabled:opacity-60 cursor-pointer"
                  >
                    {isConnectingLinkedIn ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    <span>Hubungkan LinkedIn</span>
                  </button>
                )}
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
                  Setiap akun terikat ke API Key masing-masing dan akan menerima jadwal otomatis saat postingan disetujui.
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
                {data.connectedAccounts.map((account) => {
                  const pLower = account.provider.toLowerCase();
                  return (
                    <div
                      key={account.id || account.providerAccountId}
                      className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
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
                              pLower === "threads"
                                ? "bg-black"
                                : pLower === "tiktok"
                                ? "bg-black ring-cyan-400"
                                : pLower === "linkedin"
                                ? "bg-[#0A66C2]"
                                : "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600"
                            }`}
                          >
                            {pLower === "threads"
                              ? "@"
                              : pLower === "tiktok"
                              ? "TT"
                              : pLower === "linkedin"
                              ? "in"
                              : "IG"}
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
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <p className="font-code-sm text-xs text-outline truncate">
                              @{account.username} ·{" "}
                              {pLower === "threads"
                                ? "Threads by Meta"
                                : pLower === "tiktok"
                                ? "TikTok Official"
                                : pLower === "linkedin"
                                ? "LinkedIn Network"
                                : "Instagram Business"}
                            </p>
                            {/* Key Allocation Tag */}
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-container border border-outline-variant/30 text-on-surface">
                              <Key className="w-2.5 h-2.5 text-primary" />
                              <span>via {account.zernioKeyLabel || "API Key #1"}</span>
                            </span>
                          </div>
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
                  );
                })}
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
                  Klik tombol <strong>Hubungkan Akun</strong> di atas untuk mengotentikasi akun Instagram, Threads, TikTok, atau LinkedIn Anda melalui Zernio.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
