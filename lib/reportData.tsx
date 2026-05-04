import type { FindingData } from "@/components/FindingCard";

/**
 * Mock findings for report right panel. Replace with API data.
 */

export const MOCK_FINDINGS: FindingData[] = [
  {
    id: "PSY-01",
    categoryId: "psychology",
    categoryName: "REVENUE IMPACT",
    severity: "critical",
    title: "Hero section doesn't address visitor pain or urgency",
    whatWeFound:
      "The main headline is feature-focused ('We help businesses grow') and the subcopy doesn't mention a specific outcome or time frame. No scarcity or social proof above the fold.",
    whyItMatters: (
      <>
        Drop-off is{" "}
        <span className="font-mono" style={{ color: "var(--cyan)" }}>
          47%
        </span>{" "}
        in the first 8 seconds when the value proposition is vague. Visitors need a reason to stay before they scroll.
      </>
    ),
    howToFixIt:
      "Lead with the outcome or pain you solve. Add one concrete stat or proof point in the hero. Test a headline that starts with a time frame ('In 30 days...') or a specific result.",
    exampleFix:
      "Stop losing customers in the first 10 seconds. We show you exactly where your messaging fails—and how to fix it.",
    psychologyPrinciple: "Pain-Gain Asymmetry",
    revenueImpact: 8,
    effortToFix: "low",
    timeToFix: "20 minutes",
  },
  {
    id: "TRU-07",
    categoryId: "psychology",
    categoryName: "REVENUE IMPACT",
    severity: "warning",
    title: "Trust signals are buried below the fold",
    whatWeFound:
      "Logos, testimonials, or security badges appear only after 2–3 scrolls. The first screen has no third-party validation.",
    whyItMatters: (
      <>
        Pages with above-the-fold trust elements see{" "}
        <span className="font-mono" style={{ color: "var(--cyan)" }}>
          32%
        </span>{" "}
        higher conversion. Your best proof is invisible when it matters most.
      </>
    ),
    howToFixIt:
      "Move at least one trust element (logo strip, one short testimonial, or badge) into the first viewport. Keep the hero clean but add a single line of social proof.",
    exampleFix:
      "Add a single line of proof above the fold: 'Trusted by 2,400+ teams' or one short testimonial. Keep the rest below.",
    psychologyPrinciple: "Social Proof Theory",
    revenueImpact: 6,
    effortToFix: "medium",
    timeToFix: "45 minutes",
  },
  {
    id: "MSG-03",
    categoryId: "messaging",
    categoryName: "MESSAGING",
    severity: "warning",
    title: "Value proposition is benefit-light",
    whatWeFound:
      "The hero and feature sections emphasize what the product does (features) rather than what the visitor gains (benefits).",
    whyItMatters: (
      <>
        Benefit-led copy outperforms feature-led by{" "}
        <span className="font-mono" style={{ color: "var(--cyan)" }}>
          ~24%
        </span>{" "}
        in clarity tests. Visitors decide with emotion first, then justify with logic.
      </>
    ),
    howToFixIt:
      "Rewrite the top 2–3 value statements to start with the outcome ('You get…', 'Your team will…'). Keep features in a supporting role.",
    exampleFix:
      "Lead with the outcome: 'See where you're losing people' instead of 'We analyze your site.' One line can shift the whole frame.",
    psychologyPrinciple: "Outcome vs Feature Language",
    revenueImpact: 5,
    effortToFix: "medium",
    timeToFix: "1 hour",
  },
  {
    id: "CON-01",
    categoryId: "conversion",
    categoryName: "CONVERSION",
    severity: "critical",
    title: "Primary CTA is generic and low-urgency",
    whatWeFound:
      "The main button says 'Get Started' with no time or outcome cue. No secondary CTA for visitors who aren't ready to commit.",
    whyItMatters: (
      <>
        Specific CTAs (e.g. 'See my results in 30s') can lift clicks by{" "}
        <span className="font-mono" style={{ color: "var(--cyan)" }}>
          20–40%
        </span>
        . Generic labels blend in and don't reduce friction.
      </>
    ),
    howToFixIt:
      "Use an outcome- or time-based CTA ('See where you're losing people', 'Run free diagnostic'). Add a text or secondary button for the hesitant ('How it works', 'See sample report').",
    exampleFix:
      "See where you're losing people → (primary). How it works (secondary, text link).",
    psychologyPrinciple: "Cialdini's Reciprocity",
    revenueImpact: 9,
    effortToFix: "low",
    timeToFix: "30 minutes",
  },
  {
    id: "CON-10",
    categoryId: "conversion",
    categoryName: "CONVERSION",
    severity: "passing",
    title: "Form length is reasonable",
    whatWeFound:
      "The main conversion form has 3–4 fields. No long multi-step flow on the key landing page.",
    whyItMatters: (
      <>
        You're under the{" "}
        <span className="font-mono" style={{ color: "var(--cyan)" }}>
          5-field
        </span>{" "}
        guideline. Each extra field typically costs 5–15% completion.
      </>
    ),
    howToFixIt:
      "Monitor drop-off by field. If you add fields later, consider progressive disclosure or optional fields.",
    exampleFix:
      "Keep the form short. If you need more data, ask after the first conversion (post-signup survey).",
    psychologyPrinciple: "Friction & Cognitive Load",
    revenueImpact: 2,
    effortToFix: "low",
    timeToFix: "15 minutes",
  },
  {
    id: "SEO-01",
    categoryId: "seo",
    categoryName: "SEO",
    severity: "passing",
    title: "Title tag is present and within length",
    whatWeFound:
      "The page has a unique title tag under 60 characters. It includes a primary keyword.",
    whyItMatters: (
      <>
        Pages with optimized titles see better CTR in SERPs. Your title is within the{" "}
        <span className="font-mono" style={{ color: "var(--cyan)" }}>
          ~60
        </span>{" "}
        character guideline.
      </>
    ),
    howToFixIt:
      "Ensure the title reflects the main intent of the page. Test including a benefit or number if it still fits.",
    exampleFix:
      "Keep the current structure. A/B test adding a benefit phrase (e.g. '— Free in 30 seconds') if you have room.",
    psychologyPrinciple: "Authority Bias",
    revenueImpact: 3,
    effortToFix: "low",
    timeToFix: "10 minutes",
  },
  {
    id: "UX-01",
    categoryId: "ux",
    categoryName: "UX",
    severity: "warning",
    title: "Visual hierarchy could better guide the eye",
    whatWeFound:
      "Heading levels and contrast are consistent, but the most important action (primary CTA) doesn't stand out enough from surrounding text.",
    whyItMatters: (
      <>
        Clear hierarchy can improve time-to-decision by{" "}
        <span className="font-mono" style={{ color: "var(--cyan)" }}>
          30%
        </span>
        . Visitors should know where to look in under 2 seconds.
      </>
    ),
    howToFixIt:
      "Increase contrast or size of the primary CTA. Use one clear focal point per section (headline → sub → CTA).",
    exampleFix:
      "Make the primary CTA the only high-contrast button above the fold. Secondary actions can be text or outline.",
    psychologyPrinciple: "Von Restorff Effect",
    revenueImpact: 5,
    effortToFix: "medium",
    timeToFix: "1 hour",
  },
  {
    id: "UX-02",
    categoryId: "performance",
    categoryName: "PERFORMANCE",
    severity: "passing",
    title: "LCP is within an acceptable range",
    whatWeFound:
      "Largest Contentful Paint is under 2.5s on desktop. No single blocking resource dominating load.",
    whyItMatters: (
      <>
        Core Web Vitals correlate with engagement. Your LCP is below the{" "}
        <span className="font-mono" style={{ color: "var(--cyan)" }}>
          2.5s
        </span>{" "}
        threshold.
      </>
    ),
    howToFixIt:
      "Monitor LCP on mobile. Consider lazy-loading or smaller assets if you add more content.",
    exampleFix:
      "No change required. Re-run the scan after major design or content updates.",
    psychologyPrinciple: "Peak-End Rule",
    revenueImpact: 1,
    effortToFix: "low",
    timeToFix: "10 minutes",
  },
];

export const CATEGORY_IDS = [
  "psychology",
  "messaging",
  "conversion",
  "seo",
  "ux",
  "performance",
] as const;

export const CATEGORY_NAMES: Record<string, string> = {
  psychology: "REVENUE IMPACT",
  messaging: "MESSAGING",
  conversion: "CONVERSION",
  seo: "SEO",
  ux: "UX",
  performance: "PERFORMANCE",
};
