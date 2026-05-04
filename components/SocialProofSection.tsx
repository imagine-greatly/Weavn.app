"use client";

import { ScrollReveal } from "@/components/ScrollReveal";

const SURFACE = "#070C14";

type QuoteItem = {
  quote: string;
  name: string;
  handle: string;
  initials: string;
};

const QUOTES: QuoteItem[] = [
  {
    quote:
      "webdoc flagged that my hero headline was talking about features, not outcomes. Changed one line. Bookings doubled in two weeks.",
    name: "Alex M.",
    handle: "@alexship",
    initials: "AM",
  },
  {
    quote:
      "Finally something that explains WHY people leave, not just that they do. The conversion intelligence was brutally accurate — the breakdown on each finding is worth the subscription alone.",
    name: "Jordan K.",
    handle: "@jordangrows",
    initials: "JK",
  },
  {
    quote:
      "I ran it on three competitor sites. Found exactly why they were outranking me. Fixed my messaging in an afternoon.",
    name: "Sam R.",
    handle: "@samr",
    initials: "SR",
  },
  {
    quote:
      "The intelligence read on my hero was sharper than what I had been using for two years. My copywriter was not happy.",
    name: "Maya T.",
    handle: "@mayabuilds",
    initials: "MT",
  },
  {
    quote:
      "It quoted my actual headline back to me and explained exactly why it was failing. That level of specificity I have never seen in any tool.",
    name: "Dev P.",
    handle: "@devbuilds",
    initials: "DP",
  },
];

const MARQUEE_QUOTES = [...QUOTES, ...QUOTES];

function QuoteCard({ item }: { item: QuoteItem }) {
  return (
    <div
      className="flex h-full min-h-[240px] w-[320px] shrink-0 flex-col gap-4 rounded-lg p-6"
      style={{
        background: "var(--bg-card)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex shrink-0 flex-row flex-nowrap gap-1" style={{ color: "var(--cyan)" }} aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="font-mono text-[14px] leading-none">
            ★
          </span>
        ))}
      </div>
      <p className="min-h-0 flex-1 text-left font-sans text-[14px] font-normal leading-[1.7]" style={{ color: "var(--text-primary)" }}>
        {item.quote}
      </p>
      <div className="mt-auto flex shrink-0 items-center gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-ui-label text-[11px]"
          style={{
            background: "rgba(0,200,255,0.12)",
            border: "1px solid rgba(0,200,255,0.25)",
            color: "var(--cyan)",
          }}
        >
          {item.initials}
        </div>
        <div className="min-w-0">
          <p className="font-sans text-sm font-medium leading-tight" style={{ color: "var(--text-primary)" }}>
            {item.name}
          </p>
          <p className="mt-0.5 font-mono text-[11px] leading-tight" style={{ color: "var(--text-muted)" }}>
            {item.handle}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SocialProofSection() {
  return (
    <section
      className="relative w-full overflow-hidden py-[120px]"
      style={{ paddingLeft: 0, paddingRight: 0, background: SURFACE }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-[18%] z-0 h-[420px] w-[min(900px,95vw)] -translate-x-1/2"
        style={{
          background: "radial-gradient(ellipse, rgba(0,200,255,0.035) 0%, transparent 70%)",
          filter: "blur(56px)",
        }}
        aria-hidden
      />
      <div className="mx-auto mb-12 max-w-[600px] px-6 text-center">
        <ScrollReveal variant="headline">
          <p className="section-label">OPERATOR NOTES</p>
        </ScrollReveal>
        <ScrollReveal variant="headline" delay={0.08}>
          <h2
            className="section-headline mt-3 text-[48px] leading-tight"
            style={{ maxWidth: 600, marginInline: "auto" }}
          >
            Real results from real sites.
          </h2>
        </ScrollReveal>
        <ScrollReveal variant="sub" delay={0.12}>
          <p
            className="mx-auto mt-4 max-w-[min(420px,calc(100vw-48px))] font-sans text-base font-light leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            From business owners who ran a diagnostic and acted on the findings.
          </p>
        </ScrollReveal>
      </div>

      <div className="testimonial-marquee-viewport relative z-[1] w-full">
        <div className="testimonial-marquee-track py-2">
          {MARQUEE_QUOTES.map((q, i) => (
            <QuoteCard key={`${q.handle}-${i}`} item={q} />
          ))}
        </div>
        <div
          className="pointer-events-none absolute bottom-0 left-0 top-0 z-[1] w-[80px]"
          style={{
            background: `linear-gradient(90deg, ${SURFACE}, transparent)`,
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 top-0 z-[1] w-[120px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${SURFACE})`,
          }}
          aria-hidden
        />
      </div>
    </section>
  );
}
