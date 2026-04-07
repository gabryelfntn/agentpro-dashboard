import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "./pwa-register";
import type { Viewport } from "next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentPro — Tableau de bord",
  description: "Vue d'ensemble de votre activité — chantiers, devis et pilotage commercial.",
  applicationName: "AgentPro",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body className={`${inter.className} min-h-full antialiased app-shell-bg`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
