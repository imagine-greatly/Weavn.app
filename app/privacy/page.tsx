import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — WebDoc AI",
  description: "How WebDoc AI collects, stores, and uses your data.",
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

export default function PrivacyPage() {
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
            WEBDOC AI · LEGAL DOCUMENT
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
            Privacy Policy
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
            WebDoc AI ("WebDoc," "we," "us," or "our") operates the website diagnostic and conversion
            intelligence platform at webdocai. This Privacy Policy explains what information we
            collect, how we use it, and your rights with respect to that information. By using
            WebDoc you agree to the practices described here.
          </P>
        </div>

        <Section title="Information We Collect">
          <P>
            <strong style={{ color: "#FFFFFF" }}>Account data.</strong> When you create an account
            we collect your email address and any profile information you provide.
          </P>
          <P>
            <strong style={{ color: "#FFFFFF" }}>Website scan data.</strong> When you submit a URL
            for analysis, we collect the URL you submit, the rendered HTML content our system
            retrieves from that URL, and the AI-generated diagnostic report produced from that
            content. This scan data is associated with your account.
          </P>
          <P>
            <strong style={{ color: "#FFFFFF" }}>Usage data.</strong> We collect standard server
            logs including IP addresses, browser type, pages visited, and timestamps when you
            interact with our platform.
          </P>
          <P>
            <strong style={{ color: "#FFFFFF" }}>Payment data.</strong> Payment transactions are
            processed by Stripe. We do not store full card numbers or payment credentials on our
            servers.
          </P>
        </Section>

        <Section title="How We Use Your Data">
          <P>
            <strong style={{ color: "#FFFFFF" }}>Service delivery.</strong> We use your account
            data and scan history to provide the diagnostic platform, display reports, and maintain
            your dashboard.
          </P>
          <P>
            <strong style={{ color: "#FFFFFF" }}>Data retention.</strong> We retain all scan data
            — including submitted URLs, retrieved HTML content, and generated reports —
            indefinitely. This data is used to improve our services, develop new product features,
            and maintain historical records of website diagnostics.
          </P>
          <P>
            <strong style={{ color: "#FFFFFF" }}>AI model improvement.</strong> We may analyze
            anonymized and aggregated scan data to train, evaluate, and improve our AI models and
            diagnostic algorithms. This analysis uses de-identified data and does not expose
            individual account information.
          </P>
          <P>
            <strong style={{ color: "#FFFFFF" }}>Product analytics.</strong> We use usage patterns
            to understand how our platform is used and to make product improvements.
          </P>
        </Section>

        <Section title="Outreach Communications">
          <P>
            WebDoc may send cold outreach emails to website owners whose sites have been scanned,
            based on publicly available contact information associated with those domains (such as
            WHOIS records or publicly listed contact pages). These communications may include
            diagnostic summaries or offers to view the full report for their website.
          </P>
          <P>
            If you receive such an email and wish to opt out of future outreach, you may follow
            the unsubscribe instructions included in the email or contact us at the address below.
          </P>
        </Section>

        <Section title="Data Sharing">
          <P>
            We do not sell your personal information. We may share data with third-party service
            providers who assist in operating our platform (such as cloud hosting, analytics, and
            payment processing), each bound by appropriate data protection agreements.
          </P>
          <P>
            We may disclose information when required by law, court order, or to protect the
            rights, property, or safety of WebDoc, our users, or others.
          </P>
        </Section>

        <Section title="Your Rights and Data Deletion">
          <P>
            You may request deletion of your personal account data — including your email address,
            account profile, and authentication credentials — by contacting us at the address
            below. We will process such requests within 30 days.
          </P>
          <P>
            <strong style={{ color: "#FFFFFF" }}>Scan data retention.</strong> Because website
            scan data (URLs, HTML content, and diagnostic reports) may be retained as part of our
            product training and improvement datasets, this data may be retained in anonymized or
            aggregated form even after your account is deleted. We will make commercially
            reasonable efforts to disassociate retained scan data from your personal identity upon
            a valid deletion request.
          </P>
          <P>
            Depending on your jurisdiction you may have additional rights including access,
            rectification, portability, or restriction of processing. Contact us to exercise these
            rights.
          </P>
        </Section>

        <Section title="Cookies and Tracking">
          <P>
            We use essential cookies to maintain authentication sessions. We may use analytics
            cookies to understand platform usage. You can disable cookies in your browser settings,
            though this may affect platform functionality.
          </P>
        </Section>

        <Section title="Security">
          <P>
            We implement commercially reasonable technical and organizational measures to protect
            your information. No transmission over the internet is fully secure; you use WebDoc at
            your own risk.
          </P>
        </Section>

        <Section title="Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. Material changes will be
            communicated via email or a notice on the platform. Continued use of WebDoc after
            changes take effect constitutes acceptance of the updated policy.
          </P>
        </Section>

        <Section title="Contact">
          <P>
            Questions about this Privacy Policy or data requests can be sent to:{" "}
            <a
              href="mailto:privacy@webdocai.com"
              style={{ color: CY, textDecoration: "none", fontFamily: MONO, fontSize: 13 }}
            >
              privacy@webdocai.com
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
          <span>WEBDOC AI · PRIVACY POLICY</span>
          <span>© {new Date().getFullYear()} WEBDOC AI</span>
        </div>
      </main>
    </div>
  );
}
