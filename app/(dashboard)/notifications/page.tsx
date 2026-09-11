"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Bell,
  Mail,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
} from "lucide-react";
import {
  getNotificationSettingsAction,
  saveNotificationSettingsAction,
  sendTestNotificationEmailAction,
  NotificationSettingsData,
} from "./actions";

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettingsData>({
    email: "",
    recipientName: "",
    isActive: true,
    notifyOnPublish: true,
    notifyOnFail: true,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, startSaving] = useTransition();
  const [isTesting, startTesting] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await getNotificationSettingsAction();
        if (res.success && res.settings) {
          setSettings(res.settings);
        }
      } catch (err: any) {
        setFeedback({
          type: "error",
          message: err.message || "Gagal memuat pengaturan notifikasi.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = () => {
    if (!settings.email || !settings.email.includes("@")) {
      setFeedback({
        type: "error",
        message: "Harap masukkan alamat email penerima yang valid.",
      });
      return;
    }

    setFeedback(null);
    startSaving(async () => {
      const res = await saveNotificationSettingsAction(settings);
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message || "Alamat email notifikasi berhasil disimpan!",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan pengaturan.",
        });
      }
    });
  };

  const handleTestEmail = () => {
    setFeedback(null);
    startTesting(async () => {
      // Auto-save first if modified
      await saveNotificationSettingsAction(settings);
      const res = await sendTestNotificationEmailAction();
      if (res.success) {
        setFeedback({
          type: "success",
          message: res.message,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal mengirim email uji coba.",
        });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Bell className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              Pengaturan Notifikasi Email
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Brevo Engine
            </span>
          </div>
          <p className="text-sm text-outline">
            Daftarkan email Anda untuk menerima pemberitahuan otomatis setiap kali konten berhasil tayang di Instagram via Zernio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={isTesting || isLoading || isSaving}
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border border-outline-variant/60 hover:bg-surface-container transition-colors text-on-surface cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Send className="w-4 h-4 text-primary" />
            )}
            <span>Kirim Email Uji Coba</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border transition-all text-sm ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
              : feedback.type === "error"
              ? "bg-error/10 border-error/30 text-error"
              : "bg-surface-container border-outline-variant/50 text-on-surface"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-error mt-0.5" />
          )}
          <div className="flex-1 font-medium">{feedback.message}</div>
          <button
            onClick={() => setFeedback(null)}
            className="text-outline hover:text-on-surface text-xs underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Form: Clean & Simple for User Input */}
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-5 sm:p-8 space-y-6 shadow-xs">
        {/* Toggle Master Notifikasi */}
        <div className="flex items-center justify-between pb-6 border-b border-outline-variant/30">
          <div className="space-y-0.5">
            <label className="text-base font-bold text-on-surface cursor-pointer flex items-center gap-2">
              <span>Aktifkan Notifikasi Email</span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  settings.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-surface-container-highest text-outline"
                }`}
              >
                {settings.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </label>
            <p className="text-xs sm:text-sm text-outline">
              Aktifkan untuk menerima email konfirmasi otomatis setiap kali postingan berhasil tayang di Instagram.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.isActive}
            onClick={() => setSettings((s) => ({ ...s, isActive: !s.isActive }))}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.isActive ? "bg-emerald-500" : "bg-outline-variant/60"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                settings.isActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* User Input: Recipient Email & Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-on-surface flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-primary" />
              <span>Email Penerima</span>
              <span className="text-error font-bold">*</span>
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))}
              placeholder="nama@email.com"
              className="w-full px-4 py-2.5 bg-surface rounded-xl border border-outline-variant/40 text-on-surface text-sm placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            <p className="text-[11px] text-outline">
              Email yang Anda daftarkan di sini akan menerima kiriman laporan postingan secara otomatis.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-on-surface flex items-center gap-1.5">
              <span>Nama Penerima (Opsional)</span>
            </label>
            <input
              type="text"
              value={settings.recipientName || ""}
              onChange={(e) => setSettings((s) => ({ ...s, recipientName: e.target.value }))}
              placeholder="contoh: Windi"
              className="w-full px-4 py-2.5 bg-surface rounded-xl border border-outline-variant/40 text-on-surface text-sm placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            <p className="text-[11px] text-outline">
              Nama ini akan dicantumkan pada sapaan pembuka email.
            </p>
          </div>
        </div>

        {/* Trigger Preferences */}
        <div className="space-y-3 pt-2">
          <label className="text-xs sm:text-sm font-semibold text-on-surface">
            Pemicu Notifikasi
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-outline-variant/40 bg-surface/50 hover:bg-surface transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnPublish}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, notifyOnPublish: e.target.checked }))
                }
                className="mt-0.5 rounded border-outline text-primary focus:ring-primary h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-bold text-on-surface block mb-0.5">
                  Saat Postingan Berhasil Terbit (Live)
                </span>
                <span className="text-outline block">
                  Kirim email konfirmasi lengkap beserta thumbnail media, caption, dan waktu tayang.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-outline-variant/40 bg-surface/50 hover:bg-surface transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnFail}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, notifyOnFail: e.target.checked }))
                }
                className="mt-0.5 rounded border-outline text-primary focus:ring-primary h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-bold text-on-surface block mb-0.5">
                  Saat Postingan Mengalami Kendala / Gagal
                </span>
                <span className="text-outline block">
                  Kirim peringatan cepat bila Zernio melaporkan kegagalan pengiriman postingan.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Button Row */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/30">
          <button
            type="button"
            onClick={handleTestEmail}
            disabled={isTesting || isLoading || isSaving}
            className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-xl border border-outline-variant/60 hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : (
              <Send className="w-4 h-4 text-primary" />
            )}
            <span>Kirim Email Uji Coba</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      {/* Email Preview Card Mockup */}
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-5 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-on-surface">
              Pratinjau Format Email Notifikasi
            </h2>
          </div>
          <span className="text-[11px] text-outline font-medium">
            Format HTML Responsif
          </span>
        </div>

        <div className="max-w-xl mx-auto rounded-2xl border border-outline-variant/40 bg-slate-900 text-slate-100 overflow-hidden shadow-md">
          <div className="bg-gradient-to-r from-indigo-950 via-indigo-900 to-indigo-800 p-5 text-center space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              ✓ Live di Media Sosial
            </span>
            <h3 className="text-base font-bold text-white">Postingan Anda Berhasil Terbit!</h3>
            <p className="text-xs text-indigo-200">Zernio mengonfirmasi konten Anda telah tayang di Instagram.</p>
          </div>
          <div className="p-4 space-y-3 text-xs">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-2">
              <div className="font-bold text-sm text-white">
                5 Strategi Menumbuhkan Bisnis dengan Konten AI
              </div>
              <div className="bg-slate-950/70 border-l-2 border-indigo-500 p-2.5 rounded text-[11px] text-slate-300 italic">
                &ldquo;Ingin omset bisnis meningkat tanpa pusing membuat konten setiap hari? Simak tips praktisnya di slide berikut... #BisnisOnline #AIContent&rdquo;
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                <div>Platform: <strong className="text-slate-200">Instagram</strong></div>
                <div>Status: <strong className="text-emerald-400">PUBLISHED</strong></div>
              </div>
            </div>
            <div className="w-full text-center py-2 bg-indigo-600 rounded-lg text-white font-bold text-xs">
              📅 Buka Content Calendar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
