import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Le Hub — Hub Mandalorien",
  description: "Hub regroupant les clans mandaloriens du serveur RP Star Wars",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
