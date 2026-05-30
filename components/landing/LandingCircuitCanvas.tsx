"use client";

import { useEffect, useRef } from "react";

type Pt = { x: number; y: number };

type TraceLine = {
  points: Pt[];
  totalLen: number;
  duration: number;
  startTime: number;
};

const MAX_LINES = 15;
const LINE_COLOR = "rgba(0,200,255,0.035)";
const DOT_FILL = "rgba(0,200,255,0.1)";
const DOT_RADIUS = 1.5;

function randomInRange(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function buildManhattanPath(w: number, h: number): Pt[] {
  const m = 48;
  const edgePoint = (edge: number): Pt => {
    switch (edge) {
      case 0:
        return { x: m + Math.random() * Math.max(40, w - 2 * m), y: 0 };
      case 1:
        return { x: w, y: m + Math.random() * Math.max(40, h - 2 * m) };
      case 2:
        return { x: m + Math.random() * Math.max(40, w - 2 * m), y: h };
      default:
        return { x: 0, y: m + Math.random() * Math.max(40, h - 2 * m) };
    }
  };

  let e0 = Math.floor(Math.random() * 4);
  let e1 = (e0 + 2 + Math.floor(Math.random() * 3)) % 4;
  if (e1 === e0) e1 = (e0 + 1) % 4;

  const start = edgePoint(e0);
  const end = edgePoint(e1);
  const mid =
    Math.random() > 0.5
      ? { x: end.x, y: start.y }
      : { x: start.x, y: end.y };

  return [start, mid, end];
}

function polylineLength(points: Pt[]): number {
  let L = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    L += Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
  }
  return L;
}

function pointAtDistance(points: Pt[], d: number): Pt {
  let remaining = Math.max(0, d);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const seg = Math.abs(dx) + Math.abs(dy);
    if (seg === 0) continue;
    if (remaining <= seg) {
      const t = remaining / seg;
      return { x: a.x + dx * t, y: a.y + dy * t };
    }
    remaining -= seg;
  }
  const last = points[points.length - 1]!;
  return { ...last };
}

function drawPartialPath(ctx: CanvasRenderingContext2D, points: Pt[], maxDist: number) {
  if (points.length < 2) return;
  let remaining = maxDist;
  ctx.beginPath();
  const first = points[0]!;
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const seg = Math.abs(dx) + Math.abs(dy);
    if (seg === 0) continue;
    if (remaining >= seg) {
      ctx.lineTo(b.x, b.y);
      remaining -= seg;
    } else {
      const t = remaining / seg;
      ctx.lineTo(a.x + dx * t, a.y + dy * t);
      break;
    }
  }
  ctx.stroke();
}

type Props = {
  overlay?: boolean;
};

export default function LandingCircuitCanvas({ overlay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linesRef = useRef<TraceLine[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", {
      alpha: true,
      desynchronized: true,
    } as CanvasRenderingContext2DSettings);
    if (!ctx) return;

    let animFrameId = 0;
    let needsRedraw = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      needsRedraw = true;
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(document.documentElement);
    window.addEventListener("resize", resize);

    const w0 = window.innerWidth;
    const h0 = window.innerHeight;
    let nextSpawnAt = performance.now() + randomInRange(0, 2500);
    for (let s = 0; s < 8 && linesRef.current.length < MAX_LINES; s++) {
      const points = buildManhattanPath(w0, h0);
      const totalLen = polylineLength(points);
      if (totalLen >= 80) {
        linesRef.current.push({
          points,
          totalLen,
          duration: randomInRange(14000, 22000),
          startTime: performance.now() - randomInRange(0, 10000),
        });
      }
    }

    const spawnLine = (w: number, h: number) => {
      const points = buildManhattanPath(w, h);
      const totalLen = polylineLength(points);
      if (totalLen < 80) return;
      linesRef.current.push({
        points,
        totalLen,
        duration: randomInRange(14000, 22000),
        startTime: performance.now(),
      });
      if (linesRef.current.length > MAX_LINES) {
        linesRef.current.shift();
      }
      needsRedraw = true;
    };

    const tick = (now: number) => {
      animFrameId = requestAnimationFrame(tick);

      const w = window.innerWidth;
      const h = window.innerHeight;

      if (linesRef.current.length < MAX_LINES && now >= nextSpawnAt) {
        spawnLine(w, h);
        nextSpawnAt = now + randomInRange(2300, 3100);
      }

      const beforeCount = linesRef.current.length;
      linesRef.current = linesRef.current.filter((line) => {
        const elapsed = now - line.startTime;
        return elapsed < line.duration + 400;
      });
      if (linesRef.current.length !== beforeCount) {
        needsRedraw = true;
      }

      const hasAnimating = linesRef.current.some((line) => {
        const t = (now - line.startTime) / line.duration;
        return t > 0 && t < 1;
      });

      if (!needsRedraw && !hasAnimating && linesRef.current.length === 0) {
        return;
      }

      needsRedraw = hasAnimating;

      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      ctx.strokeStyle = LINE_COLOR;
      ctx.lineCap = "square";
      ctx.lineJoin = "miter";
      ctx.fillStyle = DOT_FILL;

      for (const line of linesRef.current) {
        const t = Math.min((now - line.startTime) / line.duration, 1);
        const visibleLen = line.totalLen * t;
        drawPartialPath(ctx, line.points, visibleLen);

        const head = pointAtDistance(line.points, visibleLen);
        const tail = line.points[0]!;

        ctx.beginPath();
        ctx.arc(head.x, head.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tail.x, tail.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    animFrameId = requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={
        overlay
          ? "pointer-events-none absolute inset-0 h-full w-full mix-blend-screen opacity-[0.72]"
          : "pointer-events-none fixed inset-0 z-0"
      }
      aria-hidden
      style={overlay ? undefined : { mixBlendMode: "normal" }}
    />
  );
}
