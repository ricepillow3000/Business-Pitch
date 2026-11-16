import { Arrow } from "@/components/Arrow";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { ContactForm } from "@/components/ContactForm";
import { CopyEmail } from "@/components/CopyEmail";
import { SitePage } from "@/components/SitePage";
import { EMAIL, GMAIL, SHOW_EMAIL } from "@/lib/contact";

export const metadata: Metadata = pageMeta(
  "Contact | JIDO",
  "Send JIDO a message about the work that takes up your week. We reply by email.",
  "/contact",
);

export default function Contact() {
  return (
    <SitePage label="CONTACT" title="Send us a message." intro={<p>Tell us what takes up your week. We reply by email.</p>}>
      <div className="grid gap-16 md:grid-cols-12">
        <div className="md:col-span-7">
          <ContactForm />
        </div>
        <div className="quiet space-y-8 md:col-span-4 md:col-start-9">
          <div className="space-y-3">
            <h2 className="font-label text-beige">// Rather talk?</h2>
            <p className="text-flag">
              <a href="/book" className="text-beige">Book a discovery call</a>.
            </p>
          </div>
          {SHOW_EMAIL && (
            <div className="space-y-3">
              <h2 className="font-label text-beige">// Email</h2>
              <p className="break-all text-flag">
                <a href={GMAIL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-beige">
                  {EMAIL}
                  &nbsp;<Arrow />
                  <span className="sr-only"> (opens Gmail in a new tab)</span>
                </a>
              </p>
              <CopyEmail />
            </div>
          )}
          <div className="space-y-3">
            <h2 className="font-label text-beige">// Privacy requests</h2>
            <p className="text-flag">
              See <a href="/legal-contact" className="text-beige">Legal contact</a>.
            </p>
          </div>
        </div>
      </div>
    </SitePage>
  );
}
