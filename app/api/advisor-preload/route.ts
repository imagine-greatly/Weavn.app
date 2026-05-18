import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      domain?: string;
      title?: string;
      evidence?: string;
      whyItMatters?: string;
    };

    const domain = typeof body.domain === "string" ? body.domain.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "Missing title.", code: "ADVISOR_PRELOAD_MISSING" },
        { status: 400 }
      );
    }

    const evidence = typeof body.evidence === "string" ? body.evidence : "";
    const whyItMatters =
      typeof body.whyItMatters === "string" ? body.whyItMatters : "";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Unavailable.", code: "ADVISOR_PRELOAD_NO_KEY" },
        { status: 503 }
      );
    }

    const domainLabel = domain || "this site";
    const systemPrompt = `You are a conversion rate optimization consultant advising the owner of ${domainLabel}. You have just finished analyzing a specific finding on their site. Give sharp, actionable, specific advice. Reference the actual site and finding. Never give generic advice.`;

    const userMessage = `Write a 3-4 sentence opening advisory message for the finding "${title}" on ${domainLabel}. Lead with the most important thing they should do first. Be specific to their site and evidence. No generic advice.

Raw evidence: ${evidence || "(none provided)"}
Raw why it matters: ${whyItMatters || "(none provided)"}`;

    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = msg.content.find((b) => b.type === "text");
    const opening =
      textBlock && textBlock.type === "text"
        ? textBlock.text.trim()
        : "";

    if (!opening) {
      return NextResponse.json(
        { error: "Empty response.", code: "ADVISOR_PRELOAD_EMPTY" },
        { status: 502 }
      );
    }

    const res = NextResponse.json({ opening });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Advisor preload failed.";
    console.error("[advisor-preload]", err);
    return NextResponse.json(
      { error: message, code: "ADVISOR_PRELOAD_ERROR" },
      { status: 500 }
    );
  }
}
