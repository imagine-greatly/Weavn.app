import { createHash } from "crypto";

const CTA_RE = /\b(get|start|try|sign|join|buy|shop|book|schedule|request|download)\b/i;

function extractTag(html: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>(.*?)<\\/${tag}>`, "is");
  const m = re.exec(html);
  if (!m) return "";
  return m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

function extractMeta(html: string, name: string): string {
  let m = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i").exec(html);
  if (!m) m = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i").exec(html);
  return m?.[1]?.trim() ?? "";
}

function extractCtaText(html: string): string {
  const re = /<(?:button|a)[^>]*>([\s\S]{2,60}?)<\/(?:button|a)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]*>/g, "").trim();
    if (CTA_RE.test(text)) return text.slice(0, 60);
  }
  return "";
}

function approximateWordCount(html: string): number {
  const bodyM = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const body = bodyM?.[1] ?? html;
  return body.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
}

export async function fetchAndFingerprint(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    let html: string;
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WeavnBot/1.0)" },
      });
      if (!res.ok) return null;
      html = await res.text();
    } finally {
      clearTimeout(timer);
    }
    const parts = [
      extractTag(html, "title"),
      extractTag(html, "h1"),
      extractMeta(html, "description"),
      extractTag(html, "h2"),
      String(approximateWordCount(html)),
      extractCtaText(html),
    ];
    return createHash("sha256").update(parts.join("|")).digest("hex");
  } catch {
    return null;
  }
}

export function fingerprintsMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a === b;
}
