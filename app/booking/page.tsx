import type { Metadata } from "next";
import { BRAND } from "@/lib/config";
import dynamic from "next/dynamic";
import { Label } from "@/components/sections/Label";

export const metadata: Metadata = { title: `Book an audit — ${BRAND.name}` };

// Split chunk; pre-warmed by TransitionProvider on idle → instant on navigation.
const BookingForm = dynamic(() => import("@/components/booking/BookingForm"));

export default function BookingPage() {
  return (
    <main data-section="B1 // Booking" className="poster-grid min-h-svh gap-y-12 pb-[14vh] pt-[18vh]">
      <div className="col-span-12" data-enter-fade>
        <Label n="B1" meta="20 MIN · VIDEO OR PHONE">Book an audit</Label>
      </div>
      <div className="col-span-12 lg:col-span-5">
        <h1 data-enter className="font-poster text-h1 text-signal">
          Show us your
          <br />
          <span className="text-beige">busiest week.</span>
        </h1>
        <p data-enter className="mt-8 max-w-[38ch] font-body text-lead text-beige/80">
          We&rsquo;ll map every repetitive task, price what it costs you, and tell you honestly which ones an agent can take.
        </p>
        <ol className="mt-10 space-y-3 font-mono text-sm text-beige/80" data-enter-fade>
          <li><span className="text-signal">01</span> — You fill this in (60 seconds)</li>
          <li><span className="text-signal">02</span> — We send 3 time slots</li>
          <li><span className="text-signal">03</span> — 20-minute call, written summary after</li>
        </ol>
      </div>
      <div className="col-span-12 lg:col-span-6 lg:col-start-7" data-enter-fade>
        <BookingForm />
      </div>
    </main>
  );
}
