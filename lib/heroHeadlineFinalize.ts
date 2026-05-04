/** Reject markdown/image URLs used as hero headline; fall back to first suitable H3. */
export function isInvalidMarkdownHeroHeadline(heroHeadline: string): boolean {
  return (
    heroHeadline.includes("![") ||
    heroHeadline.includes("](http") ||
    heroHeadline.startsWith("[![") ||
    heroHeadline.includes("cdn/shop") ||
    heroHeadline.includes(".svg") ||
    heroHeadline.includes(".png")
  );
}

export function finalizeHeroHeadline(
  heroHeadline: string | null | undefined,
  headlines: Array<{ tag: string; text: string }> | undefined,
  options?: { logFinal?: boolean }
): string | null {
  const logFinal = options?.logFinal !== false;
  let h =
    heroHeadline == null || heroHeadline === ""
      ? null
      : String(heroHeadline);

  if (h && isInvalidMarkdownHeroHeadline(h)) {
    console.log("[PARSER] Rejected invalid heroHeadline:", h.slice(0, 80));
    h = null;
  }

  if (!h && headlines?.length) {
    const h3Candidates = headlines
      .filter((x) => x.tag === "h3")
      .map((x) =>
        x.text
          .replace(/\*\*_(.+?)_\*\*/g, "$1")
          .replace(/\*\*(.+?)\*\*/g, "$1")
          .replace(/_(.+?)_/g, "$1")
          .trim()
      )
      .filter((t) => {
        const low = t.toLowerCase();
        const navPhrases = [
          "your cart is empty",
          "have an account",
          "log in",
          "continue shopping",
          "total items in cart",
        ];
        return (
          t.length > 4 &&
          t.length < 150 &&
          !t.includes("![") &&
          !t.includes("http") &&
          !/^(your cart|collection:|filter|sort by|estimated total|country|have an account|sign in|log in|search|skip to|continue shopping|usd|united states)/i.test(
            t
          ) &&
          !navPhrases.some((p) => low.includes(p))
        );
      });

    if (h3Candidates.length > 0) {
      h = h3Candidates[0]!;
      console.log("[PARSER] heroHeadline from H3 fallback:", h);
    }
  }

  if (logFinal) console.log("[PARSER] FINAL heroHeadline:", h);
  return h;
}
