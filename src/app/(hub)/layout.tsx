import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import HubChrome from "@/components/HubChrome";
import Footer from "@/components/Footer";

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<Navbar />}>
        <HubChrome />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
