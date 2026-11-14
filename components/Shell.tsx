"use client";

import { CanvasRoot } from "@/components/canvas/CanvasRoot";
import { Cursor } from "@/components/dom/Cursor";
import { HintToast } from "@/components/dom/HintToast";
import { Hotspots } from "@/components/dom/Hotspots";
import { InfoPanel } from "@/components/dom/InfoPanel";
import { Hud } from "@/components/dom/Hud";
import { PageCounter } from "@/components/dom/PageCounter";
import { Preloader } from "@/components/dom/Preloader";
import { Reveals } from "@/components/dom/Reveals";
import { SmoothScroll } from "@/components/dom/SmoothScroll";
import { WarpFilter } from "@/components/dom/WarpFilter";
import { Footer } from "@/components/sections/Footer";
import { TransitionProvider } from "@/components/transition/TransitionProvider";

/**
 * PERSISTENT SHELL — mounted once in the root layout, never by a page.
 * Only `children` (the route segment) swaps on navigation; everything else,
 * including the WebGL context, survives every route change.
 *
 * Layer stack (z):
 *   0   WebGL canvas (fixed)        — moon scene: terrain, orb, beam, dust, storm, post FX, cursor lens
 *   5   DOM light source            — cursor spotlight
 *   10  #page (route content)       — sliced in/out on navigation
 *   20  Hotspots                    — clickable orb/storm markers, projected from 3D
 *   30  Hint toast
 *   50  HUD (fixed)                 — frame, coords, scroll gauge, nav, [[00X]] page counter
 *   60/70 Info panel (veil + sheet)
 *   90  Transition seam
 *   100 Preloader                   — blast doors (first load only)
 *   200 Cursor
 */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      <WarpFilter />
      <CanvasRoot />
      <Cursor />
      <Hotspots />
      <HintToast />
      <TransitionProvider
        chrome={
          <>
            <Hud />
            <PageCounter />
          </>
        }
      >
        <Reveals />
        {children}
        <Footer />
      </TransitionProvider>
      <InfoPanel />
      <Preloader />
    </>
  );
}
