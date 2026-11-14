"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useTransitionRouter } from "./TransitionProvider";

/**
 * Drop-in <Link>: keeps Next's viewport prefetch, adds hover/focus prefetch,
 * and routes the click through the choreographed transition.
 */
export function TransitionLink({ href, onClick, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const { navigate, prefetch } = useTransitionRouter();
  return (
    <Link
      href={href}
      prefetch
      onPointerEnter={() => prefetch(href)}
      onFocus={() => prefetch(href)}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    />
  );
}
