import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Client Inbox Tracker",
  description: "Track client emails per project",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "InboxTracker" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
