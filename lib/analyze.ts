/**
 * Send combined site extraction to Claude and return structured report.
 * Uses claude-sonnet-4-6 and the conversion psychologist system prompt.
 * Retries once on AI failure.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { CombinedExtraction } from "./scraper";
import { extractPageData } from "@/lib/analyzePipeline";
import type {
  ReportPayload,
  SiteType,
  ConversionKiller,
  ConversionTransformation,
  GrowthBlueprint,
  RevenueEffortLabel,
  EffortToFix,
  DimensionScoreRow,
} from "./reportSchema";

const SYSTEM_PROMPT_BASE = `You are receiving cleaned HTML directly from a fully-rendered website. Browserless rendered the page in a real Chrome browser — the HTML reflects what visitors actually see.

Analyze the HTML to identify conversion problems. Extract:
- Hero section: headline, subheadline, primary CTA button
- Trust signals: testimonials, logos, reviews, social proof
- Navigation structure
- Pricing: tiers, prices, conversion CTAs
- Forms and signup flows
- Page structure and content hierarchy

CRITICAL — CTA IDENTIFICATION RULES:
The hero CTA is a button or link INSIDE the hero section —
not in the navigation bar, not in the footer, not in a modal.
Navigation links (Sign up, Log in, Contact, Get started) in
the nav bar are NOT hero CTAs even if prominent.
If no button exists inside the hero section, report CTA as
ABSENT — do not substitute a nav link.
Always specify exact location of every CTA:
hero section / navigation / footer / pricing section / inline.

CTA FALSE POSITIVE RULES:
Do not flag these as findings:
- CTA buttons or links with href='#' or href='#section-id'
  anchor destinations — these are valid same-page navigation
  and the destination cannot be verified from HTML alone
- Links where the destination is an anchor on the same page
  (href starting with #) — assume these are functional unless
  there is direct evidence of a broken scroll target
- Navigation links that are standard site navigation —
  only flag navigation if it is structurally broken or
  missing entirely
- Anchor elements with href='' or href='#' that appear
  inside structured content cards — team member cards,
  provider cards, portfolio items, bio cards — where the
  card already displays the person's name, title, photo,
  and description text. These are Webflow and CMS rendering
  artifacts where JavaScript populates the link at runtime.
  The content is fully visible without clicking the link.
  Do not flag these as broken links, broken credential
  verification, or trust failures. The finding only applies
  if the card has NO visible content — name, title, or
  description are absent entirely.
- Countdown timers showing 00:00:00 or all-zero values —
  these are JavaScript-rendered elements that show zero in
  the static HTML before the script populates live values.
  Do not flag a countdown timer as broken based on zero
  values in the HTML alone. Only flag a countdown timer as
  a finding if the surrounding context confirms it is
  permanently disabled or referencing a past date that is
  explicitly stated in the HTML.

ABOVE-FOLD PRIORITY:
The HTML contains a [WEBDOC: estimated viewport boundary]
comment. Content before this comment is what visitors see
on load without scrolling — weight these findings highest.
Critical structural failures anywhere on the page are always
surfaced regardless of position: broken forms, missing H1,
absent pricing CTA, non-functional navigation.

FINDING PRIORITY ORDER:
1. CRITICAL — broken or absent elements above the fold
2. HIGH — weak conversion elements above the fold
3. MEDIUM — below-fold content suppressing conversion
4. LOW — below-fold improvements

SEVERITY CALIBRATION RULES:

To assign severity, run this decision tree in order.
Stop at the first YES and assign that severity.
Do not skip steps. Do not use judgment to override the tree.

STEP 1 — Is this finding about below-fold content only?
YES → HIGH. Stop. Below-fold findings are never CRITICAL.
NO → continue to Step 2.

STEP 2 — Would a motivated visitor who already wants to
convert be completely stopped by this problem — meaning
they have no clear path forward and cannot proceed without
resolving it?
YES → CRITICAL. Stop.
NO → continue to Step 3.

STEP 3 — Does this finding match any of these exact patterns?
- Hero contains no plain-language description of what the
  product or service is
- Price shown in hero or CTA with no statement of what is
  included or excluded
- No CTA button exists inside the hero section
- Trust claim in hero references expertise with no named
  individual anywhere on the homepage
- CTA destination does not match the hero offer
YES → CRITICAL. Stop.
NO → continue to Step 4.

STEP 4 — Is this finding about friction, weakness, or
suboptimal implementation rather than a hard failure?
Friction examples: weak copy, anonymous testimonials,
missing secondary trust signals, generic subheadline,
below-average but functional elements.
YES → HIGH. Stop.
NO → HIGH. Stop. When in doubt, HIGH not CRITICAL.

MANDATORY CHECKLIST ENFORCEMENT:
The site type instructions contain MANDATORY CHECKS. These
are not optional suggestions — run every one and surface it
as a finding if it fails. A failed mandatory check that is
not surfaced is a diagnostic error.

Mandatory checks take priority over other findings. Run them
first. Then fill remaining finding slots with the highest-
impact additional problems you identify from the HTML.

FINDING COUNT: Return 5 to 7 findings per scan. Never fewer
than 5. Never more than 7.

GROUNDING REQUIREMENT: Every finding must cite specific
observable evidence from the HTML — exact text strings,
element types, or their absence. Never describe a problem
in general terms without naming the specific element.
'The hero contains no button element' is grounded.
'The CTA strategy is weak' is not.

NARRATIVE FLOW EVALUATION:
After running mandatory checks, evaluate whether the
homepage follows a logical conversion sequence.
A high-converting page answers these in order:
1. What is this? (headline)
2. Why does it matter to me? (subheadline or problem framing)
3. Why should I believe you? (proof — testimonials, numbers,
   credentials, logos)
4. What do I do next? (CTA with clear scope)

Evaluate narrative flow ONLY when no CRITICAL findings exist.
If a CRITICAL finding is present, skip this evaluation.

Flag as HIGH suppression when:
- The subheadline restates the headline with no progression
  to why it matters or what problem it solves
- Social proof appears before the visitor has been told
  what the product is — trust before comprehension
- The page moves from headline directly to features with
  no problem framing or 'why you need this' bridge
- The hero CTA promises one outcome but the destination
  delivers a different experience
- Page sections appear in an order that does not build
  logically toward the CTA

Never flag narrative flow as CRITICAL.
Narrative flow is always HIGH or MEDIUM — suboptimal
sequencing, not a hard conversion stop.

NARRATIVE FLOW FINDING TITLES — sharp and surgical:
BAD: 'The subheadline repeats the headline instead of
     explaining why it matters'
GOOD: 'The subheadline restates the headline — no
      progression to why it matters'

BAD: 'Social proof appears before visitors understand
     the product'
GOOD: 'Trust signals appear before the offer is explained
      — credibility without context'

Evidence: describe exactly what appears in what order
and what is missing between those elements.

In addition to findings, the JSON output must include a
narrativeFlow field at the top level:

narrativeFlow: {
  verdict: 'strong' | 'weak' | 'broken',
  summary: '<one sentence describing the page flow>'
}

verdict definitions:
- strong: page follows logical sequence, visitor is guided
  naturally from awareness to action
- weak: sequence has gaps or repetition that slow the
  visitor but do not stop them
- broken: sequence is out of order or missing critical
  steps that prevent the visitor from understanding
  the offer or taking action

The summary is written in the clinical webdoc voice —
one sentence, no hedging, specific to this page.

VOICE AND TONE — READ BEFORE WRITING ANY OUTPUT:

webdoc is a precision diagnostic system. Every output is written in the voice of a world-class conversion specialist delivering a formal assessment. They have already done the analysis. They know exactly what is wrong. They present findings with the confidence of someone who has diagnosed hundreds of sites and is not here to soften the truth.

This voice is:
- AUTHORITATIVE — states findings as fact, never hedges with "may", "could", "might"
- PRECISE — names the specific element, describes exactly what is there, not what category of problem it represents
- DIRECT — gets to the point immediately, no dramatic openers, no buildup
- ZERO FLUFF — every sentence earns its place, nothing vague or generic

VOCABULARY BAN — never use these in any output field:
boost, unlock, seamless, pain points, actionable insights, revenue leak, money leak, leaks (in a conversion sense), costing you conversions. Say instead: revenue suppression, suppressing conversions, resolve / resolution, finding.

FINDING TITLES — one sentence, names the specific problem, no jargon compound nouns:
BAD: "Primary CTA Absent in Hero Viewport"
GOOD: "The Buy Button Does Not Exist on the First Screen Visitors See"
BAD: "Trust Signal Density Below Conversion Threshold"
GOOD: "Nothing on This Page Gives a First-Time Visitor a Reason to Trust You"

EVIDENCE (exitTrigger and evidence fields) — describes what exists and what the visitor experiences, observational, no interpretation yet:
BAD: "Hero section lacks primary CTA above the fold on the majority of viewport sizes"
GOOD: "The hero section contains no call to action. The first button on the page is 'Add' in the product grid, appearing after two full scroll lengths. Visitors with purchase intent have no forward path from the opening screen."

TECHNICAL LANGUAGE BAN — applies to every output field
including evidence, exitTrigger, implementation, and
finding titles:

Never use these in any output field:
- HTML element names: H1, H2, H3, div, span, section,
  nav, footer, header, anchor, href, class, id
- CSS class names or selectors of any kind
- Technical descriptors: DOM, element, tag, attribute,
  selector, node, render, hydrate, inject
- Developer terminology that a non-technical business
  owner would not recognize

Instead describe what the visitor sees and experiences:

BAD: 'The H1 element reads The Healthcare Revolution'
GOOD: 'The main headline reads The Healthcare Revolution'

BAD: 'anchor elements with href="" in team_members-
description-link class'
GOOD: 'the Read More links on each team member card
lead nowhere when clicked'

BAD: 'The nav-webinar-content div renders above the fold'
GOOD: 'A full-width event promotion banner appears above
the membership offer'

The evidence field describes observable visitor experience.
It never describes HTML structure.

IMPLEMENTATION — state WHAT to change and WHERE, specific enough that a developer acts without a follow-up question. Start with a verb. Max 55 words. Do not write the final copy — give the directive:
BAD: "Implement above-fold CTA architecture to improve conversion path visibility"
GOOD: "Add a single primary CTA button inside the hero section — destination: the main product or signup page. The current hero has no button element. Place it directly below the headline as the visually dominant interactive element on the first screen."
BAD: "Improve trust signaling across key conversion touchpoints"
GOOD: "Add total orders shipped, your strongest customer review with a real name, and your return policy directly in the hero section — all three are absent above the fold. Insert as three short lines below the primary CTA."

SCORING SYSTEM — REPLACE EXISTING SCORING SECTION:

The conversionScore is a precise integer reflecting
exactly what percentage of motivated visitors this
site successfully converts into the next step.

FORBIDDEN NUMBERS — never use these, they indicate
anchoring not precision:
10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 62,
65, 70, 75, 80, 85, 90

STEP 1 — DETERMINE THE BAND:

BROKEN (12–40): One or more hard conversion stops,
or the core offer cannot be understood within 3
seconds by a cold visitor.

Hard stops that guarantee this band:
- Form submit button disabled or broken
- Pricing page exists but shows no pricing
- Signup page is a blank loading screen
- Hero has no text explaining what the product is
- Page returns error or empty content

WEAK (41–57): Fundamental conversion failures that
stop a significant portion of motivated visitors.
The offer is understandable but the path to convert
is broken, hidden, or untrustworthy.

Common signals:
- No hero CTA button (CTA only in nav)
- Hero headline is a tagline or movement phrase
- Zero named social proof on a trust-critical site
- CTA routes to wrong destination
- Price shown with no scope or inclusion statement
- FAQ contradicts pricing page

AVERAGE (58–73): Site communicates the offer but
has meaningful gaps that slow motivated visitors.
Nothing is broken but friction is real.

Common signals:
- Hero CTA present but copy is weak
- Subheadline restates headline with no progression
- Social proof exists but is anonymous only
- Pricing visible but differentiator unstated
- Trust signals below fold only

STRONG (74–87): One or two meaningful friction
points but no fundamental conversion failures.
A motivated visitor can understand and convert —
they are just not optimally guided.

Common signals:
- CTA present and clear but not above fold
- Good trust signals but no named testimonials
- Pricing visible but not in hero
- Narrative flow has minor gaps

EXCEPTIONAL (88–91): Extremely rare. Hero is clear,
CTA is prominent and above fold, trust is established
with named proof, pricing is visible or one click
away, narrative flows from awareness to action.
Reserve for sites that genuinely excel at conversion.

STEP 2 — POSITION WITHIN THE BAND:

Start at the TOP of the band. Move DOWN.

FINDING COUNT PENALTY:
First finding: included in band determination
Each additional finding beyond the first: -2 points

ABOVE-FOLD SEVERITY PENALTY:
Each CRITICAL finding above the fold: -4 points
Each HIGH finding above the fold: -2 points
Below-fold or subpage findings: no additional penalty

HARD STOP FLOOR:
If any of these exist, score cannot exceed the
bottom third of the band:
- Disabled or broken form element
- Page that returns no content for its stated purpose
- CTA routing to a dead end or wrong destination
- Signup flow that cannot be completed

TRUST ABSENCE PENALTY:
Zero named social proof on trust-critical site
(healthcare, finance, legal, enterprise SaaS): -4
Zero named social proof on any site: -2
Anonymous aggregate proof only (no names): -1

PARTIAL CREDIT — move UP within band:
Strong technical foundation (clean meta, fast load
signals, proper OG tags): +2
Audience clearly stated somewhere on page: +1
Pricing visible even if not in hero: +2
Free tier explicitly stated in hero: +2
Named testimonials present even if below fold: +2
Clear differentiator from alternatives stated: +1

STEP 3 — ANTI-COLLISION CHECK:

After calculating your score ask:
- Does this number reflect something specific about
  this exact site?
- Would a site with different failures score
  differently?
- Is this score a forbidden number?

If the score is a forbidden number, move ±1-3 points
to the nearest non-forbidden integer that still
accurately reflects the site.

If two sites would score identically despite having
different failure patterns, adjust the lower-quality
site down by 2-4 points.

STEP 4 — FINAL VALIDATION:

Before writing the score ask these questions:
1. Is it a forbidden number? → adjust
2. Does it land in the right band for the severity
   of findings? → adjust if not
3. Does it reflect the specific combination of
   failures on THIS site, not a generic site with
   similar severity? → adjust if not
4. Would a founder looking at this score immediately
   understand the urgency level correctly?
   - Under 45: urgent, multiple fundamental failures
   - 45-60: serious, meaningful conversion barriers
   - 61-74: moderate, friction but functional
   - 75+: solid, optimization not emergency

EXAMPLE CALCULATIONS:

EXAMPLE A — bridgemind.ai type site:
Band: WEAK (41-57) — hero CTA routes to wrong
destination, submit button disabled
Start: 57
5 findings beyond first: -10 → 47
2 CRITICALs above fold: -8 → 39
Hard stop (disabled button): floor to bottom
third of band (41-47) → 43
Zero named social proof: -2 → 41
Strong technical foundation: +2 → 43
Final: 43

EXAMPLE B — tokenwisehq type site:
Band: WEAK (41-57) — pricing page is empty stub
Start: 57
5 findings beyond first: -10 → 47
1 CRITICAL above fold: -4 → 43
Hard stop (pricing page dead end): floor to
bottom third (41-47) → 43
Anonymous proof only: -1 → 42
Good technical foundation: +2 → 44
Audience stated in FAQ: +1 → 45
Free tier stated: +1 → 46
Final: 46

EXAMPLE C — struere.dev type site:
Band: WEAK (41-57) — hero CTA routes to founder
call not trial
Start: 57
6 findings beyond first: -12 → 45
1 CRITICAL above fold: -4 → 41
Zero named social proof, dev infrastructure: -4
→ floor to 12 minimum...
Actually: hard stop (CTA destination mismatch):
floor to bottom third (41-47) → 43
Zero named proof on infrastructure SaaS: -4 → 39
Floor applied: 41
Strong technical signals: +2 → 43
Final: 43

EXAMPLE D — well-built site, minor friction:
Band: AVERAGE (58-73)
Start: 73
3 findings beyond first: -6 → 67
2 HIGHs above fold: -4 → 63
Named social proof present: 0 penalty
Pricing visible: +2 → 65
Clear differentiator: +1 → 66
Anti-collision check: 65 is forbidden → use 66
Final: 66`;

const SITE_TYPE_INSTRUCTIONS: Record<SiteType, string> = {
  ecommerce: `The goal of this site is transactions. Every
finding must relate to why a visitor would hesitate to buy
or leave before purchasing.

MANDATORY CHECKS — evaluate every one, surface as a finding
if it fails:
1. Is the product name and what it does stated clearly in
   the hero without scrolling?
2. Is the price visible before or adjacent to the primary CTA?
3. Are shipping cost and return policy stated or linked near
   the CTA — not buried in the footer?
4. Do testimonials include full names and ideally photos —
   not initials only?
5. Is there a primary buy or add-to-cart CTA inside the hero?
6. Are trust signals present near the CTA — guarantees,
   secure checkout badges, review counts?`,

  saas: `The goal of this site is trial signups. Every finding
must relate to whether the visitor understands the product and
feels safe trying it.

MANDATORY CHECKS — evaluate every one, surface as a finding
if it fails:
1. Does the hero headline state what the product does in one
   plain sentence — not a tagline, a description?
2. Is there a free trial, demo, or signup CTA inside the hero?
3. Is pricing visible or one click away from the hero?
4. Are customer logos or testimonials with full names and
   company names present on the page?
5. Does the hero subheadline specify who the product is for?
6. Is the primary differentiator from alternatives stated
   anywhere on the page?`,

  service: `The goal of this site is membership signups,
bookings, or direct purchases. Every finding must relate to
whether the visitor trusts this business enough to take action.

MANDATORY CHECKS — evaluate every one, surface as a finding
if it fails:
1. Does the hero state the specific service category in plain
   language — not a movement, a philosophy, or a brand name?
   Visitors must know within 3 seconds what they are buying.
2. If a price is shown in the hero, is it accompanied by a
   clear statement of what that price includes and excludes?
   A price without scope creates expectation gaps that drive
   churn and refund requests.
3. Are the practitioners, founders, or providers named with
   full name and credentials on the homepage itself — not only
   on an About or Team page? Trust claims in the hero ('Built
   by Doctors', 'Expert team') require named individuals to be
   visible on the same page as the claim, or directly adjacent
   to the primary CTA. A named team that exists only on a
   separate About page does not resolve an anonymous trust claim
   on the homepage. Flag if named credentials are absent from
   the homepage when a trust claim referencing expertise is
   present.
4. Do testimonials use full names — not first name and last
   initial? On high-trust service sites, anonymous attribution
   reads as fabricated to skeptical visitors.
5. Is the primary CTA destination consistent with what the
   visitor expects based on the hero offer?
6. Are any hidden costs or upgrade requirements disclosed
   before the CTA rather than discovered post-signup?`,

  local: `The goal of this site is calls and in-person visits.
Every finding must relate to whether a local searcher would
choose this business over competitors.

MANDATORY CHECKS — evaluate every one, surface as a finding
if it fails:
1. Is the business address visible in the header or above
   the fold?
2. Is a phone number visible and click-to-call enabled?
3. Is the Google review count and star rating displayed?
4. Is the service area or city stated clearly?
5. Are hours of operation visible without scrolling?
6. Is there a primary booking or contact CTA in the hero?`,

  content: `The goal of this site is subscribers and return
readers. Every finding must relate to whether content attracts
the right visitors and converts them.

MANDATORY CHECKS — evaluate every one, surface as a finding
if it fails:
1. Is there an email capture or subscription CTA above
   the fold?
2. Is the content category immediately clear from the headline?
3. Is the author name and credential visible?
4. Are there internal links to related content?
5. Is there a clear value proposition for subscribing?
6. Is content freshness or publication date visible?`,

  unknown: `Apply universal conversion principles. This site did
not match a specific category strongly enough to
classify — diagnose it on fundamentals that apply to
every site regardless of type.

MANDATORY CHECKS — evaluate every one, surface as a
finding if it fails:
1. Does the hero explain what this site offers in one
   plain sentence — not a tagline, a brand name, or
   a movement phrase?
2. Is there a primary CTA button in the hero section
   — not in the navigation bar?
3. Is pricing or the clearest next step visible
   without scrolling?
4. Is there at least one trust signal above the fold
   — testimonial, credential, review count, or logo?
5. Is the target audience clear from the hero — does
   a first-time visitor know immediately if this is
   for them?
6. Is there a clear way to contact or reach the
   business — phone, email, form, or chat visible?`,
};

function buildSystemPrompt(siteType: SiteType): string {
  const instructions = SITE_TYPE_INSTRUCTIONS[siteType];
  return `${SYSTEM_PROMPT_BASE}

SITE TYPE: ${siteType.toUpperCase()}.

${instructions}

LANGUAGE HANDLING — If the page content is primarily in a non-English language, identify the language in the diagnosticBrief and conduct the full analysis in that context. Quote page elements in their original language. Do not translate copy and then critique the translation. Apply conversion principles universally but ground evidence in the actual language of the page. If you cannot read the language well enough to produce specific evidence-based findings, state this clearly in the diagnosticBrief rather than producing generic findings.

Return valid JSON matching this schema exactly:
{
  "diagnosticBrief": string,
  "intelligenceBrief": string,
  "conversionScore": number,
  "siteIntelligence": string,
  "siteType": string,
  "pagesAnalyzed": string[],
  "conversionTransformation": {
    "currentHeadline": string,
    "currentSubheadline": string,
    "currentCta": string,
    "trustArchitecture": string,
    "pageFlowNote": string
  },
  "conversionKillers": [
    {
      "id": string,
      "title": string,
      "exitTrigger": string,
      "evidence": string,
      "conversionCost": string,
      "implementation": string,
      "effort": "Today" | "This Week" | "This Month",
      "severity": "critical" | "high" | "medium",
      "category": string,
      "sourcePage": string
    }
  ],
  "growthBlueprint": {
    "weekOne": string[],
    "weekTwoToFour": string[],
    "monthTwo": string,
    "projectedLift": string,
    "projectedLiftNarrative": string
  },
  "dimensionScores": [
    {
      "dimension": "Conversion Architecture" | "Trust Signals" | "Message Clarity" | "Traffic Readiness" | "Technical Foundation",
      "score": number,
      "insight": string
    }
  ],
  "categoryScores": {
    "psychology": number,
    "messaging": number,
    "conversion": number,
    "seo": number,
    "ux": number,
    "trust": number
  },
  "narrativeFlow": {
    "verdict": "strong" | "weak" | "broken",
    "summary": string
  },
  "healthScore": number
}

Rules:
- diagnosticBrief: REQUIRED — max 72 words; cover site classification, score read, dominant suppression pattern with finding count, and the highest-leverage resolution. Be specific to this domain — cite real page elements. diagnosticBrief may duplicate intelligenceBrief or intelligenceBrief may be omitted.
- intelligenceBrief: optional legacy; if present without diagnosticBrief, use as executive narrative
- conversionKillers: minimum 3, maximum 7, ranked by revenue impact. If the site has fewer than 3 genuine conversion problems, produce only what exists — do not invent findings to reach a minimum. If the site has more than 7 genuine problems, surface the 7 highest revenue impact issues. Never produce a finding you cannot support with specific evidence from the page. Titles under 10 words; evidence must quote actual page text — max 45 words per evidence field
- conversionKillers evidence — Never cite carousel or slider content as incomplete or cut off. If testimonials, images, or content blocks appear to be part of a carousel or slider based on surrounding HTML structure, treat the full carousel as present and fully populated even if only one slide is visible in the snapshot.
- conversionKillers.exitTrigger: The specific experience the visitor has on the page that causes them to hesitate, doubt, or leave. Name the exact element and quote its visible text. Describe what they see or feel — not the business consequence. Example: 'Hero headline reads "Welcome" — visitor cannot determine what the site sells or who it is for.'
- conversionKillers.conversionCost: The business consequence in concrete terms — lost sales, abandoned signups, missed leads. Use a specific metric or percentage where accurate. These two fields must never contain the same text. exitTrigger = visitor experience. conversionCost = business impact.
- conversionKillers.implementation: Name the exact element and its page location. State the precise change a developer or marketer could act on immediately. Include why the change works. Start with a verb. Max 55 words. No category advice — be specific enough that a developer knows exactly what to do without follow-up questions.
- conversionKillers.sourcePage: Label the page this finding comes from — e.g. "LANDING PAGE", "PRICING PAGE", "FEATURES PAGE", "ABOUT PAGE", "CONTACT PAGE". For single-page analyses always use "LANDING PAGE".
- conversionTransformation.currentCta: Only return text if a clear, intentional hero-section call-to-action button exists above the fold. If the only buttons found are generic UI elements like 'Add', 'Add to cart', 'Menu', 'Search', or navigation links, return 'None detected' instead. Do not invent a CTA that is not clearly present as a primary action.
- growthBlueprint: weekOne and weekTwoToFour max 3 items each; monthTwo, projectedLift, and projectedLiftNarrative each max 70 words; weekOne actions must directly reference and address the highest-severity conversionKillers by their specific finding titles; weekTwoToFour must address remaining conversionKillers; every action item must name the specific element or issue it resolves — no generic advice; the blueprint is the execution plan for the findings, not a separate generic CRO checklist
- dimensionScores: exactly 5 objects one per dimension; score 0-100; insight max 30 words, specific to this site with reference to actual page evidence
- conversionScore: integer 0-100
- healthScore: same value as conversionScore for backwards compatibility
- narrativeFlow: required; verdict must be 'strong', 'weak', or 'broken' per the NARRATIVE FLOW EVALUATION definitions; summary is one sentence in the clinical webdoc voice, specific to this page's actual element sequence
- Return only valid JSON, no markdown, no preamble
- VOCABULARY: never use boost, unlock, seamless, pain points, actionable insights, revenue leak, money leak, or "costing you conversions" — use revenue suppression, suppressing conversions, resolve / resolution, finding
- FINAL CHECK: before returning, for every conversionKiller ask — (1) does the title name a specific element or a category? (2) does the evidence state an observable fact or hedge? (3) does the implementation name the exact element and change or give category advice? Rewrite any that fail.
- DYNAMIC CONTENT RULE — Before flagging any finding about missing, incomplete, or absent content, ask: could this be dynamic content that is not visible in a static HTML snapshot? Never flag as missing or broken: carousel or slider content (only one slide visible), tab panel content (only active tab captured), accordion content (collapsed panels not in DOM), modal or popup content (not open in snapshot), lazy-loaded images or text (may not have loaded), animated counters or numbers (may show initial value), video content (not capturable from HTML), or infinite scroll content (only first batch captured). Only flag content issues when the absence is clearly structural and not a rendering artifact of JavaScript-driven dynamic components. If surrounding HTML suggests a dynamic component — look for classes like swiper, slick, carousel, tabs, accordion, collapse, lazy — treat the component as fully functional and populated.
- UNREACHABLE PAGES — If the user message lists pages that were attempted but failed to load, do not generate findings about content that should be on those pages — note that the page was unreachable instead.
- TRUNCATED CONTENT — If you see a [WEBDOC: content truncated] comment in any page content, do NOT generate findings about content being cut off, incomplete, or mid-sentence — this is a technical scraper limitation not a real page issue. Only flag content issues when incompleteness is clearly structural.`;
}

function clampScore(v: number): number {
  return Math.min(100, Math.max(0, Math.round(Number(v))));
}

function mapCiDimensionScoresToRows(raw: unknown): DimensionScoreRow[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw.map((row, i) => {
    const r = row as Record<string, unknown>;
    const label = String(r.dimension ?? `dimension-${i}`);
    const score = clampScore(Number(r.score ?? 0));
    const insight = String(r.insight ?? "");
    const status: DimensionScoreRow["status"] =
      score >= 80 ? "strong" : score >= 60 ? "fair" : score >= 40 ? "weak" : "critical";
    return {
      id: `ci-${i}`,
      label,
      description: insight,
      score,
      failCount: 0,
      totalCount: 1,
      status,
    };
  });
}

function mapConversionKillerToLeak(
  input: Record<string, unknown>,
  idx: number
): ReportPayload["leaks"][number] {
  const sevStr = String(input.severity ?? "").toLowerCase();
  const mappedSeverity: "critical" | "warning" | "passing" =
    sevStr === "critical" ? "critical" : sevStr === "passing" ? "passing" : "warning";
  const effortRaw = String(input.effort ?? "This Week");
  const effortToFix: EffortToFix =
    effortRaw === "Today" ? "low" : effortRaw === "This Month" ? "high" : "medium";
  let revenueImpact = 0;
  if (sevStr === "critical") revenueImpact = 9;
  else if (sevStr === "high") revenueImpact = 7;
  else if (sevStr === "medium") revenueImpact = 4;
  const evidence = String(input.evidence ?? "");
  const exitTrigger = String(input.exitTrigger ?? "");
  const conversionCost = String(input.conversionCost ?? "");
  const implementation = String(input.implementation ?? "");
  const revenueEffort: RevenueEffortLabel =
    effortRaw === "Today" || effortRaw === "This Week" || effortRaw === "This Month"
      ? effortRaw
      : "This Week";

  const id = String(input.id ?? `ck-${idx}`);
  const title = String(input.title ?? "");

  return {
    id,
    category: String(input.category ?? "general"),
    severity: mappedSeverity,
    type: "existing",
    title,
    revenueTitle: title,
    ...(evidence.trim() ? { evidence: evidence.trim() } : {}),
    ...(conversionCost.trim() ? { businessCost: conversionCost.trim() } : {}),
    revenueEffort,
    whatWeFound: evidence || exitTrigger,
    whyItMatters: [exitTrigger, conversionCost].filter((x) => x.trim()).join(" — ") || conversionCost,
    howToFixIt: implementation,
    exampleFix: implementation,
    psychologyPrinciple: exitTrigger,
    revenueImpact,
    effortToFix,
    timeToFix:
      effortRaw === "Today" ? "~2 hours" : effortRaw === "This Month" ? "~30 days" : "1–3 days",
  };
}

function parseConversionIntelligencePayload(o: Record<string, unknown>, siteType: SiteType, fallbackPages?: string[]): ReportPayload {
  const categoryScoresIn = (o.categoryScores as Record<string, number>) ?? {};
  const pagesAnalyzed =
    Array.isArray(o.pagesAnalyzed) && o.pagesAnalyzed.length > 0
      ? o.pagesAnalyzed.map(String)
      : (fallbackPages ?? []);
  const convScore = clampScore(Number(o.conversionScore ?? o.healthScore ?? 50));
  const ct = (o.conversionTransformation as Record<string, unknown>) ?? {};
  const gb = (o.growthBlueprint as Record<string, unknown>) ?? {};
  const killersRaw = Array.isArray(o.conversionKillers) ? o.conversionKillers : [];
  const leaks = killersRaw.map((k, i) => mapConversionKillerToLeak(k as Record<string, unknown>, i));

  const weekOne = Array.isArray(gb.weekOne) ? gb.weekOne.map((x) => String(x)) : [];
  const weekTwo = Array.isArray(gb.weekTwoToFour) ? gb.weekTwoToFour.map((x) => String(x)) : [];

  const psychNote = [ct.trustArchitecture, ct.pageFlowNote]
    .filter((x) => typeof x === "string" && String(x).trim())
    .map(String)
    .join("\n\n");

  const conversionKillers: ConversionKiller[] = killersRaw.map((k, i) => {
    const r = k as Record<string, unknown>;
    const effort = r.effort;
    const e: RevenueEffortLabel =
      effort === "Today" || effort === "This Week" || effort === "This Month"
        ? effort
        : "This Week";
    const sev = r.severity;
    const s: "critical" | "high" | "medium" =
      sev === "critical" || sev === "high" || sev === "medium" ? sev : "medium";
    return {
      id: String(r.id ?? `ck-${i}`),
      title: String(r.title ?? ""),
      exitTrigger: String(r.exitTrigger ?? ""),
      evidence: String(r.evidence ?? ""),
      conversionCost: String(r.conversionCost ?? ""),
      implementation: String(r.implementation ?? ""),
      effort: e,
      severity: s,
      category: String(r.category ?? "general"),
      sourcePage: typeof r.sourcePage === "string" && r.sourcePage.trim() ? r.sourcePage.trim() : undefined,
    };
  });

  const altStrings = (key: string): string[] =>
    Array.isArray(ct[key])
      ? (ct[key] as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];

  const conversionTransformation: ConversionTransformation = {
    currentHeadline: String(ct.currentHeadline ?? ""),
    currentSubheadline: String(ct.currentSubheadline ?? ""),
    currentCta: String(ct.currentCta ?? ""),
    rewrittenHeadline: String(ct.rewrittenHeadline ?? ""),
    rewrittenSubheadline: String(ct.rewrittenSubheadline ?? ""),
    rewrittenCta: String(ct.rewrittenCta ?? ""),
    rewrittenHeadlineAlternatives: altStrings("rewrittenHeadlineAlternatives"),
    rewrittenSubheadlineAlternatives: altStrings("rewrittenSubheadlineAlternatives"),
    rewrittenCtaAlternatives: altStrings("rewrittenCtaAlternatives"),
    trustArchitecture: String(ct.trustArchitecture ?? ""),
    pageFlowNote: String(ct.pageFlowNote ?? ""),
  };

  const projectedLiftNarrativeRaw =
    typeof gb.projectedLiftNarrative === "string"
      ? String(gb.projectedLiftNarrative).trim()
      : "";
  const growthBlueprint: GrowthBlueprint = {
    weekOne,
    weekTwoToFour: weekTwo,
    monthTwo: String(gb.monthTwo ?? ""),
    projectedLift: String(gb.projectedLift ?? ""),
    ...(projectedLiftNarrativeRaw ? { projectedLiftNarrative: projectedLiftNarrativeRaw } : {}),
  };

  const dimensionScores = mapCiDimensionScoresToRows(o.dimensionScores);
  const diagnosticBriefRaw =
    typeof o.diagnosticBrief === "string" ? String(o.diagnosticBrief).trim() : "";
  const intelBrief =
    diagnosticBriefRaw ||
    (typeof o.intelligenceBrief === "string" ? o.intelligenceBrief.trim() : "");
  const siteIntelRaw =
    typeof o.siteIntelligence === "string" ? o.siteIntelligence.trim() : "";
  const siteIntel =
    siteIntelRaw && siteIntelRaw.toLowerCase() !== "unknown" ? siteIntelRaw : "";

  const topLeakMapped = mapLegacyLeakToNew((o.topLeak as Record<string, unknown>) ?? {}, "top-leak");
  const topLeak = topLeakMapped ?? leaks[0];

  const nfRaw = o.narrativeFlow as { verdict?: unknown; summary?: unknown } | null | undefined;
  const narrativeFlow = nfRaw && typeof nfRaw === 'object'
    ? {
        verdict: (nfRaw.verdict === 'strong' || nfRaw.verdict === 'weak' || nfRaw.verdict === 'broken')
          ? (nfRaw.verdict as 'strong' | 'weak' | 'broken')
          : ('weak' as const),
        summary: String(nfRaw.summary ?? '').trim(),
      }
    : undefined;

  return {
    site_type: siteType,
    healthScore: convScore,
    growthScore: convScore,
    conversionScore: convScore,
    pagesAnalyzed,
    categoryScores: {
      psychology: clampScore(categoryScoresIn.psychology ?? 50),
      messaging: clampScore(categoryScoresIn.messaging ?? 50),
      conversion: clampScore(categoryScoresIn.conversion ?? 50),
      seo: clampScore(categoryScoresIn.seo ?? 50),
      ux: clampScore(categoryScoresIn.ux ?? 50),
      trust: clampScore(categoryScoresIn.trust ?? 50),
    },
    topLeak,
    leaks,
    ...(intelBrief
      ? {
          intelligenceBrief: intelBrief,
          ...(diagnosticBriefRaw ? { diagnosticBrief: diagnosticBriefRaw } : {}),
        }
      : {}),
    ...(siteIntel ? { siteIntelligence: siteIntel } : {}),
    conversionTransformation,
    conversionKillers,
    growthBlueprint,
    ...(dimensionScores ? { dimensionScores } : {}),
    heroRewrite: {
      currentHeadline: String(ct.currentHeadline ?? ""),
      currentSubheadline: String(ct.currentSubheadline ?? "Not found"),
      currentCta: String(ct.currentCta ?? "No CTA found"),
      suggestedHeadline: String(ct.rewrittenHeadline ?? ""),
      suggestedSubheadline: String(ct.rewrittenSubheadline ?? ""),
      suggestedCta: String(ct.rewrittenCta ?? ""),
      psychologistsNote: psychNote,
    },
    growthStrategy: {
      biggestOpportunity: String(weekOne[0] ?? gb.projectedLift ?? ""),
      trafficOpportunity: String(weekTwo[0] ?? gb.monthTwo ?? ""),
      conversionOpportunity: String(weekTwo[1] ?? gb.projectedLift ?? ""),
      trustOpportunity: String(weekTwo[2] ?? ""),
      quickWins: weekOne,
      thirtyDayPlan: [weekTwo.join("\n"), gb.monthTwo, gb.projectedLift]
        .filter((x) => typeof x === "string" && String(x).trim())
        .map(String)
        .join("\n\n"),
    },
    ...(narrativeFlow ? { narrativeFlow } : {}),
  } as ReportPayload;
}

function parseLegacyPsychologistPayload(o: Record<string, unknown>, siteType: SiteType): ReportPayload {
  const categoryScores = (o.categoryScores as Record<string, number>) ?? {};
  const topLeak = (o.topLeak as Record<string, unknown>) ?? {};
  const leaks = Array.isArray(o.leaks) ? o.leaks : [];
  const heroRewrite = (o.heroRewrite as Record<string, unknown>) ?? {};
  const growthStrategy = (o.growthStrategy as Record<string, unknown>) ?? {};
  const pagesAnalyzed = Array.isArray(o.pagesAnalyzed) ? o.pagesAnalyzed : [];

  return {
    site_type: siteType,
    healthScore: clampScore(Number(o.healthScore) ?? 50),
    pagesAnalyzed: pagesAnalyzed.map(String),
    categoryScores: {
      psychology: clampScore(categoryScores.psychology ?? 50),
      messaging: clampScore(categoryScores.messaging ?? 50),
      conversion: clampScore(categoryScores.conversion ?? 50),
      seo: clampScore(categoryScores.seo ?? 50),
      ux: clampScore(categoryScores.ux ?? 50),
      trust: clampScore(categoryScores.trust ?? 50),
    },
    topLeak: mapLegacyLeakToNew(topLeak, "top-leak"),
    leaks: leaks
      .map((l: Record<string, unknown>, idx: number) => mapLegacyLeakToNew(l, `leak-${idx}`)!)
      .filter(Boolean) as ReportPayload["leaks"],
    heroRewrite: {
      currentHeadline: String(heroRewrite.currentHeadline ?? ""),
      currentSubheadline: String(heroRewrite.currentSubheadline ?? "Not found"),
      currentCta: String(heroRewrite.currentCta ?? "No CTA found"),
      suggestedHeadline: String(heroRewrite.suggestedHeadline ?? heroRewrite.headline ?? ""),
      suggestedSubheadline: String(heroRewrite.suggestedSubheadline ?? heroRewrite.subheadline ?? ""),
      suggestedCta: String(heroRewrite.suggestedCta ?? heroRewrite.cta ?? ""),
      psychologistsNote: String(heroRewrite.psychologistsNote ?? heroRewrite.psychologistNote ?? ""),
    },
    growthStrategy: {
      biggestOpportunity: String(growthStrategy.biggestOpportunity ?? ""),
      trafficOpportunity: String(growthStrategy.trafficOpportunity ?? ""),
      conversionOpportunity: String(growthStrategy.conversionOpportunity ?? ""),
      trustOpportunity: String(growthStrategy.trustOpportunity ?? ""),
      quickWins: Array.isArray(growthStrategy.quickWins)
        ? growthStrategy.quickWins.map((q) => String(q))
        : growthStrategy.quickWin != null
          ? [String(growthStrategy.quickWin)]
          : [],
      thirtyDayPlan: String(growthStrategy.thirtyDayPlan ?? ""),
    },
  };
}

function ensurePayload(raw: unknown, siteType: SiteType, fallbackPages?: string[]): ReportPayload {
  const o = raw as Record<string, unknown>;
  if (
    o.heroRewrite != null &&
    typeof o.heroRewrite === "object" &&
    o.conversionTransformation == null &&
    typeof o.intelligenceBrief !== "string" &&
    typeof o.diagnosticBrief !== "string"
  ) {
    return parseLegacyPsychologistPayload(o, siteType);
  }
  return parseConversionIntelligencePayload(o, siteType, fallbackPages);
}

function mapLegacyLeakToNew(input: Record<string, unknown>, fallbackId: string): ReportPayload["leaks"][number] | undefined {
  if (!input || Object.keys(input).length === 0) return undefined;

  const severity = input.severity;
  const mappedSeverity: "critical" | "warning" | "passing" =
    severity === "critical" || severity === "warning" || severity === "passing" ? severity : "warning";

  const effort =
    input.effortToFix === "low" || input.effortToFix === "medium" || input.effortToFix === "high"
      ? input.effortToFix
      : ("medium" as const);

  const revenueImpactRaw = input.revenueImpact;
  const impactScoreRaw = input.impactScore;
  const revenueImpact =
    typeof revenueImpactRaw === "number"
      ? revenueImpactRaw
      : typeof impactScoreRaw === "number"
        ? impactScoreRaw
        : 0;

  return {
    id: String(input.id ?? fallbackId),
    category: String(input.category ?? "general"),
    severity: mappedSeverity,
    title: String(input.title ?? ""),
    whatWeFound: String((input as any).whatWeFound ?? (input as any).description ?? ""),
    whyItMatters: String((input as any).whyItMatters ?? (input as any).evidence ?? ""),
    howToFixIt: String((input as any).howToFixIt ?? (input as any).recommendation ?? ""),
    exampleFix: String((input as any).exampleFix ?? (input as any).aiFix ?? (input as any).recommendation ?? ""),
    psychologyPrinciple: String((input as any).psychologyPrinciple ?? ""),
    revenueImpact,
    effortToFix: effort,
    timeToFix: String(input.timeToFix ?? "1 hour"),
  };
}

function guessPageLabel(url: string): string {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (/\/pricing/.test(path)) return 'PRICING PAGE';
    if (/\/features/.test(path)) return 'FEATURES PAGE';
    if (/\/(signup|register|trial)/.test(path)) return 'SIGNUP PAGE';
    if (/\/about/.test(path)) return 'ABOUT PAGE';
    if (/\/contact/.test(path)) return 'CONTACT PAGE';
    if (/\/services?/.test(path)) return 'SERVICES PAGE';
    if (/\/products?\//.test(path)) return 'PRODUCT PAGE';
    if (/\/collections?\//.test(path)) return 'COLLECTION PAGE';
    if (/\/blog\//.test(path)) return 'BLOG POST';
  } catch { /* fall through */ }
  return 'SUBPAGE';
}

/**
 * Converts raw HTML into a compact labelled summary for Claude.
 * compact=true reduces per-section limits when combining multiple pages.
 */
function buildSinglePageSummary(rawHtml: string, url: string, compact = false): string {
  let pageType = 'homepage';
  try {
    const path = new URL(url).pathname;
    if (path && path !== '/') {
      const label = guessPageLabel(url);
      pageType = label !== 'SUBPAGE'
        ? label.toLowerCase().replace(/ page$/, '').replace(/\s+/g, '-')
        : 'subpage';
    }
  } catch { /* keep 'homepage' */ }
  const page = extractPageData(rawHtml, url, pageType);
  const parts: string[] = [];

  if (url) parts.push(`URL: ${url}`);

  const metaLines = [
    page.meta.title && `Title: ${page.meta.title}`,
    page.meta.description && `Description: ${page.meta.description}`,
    page.meta.ogTitle && page.meta.ogTitle !== page.meta.title && `OG Title: ${page.meta.ogTitle}`,
    page.meta.ogDescription &&
      page.meta.ogDescription !== page.meta.description &&
      `OG Description: ${page.meta.ogDescription}`,
  ].filter(Boolean);
  if (metaLines.length) parts.push(`META\n${metaLines.join("\n")}`);

  const heroLines = [
    page.hero.headline && `Headline: ${page.hero.headline}`,
    page.hero.subheadline && `Subheadline: ${page.hero.subheadline}`,
    page.hero.ctaText &&
      `CTA: "${page.hero.ctaText}"${page.hero.ctaHref ? ` → ${page.hero.ctaHref}` : ""}`,
    page.hero.bodyText && `Body: ${page.hero.bodyText.slice(0, compact ? 200 : 400)}`,
  ].filter(Boolean);
  if (heroLines.length) parts.push(`HERO\n${heroLines.join("\n")}`);

  const h1s = page.headlines.filter((h) => h.tag === "h1").map((h) => `"${h.text}"`);
  const h2s = page.headlines.filter((h) => h.tag === "h2").slice(0, compact ? 5 : 8).map((h) => `"${h.text}"`);
  const h3s = page.headlines.filter((h) => h.tag === "h3").slice(0, compact ? 3 : 5).map((h) => `"${h.text}"`);
  if (h1s.length) parts.push(`H1: ${h1s.join(" | ")}`);
  if (h2s.length) parts.push(`H2: ${h2s.join(" | ")}`);
  if (h3s.length) parts.push(`H3: ${h3s.join(" | ")}`);

  if (page.sections.length) {
    const sectionText = page.sections
      .slice(0, compact ? 4 : 6)
      .map((s) => `[${s.label}] ${s.text.slice(0, compact ? 200 : 250)}`)
      .join("\n");
    parts.push(`SECTIONS\n${sectionText}`);
  }

  if (page.paragraphs) {
    parts.push(`BODY TEXT\n${page.paragraphs.slice(0, compact ? 1800 : 2000)}`);
  }

  if (page.pricing.length) {
    const pricingText = page.pricing
      .map(
        (p) =>
          `${p.planName}: ${p.price}${p.features.length ? ` | ${p.features.slice(0, 5).join(", ")}` : ""}`
      )
      .join("\n");
    parts.push(`PRICING\n${pricingText}`);
  }

  if (page.testimonials.length) {
    const testText = page.testimonials
      .slice(0, compact ? 2 : 4)
      .map(
        (t) =>
          `"${t.text.slice(0, compact ? 150 : 200)}" — ${t.author}${t.result ? ` [${t.result}]` : ""}`
      )
      .join("\n");
    parts.push(`TESTIMONIALS\n${testText}`);
  }

  const sp = page.socialProof;
  const spParts = [
    sp.reviewCount && `${sp.reviewCount} reviews`,
    sp.starRating && `${sp.starRating} stars`,
    sp.customerCount && `${sp.customerCount} customers`,
    sp.clientLogos.length && `Client logos: ${sp.clientLogos.slice(0, 5).join(", ")}`,
    sp.pressLogos.length && `Press: ${sp.pressLogos.slice(0, 3).join(", ")}`,
    sp.certifications.length && `Certs: ${sp.certifications.slice(0, 3).join(", ")}`,
  ].filter(Boolean);
  if (spParts.length) parts.push(`SOCIAL PROOF: ${spParts.join(" | ")}`);

  if (page.trust.length) {
    const trustText = page.trust
      .slice(0, compact ? 3 : 6)
      .map((t) => t.text.slice(0, 120))
      .join(" | ");
    parts.push(`TRUST SIGNALS: ${trustText}`);
  }

  if (page.buttons.length) {
    const ctaText = page.buttons
      .slice(0, compact ? 6 : 10)
      .map((b) => `"${b.text}"${b.href ? ` → ${b.href}` : ""}`)
      .join(" | ");
    parts.push(`CTAs: ${ctaText}`);
  }

  if (page.navigation.length) {
    parts.push(`NAVIGATION: ${page.navigation.slice(0, 10).join(" | ")}`);
  }

  if (page.forms.length) {
    const formText = page.forms
      .map((f) => `Fields: [${f.fields.slice(0, 5).join(", ")}] → "${f.submitText}"`)
      .join(" | ");
    parts.push(`FORMS: ${formText}`);
  }

  const contact = [
    page.hasPhoneNumber && "phone present",
    page.hasEmailAddress && "email present",
    page.hasAddress && "physical address present",
  ].filter(Boolean);
  if (contact.length) parts.push(`CONTACT: ${contact.join(", ")}`);

  if (page.structured_data.length) {
    parts.push(`SCHEMA.ORG: ${page.structured_data.join(", ")}`);
  }

  if (page.faq && page.faq.length > 0) {
    const faqText = page.faq
      .slice(0, compact ? 3 : 6)
      .map(({ question, answer }) => `Q: ${question}\nA: ${answer.slice(0, compact ? 200 : 350)}`)
      .join("\n\n");
    parts.push(`FAQ\n${faqText}`);
  }

  parts.push(`PAGE STATS: ${page.wordCount} words | ${page.h1Count} H1s | ${page.ctaCount} CTAs`);

  return parts.join("\n\n");
}

export function buildPageSummary(extraction: CombinedExtraction): string {
  const homepageUrl = extraction.pagesAnalyzed[0] ?? "";
  const hasSubpages = extraction.additionalPages && extraction.additionalPages.length > 0;

  if (!hasSubpages) {
    return buildSinglePageSummary(extraction.rawHtml, homepageUrl, false);
  }

  const sections: string[] = [];
  sections.push(`=== [HOMEPAGE] ===\n${buildSinglePageSummary(extraction.rawHtml, homepageUrl, true)}`);
  for (const { url, rawHtml } of extraction.additionalPages!) {
    const label = guessPageLabel(url);
    sections.push(`=== [${label}] ===\n${buildSinglePageSummary(rawHtml, url, true)}`);
  }
  return sections.join("\n\n");
}

export async function runAnalysis(
  extraction: CombinedExtraction,
  siteType: SiteType,
  plan?: string,
  model?: string,
  timeoutMs?: number
): Promise<ReportPayload> {
  const resolvedModel = model ?? "claude-sonnet-4-6";
  const clientTimeoutMs =
    extraction.complexity === 'simple' ? 130_000 :
    extraction.complexity === 'medium' ? 155_000 :
    185_000 // complex
  process.stderr.write('[ANALYZE] client timeout | complexity=' + (extraction.complexity ?? 'unknown') + ' timeoutMs=' + clientTimeoutMs + '\n')
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: clientTimeoutMs,
  });

  // Hard cap: adaptive per complexity — safety net for callers that bypass scrapeSite truncation.
  let safeExtraction = extraction;
  const hardCap =
    extraction.complexity === 'simple' ? 80_000 :
    extraction.complexity === 'medium' ? 110_000 :
    140_000  // complex
  if (extraction.rawHtml.length > hardCap) {
    process.stderr.write('[ANALYZE] HARD CAP applied: rawHtml ' + extraction.rawHtml.length + ' chars → ' + hardCap + ' (complexity=' + (extraction.complexity ?? 'medium') + ')\n');
    safeExtraction = { ...extraction, rawHtml: extraction.rawHtml.slice(0, hardCap) };
  }
  process.stderr.write('[ANALYZE] rawHtml entering pipeline: ' + safeExtraction.rawHtml.length + ' chars\n');

  const systemPrompt = buildSystemPrompt(siteType);

  const complexity = safeExtraction.complexity ?? 'medium'

  const totalCap =
    complexity === 'simple' ? 130_000 :
    complexity === 'medium' ? 145_000 :
    175_000 // complex

  const homepageSection =
    `=== HOMEPAGE: ${safeExtraction.pagesAnalyzed[0]} ===\n` +
    safeExtraction.rawHtml

  const subpageSections = (safeExtraction.additionalPages ?? [])
    .map(({ url, rawHtml }) =>
      `=== ${guessPageLabel(url).toUpperCase()}: ${url} ===\n${rawHtml}`)
    .join('\n\n')

  const fullContent = subpageSections
    ? homepageSection + '\n\n' + subpageSections
    : homepageSection

  const cappedSummary = fullContent.slice(0, totalCap)

  process.stderr.write(
    '[ANALYZE] direct HTML to claude | complexity=' + complexity +
    ' homepage=' + safeExtraction.rawHtml.length +
    ' subpages=' + (safeExtraction.additionalPages?.length ?? 0) +
    ' totalCap=' + totalCap +
    ' actual=' + cappedSummary.length + '\n'
  )

  const isMultiPage = (safeExtraction.additionalPages?.length ?? 0) > 0;
  const pageCount = 1 + (safeExtraction.additionalPages?.length ?? 0);

  const failedPages = (safeExtraction.pagesAttempted ?? []).filter(
    u => !safeExtraction.pagesAnalyzed.includes(u)
  );
  const failureNote = failedPages.length > 0
    ? `\n\nPAGES ATTEMPTED BUT FAILED TO LOAD (treat as unreachable — do not generate findings about content that should be on these pages): ${failedPages.join(', ')}`
    : '';

  const userContent = isMultiPage
    ? `Analyze cleaned HTML from ${pageCount} pages of a website. Produce 3-7 findings ranked by revenue impact across all pages. In the evidence field of each finding, name which page it came from.\n\n${cappedSummary}${failureNote}`
    : `Analyze the following cleaned HTML from a fully-rendered website page and return your JSON analysis:\n\n${cappedSummary}${failureNote}`;
  process.stderr.write(`[ANALYZE] userContent_len=${userContent.length} isMultiPage=${isMultiPage} failedPages=${failedPages.length}\n`);
  process.stderr.write('[ANALYZE] prompt chars: ' + userContent.length + '\n');

  const maxTokens = isMultiPage ? 8000 : 6000

  let attempt = 0;
  const run = async (): Promise<ReportPayload> => {
    attempt++;
    process.stderr.write(`[ANALYZE] claude START | attempt=${attempt} model=${resolvedModel} contentLen=${userContent.length} maxTokens=${maxTokens}\n`);
    const message = await client.messages.create({
      model: resolvedModel,
      max_tokens: maxTokens,
      temperature: 0,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    });
    const cacheRead = message.usage?.cache_read_input_tokens ?? 0;
    const cacheWrite = message.usage?.cache_creation_input_tokens ?? 0;
    const cacheHit = cacheRead > 0;
    process.stderr.write(`[ANALYZE] claude DONE | attempt=${attempt} stop_reason=${message.stop_reason} input_tokens=${message.usage?.input_tokens} output_tokens=${message.usage?.output_tokens}\n`);
    process.stderr.write(`[ANALYZE] CACHE | hit=${cacheHit} cache_read=${cacheRead} cache_write=${cacheWrite}\n`);

    if (message.stop_reason === "max_tokens") {
      const err = new Error("Analysis response truncated: max_tokens ceiling reached. Retrying would yield the same result.");
      (err as Error & { noRetry: boolean }).noRetry = true;
      throw err;
    }

    const block = message.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") {
      throw new Error("AI returned no text content.");
    }

    let raw: string = block.text;
    raw = raw.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
    process.stderr.write(`[ANALYZE] JSON.parse START | raw_len=${raw.length}\n`);
    const parsed: unknown = JSON.parse(raw);
    process.stderr.write(`[ANALYZE] JSON.parse DONE\n`);
    return ensurePayload(parsed, siteType, safeExtraction.pagesAnalyzed);
  };

  const runStart = Date.now()
  try {
    return await run();
  } catch (firstErr) {
    process.stderr.write(`[ANALYZE] attempt 1 FAILED | ${firstErr instanceof Error ? firstErr.message : String(firstErr)}\n`);
    if ((firstErr as Error & { noRetry?: boolean }).noRetry) throw firstErr;
    const runElapsed = Date.now() - runStart
    const remaining = timeoutMs != null ? timeoutMs - runElapsed : Infinity
    if (remaining < 20_000) {
      process.stderr.write(`[ANALYZE] skipping attempt 2 — ${remaining}ms remaining, need 20000\n`)
      throw firstErr instanceof Error ? firstErr : new Error("Analysis failed. Please try again.")
    }
    try {
      return await run();
    } catch (secondErr) {
      process.stderr.write(`[ANALYZE] attempt 2 FAILED | ${secondErr instanceof Error ? secondErr.message : String(secondErr)}\n`);
      throw firstErr instanceof Error ? firstErr : new Error("Analysis failed. Please try again.");
    }
  }
}

export interface PreviewResult {
  conversionScore: number;
  topFinding: { title: string; description: string; severity: string } | null;
}

const PREVIEW_SYSTEM_PROMPT = `You are a conversion diagnostic system analyzing a
business website. You receive cleaned HTML sampled
from a real browser render — it includes the above-
fold section and the most content-rich sections of
the page.

STEP 1 — SHELL CHECK:
If body text is under 100 chars — shell HTML only.
Return: { conversionScore: 40, topFinding: null }

STEP 2 — MANDATORY CHECKLIST (check in order,
stop at first failure, make it topFinding):

CHECK 1: Does the hero state what the product or
service is in plain language?
Movement language, brand names, and slogans do not
count. 'The future of work' fails. 'Project management
software for remote teams' passes.
FAIL → CRITICAL

CHECK 2: Is there a primary CTA button in the hero
section — not only in the navigation bar?
Only flag if you can confirm no button exists in the
hero from what is visible in the HTML. Do not assume.
FAIL → CRITICAL

CHECK 3: If a price is shown, does it state what is
included at that price?
Only apply if pricing is visible in the HTML.
FAIL → CRITICAL

CHECK 4: Does the hero make a trust or authority
claim with no named individual visible to support it?
FAIL → CRITICAL

CHECK 5: Is visible body text under 200 chars?
FAIL → return { conversionScore: 35, topFinding: null }

CHECK 6: No social proof above fold on a trust-
critical site (healthcare, finance, legal)?
FAIL → HIGH

STEP 3 — IF ALL CHECKS PASS:
Find the single most impactful weakness VISIBLE
IN THE HTML. Priority order — stop at first match:

PRIORITY 1 — HIGH:
- Subheadline restates headline with no new
  information — quote both
- Hero CTA copy is generic with no outcome stated
  — quote the actual CTA text
- All social proof is anonymous — no full names
- Hero names no target audience

PRIORITY 2 — MEDIUM:
- Pricing not mentioned in hero or nav
- No differentiator from alternatives stated
- Trust signals only below fold

MANDATORY FINDING RULE:
topFinding must NEVER be null when body text
exceeds 200 chars. If all checks pass and no
priority items match — return the weakest
observable element as MEDIUM.

GROUNDING RULE — NON-NEGOTIABLE:
Base every finding ONLY on content literally
visible in the HTML. Never reference elements
you cannot see.

BANNED PHRASES — if your finding contains any
of these, rewrite or skip it:
'or similar', 'likely', 'probably', 'not visible
in the provided HTML', 'may not', 'appears to',
'seems to', 'typically', 'usually'

SCORING:
BROKEN (12-40): Hard stop or offer incomprehensible
WEAK (41-57): Fundamental failures present
AVERAGE (58-73): Friction but functional
STRONG (74-87): Minor friction only
EXCEPTIONAL (88-91): Nearly optimized, very rare

Never use multiples of 5 or 10.
Calculate from band top downward.

FINDING FORMAT:
title: under 12 words, names the specific problem
description: 2 sentences — first quotes specific
visible content, second states conversion impact
severity: critical | high | medium

Return ONLY valid JSON, no markdown:
{
  "conversionScore": <integer>,
  "topFinding": {
    "title": "<under 12 words>",
    "description": "<2 sentences>",
    "severity": "critical" | "high" | "medium"
  } | null
}`;

export async function runPreviewAnalysis(
  extraction: CombinedExtraction,
  siteType: SiteType
): Promise<PreviewResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000 });

  const attempt = async (): Promise<PreviewResult> => {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: PREVIEW_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Site type: ${siteType}.\n\nRun the mandatory checks in order and return the first failure as the topFinding. If no checks fail, return the single highest-impact conversion weakness.\n\nHTML:\n${extraction.rawHtml}`,
        },
      ],
    });

    const block = message.content.find((c) => c.type === "text");
    if (!block || block.type !== "text") throw new Error("No text response from model.");

    process.stderr.write(
      '[PREVIEW] haiku raw response | len=' +
      block.text.length +
      ' preview=' +
      block.text.slice(0, 200) + '\n'
    )

    // Extract just the JSON object — ignore any text before
    // or after it that Haiku adds despite instructions
    const jsonMatch = block.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      process.stderr.write('[ANALYZE] preview no JSON found | raw=' +
        block.text.slice(0, 200) + '\n')
      return { conversionScore: 50, topFinding: null }
    }
    let raw = jsonMatch[0]
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '\"')
      .replace(/\u2014/g, '--')
      .replace(/\u2013/g, '-')

    const extractResult = (parsed: Record<string, unknown>) => {
      process.stderr.write(
        '[PREVIEW] parsed result | score=' +
        parsed.conversionScore +
        ' topFinding=' +
        (parsed.topFinding ? String((parsed.topFinding as Record<string, unknown>).title ?? '') : 'null') +
        '\n'
      )
      const score = Math.min(100, Math.max(0, Math.round(Number(parsed.conversionScore ?? 50))));
      const tf = parsed.topFinding as Record<string, unknown> | undefined;
      return {
        conversionScore: score,
        topFinding: tf
          ? {
              title: String(tf.title ?? ""),
              description: String(tf.description ?? ""),
              severity: String(tf.severity ?? "medium"),
            }
          : null,
      };
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return extractResult(parsed);
    } catch {
      // Strip description to prevent parse failures
      // from special characters in quoted copy
      try {
        const stripped = raw.replace(
          /"description"\s*:\s*"[^"]*"/g,
          '"description": "See full report for details"'
        )
        const parsed = JSON.parse(stripped) as Record<string, unknown>;
        return extractResult(parsed);
      } catch {
        process.stderr.write('[PREVIEW] JSON failed\n')
        return { conversionScore: 50, topFinding: null }
      }
    }
  };

  try {
    return await attempt();
  } catch (err) {
    process.stderr.write('[ANALYZE] preview ERROR | ' + err + '\n')
    return { conversionScore: 50, topFinding: null };
  }
}
