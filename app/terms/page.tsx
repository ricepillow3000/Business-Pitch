import type { Metadata } from "next";
import { A, LegalPage, Note, P, Ph, Ul } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of service | JIDO" };

/** Marks a clause an attorney must finish before these terms are used. */
const Review = () => (
  <Note label="Drafted for attorney review">
    <p>This clause is a starting point only. It must be reviewed and completed by a qualified attorney before these terms are used.</p>
  </Note>
);

export default function Terms() {
  return (
    <LegalPage
      href="/terms"
      label="TERMS"
      intro={
        <p>
          These terms apply to this website and to the AI automation services provided by <Ph k="businessName" /> (&quot;JIDO&quot;,
          &quot;we&quot;, &quot;us&quot;). A business that uses our services is a &quot;client&quot;. Please read them together with our{" "}
          <a href="/privacy" className="prose-link hit text-beige">Privacy policy</a> and{" "}
          <a href="/ai-disclosure" className="prose-link hit text-beige">AI disclosure</a>.
        </p>
      }
      sections={[
        {
          id: "acceptance",
          heading: "Acceptance of terms",
          body: (
            <P>
              By using this website or our services, you agree to these terms. If you use them for a business, you confirm that you can accept
              these terms for that business. If you do not agree, please do not use the website or services.
            </P>
          ),
        },
        {
          id: "services",
          heading: "Our services",
          body: (
            <>
              <P>We design and run AI-powered automation for businesses. Our main service is an AI receptionist (virtual front desk) that a business can add to its website. It can:</P>
              <Ul
                items={[
                  "Answer customer inquiries using information the business has approved.",
                  "Collect potential customer leads and contact details.",
                  "Check appointment availability on the business's calendar.",
                  "Book an appointment after the customer confirms a specific time.",
                  "Notify the business owner about new leads.",
                  "Send internal error notifications.",
                  "Hand complicated inquiries to a person at the business.",
                ]}
              />
              <P>The service is in development. Features may change, and what a specific client receives will be set out in a separate written agreement.</P>
            </>
          ),
        },
        {
          id: "client-responsibilities",
          heading: "Client responsibilities",
          body: (
            <Ul
              items={[
                "Provide accurate business information, services, hours and rules for the AI receptionist, and keep them up to date.",
                "Publish your own customer-facing privacy notice and make sure you may lawfully collect your customers' information.",
                "Tell your customers that they may be talking to an AI assistant.",
                "Keep your accounts and connected services (such as Google accounts and calendars) secure, and tell us promptly about any suspected misuse.",
                "Have a person available to follow up on handoffs within the time you promise your customers.",
                "Not configure the service to collect information it is not set up to handle (see Prohibited activities).",
              ]}
            />
          ),
        },
        {
          id: "acceptable-use",
          heading: "Acceptable use",
          body: <P>Use the website and services only for lawful business purposes, in line with these terms and the terms of the third-party services they connect to.</P>,
        },
        {
          id: "prohibited",
          heading: "Prohibited activities",
          body: (
            <>
              <P>You may not:</P>
              <Ul
                items={[
                  "Use the services for anything unlawful, deceptive or harmful.",
                  "Pretend that the AI receptionist is a person.",
                  "Collect patient medical histories, diagnoses, treatment details, insurance information, Social Security numbers, payment card information or passwords through the services, unless we have agreed in writing that the service is set up and authorised to handle them.",
                  "Send spam or unwanted marketing through the services.",
                  "Try to access other clients' information, break or bypass security, or overload the systems.",
                  "Copy, resell or reverse engineer the services without our written permission.",
                ]}
              />
            </>
          ),
        },
        {
          id: "ai-limitations",
          heading: "AI limitations",
          body: (
            <>
              <P>AI can make mistakes. Replies from the AI receptionist may be incomplete, out of date or wrong, even when it is set up carefully.</P>
              <Ul
                items={[
                  "AI replies are not professional medical, legal, financial or emergency advice.",
                  "AI replies are not a guaranteed statement or promise by the business.",
                  "Customers can always ask for a person.",
                ]}
              />
            </>
          ),
        },
        {
          id: "booking-limitations",
          heading: "Appointment booking limitations",
          body: (
            <Ul
              items={[
                "Availability comes from the business's connected calendar and is only as accurate as that calendar.",
                "A booking is made only after the customer confirms a specific time. It can still fail, for example if the calendar is unavailable.",
                "Changes and cancellations are passed to a person at the business.",
                "The business remains responsible for confirming and honouring its appointments.",
              ]}
            />
          ),
        },
        {
          id: "third-party",
          heading: "Third-party services and availability",
          body: (
            <P>
              The services depend on third-party providers, including n8n, Google (Gemini, Sheets, Gmail and Calendar) and possibly OpenAI. Their
              own terms apply, and they may change, limit or stop their services. We are not responsible for outages or changes caused by them,
              but we will work to keep disruption to a minimum.
            </P>
          ),
        },
        {
          id: "accuracy",
          heading: "Accuracy of business information",
          body: (
            <P>
              The AI receptionist answers from the information the client approves. Each client is responsible for making sure that information,
              including services, hours, policies and contact details, is accurate, complete and lawful.
            </P>
          ),
        },
        {
          id: "data",
          heading: "Data ownership and processing",
          body: (
            <>
              <P>
                Each client owns its customer information. We process it on the client&apos;s behalf to provide the services, as described in our{" "}
                <A href="/privacy">Privacy policy</A> and any data processing terms in our agreement with the client.
              </P>
              <P>We may keep usage and error records that do not identify customers, to run, secure and improve the services.</P>
            </>
          ),
        },
        {
          id: "ip",
          heading: "Intellectual property",
          body: (
            <P>
              The JIDO name, logo, website, workflows, prompts and software belong to us or our licensors. Clients keep ownership of their own
              content and business information. Nothing in these terms transfers ownership unless a written agreement says so.
            </P>
          ),
        },
        {
          id: "payment",
          heading: "Payment and subscription terms",
          body: <P>Any fees, billing periods and refund terms will be set out in a separate written agreement or order with each client. Nothing on this website is an offer at a set price.</P>,
        },
        {
          id: "maintenance",
          heading: "Service interruptions and maintenance",
          body: <P>The services may be unavailable at times, for example during maintenance, updates or provider outages. We do not promise uninterrupted or error-free service.</P>,
        },
        {
          id: "termination",
          heading: "Suspension or termination",
          body: (
            <P>
              We may suspend or end access to the services if these terms are broken, if continuing would create a legal or security risk, or as
              set out in a client&apos;s agreement. Clients may stop using the services as set out in their agreement.
            </P>
          ),
        },
        {
          id: "liability",
          heading: "Limitation of liability",
          body: (
            <>
              <P>
                To the fullest extent the law allows, we are not liable for indirect, incidental, special or consequential losses, or for lost
                profits, revenue or data, arising from the website or services. Our total liability will be limited as set out in the client&apos;s
                written agreement. Some laws do not allow these limits, so they may not apply to you.
              </P>
              <Review />
            </>
          ),
        },
        {
          id: "indemnification",
          heading: "Indemnification",
          body: (
            <>
              <P>
                Clients agree to defend and compensate us for claims that arise from the information they provide, their use of the services in
                breach of these terms, or their failure to meet their legal obligations to their own customers.
              </P>
              <Review />
            </>
          ),
        },
        {
          id: "governing-law",
          heading: "Governing law",
          body: <P>These terms are governed by the laws of <Ph k="jurisdiction" />, without regard to its conflict of law rules.</P>,
        },
        {
          id: "disputes",
          heading: "Dispute resolution",
          body: (
            <>
              <P>If a dispute arises, please contact us first. We will try in good faith to resolve it informally. Any formal process will follow the client&apos;s agreement and the governing law above.</P>
              <Review />
            </>
          ),
        },
        {
          id: "contact",
          heading: "Contact",
          body: (
            <Ul
              items={[
                <>Business: <Ph k="businessName" /></>,
                <>Mailing address: <Ph k="mailingAddress" /></>,
                <>Email: <Ph k="generalEmail" /></>,
                <>Legal and privacy requests: <A href="/legal-contact">Legal contact</A></>,
              ]}
            />
          ),
        },
        {
          id: "updates",
          heading: "Updates to these terms",
          body: <P>We may update these terms. The &quot;Last updated&quot; date at the top shows the latest version. Using the website or services after an update means you accept the updated terms.</P>,
        },
      ]}
    />
  );
}
