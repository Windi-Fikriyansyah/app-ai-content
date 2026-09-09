import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk - AutoContent AI",
  description: "Masuk ke AutoContent AI — Enterprise Orchestration Dashboard",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-on-surface antialiased min-h-screen flex items-center justify-center p-space-base relative overflow-x-hidden selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Background Decorative Precision Grid & Light Rays */}
      <div className="fixed inset-0 pointer-events-none -z-10 flex items-center justify-center overflow-hidden">
        <div className="absolute w-[600px] h-[600px] bg-primary-fixed/40 rounded-full blur-3xl -top-40 -left-20 opacity-70"></div>
        <div className="absolute w-[500px] h-[500px] bg-secondary-container/40 rounded-full blur-3xl -bottom-20 -right-20 opacity-60"></div>
        {/* Ultra-subtle engineering crosshair grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(#3525cd 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        ></div>
      </div>

      {children}
    </div>
  );
}
