/**
 * Scan guard — blocks only globally recognized mega-platforms no single business could plausibly own.
 * Legitimate business sites (including large employers) are never blocked on size alone.
 */

/** Multi-segment public suffixes → registrable domain is last N labels (e.g. amazon.co.uk). */
const REGISTRABLE_SUFFIX2 = new Set([
  "co.uk",
  "com.au",
  "co.jp",
  "com.br",
  "co.nz",
  "com.mx",
  "co.in",
  "com.tr",
  "com.ar",
  "com.sg",
  "org.uk",
  "net.au",
  "co.kr",
  "com.co",
  "co.za",
  "com.hk",
  "com.tw",
  "com.my",
  "com.ph",
  "ne.jp",
  "or.jp",
  "ac.uk",
  "gov.uk",
  "ltd.uk",
  "plc.uk",
]);

/**
 * Lowercase registrable roots — mega-platforms only (no plausible single-owner operator).
 * Subdomains of these roots are blocked by isBlockedDomain().
 */
export const BLOCKED_SCAN_ROOTS: readonly string[] = [
  // Amazon retail — global + major regional storefronts
  "amazon.com",
  "amazon.co.uk",
  "amazon.de",
  "amazon.fr",
  "amazon.it",
  "amazon.es",
  "amazon.nl",
  "amazon.se",
  "amazon.pl",
  "amazon.ca",
  "amazon.com.au",
  "amazon.com.br",
  "amazon.in",
  "amazon.co.jp",
  "amazon.com.mx",
  "amazon.ae",
  "amazon.sg",
  "amazon.sa",
  "amazon.eg",
  "amazon.com.tr",
  "amazon.co.za",
  "amazon.cl",
  "amazon.com.co",
  "amazon.com.be",
  // Google — google.com covers *.google.com; add common regional google.* roots
  "google.com",
  "google.co.uk",
  "google.de",
  "google.fr",
  "google.ca",
  "google.com.au",
  "google.co.jp",
  "google.it",
  "google.es",
  "google.nl",
  "google.pl",
  "google.be",
  "google.at",
  "google.ch",
  "google.ie",
  "google.co.in",
  "google.com.br",
  "google.com.mx",
  "google.com.tr",
  "google.ae",
  "google.co.za",
  "google.co.nz",
  "google.pt",
  "google.cl",
  "google.com.ar",
  "google.co.id",
  "google.com.sg",
  "google.com.hk",
  "google.com.tw",
  // Named mega-platforms (full list intent)
  "facebook.com",
  "instagram.com",
  "whatsapp.com",
  "youtube.com",
  "netflix.com",
  "alibaba.com",
  "aliexpress.com",
  "wikipedia.org",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "reddit.com",
  "linkedin.com",
  "ebay.com",
  "walmart.com",
  "microsoft.com",
  "apple.com",
] as const;

const BLOCKED_SET = new Set<string>(BLOCKED_SCAN_ROOTS);

function stripProtocol(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, "");
}

/** Hostname only, no path/query/port; lowercase; strips leading www. */
export function scanGuardHostnameFromInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProto).hostname.toLowerCase().replace(/^www\./i, "");
  } catch {
    const withoutProto = stripProtocol(trimmed);
    const hostPart = (withoutProto.split(/[/?:#]/)[0] ?? "").replace(/:\d+$/, "");
    return hostPart.trim().toLowerCase().replace(/^www\./i, "");
  }
}

/**
 * Registrable-style root (e.g. store.amazon.co.uk → amazon.co.uk, www.google.com → google.com).
 */
export function scanGuardRegistrableRoot(hostname: string): string {
  const h = hostname.replace(/\.$/, "").toLowerCase();
  if (!h) return "";
  const parts = h.split(".").filter(Boolean);
  if (parts.length < 2) return h;
  const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  if (REGISTRABLE_SUFFIX2.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

/**
 * True when URL host (any subdomain) maps to a blocked registrable root.
 */
export function isBlockedDomain(url: string): boolean {
  const host = scanGuardHostnameFromInput(url);
  if (!host) return false;
  const root = scanGuardRegistrableRoot(host);
  if (!root) return false;
  if (BLOCKED_SET.has(host) || BLOCKED_SET.has(root)) return true;
  for (const blocked of BLOCKED_SCAN_ROOTS) {
    if (host === blocked || root === blocked) return true;
    if (host.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

export type BlockedScanMessage = {
  headline: string;
  body: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

export function getBlockedMessage(): BlockedScanMessage {
  return {
    headline: "Diagnostic Unavailable for This Domain.",
    body:
      "WebDoc's diagnostic engine is built for business websites. This domain is a globally recognized platform outside the scope of our diagnostic parameters — scanning it would consume excessive resources without producing actionable findings for a site owner.\n\nIf you own a business website, enter that URL to run a full conversion diagnostic.",
    ctaPrimary: "Run Diagnostic on My Site",
    ctaSecondary: "Contact Support",
  };
}
