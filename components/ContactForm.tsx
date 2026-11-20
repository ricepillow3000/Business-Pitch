"use client";

import { Arrow } from "@/components/Arrow";
import { useEffect, useId, useState } from "react";
import { EMAIL } from "@/lib/contact";
import { SITE } from "@/lib/site";
import { TopicCombobox } from "./TopicCombobox";

type Field = "name" | "email" | "business" | "message";
type Errors = Partial<Record<Field, string>>;
type State = "idle" | "sending" | "sent" | "failed";

const LIMITS = { name: 120, email: 200, business: 160, message: 5000 };

/** Same rules as the n8n workflow, so people hear about mistakes before sending. */
function validate(v: Record<Field, string>): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = "Please add your name.";
  else if (v.name.length > LIMITS.name) e.name = "That name is too long.";
  if (!v.email.trim()) e.email = "Please add your email so we can reply.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = "That email address does not look right.";
  if (v.business.length > LIMITS.business) e.business = "That is a bit long. Please shorten it.";
  if (v.message.trim().length < 10) e.message = "Please tell us a little more (at least 10 characters).";
  else if (v.message.length > LIMITS.message) e.message = "Please keep it under 5,000 characters.";
  return e;
}

/**
 * Contact form → n8n webhook (lib/site.ts → contactEndpoint).
 * If the endpoint is missing, unreachable or fails, nothing is lost: the visitor
 * gets a one-click Gmail draft containing exactly what they typed (Postel's law).
 */
export function ContactForm() {
  const id = useId();
  const [v, setV] = useState<Record<Field, string>>({ name: "", email: "", business: "", message: "" });
  const [topic, setTopic] = useState("");
  const [hp, setHp] = useState(""); // honeypot: people never see or fill it
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<State>("idle");

  // arriving from the home page menu with a topic already picked
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("topic");
    if (t) setTopic(t.slice(0, 120));
  }, []);

  const set = (k: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setV((old) => ({ ...old, [k]: e.target.value }));
    if (errors[k]) setErrors((old) => ({ ...old, [k]: undefined }));
  };

  const fallback = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL)}&su=${encodeURIComponent(
    topic ? `Hello JIDO: ${topic}` : "Hello JIDO",
  )}&body=${encodeURIComponent(`${v.message}\n\n${v.name}${v.business ? `, ${v.business}` : ""}\n${v.email}`)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(v);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`${id}-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    if (!SITE.contactEndpoint) return setState("failed");
    setState("sending");
    try {
      const res = await fetch(SITE.contactEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, topic, page: location.pathname, website: hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) return setState("sent");
      if (res.status === 422 && data.errors) {
        setErrors(data.errors);
        return setState("idle");
      }
      setState("failed");
    } catch {
      setState("failed");
    }
  };

  if (state === "sent")
    return (
      <div role="status" data-form-state="sent" className="quiet max-w-[52ch] space-y-4 border border-beige/50 p-6 md:p-8">
        <p className="font-label text-beige">// Message received</p>
        <p className="text-flag">Thank you, {v.name.split(" ")[0]}. We will reply to {v.email} by email.</p>
      </div>
    );

  const input = "mt-3 block w-full border-b border-beige/50 bg-transparent py-3 text-lead text-beige placeholder:text-flag focus:border-beige aria-[invalid=true]:border-beige";
  const fieldBlock = (k: Field, label: string, el: React.ReactNode, hint?: string) => (
    <div>
      <label htmlFor={`${id}-${k}`} className="font-label text-flag">
        // {label}
      </label>
      {el}
      {errors[k] ? (
        <p id={`${id}-${k}-err`} className="mt-2 text-sm text-beige">
          {errors[k]}
        </p>
      ) : hint ? (
        <p className="mt-2 text-sm text-flag">{hint}</p>
      ) : null}
    </div>
  );
  const a11y = (k: Field) => ({ id: `${id}-${k}`, "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${id}-${k}-err` : undefined });

  return (
    <form data-contact-form noValidate onSubmit={submit} className="max-w-xl space-y-10">
      {fieldBlock("name", "Your name", <input {...a11y("name")} value={v.name} onChange={set("name")} autoComplete="name" maxLength={LIMITS.name} className={input} />)}
      {fieldBlock("email", "Email", <input {...a11y("email")} type="email" value={v.email} onChange={set("email")} autoComplete="email" maxLength={LIMITS.email} className={input} />)}
      {fieldBlock("business", "Business (optional)", <input {...a11y("business")} value={v.business} onChange={set("business")} autoComplete="organization" maxLength={LIMITS.business} className={input} />)}
      <TopicCombobox value={topic} onChange={setTopic} />
      {fieldBlock(
        "message",
        "Message",
        <textarea {...a11y("message")} value={v.message} onChange={set("message")} rows={5} maxLength={LIMITS.message} className={`${input} resize-y`} />,
        "Please do not include medical details, ID numbers or card numbers.",
      )}

      {/* honeypot: hidden from people and screen readers; bots tend to fill every field */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} name="website" />
        </label>
      </div>

      <div className="space-y-4">
        <button
          type="submit"
          disabled={state === "sending"}
          className="chamfer inline-flex min-h-11 items-center bg-beige px-8 py-4 font-wide text-sm text-flag-deep disabled:opacity-60"
        >
          {state === "sending" ? "Sending" : "Send message"}
        </button>
        <p className="max-w-[52ch] text-sm leading-relaxed text-flag">
          We use what you send only to reply. See our <a href="/privacy" className="text-beige">Privacy policy</a>.
        </p>
      </div>

      {state === "failed" && (
        <div role="alert" data-form-state="failed" className="max-w-[52ch] space-y-4 border border-beige/50 p-6">
          <p className="font-label text-beige">// The form could not send right now</p>
          <p className="text-flag">Nothing you typed is lost. Send it as an email instead:</p>
          <a href={fallback} target="_blank" rel="noopener noreferrer" className="chamfer inline-flex min-h-11 items-center bg-beige px-7 py-4 font-wide text-sm text-flag-deep">
            Send it from Gmail &nbsp;<Arrow />
            <span className="sr-only"> (opens Gmail in a new tab)</span>
          </a>
        </div>
      )}
    </form>
  );
}
