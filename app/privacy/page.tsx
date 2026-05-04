import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — WebDoc AI",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <Link href="/" className="font-mono text-[11px]" style={{ color: "var(--cyan)" }}>
        ← Return to home
      </Link>
      <h1 className="mt-8 font-sans text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
        Privacy Policy
      </h1>
      <p className="mt-6 font-sans text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        This document states how WebDoc AI collects, stores, and processes data related to your account and diagnostic scans; replace placeholder sections below with counsel-approved legal text before production use.
      </p>
    </main>
  );
}
