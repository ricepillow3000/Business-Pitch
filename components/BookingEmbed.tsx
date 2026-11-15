"use client";

import { Arrow } from "@/components/Arrow";
import { useState } from "react";
import { EMAIL } from "@/lib/contact";

const requestLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL)}&su=${encodeURIComponent("Discovery call request")}&body=${encodeURIComponent(
  "Hi JIDO,\n\nI'd like to book a discovery call.\n\nBusiness:\nWhat I'd like to automate:\nTimes that suit me (with time zone):\n",
)}`;

/**
 * Google Calendar appointment schedule, loaded only when the visitor asks for it
 * (progressive disclosure, and no connection to Google until then).
 * Without a booking link yet, it offers a pre-filled email request instead.
 */
export function BookingEmbed({ url }: { url: string | null }) {
  const [show, setShow] = useState(false);

  if (!url)
    return (
      <div data-booking="request" className="quiet max-w-[52ch] space-y-6 border border-slate-line p-6 md:p-8">
        <p className="font-label text-beige">// Online booking is being set up</p>
        <p className="text-flag">Until then, send a request with a few times that suit you and we will confirm one by email.</p>
        <a href={requestLink} target="_blank" rel="noopener noreferrer" className="chamfer inline-flex min-h-11 items-center bg-beige px-7 py-4 font-wide text-sm text-flag-deep">
          Request a call in Gmail &nbsp;<Arrow />
          <span className="sr-only"> (opens Gmail in a new tab)</span>
        </a>
      </div>
    );

  const src = url.includes("gv=true") ? url : `${url}${url.includes("?") ? "&" : "?"}gv=true`;
  return show ? (
    <div className="space-y-4">
      <iframe data-booking="calendar" src={src} title="Book a discovery call (Google Calendar)" className="h-[44rem] w-full max-w-3xl border border-slate-line bg-beige" />
      <a href={url} target="_blank" rel="noopener noreferrer" className="prose-link inline-flex min-h-11 items-center font-label text-flag">
        Open the booking page in a new tab &nbsp;<Arrow />
      </a>
    </div>
  ) : (
    <div data-booking="consent" className="quiet max-w-[52ch] space-y-6 border border-slate-line p-6 md:p-8">
      <p className="text-flag">
        Booking is handled by Google Calendar. Showing the times connects your browser to Google, which may set its own cookies. See our{" "}
        <a href="/privacy#cookies" className="prose-link text-beige">Privacy policy</a>.
      </p>
      <button type="button" onClick={() => setShow(true)} className="chamfer inline-flex min-h-11 items-center bg-beige px-7 py-4 font-wide text-sm text-flag-deep">
        Show available times
      </button>
    </div>
  );
}
