import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND } from "@/lib/config";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: `${BRAND.name} — AI agents that do the busywork`,
  description: "AI automation agency for local businesses. Agents that answer, book, invoice and follow up — while you run the business.",
};

export const viewport: Viewport = { themeColor: "#152626" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
