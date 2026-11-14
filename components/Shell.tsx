"use client";

import { CanvasRoot } from "@/components/canvas/CanvasRoot";
import { Cursor } from "@/components/dom/Cursor";
import { HubLabels } from "@/components/dom/HubLabels";
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
 *   0   WebGL canvas (fixed)        — brain, nebula, beam, post FX, cursor lens
 *   5   DOM light source            — cursor spotlight
 *   6   Hub labels                  — projected from 3D
 *   10  #page (route content)       — sliced in/out on navigation
 *   50  HUD (fixed)                 — frame, coords, scroll gauge, nav, [[00X]] page counter
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
      <HubLabels />
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
      <Preloader />
    </>
  );
}
