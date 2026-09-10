import type { Metadata } from "next";
import { Bot, LogOut, Shield } from "lucide-react";
import { logoutUser } from "./onboarding/actions";

export const metadata: Metadata = {
  title: "Onboarding Wizard — AutoContent AI",
  description: "Lengkapi profil bisnis dan brand kit Anda untuk memulai otomatisasi konten AI.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface flex flex-col selection:bg-primary-container selection:text-on-primary">
      {/* Top Header */}
      <header className="w-full bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/40 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-label-md font-bold text-on-surface tracking-tight">
                  AutoContent AI
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-fixed text-on-primary-fixed-variant uppercase tracking-wider">
                  Setup Wizard
                </span>
              </div>
            </div>
          </div>

          {/* Right actions: Help & Logout */}
          <div className="flex items-center gap-4 text-outline font-label-sm text-label-sm">
            <div className="hidden sm:flex items-center gap-1.5 text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
              <span>AI Engine Siap Dikonfigurasi</span>
            </div>

            <div className="h-4 w-px bg-outline-variant/50 hidden sm:block"></div>

            <form action={logoutUser}>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors cursor-pointer"
                title="Keluar dari akun saat ini"
              >
                <LogOut className="w-[18px] h-[18px]" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 md:py-12 flex flex-col justify-start">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-outline-variant/30 py-4 text-center text-xs text-outline font-label-sm">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 AutoContent AI Inc. Hak cipta dilindungi.</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Enkripsi 256-bit
            </span>
            <span>•</span>
            <span>Bantuan Setup: support@autocontent.ai</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
