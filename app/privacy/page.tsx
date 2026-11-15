import type { Metadata } from "next";
import { pageMeta } from "@/lib/site";
import { A, H3, LegalPage, Note, P, Ph, Ul } from "@/components/LegalPage";

export const metadata: Metadata = pageMeta(
  "Privacy policy | JIDO",
  "Draft privacy policy for the JIDO website and services: what information is collected, why, and the choices you have.",
  "/privacy",
);

export default function Privacy() {
  return (
    <LegalPage
      href="/privacy"
      label="PRIVACY"
      intro={
        <>
          <p>
            This policy explains what information JIDO collects, why we collect it, who we share it with and the choices you have. It covers
            this website and the AI automation services we build for businesses, including our AI receptionist (a virtual front desk).
          </p>
          <p>We have tried to write it in plain English. If anything is unclear, contact us using the details at the end.</p>
        </>
      }
      sections={[
        {
          id: "who-we-are",
          heading: "Who we are and our roles",
          body: (
            <>
              <P>
                In this policy, &quot;JIDO&quot;, &quot;we&quot; and &quot;us&quot; mean <Ph k="businessName" />. We act in two different roles,
                and it matters which one applies to you:
              </P>
              <Ul
                items={[
                  <>
                    <strong className="text-beige">As a business in our own right.</strong> When you visit this website, email us, or become one of
                    our business clients, we decide how your information is used. This policy is the notice for that information.
                  </>,
                  <>
                    <strong className="text-beige">As a service provider to a business client.</strong> When a business uses our AI receptionist on
                    its website, we process its customers&apos; information on that business&apos;s behalf and under its instructions.
                  </>,
                ]}
              />
              <P>
                In the second case, the business you contacted is responsible for its own customer-facing privacy notice and for collecting your
                information lawfully. If you talked to an AI receptionist on a business&apos;s website, please read that business&apos;s privacy
                notice and send requests to them first. We will help them respond.
              </P>
            </>
          ),
        },
        {
          id: "where-things-stand",
          heading: "Where things stand today",
          body: (
            <>
              <P>
                Our AI receptionist is in development and testing. Our demonstration uses a fictional dental office, Bright Smile Dental, with
                made-up customers. The AI receptionist is not yet connected to any live website and is not handling real customer conversations.
              </P>
              <P>
                The workflow behind this website&apos;s contact form is also not switched on yet; until it is, the form offers to send your
                message by email instead.
              </P>
              <P>
                This policy describes how the service is designed to work. We will review and update it before we accept real customers, and the
                date at the top will change when we do.
              </P>
            </>
          ),
        },
        {
          id: "information-we-collect",
          heading: "Information we collect",
          body: (
            <>
              <H3>Website visitors (collected by us)</H3>
              <P>This website has no accounts, cookies or analytics. We only receive information about you if you contact us or book a call:</P>
              <Ul
                items={[
                  "Contact form: your name, email address, business name (optional), the topic you pick, your message and the page you sent it from.",
                  "Email: your email address, your name if your email shows it, and anything you include in your message.",
                  "Discovery call booking: the details you enter on the Google Calendar booking page, such as your name, email address and chosen time.",
                ]}
              />
              <P>
                We do not collect your IP address, browser type, device information or browsing activity through this website. The company that
                will host it (<Ph k="hostingProvider" />) may automatically record technical information such as IP address, browser type and the
                pages requested, to keep the site secure and working.
              </P>

              <H3>AI receptionist users (collected on behalf of our business clients)</H3>
              <P>When you chat with an AI receptionist we provide to a business, the following may be collected for that business:</P>
              <Ul
                items={[
                  "Your name.",
                  "Your email address.",
                  "Your phone number, if you give it.",
                  "Why you are contacting the business, and your answers to its questions.",
                  "Your appointment preferences, and the date and time of any appointment you confirm.",
                  "Your messages, and anything else you choose to share in the conversation.",
                  "A short summary of the conversation, written by the AI, so a team member has context.",
                ]}
              />
              <P>
                The AI receptionist is instructed not to ask for payment card numbers, government ID numbers, passwords or medical records. Please
                do not share them. See <A href="#sensitive-information">Sensitive and health information</A>.
              </P>

              <H3>Business clients (collected by us)</H3>
              <Ul
                items={[
                  "Business name and the contact details of the people we work with.",
                  "Configuration information: the approved business information, services, opening hours and rules the AI receptionist follows.",
                  "Calendar and integration settings: which calendar and spreadsheet to use, where owner notifications go, and the connections to services such as Google Sheets, Gmail and Google Calendar.",
                  "Account and billing information, if applicable. We do not currently collect payment information through this website.",
                ]}
              />

              <H3>Technical and usage information (collected by us)</H3>
              <Ul
                items={[
                  "Usage records for each AI reply: time, client ID, a random conversation ID, message number, workflow run ID, whether it was a test or live run, the AI model, the number of AI requests, which tools were used, estimated token use, an estimated cost and workflow execution counts. These records are designed not to contain names, email addresses or message text.",
                  "Error records: time, workflow name, the step that failed, the error message and a link to the failed run. Error messages can sometimes include customer details.",
                  "Run history kept by our workflow platform (n8n), which can include the content of conversations and the information passed between steps, depending on its settings.",
                  "System performance information, such as whether a run succeeded and how long it took.",
                ]}
              />
            </>
          ),
        },
        {
          id: "how-we-use",
          heading: "How we use information",
          body: (
            <>
              <Ul
                items={[
                  "To respond to customer inquiries.",
                  "To process and organise potential leads for the business you contacted.",
                  "To check availability and schedule appointments you confirm.",
                  "To send notifications to the business about new leads, bookings and requests for a person.",
                  "To maintain and improve our automation workflows.",
                  "To diagnose technical problems.",
                  "To monitor system performance and usage, including estimated AI costs.",
                  "To communicate with our business clients.",
                  "To protect against misuse and unauthorised access.",
                ]}
              />
              <P>We do not sell personal information, and we do not use it for advertising.</P>
            </>
          ),
        },
        {
          id: "ai",
          heading: "Artificial intelligence",
          body: (
            <>
              <P>
                When you contact a business that uses our service, you may be talking to an AI-powered virtual receptionist, not a person. It will
                say that it is an AI assistant if you ask.
              </P>
              <Ul
                items={[
                  "AI-generated replies can sometimes be wrong.",
                  "You can ask for a person at any time, and the business will be notified.",
                  "Do not rely on the AI for medical, legal, financial or emergency advice. In an emergency, call your local emergency number.",
                  "Appointment times come from the business's connected calendar. A booking is only made after you confirm a specific time.",
                  "Information from the AI is not a guaranteed statement by the business. Confirm anything important with the business directly.",
                ]}
              />
              <P>
                More detail is in our <A href="/ai-disclosure">AI disclosure</A>.
              </P>
            </>
          ),
        },
        {
          id: "service-providers",
          heading: "Service providers",
          body: (
            <>
              <P>We use these providers to run the service. Each processes the information it needs to do its job, under its own terms and privacy practices. Their data retention and AI training rules are not all the same.</P>
              <Ul
                items={[
                  <><strong className="text-beige">n8n (n8n Cloud):</strong> runs our automation workflows and processes the information passing through them, including conversations and this website&apos;s contact form.</>,
                  <><strong className="text-beige">Google Gemini API:</strong> the AI model we use during development, and possibly in production, depending on how a client&apos;s service is configured.</>,
                  <><strong className="text-beige">OpenAI API:</strong> a possible future AI provider that may replace Gemini. It is not connected today.</>,
                  <><strong className="text-beige">Google Sheets:</strong> stores leads, contact form messages, usage records and error records.</>,
                  <><strong className="text-beige">Gmail:</strong> sends notifications to business owners and to us, and internal error alerts.</>,
                  <><strong className="text-beige">Google Calendar:</strong> checks availability and creates confirmed appointments, and runs the booking page for our discovery calls.</>,
                  <><strong className="text-beige">Website hosting (<Ph k="hostingProvider" />):</strong> serves this website.</>,
                ]}
              />
              <Note label="Unpaid and paid Gemini API">
                <p>
                  Google offers the Gemini API as an unpaid service and as a paid service, under different terms. Under Google&apos;s terms for the
                  unpaid service, content sent to it may be used to improve Google&apos;s products and may be read by human reviewers.
                </p>
                <p>
                  Our rule: the unpaid Gemini tier is used only for development, with made-up information. Real customer information and
                  confidential business information will not be sent through it. Before handling real customers we will use a paid AI service
                  whose terms we have reviewed.
                </p>
              </Note>
              <P>
                The &quot;Email&quot; links on this website open Gmail in your browser. If you use them, your email is handled by Google under its
                own terms.
              </P>
            </>
          ),
        },
        {
          id: "sharing",
          heading: "When information is shared",
          body: (
            <>
              <P>Because the service works by passing information between systems, some sharing is necessary. Information may be shared:</P>
              <Ul
                items={[
                  "With the business client that receives your inquiry, lead details or appointment.",
                  "With the service providers listed above, as needed to run the automation.",
                  "When the law requires it, for example to answer a valid legal request.",
                  "When needed to protect the rights, safety and security of our business, our clients and users.",
                ]}
              />
              <P>We do not share personal information for other businesses&apos; marketing.</P>
            </>
          ),
        },
        {
          id: "retention",
          heading: "How long information is kept",
          body: (
            <>
              <P>We have not yet set fixed retention periods. Here is how information is kept today:</P>
              <Ul
                items={[
                  "Lead records, usage records and error records stay in the spreadsheet until they are deleted.",
                  "The AI receptionist's conversation memory holds the most recent messages of a conversation temporarily, and is cleared when the automation service restarts.",
                  "Workflow run history is kept by n8n according to its settings and plan.",
                  "Each service provider keeps information according to its own rules.",
                  "Emails are kept in our mailbox until deleted.",
                ]}
              />
              <P>
                Information should be deleted or anonymised when it is no longer needed, unless the law requires us to keep it. We will set specific
                retention periods before accepting real customers and list them here.
              </P>
            </>
          ),
        },
        {
          id: "security",
          heading: "How we protect information",
          body: (
            <>
              <P>No system is perfectly secure, and we cannot guarantee security. These are the safeguards in place or planned:</P>
              <H3>In place today</H3>
              <Ul
                items={[
                  "Access to Google services is granted through n8n's connection settings, not by sharing passwords inside workflows.",
                  "While in development, the chat entry point is not public and all workflows are switched off.",
                  "Usage records are designed to leave out names, email addresses and message text.",
                  "The AI is instructed not to ask for card numbers, government ID numbers, passwords or medical records.",
                  "Our providers are reached over secure (HTTPS) connections.",
                  "Error alerts go to a private agency inbox.",
                ]}
              />
              <H3>Planned before real customers</H3>
              <Ul
                items={[
                  "Separate spreadsheets, calendars and AI keys for each client.",
                  "A paid AI service in place of the unpaid Gemini tier.",
                  "Written retention periods, and limits on stored run history.",
                  "Two-step verification and regular access reviews on every account involved.",
                ]}
              />
              <P>We have not completed an independent security audit or certification.</P>
            </>
          ),
        },
        {
          id: "client-separation",
          heading: "Keeping each client's information separate",
          body: (
            <>
              <P>Each business client should have its own:</P>
              <Ul items={["Customer records.", "Business settings.", "Calendar configuration.", "Owner notification settings.", "Usage records.", "Access permissions."]} />
              <P>
                How well this separation protects information depends on how each client is set up. For example, a wrong spreadsheet link could place
                one client&apos;s customers in another client&apos;s records. We test each new client setup with a test conversation before it goes
                live.
              </P>
            </>
          ),
        },
        {
          id: "your-rights",
          heading: "Your choices and requests",
          body: (
            <>
              <P>You can contact us to ask:</P>
              <Ul
                items={[
                  "For a copy of the personal information we hold about you.",
                  "For us to correct information that is wrong.",
                  "For us to delete information, where that applies.",
                  "How your information is processed.",
                  "To withdraw your consent, where we rely on it.",
                ]}
              />
              <P>
                Send requests to <Ph k="privacyEmail" />, or see <A href="/legal-contact">Legal contact</A>. We may need to confirm your identity
                first. If we hold your information on behalf of a business client, we may pass your request to that business.
              </P>
              <P>
                Deleting information from our own records does not always remove it from every service provider right away. Copies may remain in a
                provider&apos;s systems until its own retention period ends.
              </P>
            </>
          ),
        },
        {
          id: "cookies",
          heading: "Cookies and tracking",
          body: (
            <>
              <P>This website does not set cookies and does not use analytics, advertising or tracking scripts.</P>
              <Ul
                items={[
                  "It saves one small note (named jido:intro) in your browser's session storage, so the intro is shorter on your next visit. It stays on your device and is cleared when you close the tab.",
                  "Fonts are served from this website itself, not from a third party.",
                  "The booking page only loads Google Calendar after you click \"Show available times\". From then on, Google may set its own cookies and collect information under its own privacy policy.",
                ]}
              />
              <P>
                If a business adds our chat window to its website, the chat window may store a random conversation ID in your browser so the
                conversation stays together. We will describe this precisely before the chat goes live.
              </P>
            </>
          ),
        },
        {
          id: "children",
          heading: "Children",
          body: (
            <P>
              Our website and services are meant for businesses and adults. They are not directed at children under 13, and we do not knowingly
              collect personal information from children in violation of applicable law. If you think a child has given us information, contact us
              and we will take appropriate steps.
            </P>
          ),
        },
        {
          id: "international",
          heading: "Where information is processed",
          body: (
            <P>
              Our service providers run their systems in different locations, so information may be processed outside your state or country,
              depending on their infrastructure and agreements. We cannot promise that all information stays within the United States.
            </P>
          ),
        },
        {
          id: "sensitive-information",
          heading: "Sensitive and health information",
          body: (
            <>
              <P>
                Our demonstration uses a fictional dental office. Our platform is not HIPAA compliant, and we have not verified that it can process
                protected health information safely or lawfully.
              </P>
              <Note label="Not allowed in our current development environment">
                <Ul
                  items={[
                    "Patient medical histories.",
                    "Diagnoses.",
                    "Treatment details.",
                    "Insurance information.",
                    "Social Security numbers.",
                    "Payment card information.",
                    "Passwords or login credentials.",
                  ]}
                />
              </Note>
              <P>
                Using the service for a real healthcare provider would first require a separate compliance assessment and, where applicable,
                Business Associate Agreements with that provider and with each service provider involved.
              </P>
            </>
          ),
        },
        {
          id: "changes",
          heading: "Changes to this policy",
          body: (
            <P>
              We will update this policy as our services, technology providers and legal requirements change. The &quot;Last updated&quot; date at
              the top shows the latest version. If a change is significant, we will make it clear on this page.
            </P>
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
                <>Privacy questions and requests: <Ph k="privacyEmail" /></>,
                <>More ways to reach us: <A href="/legal-contact">Legal contact</A></>,
              ]}
            />
          ),
        },
      ]}
    />
  );
}
