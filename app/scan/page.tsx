"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const BG = "#000008";
const CY = "#00C8FF";
const MONO = "var(--font-space-mono), ui-monospace, monospace";
const ORBIT = "var(--font-orbitron), ui-sans-serif, sans-serif";

const SECTIONS = [
  { id: "nav", label: "NAVIGATION", badge: "STRUCTURE", dwell: 2200 },
  { id: "hero", label: "HERO", badge: "MESSAGING", dwell: 6500 },
  { id: "social", label: "SOCIAL PROOF", badge: "TRUST", dwell: 2600 },
  { id: "features", label: "FEATURES", badge: "VALUE", dwell: 4800 },
  { id: "testimonials", label: "TESTIMONIALS", badge: "PROOF", dwell: 4800 },
  { id: "cta", label: "CTA", badge: "CONVERSION", dwell: 2600 },
  { id: "footer", label: "FOOTER", badge: "SEO & META", dwell: 2200 },
] as const;

const TOTAL_DWELL = SECTIONS.reduce((s, x) => s + x.dwell, 0);

const STATUS_MESSAGES = [
  "Initializing diagnostic scan...",
  "Analyzing above-fold conversion architecture...",
  "Detecting CTA placement across viewport breakpoints...",
  "Scoring headline persuasion architecture...",
  "Evaluating trust signal density...",
  "Mapping navigation structure and hierarchy...",
  "Identifying conversion suppression patterns...",
  "Analyzing social proof placement and visibility...",
  "Scoring page load performance impact...",
  "Evaluating mobile viewport conversion architecture...",
  "Detecting form friction and completion barriers...",
  "Analyzing above-fold value proposition clarity...",
  "Scoring CTA visual hierarchy and contrast...",
  "Flagging structural anomalies in conversion flow...",
  "Evaluating revenue dimension: Authority & Trust...",
  "Evaluating revenue dimension: CTA Architecture...",
  "Evaluating revenue dimension: Page Performance...",
  "Evaluating revenue dimension: Social Proof...",
  "Cross-referencing diagnostic findings...",
  "Rendering findings — ranked by revenue impact...",
] as const;

const SECTION_MESSAGES: Record<string, string[]> = {
  nav: [
    "Auditing navigation conversion architecture...",
    "Analyzing primary CTA placement and visibility...",
    "Evaluating menu hierarchy and friction points...",
  ],
  hero: [
    "Scoring headline persuasion architecture...",
    "Analyzing value proposition clarity...",
    "Detecting above-the-fold conversion triggers...",
    "Evaluating hero CTA strength and specificity...",
  ],
  social: [
    "Scanning trust signal density...",
    "Analyzing social proof placement and credibility...",
    "Evaluating testimonial conversion weight...",
  ],
  features: [
    "Auditing feature-to-benefit translation...",
    "Analyzing information hierarchy...",
    "Detecting objection handling gaps...",
  ],
  testimonials: [
    "Scoring testimonial specificity and trust...",
    "Analyzing proof element placement...",
    "Evaluating social validation architecture...",
  ],
  cta: [
    "Analyzing call-to-action conversion strength...",
    "Detecting friction in conversion flow...",
    "Scoring CTA copy and visual hierarchy...",
  ],
  footer: [
    "Auditing footer trust signals...",
    "Analyzing secondary conversion opportunities...",
    "Scanning SEO and meta conversion readiness...",
  ],
  default: [
    "Cross-referencing diagnostic findings...",
    "Ranking issues by conversion impact...",
    "Compiling intelligence brief...",
  ],
};

const STATUS_COMPLETE_TEXT = "Scan complete. Diagnostic report ready.";

const MILESTONE_FLASHES = [
  { ms:  8_000, text: "NAVIGATION ARCHITECTURE MAPPED" },
  { ms: 19_000, text: "HERO CONVERSION SIGNALS EXTRACTED" },
  { ms: 30_000, text: "TRUST SIGNAL DENSITY SCORED" },
  { ms: 41_000, text: "CTA ARCHITECTURE ANALYZED" },
  { ms: 52_000, text: "PERSUASION PATTERNS IDENTIFIED" },
  { ms: 63_000, text: "TRAFFIC READINESS EVALUATED" },
  { ms: 74_000, text: "REVENUE SUPPRESSION PATTERNS FLAGGED" },
  { ms: 84_000, text: "DIAGNOSTIC FINDINGS RANKED" },
] as const;

function cubicEaseInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function getDomain(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return urlStr || "target";
  }
}

function ScanLoadingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url")?.trim() ?? "";
  const [resolvedUrl, setResolvedUrl] = useState("");
  const isRescanActive =
    searchParams.get("rescan") === "true" ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("rescan") === "true");
  console.log('[scan] isRescanActive:', isRescanActive, 'url param:', urlParam, 'full search params:', searchParams.toString());
  useEffect(() => {
    if (!urlParam) return;
    const t = window.setTimeout(() => setResolvedUrl(urlParam), 300);
    return () => clearTimeout(t);
  }, [urlParam]);

  const beamDivRef = useRef<HTMLDivElement>(null);
  const laserLineRef = useRef<HTMLDivElement>(null);
  const beamRafRef = useRef<number>(0);
  const schematicRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const scoreOverlayRef = useRef<HTMLDivElement>(null);
  const ringInnerRef = useRef<HTMLDivElement>(null);
  const ringOuterRef = useRef<HTMLDivElement>(null);
  const scoreNumRef = useRef<HTMLDivElement>(null);
  const checksCounterRef = useRef<HTMLSpanElement>(null);
  const pulseBarRef = useRef<HTMLDivElement>(null);
  const pulseGlowRef = useRef<HTMLDivElement>(null);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [sectionVisualComplete, setSectionVisualComplete] = useState(false);
  const [materialized, setMaterialized] = useState(false);
  const [scoreReveal, setScoreReveal] = useState(false);
  const scoreRevealRef = useRef(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [subLabelVis, setSubLabelVis] = useState(false);
  const [diagLabelVis, setDiagLabelVis] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanFailure, setScanFailure] = useState<
    null | { kind: "severe" | "client"; message?: string }
  >(null);
  const [scanRetrying, setScanRetrying] = useState(false);
  const [invalidUrlMessage, setInvalidUrlMessage] = useState<string | null>(null);
  const [statusBarOverride, setStatusBarOverride] = useState<string | null>(null);
  const [scanUserAborted, setScanUserAborted] = useState(false);
  // Cinematic intro — starts true for fresh scans so the overlay is visible on the very first frame
  const [introVisible, setIntroVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const p = new URLSearchParams(window.location.search);
    if (p.get("rescan") === "true") return false;
    return p.get("url") !== null ||
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("pendingUrl") !== null);
  });
  const [introFadingOut, setIntroFadingOut] = useState(false);
  const [introLine1, setIntroLine1] = useState("");
  const [introLine2Glitch, setIntroLine2Glitch] = useState("");
  const [introLine2Real, setIntroLine2Real] = useState(0);
  const [introLine3, setIntroLine3] = useState(false);
  // Status typewriter
  const [typedStatus, setTypedStatus] = useState<string>(STATUS_MESSAGES[0]);
  const [milestoneFlash, setMilestoneFlash] = useState<string | null>(null);
  const [milestoneFlashFade, setMilestoneFlashFade] = useState(false);

  // beam-Y section activation state
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  // status crossfade state
  const [statusText, setStatusText] = useState<string>(STATUS_MESSAGES[0]);
  const [statusFading, setStatusFading] = useState(false);

  const healthScoreRef = useRef(74);
  const domainRef = useRef("");
  const normalizedUrlRef = useRef("");
  const apiFailedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const beamRafHaltedRef = useRef(false);
  const cancelRequestedRef = useRef(false);
  const hasRetriedRef = useRef(false);
  const isRescanRef = useRef(false);

  const beamActiveRef = useRef(false);
  const sectionIdxRef = useRef(0);
  const sectionElapsedRef = useRef(0);
  const sectionTopRef = useRef(0);
  const sectionBotRef = useRef(0);
  const lastScanTickRef = useRef(0);
  const rafScanRef = useRef<number>(0);
  const scanStartedRef = useRef(false);
  const apiDoneRef = useRef(false);
  const scanStartTimeRef = useRef(0);
  const estimatedTotalMsRef = useRef<number>(Number(searchParams.get("analyzeTimeoutMs")) || 150000);

  // beam spring physics (all in one ref, no re-renders)
  const beamStateRef = useRef<{
    pos: { x: number; y: number };
    target: { x: number; y: number };
    velocity: { x: number; y: number };
    dwellTimer: number;
    behaviorMode: "free" | "drag" | "hesitate";
    dragTargetX: number;
    visitedY: number[];
    lastFrameTime: number;
    nudgeScheduled: boolean;
    nudgePendingAt: number;
    nudgeDelta: { x: number; y: number };
  }>({
    pos: { x: 0, y: 120 },
    target: { x: 0, y: 120 },
    velocity: { x: 0, y: 0 },
    dwellTimer: 0,
    behaviorMode: "free",
    dragTargetX: 0,
    visitedY: [],
    lastFrameTime: 0,
    nudgeScheduled: false,
    nudgePendingAt: 0,
    nudgeDelta: { x: 0, y: 0 },
  });

  const wpRef = useRef<{
    tx: number;
    ty: number;
    dwell: number;
    force: number;
    phase: "scan" | "seek";
    sweepRight: boolean;
    lastSecId: string | null;
  }>({
    tx: 0,
    ty: 0,
    dwell: 0,
    force: 0.016,
    phase: "seek",
    sweepRight: true,
    lastSecId: null,
  });

  const sectionBoundsRef = useRef<Array<{ id: string; top: number; bottom: number }>>([]);
  const activeSectionIdRef = useRef<string | null>(null);
  const completedSectionIdsRef = useRef<Set<string>>(new Set());
  const statusCrossfadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionMsgIdxRef = useRef<Record<string, number>>({});

  useLayoutEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (urlParam) return;
    const pending = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("pendingUrl") : null;
    if (pending) {
      sessionStorage.removeItem("pendingUrl");
      const normalized = /^https?:\/\//i.test(pending) ? pending : `https://${pending}`;
      const t = window.setTimeout(() => setResolvedUrl(normalized), 500);
      return () => clearTimeout(t);
    }
  }, [urlParam, searchParams]);

  useEffect(() => {
    const t0 = performance.now();
    const id = window.setInterval(() => {
      setElapsedMs(Math.floor(performance.now() - t0));
    }, 100);
    return () => clearInterval(id);
  }, []);

  // crossfade helper
  const triggerStatusCrossfade = useCallback((nextText: string) => {
    if (statusCrossfadeTimerRef.current) clearTimeout(statusCrossfadeTimerRef.current);
    setStatusFading(true);
    statusCrossfadeTimerRef.current = setTimeout(() => {
      setStatusText(nextText);
      setStatusFading(false);
    }, 180);
  }, []);

  // cycle status messages per section, every 2.8s
  useEffect(() => {
    if (sectionVisualComplete || scoreReveal) return;
    const id = window.setInterval(() => {
      const section = activeSectionIdRef.current ?? "default";
      const pool = SECTION_MESSAGES[section] ?? SECTION_MESSAGES.default;
      const idx = ((sectionMsgIdxRef.current[section] ?? 0) + 1) % pool.length;
      sectionMsgIdxRef.current[section] = idx;
      triggerStatusCrossfade(pool[idx]);
    }, 2800);
    return () => clearInterval(id);
  }, [sectionVisualComplete, scoreReveal, triggerStatusCrossfade]);

  // when active section changes, immediately show its first message
  useEffect(() => {
    if (!activeSection || sectionVisualComplete || scoreReveal) return;
    const pool = SECTION_MESSAGES[activeSection] ?? SECTION_MESSAGES.default;
    triggerStatusCrossfade(pool[0]);
    sectionMsgIdxRef.current[activeSection] = 0;
  }, [activeSection, sectionVisualComplete, scoreReveal, triggerStatusCrossfade]);

  // when scan completes, switch to default transition messages
  useEffect(() => {
    if (!sectionVisualComplete) return;
    triggerStatusCrossfade(SECTION_MESSAGES.default[0]);
    sectionMsgIdxRef.current["default"] = 0;
  }, [sectionVisualComplete, triggerStatusCrossfade]);

  const updateSectionBounds = useCallback(() => {
    const sc = schematicRef.current;
    if (!sc) return;
    const idx = sectionIdxRef.current;
    const secEl = sc.querySelector(`[data-section="${SECTIONS[idx]?.id}"]`) as HTMLElement | null;
    if (!secEl) return;
    const srect = sc.getBoundingClientRect();
    const er = secEl.getBoundingClientRect();
    sectionTopRef.current = er.top - srect.top;
    sectionBotRef.current = er.bottom - srect.top;
  }, []);

  const scanNext = useCallback(() => {
    const idx = sectionIdxRef.current;
    if (idx >= SECTIONS.length) {
      setSectionVisualComplete(true);
      beamActiveRef.current = false;
      if (progressFillRef.current) progressFillRef.current.style.width = "100%";

      const finishReveal = () => {
        if (apiFailedRef.current) return;
        const target = healthScoreRef.current;
        document.querySelectorAll("[data-section]").forEach((el) => {
          el.classList.add("done");
          el.classList.remove("active");
        });
        scoreOverlayRef.current?.classList.add("vis");
        setScoreReveal(true);
        window.requestAnimationFrame(() => {
          ringInnerRef.current?.classList.add("spring");
          ringOuterRef.current?.classList.add("spring");
        });
        window.setTimeout(() => setDiagLabelVis(true), 500);
        const startCount = performance.now();
        window.setTimeout(() => {
          const tick = () => {
            const t = (performance.now() - startCount) / 1400;
            if (t >= 1) {
              setDisplayScore(target);
              return;
            }
            setDisplayScore(Math.round(cubicEaseInOut(t) * target));
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, 800);
        window.setTimeout(() => setSubLabelVis(true), 2000);
        window.setTimeout(() => {
          if (domainRef.current) {
            console.log("[scan] complete → /report/" + domainRef.current);
            router.replace("/report/" + domainRef.current);
          }
        }, 4200);
      };

      window.setTimeout(() => {
        if (apiDoneRef.current) finishReveal();
        else {
          const iv = window.setInterval(() => {
            if (apiDoneRef.current) {
              clearInterval(iv);
              finishReveal();
            }
          }, 80);
        }
      }, 500);
      return;
    }

    const dwell = SECTIONS[idx].dwell;
    sectionElapsedRef.current = 0;
    lastScanTickRef.current = performance.now();
    beamActiveRef.current = true;

    document.querySelectorAll("[data-section]").forEach((el, i) => {
      if (i < idx) el.classList.add("done");
      else el.classList.remove("done");
      if (i === idx) el.classList.add("active");
      else el.classList.remove("active");
    });

    window.requestAnimationFrame(() => {
      updateSectionBounds();
    });
  }, [router, updateSectionBounds]);

  const materialize = useCallback(() => {
    setMaterialized(true);
    SECTIONS.forEach((_, i) => {
      window.setTimeout(() => {
        document.querySelector(`[data-section="${SECTIONS[i].id}"]`)?.classList.add("on");
      }, i * 80);
    });
  }, []);

  useEffect(() => {
    if (!resolvedUrl) return;
    // Read from window.location.search at effect execution time — not from the render-closure
    // isRescanActive. useSearchParams() inside Suspense can lag behind the actual URL by one or
    // more renders; window.location.search is always live and correct at this moment.
    const isRescan = new URLSearchParams(window.location.search).get("rescan") === "true";
    isRescanRef.current = isRescan;
    console.log("[scan] starting pipeline", { url: resolvedUrl, rescan: isRescan });
    let normalized = resolvedUrl;
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
    let domain = "";
    try {
      domain = new URL(normalized).hostname.replace(/^www\./, "");
    } catch {
      setErrorMsg("Invalid URL.");
      return;
    }
    domainRef.current = domain;
    normalizedUrlRef.current = normalized;

    const startNormalScan = () => {
      scanStartTimeRef.current = performance.now();
      window.setTimeout(() => materialize(), 120);
      window.setTimeout(() => {
        sectionIdxRef.current = 0;
        scanNext();
      }, 900);

      const runFetch = async () => {
        apiFailedRef.current = false;
        setScanFailure(null);
        setInvalidUrlMessage(null);
        abortControllerRef.current = new AbortController();
        const controller = abortControllerRef.current;
        const timeoutMs = 240000;
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch("/api/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: normalized, ...(isRescan ? { rescan: true } : {}) }),
            signal: controller.signal,
          });
          window.clearTimeout(timeoutId);
          let data: Record<string, unknown> = {};
          try {
            data = (await res.json()) as Record<string, unknown>;
          } catch {
            data = {};
          }
          if (!res.ok) {
            apiFailedRef.current = true;
            apiDoneRef.current = true;
            if (res.status === 422 && data.error === "invalid_url") {
              const ivMsg =
                typeof data.message === "string"
                  ? data.message
                  : "This URL does not appear to be a live website.";
              setInvalidUrlMessage(ivMsg);
              beamActiveRef.current = false;
              beamRafHaltedRef.current = true;
              cancelAnimationFrame(rafScanRef.current);
              return;
            }
            const msg =
              typeof data.error === "string" ? data.error : "Scan failed.";
            if (res.status >= 500) {
              setScanFailure({ kind: "severe" });
            } else {
              setScanFailure({ kind: "client", message: msg });
            }
            return;
          }
          const hs = Number(
            (data as { payload?: { healthScore?: number } }).payload?.healthScore ?? 74,
          );
          healthScoreRef.current = Number.isFinite(hs)
            ? Math.min(100, Math.max(0, Math.round(hs)))
            : 74;
          apiDoneRef.current = true;
        } catch (e) {
          window.clearTimeout(timeoutId);
          const aborted = e instanceof Error && e.name === "AbortError";
          if (aborted && cancelRequestedRef.current) {
            cancelRequestedRef.current = false;
            return;
          }
          if (!hasRetriedRef.current &&
              !cancelRequestedRef.current) {
            hasRetriedRef.current = true
            await new Promise(r => setTimeout(r, 10000))
            runFetch()
            return
          }
          apiFailedRef.current = true;
          apiDoneRef.current = true;
          if (aborted) {
            setScanFailure({ kind: "severe" });
          } else {
            setScanFailure({ kind: "severe" });
          }
        }
      };
      // For rescan there is no intro, so fetch starts immediately.
      // For normal scans, delay until cinematic is gone: materialize() at 120ms + 1800ms intro ≈ 1936ms.
      window.setTimeout(() => { runFetch(); }, isRescan ? 0 : 2000);
    };

    if (scanFailure !== null) {
      startNormalScan();
      return;
    }

    void (async () => {
      try {
        const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
        if (!session) {
          router.replace(`/auth?next=${encodeURIComponent(`/scan?url=${encodeURIComponent(normalized)}`)}`);
          return;
        }
      } catch {
        // Session check failed — proceed with normal scan
      }
      startNormalScan();
    })();
  }, [resolvedUrl, materialize, scanNext, router]);

  useEffect(() => {
    if (errorMsg) {
      beamActiveRef.current = false;
      beamRafHaltedRef.current = true;
      cancelAnimationFrame(rafScanRef.current);
    }
  }, [errorMsg]);

  useEffect(() => {
    if (!invalidUrlMessage) return;
    beamActiveRef.current = false;
    beamRafHaltedRef.current = true;
    cancelAnimationFrame(rafScanRef.current);
  }, [invalidUrlMessage]);

  // Cinematic intro — fires as soon as introVisible becomes true (which is on the very first render
  // for fresh scans, before materialized). Domain is read inside the t2 callback so it is always
  // set by the time the timer fires (~1100ms after mount, domain arrives at ~316ms).
  useEffect(() => {
    if (!introVisible) return;
    if (new URLSearchParams(window.location.search).get("rescan") === "true") {
      setIntroVisible(false);
      return;
    }

    const LINE1 = "INITIATING DIAGNOSTIC";
    const t1 = window.setTimeout(() => {
      let i = 0;
      const charDelay = Math.round(400 / LINE1.length);
      const iv = window.setInterval(() => {
        i++;
        setIntroLine1(LINE1.slice(0, i));
        if (i >= LINE1.length) clearInterval(iv);
      }, charDelay);
    }, 800);

    // 1100ms: glitch → decode domain (domain is set well before this fires)
    const t2 = window.setTimeout(() => {
      const domain = domainRef.current;
      if (!domain) return;
      const glitchChars = "0134_";
      let glitchCount = 0;
      const glitchIv = window.setInterval(() => {
        let dollarCount = 0;
        const scrambled = Array.from({ length: domain.length }, () => {
          if (dollarCount < 2 && Math.random() < 0.15) { dollarCount++; return "$"; }
          return glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }).join("");
        setIntroLine2Glitch(scrambled);
        glitchCount++;
        if (glitchCount >= 8) {
          clearInterval(glitchIv);
          let revealed = 0;
          const decodeIv = window.setInterval(() => {
            revealed++;
            setIntroLine2Real(revealed);
            if (revealed >= domain.length) clearInterval(decodeIv);
          }, 55);
        }
      }, 75);
    }, 1100);

    const t3 = window.setTimeout(() => setIntroLine3(true), 1400);
    const t4 = window.setTimeout(() => setIntroFadingOut(true), 1500);
    const t5 = window.setTimeout(() => setIntroVisible(false), 1800);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [introVisible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Status typewriter — types each new message in over 0.3s
  useEffect(() => {
    let i = 0;
    setTypedStatus("");
    const charDelay = Math.max(8, Math.round(300 / statusText.length));
    const iv = window.setInterval(() => {
      i++;
      setTypedStatus(statusText.slice(0, i));
      if (i >= statusText.length) clearInterval(iv);
    }, charDelay);
    return () => clearInterval(iv);
  }, [statusText]);

  useEffect(() => { scoreRevealRef.current = scoreReveal; }, [scoreReveal]);

  useEffect(() => {
    if (!materialized) return;
    const timers: number[] = [];
    MILESTONE_FLASHES.forEach(({ ms, text }) => {
      timers.push(window.setTimeout(() => {
        if (scoreRevealRef.current) return;
        setMilestoneFlash(text);
        setMilestoneFlashFade(false);
      }, ms));
      timers.push(window.setTimeout(() => setMilestoneFlashFade(true), ms + 600));
      timers.push(window.setTimeout(() => {
        setMilestoneFlash(null);
        setMilestoneFlashFade(false);
      }, ms + 950));
    });
    return () => timers.forEach(clearTimeout);
  }, [materialized]);

  const handleCancelScan = useCallback(() => {
    cancelRequestedRef.current = true;
    abortControllerRef.current?.abort();
    apiFailedRef.current = true;
    apiDoneRef.current = true;
    setScanUserAborted(true);
    beamActiveRef.current = false;
    beamRafHaltedRef.current = true;
    cancelAnimationFrame(rafScanRef.current);
    setStatusBarOverride("DIAGNOSTIC ABORTED");
    window.setTimeout(() => setStatusBarOverride(null), 1000);
    window.setTimeout(() => router.push("/"), 1500);
  }, [router]);

  const tickScan = useCallback(() => {
    if (beamRafHaltedRef.current) return;

    const now = performance.now();
    const dt = Math.min(50, now - lastScanTickRef.current);
    lastScanTickRef.current = now;

    const beam = beamActiveRef.current;
    const idx = sectionIdxRef.current;

    if (beam && idx < SECTIONS.length) {
      const dwell = SECTIONS[idx].dwell;
      sectionElapsedRef.current += dt;

      if (sectionElapsedRef.current >= dwell) {
        const prev = sectionIdxRef.current;
        let acc = 0;
        for (let i = 0; i <= prev; i++) acc += SECTIONS[i].dwell;
        const endPct = (acc / TOTAL_DWELL) * 100;
        if (progressFillRef.current) {
          progressFillRef.current.style.width = `${endPct}%`;
        }
        sectionIdxRef.current++;
        sectionElapsedRef.current = 0;
        scanNext();
        rafScanRef.current = requestAnimationFrame(tickScan);
        return;
      }

      const accPrev = SECTIONS.slice(0, idx).reduce((s, x) => s + x.dwell, 0);
      const frac = sectionElapsedRef.current / dwell;
      const startPct = (accPrev / TOTAL_DWELL) * 100;
      const endPct = ((accPrev + SECTIONS[idx].dwell) / TOTAL_DWELL) * 100;
      if (progressFillRef.current) {
        progressFillRef.current.style.width = `${startPct + (endPct - startPct) * frac}%`;
      }
    }

    if (checksCounterRef.current) {
      if (scoreRevealRef.current) {
        checksCounterRef.current.textContent = "200";
      } else {
        const elapsed = Math.max(0, now - scanStartTimeRef.current);
        const progress = Math.min(1, elapsed / estimatedTotalMsRef.current);
        const easedProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        checksCounterRef.current.textContent = String(Math.min(199, Math.floor(easedProgress * 200)));
      }
    }

    rafScanRef.current = requestAnimationFrame(tickScan);
  }, [scanNext]);

  useEffect(() => {
    if (!materialized) return;
    if (scanStartedRef.current) return;
    beamRafHaltedRef.current = false;
    scanStartedRef.current = true;
    rafScanRef.current = requestAnimationFrame(tickScan);
    return () => cancelAnimationFrame(rafScanRef.current);
  }, [materialized, tickScan]);

  // calculate section viewport bounds once after materialization
  useEffect(() => {
    if (!materialized) return;
    const timer = window.setTimeout(() => {
      const bounds: Array<{ id: string; top: number; bottom: number }> = [];
      SECTIONS.forEach(({ id }) => {
        const el = document.querySelector(`[data-section="${id}"]`) as HTMLElement | null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        bounds.push({ id, top: r.top, bottom: r.bottom });
      });
      sectionBoundsRef.current = bounds;
    }, 200);
    return () => clearTimeout(timer);
  }, [materialized]);

  // beam RAF — waypoint spring: seeks freely-chosen 2-D targets anywhere on the viewport.
  // Restores the SEEK/DWELL state machine with spring physics; removes the left-right-then-down
  // typewriter sweep so the pulse can drift up, down, sideways, or diagonally at any moment.
  useEffect(() => {
    if (!materialized) return;
    const el = beamDivRef.current;
    if (!el) return;
    const lineEl = laserLineRef.current;

    const BEAM_W = 160;
    const s = beamStateRef.current;

    el.style.opacity = "1";
    if (lineEl) lineEl.style.opacity = "1";

    // ── State machine: SEEK → DWELL → SEEK (no rows, no sweeps, fully free 2D) ──────────
    type BsmState = 'SEEK' | 'DWELL';
    let bsm: BsmState = 'SEEK';
    let bsmTimer = 0;

    let seekX = 0, seekY = 0, seekK = 0.010;
    let dwX = 0, dwY = 0;

    // Deterministic pseudo-variance — increments tc so each tv() call yields a fresh value
    let tc = 0;
    const tv = (o = 0): number => (Math.sin((tc + o) * 2.3999) + 1) / 2;

    const vBounds = () => {
      const yMin = 56, yMax = window.innerHeight - 60;
      const xMax = window.innerWidth - BEAM_W;
      return { yMin, yMax, xMax };
    };

    // Pick any 2D waypoint anywhere in the live viewport — no row or column constraint
    const pickTarget = (): { x: number; y: number } => {
      const { yMin, yMax, xMax } = vBounds();
      return { x: tv() * xMax, y: yMin + tv(1) * (yMax - yMin) };
    };

    const goSeek = (x: number, y: number, k: number, ms: number) => {
      bsm = 'SEEK'; seekX = x; seekY = y; seekK = k; bsmTimer = ms; tc++;
    };
    const goDwell = (ax: number, ay: number) => {
      bsm = 'DWELL'; dwX = ax; dwY = ay;
      bsmTimer = 3000 + tv() * 2000;  // 3 – 5 s
      tc++;
    };

    // ── Init ──────────────────────────────────────────────────────────────
    s.lastFrameTime = performance.now();
    const { yMin: iYMin, yMax: iYMax, xMax: iXMax } = vBounds();
    s.pos = { x: iXMax * 0.5, y: iYMin + (iYMax - iYMin) * 0.3 };
    s.velocity = { x: 0, y: 0 };
    const initT = pickTarget();
    goSeek(initT.x, initT.y, 0.010, 700);

    // brakeUntil: timestamp until which we apply extra damping (section boundary crossings)
    let brakeUntil = 0;

    // ── RAF tick ──────────────────────────────────────────────────────────
    const tick = (now: number) => {
      if (beamRafHaltedRef.current) {
        el.style.opacity = "0";
        if (lineEl) lineEl.style.opacity = "0";
        return;
      }

      const dt = Math.min(50, now - s.lastFrameTime);
      s.lastFrameTime = now;

      bsmTimer -= dt;
      // 0.72 during boundary brake (deliberate pause), 0.88 normally (smooth, less jitter)
      const damp = now < brakeUntil ? 0.72 : 0.88;

      switch (bsm) {
        case 'SEEK': {
          const dx = seekX - s.pos.x, dy = seekY - s.pos.y;
          s.velocity.x += dx * seekK;
          s.velocity.y += dy * seekK;
          s.velocity.x *= damp; s.velocity.y *= damp;
          s.pos.x += s.velocity.x; s.pos.y += s.velocity.y;
          if (bsmTimer <= 0 || Math.hypot(dx, dy) < 16) {
            if (tv() < 0.70) {
              goDwell(s.pos.x, s.pos.y);
            } else {
              const tgt = pickTarget();
              // Vary K: sometimes slow and drifting (0.010), sometimes purposeful (0.024)
              goSeek(tgt.x, tgt.y, 0.005 + tv(2) * 0.007, 700 + tv(1) * 1500);
            }
          }
          break;
        }

        case 'DWELL': {
          // Three overlapping sines → organic micro-motion, never completely still
          const jX = Math.sin(now * 0.0079) * 3.8
                    + Math.sin(now * 0.0214) * 1.6
                    + Math.sin(now * 0.0431) * 0.6;
          const jY = Math.sin(now * 0.0127) * 2.2
                    + Math.sin(now * 0.0318) * 0.9;
          s.velocity.x += (dwX + jX - s.pos.x) * 0.020;
          s.velocity.y += (dwY + jY - s.pos.y) * 0.020;
          s.velocity.x *= damp; s.velocity.y *= damp;
          s.pos.x += s.velocity.x; s.pos.y += s.velocity.y;
          if (bsmTimer <= 0) {
            const tgt = pickTarget();
            goSeek(tgt.x, tgt.y, 0.005 + tv(1) * 0.006, 600 + tv() * 1200);
          }
          break;
        }
      }

      // Soft boundary — reflect velocity on contact, lose some energy
      const { yMin, yMax, xMax } = vBounds();
      if (s.pos.x < 0)    { s.pos.x = 0;    s.velocity.x =  Math.abs(s.velocity.x) * 0.3; }
      if (s.pos.x > xMax) { s.pos.x = xMax; s.velocity.x = -Math.abs(s.velocity.x) * 0.3; }
      if (s.pos.y < yMin) { s.pos.y = yMin; s.velocity.y =  Math.abs(s.velocity.y) * 0.3; }
      if (s.pos.y > yMax) { s.pos.y = yMax; s.velocity.y = -Math.abs(s.velocity.y) * 0.3; }

      el.style.transform = `translate(${s.pos.x}px, ${s.pos.y}px)`;
      if (lineEl) lineEl.style.transform = `translateY(${s.pos.y + 0.5}px)`;

      // Section label activation by beam Y (viewport coords) — unchanged logic
      const beamY = s.pos.y;
      const bounds = sectionBoundsRef.current;
      let newSec: string | null = null;
      for (const b of bounds) {
        if (beamY >= b.top && beamY <= b.bottom) {
          newSec = b.id;
          break;
        }
      }
      if (newSec !== activeSectionIdRef.current) {
        brakeUntil = now + 100;
        const prev = activeSectionIdRef.current;
        activeSectionIdRef.current = newSec;
        if (prev) {
          const prevEl = document.querySelector(`[data-section="${prev}"]`);
          prevEl?.classList.remove("beam-active", "active");
          if (!completedSectionIdsRef.current.has(prev)) {
            completedSectionIdsRef.current.add(prev);
          }
        }
        if (newSec) {
          const newEl = document.querySelector(`[data-section="${newSec}"]`);
          newEl?.classList.add("beam-active", "active");
        }
        setActiveSection(newSec);
        if (prev) setCompletedSections(Array.from(completedSectionIdsRef.current));
      }

      beamRafRef.current = requestAnimationFrame(tick);
    };

    beamRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(beamRafRef.current);
  }, [materialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pulse hotspot — bounces L↔R along the beam line, ~1800ms per full crossing
  useEffect(() => {
    if (!materialized) return;
    const el = pulseBarRef.current;
    if (!el) return;

    const PULSE_W = 150;
    const CROSSING_MS = 1800;
    const startTime = performance.now();
    let rafId = 0;
    let maxX = Math.max(0, window.innerWidth - PULSE_W);

    const syncSize = () => { maxX = Math.max(0, window.innerWidth - PULSE_W); };
    window.addEventListener('resize', syncSize);

    const tick = (now: number) => {
      if (beamRafHaltedRef.current) {
        el.style.opacity = '0';
        if (pulseGlowRef.current) pulseGlowRef.current.style.opacity = '0';
        return;
      }
      el.style.opacity = '1';

      const elapsed = now - startTime;
      const cycle = elapsed % (CROSSING_MS * 2);
      // t: 0→1 (L→R) then 1→0 (R→L) — easeInOutSine for smooth reversal at edges
      const t = cycle < CROSSING_MS ? cycle / CROSSING_MS : 1 - (cycle - CROSSING_MS) / CROSSING_MS;
      const tx = `translateX(${easeInOutSine(t) * maxX}px)`;
      el.style.transform = tx;
      if (pulseGlowRef.current) {
        pulseGlowRef.current.style.transform = tx;
        pulseGlowRef.current.style.opacity = '0.12';
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', syncSize);
    };
  }, [materialized]);

  const getSectionLabelClass = (sectionId: string): string => {
    if (sectionId === activeSection) return "section-active";
    if (completedSections.includes(sectionId)) return "section-completed";
    return "section-unvisited";
  };

  const formatElapsed = () => `${(elapsedMs / 1000).toFixed(1)}s`;

  const secStagger = (i: number): CSSProperties => ({
    ["--sec-stagger" as string]: `${i * 80}ms`,
  });
  const secLabelStyle: CSSProperties = {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    fontFamily: MONO,
    fontSize: 8,
    letterSpacing: "3px",
    textTransform: "uppercase",
    pointerEvents: "none",
    zIndex: 4,
  };

  const bottomStatusText =
    statusBarOverride ??
    (scoreReveal ? STATUS_COMPLETE_TEXT : statusText);

  const secBadgeStyle: CSSProperties = {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    fontFamily: MONO,
    fontSize: 7,
    letterSpacing: "2px",
    textTransform: "uppercase",
    pointerEvents: "none",
    zIndex: 4,
  };
  const displayDomain = resolvedUrl ? getDomain(resolvedUrl.startsWith("http") ? resolvedUrl : `https://${resolvedUrl}`) : "—";

  if (!resolvedUrl && !urlParam) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          color: "rgba(0,200,255,0.55)",
          fontSize: 12,
        }}
      >
        No scan URL. Return to home and submit a URL.
      </div>
    );
  }

  const introDomainStr = domainRef.current || (resolvedUrl ? getDomain(resolvedUrl.startsWith("http") ? resolvedUrl : `https://${resolvedUrl}`) : "");
  const introDomainDisplay = !introDomainStr
    ? introLine2Glitch
    : introLine2Real >= introDomainStr.length
      ? introDomainStr
      : introLine2Real === 0
        ? (introLine2Glitch || "")
        : introDomainStr.slice(0, introLine2Real) + (introLine2Glitch ? introLine2Glitch.slice(introLine2Real, introLine2Real + 4) : "") + introDomainStr.slice(introLine2Real + 4);

  return (
    <>
      <style>{`
        @keyframes sectionReveal {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes atmosphereA {
          from { transform: translate(0,0); }
          to { transform: translate(80px, 50px); }
        }
        @keyframes atmosphereB {
          from { transform: translate(0,0); }
          to { transform: translate(-60px, -70px); }
        }
        .scan-abort-btn {
          font-family: var(--font-space-mono), ui-monospace, monospace;
          font-size: 9px;
          letter-spacing: 0.15em;
          color: rgba(255,45,45,0.6);
          background: transparent;
          border: 1px solid rgba(255,45,45,0.2);
          padding: 5px 14px;
          cursor: pointer;
          text-transform: uppercase;
        }
        .scan-abort-btn:hover {
          color: rgba(255,45,45,0.9);
          border-color: rgba(255,45,45,0.4);
        }
        @keyframes topEdgeSweep {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes ringSpring {
          from { transform: scale(0.4); opacity: 0.6; }
          to { transform: scale(1); opacity: 1; }
        }
        .score-ring { transform: scale(0.4); opacity: 0.6; }
        .scan-sec-body {
          filter: grayscale(1);
          opacity: 0.18;
        }
        .scan-sec { opacity: 0; transform: translateY(12px); }
        .scan-sec.on {
          animation: sectionReveal 1.9s cubic-bezier(0.22,1,0.36,1) forwards;
          animation-delay: var(--sec-stagger, 0ms);
        }
        .scan-sec .sec-label { transition: color 0.8s ease, text-shadow 0.8s ease; }
        .scan-sec .sec-badge { transition: color 0.25s; }
        .scan-sec .hero-ph-diag {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          border-radius: 3px;
        }
        .scan-sec .hero-ph-diag::before,
        .scan-sec .hero-ph-diag::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 220%;
          height: 1px;
          transform-origin: center;
        }
        .scan-sec .hero-ph-diag::before {
          transform: translate(-50%, -50%) rotate(-15deg);
          background: rgba(0,200,255,0.05);
        }
        .scan-sec .hero-ph-diag::after {
          transform: translate(-50%, -50%) rotate(15deg);
          background: rgba(0,200,255,0.05);
        }
        .scan-sec.active .hero-ph-diag::before,
        .scan-sec.active .hero-ph-diag::after {
          background: rgba(0,200,255,0.22);
        }
        .scan-sec { border-color: rgba(0,200,255,0.06) !important; }
        .scan-sec.active {
          background: rgba(0,200,255,0.028) !important;
          border-color: rgba(0,200,255,0.4) !important;
          box-shadow: inset 0 0 60px rgba(0,200,255,0.045), inset 0 1px 0 rgba(0,200,255,0.2) !important;
        }
        .scan-sec.active::before {
          content: "";
          position: absolute;
          left: 0; right: 0; top: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(0,200,255,0.7) 20%, rgba(255,255,255,0.4) 50%, rgba(0,200,255,0.7) 80%, transparent 100%);
          background-size: 200% 100%;
          animation: topEdgeSweep 6.5s linear infinite;
          pointer-events: none;
          z-index: 3;
        }
        .scan-sec.done {
          background: rgba(0,200,255,0.011) !important;
          border-color: rgba(0,200,255,0.14) !important;
        }
        .scan-sec .sec-label { color: rgba(0,200,255,0.4) !important; }
        .scan-sec.active .sec-label { color: rgba(0,200,255,0.72) !important; text-shadow: none !important; }
        .scan-sec.done .sec-label { color: rgba(0,200,255,0.35) !important; }
        .scan-sec .sec-badge { color: rgba(0,200,255,0.07) !important; }
        .scan-sec.active .sec-badge { color: rgba(0,200,255,0.65) !important; }
        .scan-sec.done .sec-badge { color: rgba(0,200,255,0.2) !important; }
        .scan-sec .sec-sticker { transition: background 0.85s ease, box-shadow 0.85s ease; }
        .scan-sec.active .sec-sticker {
          background: rgba(0,200,255,0.9) !important;
          box-shadow: 0 0 12px #00C8FF, 0 0 24px rgba(0,200,255,0.5) !important;
        }
        .scan-sec.done .sec-sticker {
          background: linear-gradient(180deg, rgba(0,200,255,0.4) 0%, rgba(0,200,255,0.08) 100%) !important;
        }
        /* beam-Y section label activation — overrides scan-pipeline label colors */
        .scan-sec .sec-label.section-unvisited,
        .scan-sec .sec-badge.section-unvisited {
          color: rgba(0,200,255,0.2) !important;
        }
        .scan-sec .sec-label.section-active,
        .scan-sec .sec-badge.section-active {
          color: rgba(0,200,255,1) !important;
          text-shadow: 0 0 10px rgba(0,200,255,0.5) !important;
          transition: all 0.25s ease !important;
        }
        .scan-sec .sec-label.section-completed,
        .scan-sec .sec-badge.section-completed {
          color: rgba(0,200,255,0.45) !important;
          transition: all 0.4s ease !important;
        }
        /* beam-Y section background */
        .scan-sec.beam-active {
          background: rgba(0,200,255,0.018) !important;
          transition: background 0.4s ease !important;
        }
        .score-overlay {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.7s ease, background 0.7s ease, backdrop-filter 0.7s ease;
        }
        .score-overlay.vis {
          opacity: 1 !important;
          pointer-events: auto;
          background: rgba(0,0,8,0.94) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
        }
        .score-ring.spring.ring-inner {
          animation: ringSpring 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards;
          animation-delay: 0.55s;
        }
        .score-ring.spring.ring-outer {
          animation: ringSpring 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards;
          animation-delay: 0.6s;
        }
        .diag-fade {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.5s ease 0.5s, transform 0.5s cubic-bezier(0.22,1,0.36,1) 0.5s;
        }
        .diag-fade.show { opacity: 1; transform: translateY(0); }
        .scan-sub-fade { opacity: 0; transition: opacity 0.5s ease 2s; }
        .scan-sub-fade.show { opacity: 1; }
        .status-text { transition: opacity 0.18s ease; }
        @keyframes scanCursorMove {
          from { left: -80px; }
          to { left: calc(100% + 80px); }
        }
        @keyframes introSweep {
          from { transform: translateY(-100%); }
          to   { transform: translateY(100vh); }
        }
        @keyframes beamSweep {
          from { left: -40px; }
          to { left: 160px; }
        }
        .scan-beam {
          overflow: hidden;
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 50,
          background: BG,
          overflow: "hidden",
          fontFamily: MONO,
        }}
      >
        {/* Beam — the only moving element */}
        <div
          ref={beamDivRef}
          className="scan-beam"
          aria-hidden
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: 160,
            height: 2,
            borderRadius: 2,
            zIndex: 50,
            pointerEvents: "none",
            opacity: 0,
            willChange: "transform",
            background: "transparent",
          }}
        />
        {/* Laser line — full-width 1px rule that travels at the beam's Y center */}
        <div
          ref={laserLineRef}
          aria-hidden
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "100vw",
            height: 1,
            zIndex: 49,
            pointerEvents: "none",
            opacity: 0,
            willChange: "transform",
            background: "rgba(0,200,255,0.18)",
            boxShadow: "0 0 2px 0px rgba(0,200,255,0.10)",
            overflow: "visible",
          }}
        >
          <div
            ref={pulseBarRef}
            aria-hidden
            style={{
              position: "absolute",
              top: "-1px",
              left: 0,
              width: "150px",
              height: "3px",
              background: "linear-gradient(90deg, rgba(0,200,255,0) 0%, rgba(0,200,255,0.9) 25%, rgba(0,220,255,1.0) 50%, rgba(0,200,255,0.9) 75%, rgba(0,200,255,0) 100%)",
              pointerEvents: "none",
              opacity: 0,
            }}
          />
          <div
            ref={pulseGlowRef}
            aria-hidden
            style={{
              position: "absolute",
              top: "-3.5px",
              left: 0,
              width: "150px",
              height: "8px",
              background: "linear-gradient(90deg, rgba(0,200,255,0) 0%, rgba(0,200,255,0.9) 25%, rgba(0,220,255,1.0) 50%, rgba(0,200,255,0.9) 75%, rgba(0,200,255,0) 100%)",
              pointerEvents: "none",
              opacity: 0,
            }}
          />
        </div>

        <div style={{ position: "fixed", inset: 0, zIndex: 4, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              width: 1000,
              height: 650,
              top: -200,
              left: -300,
              background: "radial-gradient(ellipse, rgba(0,100,255,0.07) 0%, transparent 70%)",
              filter: "blur(80px)",
              animation: "atmosphereA 78s ease-in-out infinite alternate",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 800,
              height: 550,
              bottom: -200,
              right: -200,
              background: "radial-gradient(ellipse, rgba(0,60,200,0.05) 0%, transparent 70%)",
              filter: "blur(90px)",
              animation: "atmosphereB 96s ease-in-out infinite alternate",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 600,
              height: 250,
              bottom: -50,
              left: "50%",
              transform: "translateX(-50%)",
              background: "radial-gradient(ellipse, rgba(0,200,255,0.04) 0%, transparent 70%)",
              filter: "blur(100px)",
            }}
          />
        </div>

        {/* Top HUD */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 56,
            zIndex: 200,
            background: "linear-gradient(180deg, rgba(0,0,8,0.97) 0%, rgba(0,0,8,0.75) 100%)",
            backdropFilter: "blur(16px) saturate(1.4)",
            WebkitBackdropFilter: "blur(16px) saturate(1.4)",
            borderBottom: "1px solid rgba(0,200,255,0.14)",
            boxShadow: "0 1px 0 rgba(0,200,255,0.07), 0 8px 40px rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: CY,
                  opacity: 0.85,
                }}
              />
            ))}
            <span
              style={{
                fontFamily: MONO,
                fontSize: 13,
                color: "#F0F4FF",
                letterSpacing: "0.04em",
              }}
            >
              {displayDomain}
            </span>
            <span style={{ color: "rgba(0,200,255,0.4)", fontSize: 10 }} aria-hidden>
              ⬡
            </span>
          </div>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 9,
              letterSpacing: "0.2em",
              color: "rgba(0,200,255,0.45)",
              textTransform: "uppercase",
            }}
          >
            REVENUE DIAGNOSTIC IN PROGRESS
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {materialized &&
              !scoreReveal &&
              !invalidUrlMessage &&
              !errorMsg &&
              !scanFailure &&
              !scanUserAborted && (
                <button
                  type="button"
                  className="scan-abort-btn"
                  onClick={handleCancelScan}
                >
                  ABORT DIAGNOSTIC
                </button>
              )}
          </div>
        </div>

        {/* Schematic full width */}
        <div
          style={{
            position: "fixed",
            top: 56,
            bottom: 60,
            left: 0,
            right: 0,
            zIndex: 10,
            overflow: "hidden",
            background: "rgba(0,0,6,0.7)",
            borderTop: "1px solid rgba(0,200,255,0.08)",
            borderBottom: "1px solid rgba(0,200,255,0.08)",
          }}
        >
          {/* Reticle corners */}
          {[
            { t: 0, l: 0, bt: "borderTop", bl: "borderLeft", h: "left", v: "top" },
            { t: 0, r: 0, bt: "borderTop", br: "borderRight", h: "right", v: "top" },
            { b: 0, l: 0, bb: "borderBottom", bl: "borderLeft", h: "left", v: "bottom" },
            { b: 0, r: 0, bb: "borderBottom", br: "borderRight", h: "right", v: "bottom" },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 32,
                height: 32,
                zIndex: 12,
                pointerEvents: "none",
                ...(c.t !== undefined ? { top: 0 } : {}),
                ...(c.b !== undefined ? { bottom: 0 } : {}),
                ...(c.l !== undefined ? { left: 0 } : {}),
                ...(c.r !== undefined ? { right: 0 } : {}),
                ...(c.bt ? { borderTop: "2px solid rgba(0,200,255,0.3)" } : {}),
                ...(c.bb ? { borderBottom: "2px solid rgba(0,200,255,0.3)" } : {}),
                ...(c.bl ? { borderLeft: "2px solid rgba(0,200,255,0.3)" } : {}),
                ...(c.br ? { borderRight: "2px solid rgba(0,200,255,0.3)" } : {}),
              }}
            />
          ))}

          {/* Edge ticks */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, pointerEvents: "none", zIndex: 11 }}>
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <div
                key={`tt-${p}`}
                style={{
                  position: "absolute",
                  left: `${p * 100}%`,
                  transform: "translateX(-50%)",
                  width: 2,
                  height: 8,
                  background: "rgba(0,200,255,0.25)",
                }}
              />
            ))}
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, pointerEvents: "none", zIndex: 11 }}>
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <div
                key={`tb-${p}`}
                style={{
                  position: "absolute",
                  left: `${p * 100}%`,
                  transform: "translateX(-50%)",
                  width: 2,
                  height: 8,
                  background: "rgba(0,200,255,0.25)",
                }}
              />
            ))}
          </div>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 8, pointerEvents: "none", zIndex: 11 }}>
            {[0, 0.33, 0.66, 1].map((p) => (
              <div
                key={`lt-${p}`}
                style={{
                  position: "absolute",
                  top: `${p * 100}%`,
                  transform: "translateY(-50%)",
                  width: 8,
                  height: 2,
                  background: "rgba(0,200,255,0.25)",
                }}
              />
            ))}
          </div>
          <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 8, pointerEvents: "none", zIndex: 11 }}>
            {[0, 0.33, 0.66, 1].map((p) => (
              <div
                key={`rt-${p}`}
                style={{
                  position: "absolute",
                  top: `${p * 100}%`,
                  transform: "translateY(-50%)",
                  width: 8,
                  height: 2,
                  background: "rgba(0,200,255,0.25)",
                }}
              />
            ))}
          </div>

            <div
              id="schematic"
              data-schematic
              ref={schematicRef}
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: "transparent",
                overflow: "hidden",
                zIndex: 6,
              }}
            >
              {/* NAV */}
              <section
                data-section="nav"
                data-dwell={2200}
                className="scan-sec"
                style={{
                  height: "6%",
                  minHeight: 36,
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  borderBottom: "1px solid rgba(0,200,255,0.06)",
                  transition: "border-color 0.75s ease, background 0.85s ease, box-shadow 0.85s ease",
                  ...secStagger(0),
                }}
              >
                <span className={`sec-label ${getSectionLabelClass("nav")}`} style={secLabelStyle}>
                  NAV
                </span>
                <span className={`sec-badge ${getSectionLabelClass("nav")}`} style={secBadgeStyle}>
                  STRUCTURE
                </span>
                <div
                  className="sec-sticker"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: "transparent",
                  }}
                />
                <div
                  className="scan-sec-body"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 80px",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="ci b" style={{ width: 20, height: 20 }} />
                      <div className="b" style={{ width: 58, height: 7 }} />
                    </div>
                    <div style={{ display: "flex", gap: 22 }}>
                      {[42, 54, 38, 62, 46].map((w, j) => (
                        <div key={j} className="b" style={{ width: w, height: 7 }} />
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        className="nav-ghost b"
                        style={{
                          width: 58,
                          height: 18,
                          borderRadius: 3,
                          border: "1px solid rgba(0,200,255,0.1)",
                          background: "transparent",
                          boxSizing: "border-box",
                        }}
                      />
                      <div className="b" style={{ width: 68, height: 18, borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              </section>

              {/* HERO */}
              <section
                data-section="hero"
                data-dwell={6500}
                className="scan-sec"
                style={{
                  height: "27%",
                  borderBottom: "1px solid rgba(0,200,255,0.06)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "border-color 0.75s ease, background 0.85s ease, box-shadow 0.85s ease",
                  ...secStagger(1),
                }}
              >
                <span className={`sec-label ${getSectionLabelClass("hero")}`} style={secLabelStyle}>
                  HERO
                </span>
                <span className={`sec-badge ${getSectionLabelClass("hero")}`} style={secBadgeStyle}>
                  MESSAGING
                </span>
                <div className="sec-sticker" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3 }} />
                <div
                  className="scan-sec-body"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 80px",
                    gap: 28,
                  }}
                >
                  <div
                    style={{
                      flex: 1.15,
                      minWidth: 0,
                      height: "84%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <div className="b" style={{ width: 110, height: 7, borderRadius: 10, marginBottom: 16 }} />
                    <div className="b" style={{ width: "94%", height: 20, marginBottom: 10 }} />
                    <div className="b" style={{ width: "76%", height: 20, marginBottom: 16 }} />
                    <div className="b" style={{ width: "84%", height: 9, marginBottom: 6 }} />
                    <div className="b" style={{ width: "68%", height: 9, marginBottom: 24 }} />
                    <div style={{ display: "flex", gap: 12 }}>
                      <div className="b" style={{ width: 118, height: 30, borderRadius: 4 }} />
                      <div
                        className="b nav-ghost"
                        style={{
                          width: 92,
                          height: 30,
                          borderRadius: 4,
                          border: "1px solid rgba(0,200,255,0.1)",
                          background: "transparent",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
                      {[0, 1, 2].map((k) => (
                        <div
                          key={k}
                          className="ci b"
                          style={{
                            width: 16,
                            height: 16,
                            marginRight: k < 2 ? -6 : 0,
                            zIndex: 3 - k,
                          }}
                        />
                      ))}
                      <div className="b" style={{ width: 88, height: 7, borderRadius: 10 }} />
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 0.85,
                      minWidth: 0,
                      height: "84%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      className="hero-ph"
                      style={{
                        flex: 1,
                        minHeight: 80,
                        position: "relative",
                        border: "1px solid rgba(0,200,255,0.06)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div className="hero-ph-diag" aria-hidden />
                      <div
                        style={{
                          position: "absolute",
                          inset: 14,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="ci b" style={{ width: 14, height: 14 }} />
                          <div className="b" style={{ flex: 1, height: 8 }} />
                        </div>
                        <div className="b" style={{ width: "78%", height: 16, borderRadius: 20 }} />
                        <div className="b" style={{ width: "58%", height: 8 }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8, height: 36 }}>
                      {[0, 1, 2].map((x) => (
                        <div key={x} className="hero-subcard" style={{ flex: 1, borderRadius: 3 }} />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* SOCIAL */}
              <section
                data-section="social"
                data-dwell={2600}
                className="scan-sec"
                style={{
                  height: "8%",
                  minHeight: 44,
                  borderBottom: "1px solid rgba(0,200,255,0.06)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "border-color 0.75s ease, background 0.85s ease, box-shadow 0.85s ease",
                  ...secStagger(2),
                }}
              >
                <span className={`sec-label ${getSectionLabelClass("social")}`} style={secLabelStyle}>
                  SOCIAL PROOF
                </span>
                <span className={`sec-badge ${getSectionLabelClass("social")}`} style={secBadgeStyle}>
                  TRUST
                </span>
                <div className="sec-sticker" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3 }} />
                <div
                  className="scan-sec-body"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 80px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center" }}>
                        {i > 0 ? (
                          <div
                            style={{
                              width: 1,
                              height: 22,
                              background: "rgba(0,200,255,0.08)",
                              margin: "0 22px",
                            }}
                          />
                        ) : null}
                        {i === 2 ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <div style={{ display: "flex", gap: 4 }}>
                              {[0, 1, 2, 3, 4].map((s) => (
                                <div key={s} className="b" style={{ width: 10, height: 10 }} />
                              ))}
                            </div>
                            <div className="b" style={{ width: 44, height: 6 }} />
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <div className="b" style={{ width: 58, height: 10 }} />
                            <div className="b" style={{ width: 36, height: 6 }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* FEATURES */}
              <section
                data-section="features"
                data-dwell={4800}
                className="scan-sec"
                style={{
                  height: "21%",
                  borderBottom: "1px solid rgba(0,200,255,0.06)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "border-color 0.75s ease, background 0.85s ease, box-shadow 0.85s ease",
                  ...secStagger(3),
                }}
              >
                <span className={`sec-label ${getSectionLabelClass("features")}`} style={secLabelStyle}>
                  FEATURES
                </span>
                <span className={`sec-badge ${getSectionLabelClass("features")}`} style={secBadgeStyle}>
                  VALUE
                </span>
                <div className="sec-sticker" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3 }} />
                <div
                  className="scan-sec-body"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 80px 0",
                    gap: 16,
                  }}
                >
                  {[0, 1, 2].map((col) => (
                    <div
                      key={col}
                      className="feat-card"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: "84%",
                        border: "1px solid rgba(0,200,255,0.05)",
                        borderRadius: 4,
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        boxSizing: "border-box",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div className="b" style={{ width: 24, height: 24, borderRadius: 4 }} />
                        <div className="b" style={{ width: 58, height: 8 }} />
                      </div>
                      <div className="b" style={{ width: "88%", height: 7 }} />
                      <div className="b" style={{ width: "70%", height: 7 }} />
                      <div className="feat-div" style={{ height: 1, margin: 0 }} />
                      {[0, 1].map((r) => (
                        <div key={r} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="ci b" style={{ width: 9, height: 9 }} />
                          <div
                            className="b"
                            style={{ width: r === 0 ? "66%" : "50%", height: 7 }}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>

              {/* TESTIMONIALS */}
              <section
                data-section="testimonials"
                data-dwell={4800}
                className="scan-sec"
                style={{
                  height: "18%",
                  borderBottom: "1px solid rgba(0,200,255,0.06)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "border-color 0.75s ease, background 0.85s ease, box-shadow 0.85s ease",
                  ...secStagger(4),
                }}
              >
                <span className={`sec-label ${getSectionLabelClass("testimonials")}`} style={secLabelStyle}>
                  TESTIMONIALS
                </span>
                <span className={`sec-badge ${getSectionLabelClass("testimonials")}`} style={secBadgeStyle}>
                  PROOF
                </span>
                <div className="sec-sticker" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3 }} />
                <div
                  className="scan-sec-body"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 80px",
                    gap: 16,
                  }}
                >
                  {[0, 1].map((c) => (
                    <div
                      key={c}
                      className="t-card"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: "84%",
                        border: "1px solid rgba(0,200,255,0.07)",
                        borderRadius: 4,
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        boxSizing: "border-box",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div className="ci b" style={{ width: 24, height: 24 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div className="b" style={{ width: 74, height: 8 }} />
                          <div className="b" style={{ width: 54, height: 7 }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 3 }}>
                        {[0, 1, 2, 3, 4].map((s) => (
                          <div key={s} className="b" style={{ width: 10, height: 10 }} />
                        ))}
                      </div>
                      <div className="quote-skel" />
                      <div className="b" style={{ width: "92%", height: 7 }} />
                      <div className="b" style={{ width: "76%", height: 7 }} />
                      <div className="b" style={{ width: "58%", height: 7 }} />
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="ci b" style={{ width: 8, height: 8 }} />
                        <div className="b" style={{ width: 52, height: 6, borderRadius: 10 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* CTA */}
              <section
                data-section="cta"
                data-dwell={2600}
                className="scan-sec"
                style={{
                  height: "9%",
                  minHeight: 48,
                  borderBottom: "1px solid rgba(0,200,255,0.06)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  transition: "border-color 0.75s ease, background 0.85s ease, box-shadow 0.85s ease",
                  ...secStagger(5),
                }}
              >
                <span className={`sec-label ${getSectionLabelClass("cta")}`} style={secLabelStyle}>
                  CTA
                </span>
                <span className={`sec-badge ${getSectionLabelClass("cta")}`} style={secBadgeStyle}>
                  CONVERSION
                </span>
                <div className="sec-sticker" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3 }} />
                <div
                  className="scan-sec-body"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 80px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    <div className="b" style={{ width: 96, height: 7, borderRadius: 10 }} />
                    <div className="b" style={{ width: 230, height: 14 }} />
                    <div className="b" style={{ width: 180, height: 14 }} />
                    <div className="b" style={{ width: 190, height: 8 }} />
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div className="b" style={{ width: 118, height: 32, borderRadius: 4 }} />
                    <div
                      className="b nav-ghost"
                      style={{
                        width: 94,
                        height: 32,
                        borderRadius: 4,
                        border: "1px solid rgba(0,200,255,0.1)",
                        background: "transparent",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* FOOTER */}
              <section
                data-section="footer"
                data-dwell={2200}
                className="scan-sec"
                style={{
                  height: "11%",
                  flex: 1,
                  minHeight: 56,
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  borderBottom: "1px solid rgba(0,200,255,0.06)",
                  transition: "border-color 0.75s ease, background 0.85s ease, box-shadow 0.85s ease",
                  ...secStagger(6),
                }}
              >
                <span className={`sec-label ${getSectionLabelClass("footer")}`} style={secLabelStyle}>
                  FOOTER
                </span>
                <span className={`sec-badge ${getSectionLabelClass("footer")}`} style={secBadgeStyle}>
                  SEO &amp; META
                </span>
                <div className="sec-sticker" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3 }} />
                <div
                  className="scan-sec-body"
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 24,
                    padding: "10px 80px 28px",
                    position: "relative",
                  }}
                >
                  <div style={{ flex: 1.5, minWidth: 0, display: "flex", flexDirection: "column", gap: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div className="ci b" style={{ width: 18, height: 18 }} />
                      <div className="b" style={{ width: 66, height: 9 }} />
                    </div>
                    <div className="b" style={{ width: "88%", height: 7 }} />
                    <div className="b" style={{ width: "70%", height: 7 }} />
                  </div>
                  <div
                    style={{
                      width: 1,
                      alignSelf: "stretch",
                      minHeight: 40,
                      background: "rgba(0,200,255,0.05)",
                    }}
                  />
                  {[
                    [58, 72, 64, 52],
                    [58, 68, 60, 48],
                    [58, 70, 55, 50],
                  ].map((widths, col) => (
                    <div
                      key={col}
                      style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}
                    >
                      <div className="b" style={{ width: widths[0], height: 8, marginBottom: 2 }} />
                      {widths.slice(1).map((w, r) => (
                        <div key={r} className="b" style={{ width: w, height: 6 }} />
                      ))}
                    </div>
                  ))}
                </div>
                <div
                  className="scan-sec-body"
                  style={{
                    position: "absolute",
                    bottom: 8,
                    left: 80,
                    right: 80,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div className="b" style={{ width: 140, height: 6 }} />
                  <div style={{ display: "flex", gap: 14 }}>
                    <div className="b" style={{ width: 40, height: 6 }} />
                    <div className="b" style={{ width: 40, height: 6 }} />
                    <div className="b" style={{ width: 40, height: 6 }} />
                  </div>
                </div>
              </section>
            </div>
            {invalidUrlMessage && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  background: "rgba(5,8,16,0.85)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  zIndex: 100,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    color: "#FF2D2D",
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                  }}
                >
                  ● DIAGNOSTIC FAILED
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 13,
                    color: "#F0F4FF",
                    textAlign: "center",
                    maxWidth: 360,
                    lineHeight: 1.6,
                  }}
                >
                  {invalidUrlMessage}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    color: "rgba(240,244,255,0.4)",
                    textAlign: "center",
                  }}
                >
                  Verify the URL is correct and the site is publicly accessible.
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  style={{
                    marginTop: 8,
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#00C8FF",
                    background: "transparent",
                    border: "1px solid rgba(0,200,255,0.3)",
                    padding: "10px 24px",
                    cursor: "pointer",
                    borderRadius: 1,
                  }}
                >
                  TRY ANOTHER URL →
                </button>
              </div>
            )}
          </div>

        {/* Bottom terminal bar */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            zIndex: 200,
            background: "linear-gradient(0deg, rgba(0,0,8,0.98) 0%, rgba(0,0,8,0.75) 100%)",
            backdropFilter: "blur(16px) saturate(1.4)",
            WebkitBackdropFilter: "blur(16px) saturate(1.4)",
            borderTop: "1px solid rgba(0,200,255,0.12)",
            boxShadow: "0 -1px 0 rgba(0,200,255,0.06), 0 -8px 40px rgba(0,0,0,0.9)",
          }}
        >
          <div
            ref={progressFillRef}
            style={{
              position: "absolute",
              top: -1,
              left: 0,
              height: 2,
              width: "0%",
              background: "#00C8FF",
              transition: "width 0.4s ease",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 28px",
              gap: 20,
              height: "100%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  color: "rgba(0,200,255,0.55)",
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 6,
                }}
              >
                <span style={{ color: "rgba(0,200,255,0.3)" }} aria-hidden>
                  ›
                </span>
                <span
                  className="status-text"
                  style={{ opacity: statusFading ? 0 : 1 }}
                >
                  {statusBarOverride ?? (scoreReveal ? STATUS_COMPLETE_TEXT : typedStatus)}
                </span>
              </span>
            </div>
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 7,
                  letterSpacing: "0.2em",
                  color: "rgba(0,200,255,0.3)",
                  textTransform: "uppercase",
                  display: "block",
                  textAlign: "center",
                }}
              >
                REVENUE CHECKS
              </span>
              <span
                style={{
                  fontFamily: ORBIT,
                  fontWeight: 700,
                  fontSize: 16,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span
                  ref={checksCounterRef}
                  style={{
                    color: "#00C8FF",
                    textShadow: "0 0 10px #00C8FF, 0 0 25px rgba(0,200,255,0.5)",
                  }}
                >
                  0
                </span>
                <span style={{ color: "rgba(0,200,255,0.3)" }}> / </span>
                <span style={{ color: "rgba(0,200,255,0.4)" }}>200</span>
              </span>
            </div>
            <div style={{ flex: 1, textAlign: "right" }}>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 7,
                  letterSpacing: "0.2em",
                  color: "rgba(0,200,255,0.3)",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 2,
                }}
              >
                ELAPSED
              </span>
              <span
                style={{
                  fontFamily: ORBIT,
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#00C8FF",
                  textShadow: "0 0 12px #00C8FF, 0 0 30px rgba(0,200,255,0.5), 0 0 60px rgba(0,200,255,0.2)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatElapsed()}
              </span>
            </div>
          </div>
        </div>

        {/* Skeleton base styles */}
        <style>{`
          .b { border-radius: 2px; }
          .ci { border-radius: 50%; }
          .b, .ci {
            background: rgba(0,200,255,0.06);
            transition: background 0.9s ease, box-shadow 0.9s ease;
          }
          .scan-sec.active .hero-ph {
            border-color: rgba(0,200,255,0.18) !important;
          }
          .scan-sec.active .feat-card {
            border-color: rgba(0,200,255,0.22) !important;
          }
          .scan-sec.active .t-card {
            border-color: rgba(0,200,255,0.25) !important;
          }
          .feat-div {
            background: rgba(0,200,255,0.06);
            transition: background 0.9s ease;
          }
          .scan-sec.active .feat-div {
            background: rgba(0,200,255,0.14);
          }
          .hero-subcard {
            border: 1px solid rgba(0,200,255,0.05);
            background: rgba(0,200,255,0.015);
            box-sizing: border-box;
            transition: border-color 0.9s ease, background 0.9s ease;
          }
          .scan-sec.active .hero-subcard {
            border-color: rgba(0,200,255,0.18);
            background: rgba(0,200,255,0.04);
          }
          .scan-sec.active .nav-ghost {
            border-color: rgba(0,200,255,0.3) !important;
          }
          .scan-sec.active .b, .scan-sec.active .ci {
            background: rgba(0,200,255,0.14);
            box-shadow: 0 0 6px rgba(0,200,255,0.08);
          }
          .scan-sec.done .b, .scan-sec.done .ci {
            background: rgba(0,200,255,0.055);
            box-shadow: none;
          }
          .quote-skel {
            width: 18px;
            height: 11px;
            border-radius: 2px;
            opacity: 0.5;
            background: rgba(0,200,255,0.06);
            transition: background 0.9s ease;
          }
          .scan-sec.active .quote-skel {
            background: rgba(0,200,255,0.14);
          }
          .scan-sec.done .quote-skel {
            background: rgba(0,200,255,0.055);
          }
        `}</style>

        {/* Milestone diagnostic flashes — timed throughout the scan */}
        {milestoneFlash && (
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 290,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              opacity: milestoneFlashFade ? 0 : 1,
              transition: milestoneFlashFade ? "opacity 0.35s ease" : "none",
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 13,
                letterSpacing: "6px",
                color: CY,
                textTransform: "uppercase",
                textShadow: "0 0 20px rgba(0,200,255,0.8), 0 0 60px rgba(0,200,255,0.4)",
              }}
            >
              {milestoneFlash}
            </div>
          </div>
        )}

        {/* Score overlay */}
        <div
          ref={scoreOverlayRef}
          className="score-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,8,0)",
            backdropFilter: "blur(0px)",
            WebkitBackdropFilter: "blur(0px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.6s ease, backdrop-filter 0.6s ease",
          }}
        >
          <div style={{ position: "relative", width: 340, height: 340, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              ref={ringOuterRef}
              className="score-ring ring-outer"
              style={{
                position: "absolute",
                width: 320,
                height: 320,
                borderRadius: "50%",
                border: "1px solid rgba(0,200,255,0.08)",
                opacity: 0,
              }}
            />
            <div
              ref={ringInnerRef}
              className="score-ring ring-inner"
              style={{
                position: "absolute",
                width: 260,
                height: 260,
                borderRadius: "50%",
                border: "1px solid rgba(0,200,255,0.18)",
                boxShadow: "0 0 60px rgba(0,200,255,0.08)",
                opacity: 0,
              }}
            />
            <div
              className={`diag-fade ${diagLabelVis ? "show" : ""}`}
              style={{
                position: "absolute",
                top: 52,
                fontSize: 9,
                letterSpacing: "5px",
                color: "rgba(0,200,255,0.55)",
                textTransform: "uppercase",
                fontFamily: MONO,
              }}
            >
              DIAGNOSTIC COMPLETE
            </div>
            <div
              ref={scoreNumRef}
              style={{
                fontFamily: ORBIT,
                fontWeight: 900,
                fontSize: "clamp(80px, 14vw, 140px)",
                color: "#00C8FF",
                lineHeight: 1,
                textShadow:
                  "0 0 24px rgba(0,200,255,1), 0 0 70px rgba(0,200,255,0.7), 0 0 140px rgba(0,200,255,0.4), 0 0 250px rgba(0,200,255,0.15)",
                opacity: scoreReveal ? 1 : 0,
              }}
            >
              {displayScore}
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 40,
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: "4px",
                color: "rgba(0,200,255,0.45)",
                opacity: subLabelVis ? 1 : 0,
                transition: "opacity 0.5s ease",
              }}
            >
              / 100 REVENUE SCORE
            </div>
          </div>
        </div>

        {scanRetrying && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: "0.12em",
                color: "rgba(0,200,255,0.45)",
              }}
            >
              Taking longer than expected — retrying...
            </span>
          </div>
        )}

        {(errorMsg || scanFailure) && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 400,
              background: "rgba(5,8,16,0.94)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
              padding: 24,
              textAlign: "center",
              borderTop: "1px solid rgba(0,200,255,0.12)",
              boxShadow: "inset 0 0 120px rgba(0,200,255,0.04)",
            }}
          >
            <div
              style={{
                maxWidth: 420,
                border: "1px solid rgba(0,200,255,0.22)",
                borderRadius: 12,
                padding: "32px 28px 28px 28px",
                background: "rgba(5,8,16,0.85)",
                boxShadow:
                  "0 0 0 1px rgba(0,200,255,0.06), 0 24px 64px rgba(0,0,0,0.55)",
              }}
            >
              <h2
                style={{
                  fontFamily: ORBIT,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: CY,
                  margin: 0,
                  marginBottom: 14,
                  textTransform: "uppercase",
                }}
              >
                {errorMsg ? "INVALID URL" : "SCAN INTERRUPTED"}
              </h2>
              <p
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: "rgba(240,244,255,0.45)",
                  margin: 0,
                  marginBottom: 24,
                }}
              >
                {errorMsg
                  ? errorMsg
                  : scanFailure?.kind === "client"
                    ? scanFailure.message ??
                      "We couldn't complete this scan. Try again or use a different URL."
                    : "We encountered an issue analyzing this site. This sometimes happens with heavily protected sites."}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    const u = normalizedUrlRef.current;
                    if (u) {
                      const path = `/scan?url=${encodeURIComponent(u)}&rescan=true`;
                      console.log("[scan-nav] window.location.href (retry)", path);
                      window.location.href = path;
                    } else {
                      window.location.reload();
                    }
                  }}
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    fontWeight: 700,
                    color: "#050810",
                    background: CY,
                    border: `1px solid ${CY}`,
                    padding: "10px 18px",
                    borderRadius: 6,
                    cursor: "pointer",
                    boxShadow: "0 0 20px rgba(0,200,255,0.25)",
                  }}
                >
                  TRY AGAIN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push("/");
                  }}
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    fontWeight: 600,
                    color: "rgba(0,200,255,0.9)",
                    background: "transparent",
                    border: "1px solid rgba(0,200,255,0.35)",
                    padding: "10px 18px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  SCAN DIFFERENT SITE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cinematic intro overlay — covers the first 1.5s of a normal scan */}
        {introVisible && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 350,
              background: BG,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO,
              opacity: introFadingOut ? 0 : 1,
              transition: introFadingOut ? "opacity 0.3s ease" : "none",
              pointerEvents: introFadingOut ? "none" : "auto",
            }}
          >
            {/* Horizontal sweep beam */}
            <div
              aria-hidden
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background: "rgba(0,200,255,0.6)",
                zIndex: 100,
                boxShadow: "0 0 12px rgba(0,200,255,0.5), 0 0 40px rgba(0,200,255,0.2)",
                animation: "introSweep 0.8s ease-in-out forwards",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                position: "relative",
                zIndex: 10,
              }}
            >
              {/* INITIATING DIAGNOSTIC */}
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), ui-monospace, monospace",
                  fontSize: 11,
                  letterSpacing: "4px",
                  color: CY,
                  textTransform: "uppercase",
                  minHeight: 16,
                }}
              >
                {introLine1}
                {introLine1.length > 0 && introLine1.length < "INITIATING DIAGNOSTIC".length && (
                  <span style={{ opacity: 0.5 }}>_</span>
                )}
              </div>

              {/* TARGET: <domain> with glitch decode */}
              {(introLine2Real > 0 || introLine2Glitch) && (
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), var(--font-space-mono), ui-monospace, monospace",
                    fontSize: 11,
                    letterSpacing: "4px",
                    color: CY,
                    textTransform: "uppercase",
                  }}
                >
                  <span style={{ opacity: 0.4 }}>TARGET: </span>
                  {introDomainDisplay}
                </div>
              )}

              {/* 166 DIAGNOSTIC CHECKS QUEUED */}
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "3px",
                  color: "rgba(0,200,255,0.4)",
                  textTransform: "uppercase",
                  opacity: introLine3 ? 1 : 0,
                  transition: "opacity 0.4s ease",
                }}
              >
                200 DIAGNOSTIC CHECKS QUEUED
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: BG,
          }}
        />
      }
    >
      <ScanLoadingInner />
    </Suspense>
  );
}