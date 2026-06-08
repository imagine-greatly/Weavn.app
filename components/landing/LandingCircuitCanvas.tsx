"use client";

import { useEffect, useRef } from "react";

type Pt = { x: number; y: number };

type TraceColor = { line: string; dot: string };

type TraceLine = {
  points: Pt[];
  totalLen: number;
  duration: number;
  startTime: number;
  color: TraceColor;
};

const GRID = 64;
const MAX_LINES = 28;
const DOT_RADIUS = 1.5;

const TRACE_COLORS: TraceColor[] = [
  { line: 'rgba(111,155,198,0.045)', dot: 'rgba(111,155,198,0.135)' }, // 60% — muted blue
  { line: 'rgba(128,128,192,0.040)', dot: 'rgba(128,128,192,0.12)'  }, // 30% — muted purple
  { line: 'rgba(0,196,140,0.035)',   dot: 'rgba(0,196,140,0.10)'    }, // 10% — muted green
];

function randomTraceColor(): TraceColor {
  const r = Math.random();
  if (r < 0.6) return TRACE_COLORS[0]!;
  if (r < 0.9) return TRACE_COLORS[1]!;
  return TRACE_COLORS[2]!;
}

const snapToGrid = (value: number, grid: number) => Math.round(value / grid) * grid;

function randomInRange(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function buildManhattanPath(w: number, h: number): Pt[] {
  const gridW = snapToGrid(w, GRID);
  const gridH = snapToGrid(h, GRID);

  const edgePoint = (edge: number): Pt => {
    switch (edge) {
      case 0: return { x: snapToGrid(randomInRange(0, w), GRID), y: 0 };
      case 1: return { x: gridW, y: snapToGrid(randomInRange(0, h), GRID) };
      case 2: return { x: snapToGrid(randomInRange(0, w), GRID), y: gridH };
      default: return { x: 0, y: snapToGrid(randomInRange(0, h), GRID) };
    }
  };

  const e0 = Math.floor(Math.random() * 4);
  let e1 = (e0 + 1 + Math.floor(Math.random() * 3)) % 4;
  if (e1 === e0) e1 = (e0 + 1) % 4;

  const start = edgePoint(e0);
  const end = edgePoint(e1);

  // First direction is perpendicular to the start edge:
  // left(3)/right(1) edges → move horizontally first; top(0)/bottom(2) → vertically first
  let goHorizontal = e0 === 1 || e0 === 3;

  const points: Pt[] = [start];
  let cur = { ...start };

  const numIntermediates = 1 + Math.floor(Math.random() * 4); // 1–4 intermediates → 2–5 segments

  for (let i = 0; i < numIntermediates; i++) {
    const cells = 1 + Math.floor(Math.random() * 6); // 1–6 grid cells per segment
    const dist = cells * GRID;

    if (goHorizontal) {
      const dir = cur.x <= 0 ? 1 : cur.x >= gridW ? -1 : Math.random() > 0.5 ? 1 : -1;
      cur = { x: Math.min(gridW, Math.max(0, cur.x + dir * dist)), y: cur.y };
    } else {
      const dir = cur.y <= 0 ? 1 : cur.y >= gridH ? -1 : Math.random() > 0.5 ? 1 : -1;
      cur = { x: cur.x, y: Math.min(gridH, Math.max(0, cur.y + dir * dist)) };
    }

    points.push({ ...cur });
    goHorizontal = !goHorizontal;
  }

  points.push(end);
  return points;
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
    let nextSpawnAt = performance.now() + randomInRange(0, 1500);
    for (let s = 0; s < 14 && linesRef.current.length < MAX_LINES; s++) {
      const points = buildManhattanPath(w0, h0);
      if (process.env.NODE_ENV === 'development' && s === 0) {
        console.log('Circuit path waypoints:', points.map(p => `${p.x},${p.y}`).join(' → '));
      }
      const totalLen = polylineLength(points);
      if (totalLen >= 64) {
        linesRef.current.push({
          points,
          totalLen,
          duration: randomInRange(18000, 28000),
          startTime: performance.now() - randomInRange(0, 14000),
          color: randomTraceColor(),
        });
      }
    }

    const spawnLine = (w: number, h: number) => {
      const points = buildManhattanPath(w, h);
      const totalLen = polylineLength(points);
      if (totalLen < 64) return;
      linesRef.current.push({
        points,
        totalLen,
        duration: randomInRange(18000, 28000),
        startTime: performance.now(),
        color: randomTraceColor(),
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
        nextSpawnAt = now + randomInRange(1200, 2000);
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
      ctx.lineCap = "square";
      ctx.lineJoin = "miter";

      for (const line of linesRef.current) {
        const t = Math.min((now - line.startTime) / line.duration, 1);
        const visibleLen = line.totalLen * t;

        ctx.strokeStyle = line.color.line;
        ctx.fillStyle = line.color.dot;
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
