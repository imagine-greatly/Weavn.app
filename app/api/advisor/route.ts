import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { formatWebDocScoreWithBand } from "@/lib/displayScoreColor";
import {
  buildDashboardAdvisorBaseSystemPrompt,
  buildDashboardAdvisorIssueSystemPrompt,
} from "@/lib/prompts";
import { getUserReports } from "@/lib/supabase";
import type { ReportPayload } from "@/lib/reportSchema";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function buildContext(
  reports: Array<{
    domain: string;
    created_at: string;
    payload: ReportPayload;
  }>
) {
  const blocks = reports.map((r) => {
    const leaks = r.payload?.leaks ?? [];
    const critical = leaks.filter((l) => l.severity === "critical");
    const warnings = leaks.filter((l) => l.severity === "warning");
    const cs = r.payload?.categoryScores ?? {};
    const hero = r.payload?.heroRewrite;
    const exec = r.payload?.executiveSummary;
    const growth = r.payload?.growthStrategy;

    const topFindings = leaks
      .slice()
      .sort((a, b) => (b.revenueImpact ?? 0) - (a.revenueImpact ?? 0))
      .slice(0, 8)
      .map(
        (l, i) =>
          `${i + 1}. [${l.severity.toUpperCase()}] ${l.title}
   What: ${l.whatWeFound}
   Why: ${l.whyItMatters}
   Resolution: ${l.howToFixIt}
   Impact: ${l.revenueImpact}/10 | Effort: ${l.effortToFix} | Time: ${l.timeToFix}`
      )
      .join("\n\n");

    const hs = typeof r.payload?.healthScore === "number" ? r.payload.healthScore : 0;

    return [
      `═══ SITE: ${r.domain} ═══`,
      `Scan date: ${formatDate(r.created_at)}`,
      `WebDoc Score: ${formatWebDocScoreWithBand(hs)}`,
      ``,
      `CATEGORY SCORES:`,
      `  Revenue impact: ${cs.psychology ?? 0}/100`,
      `  Messaging: ${cs.messaging ?? 0}/100`,
      `  Conversion: ${cs.conversion ?? 0}/100`,
      `  Trust: ${cs.trust ?? 0}/100`,
      `  SEO: ${cs.seo ?? 0}/100`,
      `  UX: ${cs.ux ?? 0}/100`,
      ``,
      `SUMMARY: ${critical.length} critical, ${warnings.length} warnings`,
      exec ? `VERDICT: ${exec.verdict}` : "",
      exec ? `DIAGNOSIS: ${exec.diagnosis}` : "",
      exec ? `PRIORITY ACTION: ${exec.priorityAction}` : "",
      ``,
      `ALL FINDINGS (ranked by revenue impact):`,
      topFindings,
      ``,
      hero ? `HERO SECTION:` : "",
      hero ? `Current headline: "${hero.currentHeadline}"` : "",
      hero ? `Current CTA: "${hero.currentCta}"` : "",
      hero ? `Diagnostic note: ${hero.psychologistsNote}` : "",
      ``,
      growth ? `PRIORITY RESOLUTION: ${growth.biggestOpportunity}` : "",
      growth?.quickWins?.length
        ? `QUICK WINS:\n${growth.quickWins.map((w, i) => `${i + 1}. ${w}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  return blocks.join("\n\n");
}

async function getSessionUserId(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return "";
  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {},
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? "";
}

export async function POST(req: NextRequest) {
  try {
  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    activeDomain?: string;
    conversationHistory?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    issueContext?: unknown;
  };

  const message = typeof body.message === "string" ? body.message : "";
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized.", code: "UNAUTHORIZED" }, { status: 401 });
  }
  const conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];
  const activeDomain = typeof body.activeDomain === "string" ? body.activeDomain : "";

  const issueContext = body.issueContext
    ? (body.issueContext as {
        title: string;
        severity: string;
        whatWeFound: string;
        whyItMatters: string;
        howToFixIt: string;
        exampleFix: string;
        psychologyPrinciple: string;
        revenueImpact: number;
        timeToFix: string;
      })
    : null;

  if (!message) {
    return NextResponse.json(
      { error: "Missing message.", code: "ADVISOR_MISSING_MESSAGE" },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const allReports = userId ? await getUserReports(userId, 5) : [];

  const activeReports = allReports.filter((r) => r.domain === activeDomain);
  const otherReports = allReports.filter((r) => r.domain !== activeDomain);

  const activeContext =
    activeReports.length > 0
      ? buildContext(
          activeReports.map((r) => ({
            domain: r.domain,
            created_at: r.created_at,
            payload: r.analysis,
          }))
        )
      : "No data for active site.";

  const otherContext =
    otherReports.length > 0
      ? `OTHER SITES IN PORTFOLIO:\n${otherReports
          .map((r) => {
            const h = r.analysis?.healthScore;
            const line =
              typeof h === "number" ? formatWebDocScoreWithBand(h) : `WebDoc Score: ${String(h ?? "Unknown")}`;
            return `- ${r.domain}: ${line}`;
          })
          .join("\n")}`
      : "";

  const contextString = [
    `CURRENTLY VIEWING: ${activeDomain || "Unknown site"}`,
    ``,
    activeContext,
    otherContext ? `\n${otherContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const reports =
    activeReports.length > 0 ? activeReports : allReports;

  const baseSystemPrompt = buildDashboardAdvisorBaseSystemPrompt(contextString);

  const domainLabel = activeDomain || "this site";
  const hs0 = reports[0]?.analysis?.healthScore;
  const healthScoreForIssue =
    typeof hs0 === "number" ? formatWebDocScoreWithBand(hs0) : "Unknown";
  const systemPrompt = issueContext
    ? buildDashboardAdvisorIssueSystemPrompt(domainLabel, healthScoreForIssue, issueContext)
    : baseSystemPrompt;

  // messages.stream() enables token-by-token streaming (Anthropic SDK equivalent of stream: true).
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-5-20251022",
    max_tokens: 400,
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [
      ...conversationHistory.map((m) => ({
        role: m.role === "system" ? "user" : m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    start(controller) {
      stream
        .on("text", (textDelta: string) => {
          controller.enqueue(encoder.encode(textDelta));
        })
        .on("end", () => controller.close())
        .on("error", () => controller.close());
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Advisor request failed.";
    console.error("[advisor]", err);
    return NextResponse.json(
      { error: message, code: "ADVISOR_ERROR" },
      { status: 500 }
    );
  }
}
