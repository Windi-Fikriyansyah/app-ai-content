import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoContent AI — Enterprise Orchestration Dashboard",
  description: "Enterprise Orchestration Dashboard for AI Content Operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full bg-surface">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Manrope:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-surface text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
