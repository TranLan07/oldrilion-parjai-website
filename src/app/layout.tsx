import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Le Hub — Hub Mandalorien",
  description: "Hub regroupant les clans mandaloriens du serveur RP Star Wars",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Parjai Hub",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <head>
        <meta name="theme-color" content="#c9a84c" />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
