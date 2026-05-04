import Link from "next/link";

export const metadata = {
  title: "Terms of Service — webdoc.ai",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <Link href="/" className="font-mono text-[11px]" style={{ color: "var(--cyan)" }}>
        ← Back home
      </Link>
      <h1 className="mt-8 font-sans text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
        Terms of Service
      </h1>
      <p className="mt-6 font-sans text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        This page is a placeholder — add your full terms before launch, including acceptable use, liability, and
        subscription terms for Pro.
      </p>
    </main>
  );
}
