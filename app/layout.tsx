import type { Metadata, Viewport } from "next";
import { Cursor } from "@/components/Cursor";
import { HUD } from "@/components/HUD";
import { Loader } from "@/components/Loader";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

export const metadata: Metadata = {
  title: "JIDO | Intelligent workflows for local businesses",
  description:
    "We build intelligent workflows for local businesses. Automate the repetitive, focus on the essential.",
};

// viewport-fit=cover: the page may run under a phone's notch; the HUD and gutters
// then pad themselves with env(safe-area-inset-*) so nothing gets hidden.
export const viewport: Viewport = { themeColor: "#14181b", viewportFit: "cover" };

/**
 * Persistent shell. Mounted once; nothing here ever re-mounts.
 *
 *   z-[200]  Cursor        (fixed, pointer-events-none)
 *   z-[100]  Loader        (first paint only, removes itself)
 *   z-50     HUD           (fixed frame, pointer-events-none)
 *   z-0      {children}    (the page)
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SmoothScroll />
        {children}
        <HUD />
        <Loader />
        <Cursor />
      </body>
    </html>
  );
}
