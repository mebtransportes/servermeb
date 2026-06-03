import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LOGO_SRC } from "@/components/brand/logo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEB — Gestão de Transporte",
  description: "Sistema de gestão de transporte",
  icons: {
    icon: LOGO_SRC,
    shortcut: LOGO_SRC,
    apple: LOGO_SRC,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#121212] text-slate-100">{children}</body>
    </html>
  );
}
