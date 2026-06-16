/**
 * White-label branding model.
 *
 * Agencies rebrand the WRAPPER (cover, chrome accent, theme, footer, which
 * optional sections appear), never the INSTRUMENT. The report body — score ring,
 * conversion-health strip, findings, voice, section order — is fixed by the
 * locked report component + the selected template, and is physically un-editable
 * here. Two token families stay strictly separate:
 *   - the brand ACCENT drives chrome only (eyebrows, rules, dividers, links, cover)
 *   - VERDICT colors (red/amber/green) are semantic + fixed, never the accent,
 *     so a red brand never makes every ring read "critical".
 */

export type ThemeMode = "light" | "dark";
export type TemplateId = "standard";

export interface BrandingConfig {
  agencyName: string;
  logoUrl: string;
  accentColor: string;
  theme: ThemeMode;
  coverNote: string;
  footerText: string;
  includedSections: { rewrites: boolean; blueprint: boolean };
  templateId: TemplateId;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  agencyName: "",
  logoUrl: "",
  accentColor: "#6F9BC6",
  theme: "light",
  coverNote: "",
  footerText: "",
  includedSections: { rewrites: true, blueprint: true },
  templateId: "standard",
};

// ── Template registry — extensible by design ────────────────────────────────────
// Adding a curated template (minimal / dense / narrative) = register another entry
// here; each is individually locked (its section list + order is fixed, agencies
// only theme + toggle the `core: false` sections). The render path iterates this
// list, so a second template needs no structural change to the report component.
export type SectionId = "score" | "health" | "brief" | "findings" | "rewrites" | "blueprint";

export interface TemplateDescriptor {
  id: TemplateId;
  name: string;
  sections: { id: SectionId; core: boolean }[];
}

export const TEMPLATES: Record<TemplateId, TemplateDescriptor> = {
  standard: {
    id: "standard",
    name: "Standard",
    sections: [
      { id: "score", core: true },
      { id: "health", core: true },
      { id: "brief", core: true },
      { id: "findings", core: true },
      { id: "rewrites", core: false },
      { id: "blueprint", core: false },
    ],
  },
};

export function getTemplate(id: string | undefined | null): TemplateDescriptor {
  return TEMPLATES[(id as TemplateId)] ?? TEMPLATES.standard;
}

// ── Theme + verdict token sets ──────────────────────────────────────────────────
export interface ThemeTokens {
  mode: ThemeMode;
  bg: string;
  surface: string;
  inkPrimary: string;
  inkSecondary: string;
  inkMuted: string;
  border: string;
  track: string;
  /** Semantic diagnostic colors — NEVER driven by the brand accent. */
  verdict: { red: string; amber: string; green: string };
  /** Contrast-safe chrome accent (a hex for white-label, the surface CSS var in-app). */
  accent: string;
  /** Low-alpha accent fill for blooms / tints. */
  accentSoft: string;
}

const DARK = {
  bg: "#050810",
  surface: "#0A0E18",
  inkPrimary: "#E6E9EE",
  inkSecondary: "#9398A8",
  inkMuted: "#6E7587",
  border: "rgba(255,255,255,0.06)",
  track: "rgba(255,255,255,0.07)",
  // Dark-bg verdict tokens.
  verdict: { red: "#E8635F", amber: "#EFB23E", green: "#00C48C" },
} as const;

const LIGHT = {
  bg: "#FFFFFF",
  surface: "#F5F7FA",
  inkPrimary: "#0F172A",
  inkSecondary: "#475467",
  inkMuted: "#8A93A6",
  border: "rgba(15,23,42,0.10)",
  track: "rgba(15,23,42,0.08)",
  // Light-safe verdict variants — darker for contrast on white (PDF/print).
  verdict: { red: "#C5453E", amber: "#A66A09", green: "#1A8A5E" },
} as const;

// ── Color helpers ───────────────────────────────────────────────────────────────
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec((hex ?? "").trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return "#" + [r, g, b].map((c) => clamp255(c).toString(16).padStart(2, "0")).join("");
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** Validate + normalize a hex accent; falls back to the default steel. */
export function normalizeHex(hex: string): string {
  const rgb = parseHex(hex);
  return rgb ? rgbToHex(rgb) : DEFAULT_BRANDING.accentColor;
}

/**
 * Auto-derive a contrast-safe chrome accent for the given theme. The raw accent
 * is nudged toward black (light theme) or white (dark theme) until it clears a
 * luminance band — so it never becomes low-contrast chrome on the page bg. Used
 * for chrome ONLY; verdict/body tokens never read from here.
 */
export function contrastSafeAccent(hex: string, theme: ThemeMode): string {
  const rgb = parseHex(hex);
  if (!rgb) return theme === "light" ? "#1F4E79" : "#6F9BC6";
  let c = rgb;
  for (let i = 0; i < 14; i++) {
    const L = relativeLuminance(c);
    if (theme === "light" && L > 0.5) c = mix(c, [0, 0, 0], 0.1);
    else if (theme === "dark" && L < 0.32) c = mix(c, [255, 255, 255], 0.1);
    else break;
  }
  return rgbToHex(c);
}

function hexToRgba(hex: string, alpha: number): string {
  const rgb = parseHex(hex) ?? [111, 155, 198];
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/**
 * Resolve theme + accent tokens for the report. No branding (in-app report) →
 * the existing dark surface, with chrome accent flowing from --surface-accent.
 * White-label → the chosen light/dark token set + a contrast-safe brand accent.
 */
export function resolveTheme(branding?: BrandingConfig | null): ThemeTokens {
  const base = branding?.theme === "dark" ? DARK : branding ? LIGHT : DARK;
  if (!branding) {
    return {
      mode: "dark",
      ...base,
      accent: "var(--surface-accent)",
      accentSoft: "color-mix(in srgb, var(--surface-accent) 12%, transparent)",
    };
  }
  const accent = contrastSafeAccent(branding.accentColor, branding.theme);
  return {
    mode: branding.theme,
    ...base,
    accent,
    accentSoft: hexToRgba(accent, branding.theme === "light" ? 0.1 : 0.14),
  };
}

/** Coerce an arbitrary stored/posted value into a valid BrandingConfig. */
export function sanitizeBranding(input: unknown): BrandingConfig {
  const o = (input ?? {}) as Record<string, unknown>;
  const inc = (o.includedSections ?? {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  return {
    agencyName: str(o.agencyName, 80),
    logoUrl: typeof o.logoUrl === "string" && /^https?:\/\//i.test(o.logoUrl) ? o.logoUrl.slice(0, 600) : "",
    accentColor: normalizeHex(typeof o.accentColor === "string" ? o.accentColor : DEFAULT_BRANDING.accentColor),
    theme: o.theme === "dark" ? "dark" : "light",
    coverNote: str(o.coverNote, 400),
    footerText: str(o.footerText, 160),
    includedSections: {
      rewrites: inc.rewrites !== false,
      blueprint: inc.blueprint !== false,
    },
    templateId: getTemplate(typeof o.templateId === "string" ? o.templateId : undefined).id,
  };
}
