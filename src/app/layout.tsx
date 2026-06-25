import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider, ThemeScript } from "@/components/ThemeProvider";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Client Inbox Tracker",
  description: "Track client emails per project — L2 routing, SLA, escalation",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "InboxTracker" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Apply theme before paint to prevent flash. */}
        <ThemeScript />
      </head>
      <body className="h-full antialiased bg-bg text-fg">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
