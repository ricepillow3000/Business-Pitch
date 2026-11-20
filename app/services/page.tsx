import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { NextSteps, SitePage, Status } from "@/components/SitePage";

export const metadata: Metadata = pageMeta(
  "Services | JIDO",
  "AI receptionist, lead capture, booking and admin automations for local businesses, each marked with how far along it honestly is.",
  "/services",
);

/** Problem → what we build → how far along it honestly is. */
const SERVICES = [
  {
    problem: "Inquiries go unanswered after hours.",
    build: "An AI receptionist on your website that answers from information you approve, and hands anything it cannot answer to a person on your team.",
    status: "In pilot",
    note: "Built and tested with sample data. Live testing comes before client launch.",
  },
  {
    problem: "Leads get lost in inboxes.",
    build: "Every inquiry lands in one list with the contact details, the reason and a short summary, and you get an email when someone is ready to book.",
    status: "In pilot",
    note: "Built and tested with sample data.",
  },
  {
    problem: "Booking takes too many emails.",
    build: "Customers see real open times from your calendar and book after confirming one. Double bookings are blocked. Changes go to a person.",
    status: "In pilot",
    note: "Built and tested with sample data, using Google Calendar.",
  },
  {
    problem: "The same admin task, every week.",
    build: "A focused automation for one repetitive job, such as moving form entries into a spreadsheet and alerting the right person.",
    status: "Scoped per project",
    note: "We confirm what is possible on the discovery call.",
  },
  {
    problem: "You need something bigger.",
    build: "Voice agents, CRM integrations and custom systems.",
    status: "Quote after discovery",
    note: "Not built yet. We only quote what we can test first.",
  },
];

export default function Services() {
  return (
    <SitePage
      label="SERVICES"
      title="What we automate."
      intro={
        <p>
          We build AI-assisted systems that take repetitive front-desk and admin work off your plate. We are a new agency, so each service
          below says honestly how far along it is.
        </p>
      }
    >
      <ol className="border-t border-slate-line">
        {SERVICES.map((s) => (
          <li key={s.problem} className="grid gap-4 border-b border-slate-line py-10 md:grid-cols-12 md:gap-10">
            <h2 className="font-wide text-[clamp(1.25rem,2vw,1.75rem)] leading-tight text-beige md:col-span-5">{s.problem}</h2>
            <div className="quiet space-y-4 md:col-span-6 md:col-start-7">
              <p className="max-w-[52ch] text-flag">{s.build}</p>
              <Status>{s.status}</Status>
              <p className="max-w-[52ch] text-sm leading-relaxed text-flag">{s.note}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-24 font-wide text-[clamp(1.25rem,2vw,1.75rem)] text-beige">How a project runs.</h2>
      <div className="quiet mt-8 max-w-[52ch] space-y-4 text-flag">
        <p>
          It starts with a discovery call, where we learn how your business runs and where the time goes. Before any work begins, we agree in
          writing what we build, the usage limits, support and costs.
        </p>
        <p>
          We test everything with sample data before it touches real customers. After launch we watch for errors and adjust as your business
          changes.
        </p>
      </div>

      <p className="quiet mt-16 max-w-[52ch] text-flag">
        We do not handle medical records, payment card numbers or other sensitive information. Healthcare clients need a separate compliance
        review first.
      </p>
      <NextSteps />
    </SitePage>
  );
}
