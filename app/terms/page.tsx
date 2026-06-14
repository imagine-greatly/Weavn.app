import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Weavn",
  description: "Terms governing your use of the Weavn platform.",
};

const MONO = "var(--font-jetbrains-mono), var(--font-space-mono), ui-monospace, monospace";
const SANS = "var(--font-space-grotesk), ui-sans-serif, sans-serif";
const CY = "#00C8FF";
const BG = "#050810";
const BORDER = "rgba(0,200,255,0.10)";
const TEXT = "#C8D4E8";
const DIM = "rgba(200,212,232,0.45)";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: "0.22em",
          color: CY,
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        ● {title}
      </div>
      <div
        style={{
          borderLeft: `2px solid rgba(0,200,255,0.25)`,
          paddingLeft: 20,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: SANS,
        fontSize: 14,
        lineHeight: 1.75,
        color: TEXT,
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

export default function TermsPage() {
  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "64px 32px 96px",
          boxSizing: "border-box",
        }}
      >
        {/* Back link */}
        <Link
          href="/"
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: "rgba(0,200,255,0.6)",
            letterSpacing: "0.12em",
            textDecoration: "none",
            textTransform: "uppercase",
          }}
        >
          ← Return to home
        </Link>

        {/* Header */}
        <div style={{ marginTop: 40, marginBottom: 48, paddingBottom: 32, borderBottom: `1px solid ${BORDER}` }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.25em",
              color: "rgba(0,200,255,0.5)",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            WEAVN · LEGAL DOCUMENT
          </div>
          <h1
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 36,
              color: "#FFFFFF",
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: "-0.5px",
            }}
          >
            Terms of Service
          </h1>
          <p
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: DIM,
              marginTop: 12,
              marginBottom: 0,
            }}
          >
            Effective date: May 2025 · Last updated: May 2025
          </p>
        </div>

        {/* Intro */}
        <div style={{ marginBottom: 40 }}>
          <P>
            These Terms of Service ("Terms") govern your access to and use of the Weavn platform
            ("Weavn," "we," "us," or "our") at weavn.app. By creating an account or submitting any
            URL for analysis, you agree to be bound by these Terms. If you do not agree, do not use
            Weavn.
          </P>
        </div>

        <Section title="Acceptance and Data Retention">
          <P>
            By using Weavn you agree to our data retention policy as described in these Terms and
            in our{" "}
            <Link href="/privacy" style={{ color: CY, textDecoration: "none", fontFamily: MONO, fontSize: 13 }}>
              Privacy Policy
            </Link>
            . This includes the collection, storage, and use of website scan data submitted through
            the platform.
          </P>
          <P>
            <strong style={{ color: "#FFFFFF" }}>Scan data retention.</strong> Website scan data
            submitted to Weavn — including URLs, rendered HTML content, and AI-generated diagnostic
            reports — may be retained and used for service improvement, product development, and AI
            model training, as further described in the Privacy Policy. You acknowledge and consent
            to this retention as a condition of using the platform.
          </P>
        </Section>

        <Section title="Platform Access and Eligibility">
          <P>
            You must be at least 18 years old and capable of entering a binding contract to use
            Weavn. Accounts are for individual use; sharing credentials is not permitted. You are
            responsible for all activity that occurs under your account.
          </P>
          <P>
            We reserve the right to suspend or terminate accounts that violate these Terms, engage
            in abusive behavior, or use the platform in a manner that degrades service for other
            users.
          </P>
        </Section>

        <Section title="Publicly Accessible Website Data">
          <P>
            Weavn operates by retrieving and analyzing publicly accessible web pages. We reserve
            the right to analyze publicly accessible website data as part of our core service
            delivery, product development, and outreach operations.
          </P>
          <P>
            When you submit a URL, you represent that you have the right to submit that URL for
            analysis, or that the URL is publicly accessible and you are using Weavn for legitimate
            diagnostic and research purposes. You may not submit URLs for the purpose of
            unauthorized data collection, competitive intelligence in violation of applicable law,
            or any other unlawful purpose.
          </P>
        </Section>

        <Section title="Acceptable Use">
          <P>
            You agree not to use Weavn to: submit URLs you are not authorized to analyze; attempt
            to reverse-engineer or scrape the platform itself; interfere with the platform's
            operation or other users' access; use automated tools to generate excessive scan
            requests beyond plan limits; or violate any applicable law or regulation.
          </P>
          <P>
            Weavn is a diagnostic tool. The reports and recommendations generated by the platform
            are informational and advisory in nature. We make no guarantee that implementing
            suggested changes will produce any specific business outcome.
          </P>
        </Section>

        <Section title="Subscription and Payment">
          <P>
            Free plan usage is subject to scan limits as displayed on the platform. Pro subscriptions
            are billed on a recurring basis via Stripe. You authorize us to charge the payment method
            on file at the start of each billing period.
          </P>
          <P>
            Subscriptions may be cancelled at any time from your account settings. Cancellation
            takes effect at the end of the current billing period — no partial refunds are issued
            for unused time. We reserve the right to change pricing with advance notice.
          </P>
        </Section>

        <Section title="Intellectual Property">
          <P>
            The Weavn platform, including its software, design, AI models, and diagnostic
            methodology, is owned by Weavn and protected by applicable intellectual property
            laws. You are granted a limited, non-exclusive, non-transferable license to use the
            platform in accordance with these Terms.
          </P>
          <P>
            Diagnostic reports generated for your submitted URLs are made available to you for your
            own business use. You may not resell or redistribute reports without our written
            consent.
          </P>
        </Section>

        <Section title="Disclaimers and Limitation of Liability">
          <P>
            Weavn is provided "as is" without warranties of any kind, express or implied. We do
            not warrant that the platform will be error-free, uninterrupted, or that diagnostic
            results will be accurate or complete for all websites.
          </P>
          <P>
            To the maximum extent permitted by law, Weavn's total liability to you for any claim
            arising from these Terms or your use of the platform shall not exceed the amounts you
            paid to Weavn in the twelve months preceding the claim. We are not liable for any
            indirect, incidental, special, or consequential damages.
          </P>
        </Section>

        <Section title="Changes to These Terms">
          <P>
            We may update these Terms from time to time. Material changes will be communicated via
            email or a notice on the platform. Your continued use of Weavn after the effective date
            of revised Terms constitutes acceptance of those changes.
          </P>
        </Section>

        <Section title="Governing Law">
          <P>
            These Terms are governed by the laws of the jurisdiction in which Weavn is
            incorporated, without regard to conflict of law principles. Any disputes shall be
            resolved in the courts of that jurisdiction.
          </P>
        </Section>

        <Section title="Contact">
          <P>
            Questions about these Terms can be sent to:{" "}
            <a
              href="mailto:legal@weavn.app"
              style={{ color: CY, textDecoration: "none", fontFamily: MONO, fontSize: 13 }}
            >
              legal@weavn.app
            </a>
          </P>
        </Section>

        {/* Footer rule */}
        <div
          style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: `1px solid ${BORDER}`,
            fontFamily: MONO,
            fontSize: 9,
            color: DIM,
            letterSpacing: "0.1em",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>WEAVN · TERMS OF SERVICE</span>
          <span>© {new Date().getFullYear()} WEAVN</span>
        </div>
      </main>
    </div>
  );
}
