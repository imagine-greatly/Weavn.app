import type { AuditIssue } from "./types";

export const MOCK_ISSUES: AuditIssue[] = [
  {
    id: "1",
    severity: "critical",
    title: "Conversion Leak",
    description:
      "Your headline does not clearly communicate the primary value of your product.",
    whyItMatters:
      "Visitors decide within 5 seconds whether they understand what your product does.",
    howToFix:
      "Rewrite your headline to lead with the core benefit. Use active language and avoid jargon.",
    exampleCopy:
      '"Automate your bookkeeping in minutes instead of hours."',
    category: "conversion",
  },
  {
    id: "2",
    severity: "critical",
    title: "Missing H1 Tag",
    description: "No H1 tag detected on the homepage.",
    whyItMatters:
      "H1 tags help search engines understand page content and improve SEO rankings.",
    howToFix:
      "Add a single, descriptive H1 tag that summarizes the main purpose of your page.",
    exampleCopy: '<h1>Automate Your Bookkeeping in Minutes</h1>',
    category: "seo",
  },
  {
    id: "3",
    severity: "warning",
    title: "CTA Below the Fold",
    description: "Primary CTA is below the fold on desktop and mobile.",
    whyItMatters:
      "Users who don't see a clear CTA above the fold are less likely to convert.",
    howToFix:
      "Move your primary CTA above the fold or add a sticky header CTA.",
    category: "ux",
  },
  {
    id: "4",
    severity: "warning",
    title: "Weak Social Proof",
    description: "No customer logos, testimonials, or trust badges above the fold.",
    whyItMatters:
      "Social proof reduces perceived risk and increases conversion by 15-30%.",
    howToFix:
      "Add 3-5 customer logos and a short testimonial near your headline.",
    exampleCopy:
      '"We cut our bookkeeping time by 80% in the first month." — Sarah, CFO at Acme Inc.',
    category: "trust",
  },
  {
    id: "5",
    severity: "improve",
    title: "Vague Value Proposition",
    description: "Messaging focuses on features rather than outcomes.",
    whyItMatters:
      "Outcome-focused messaging resonates better with decision-makers.",
    howToFix:
      "Reframe feature descriptions to emphasize the result for the user.",
    exampleCopy:
      '"Stop chasing receipts. Get a clear financial picture in one click."',
    category: "messaging",
  },
];
