type LogoSize = "sm" | "md" | "lg";

const SIZES: Record<LogoSize, number> = {
  sm: 32,
  md: 72,
  lg: 120,
};

export default function Logo({ size = "md" }: { size?: LogoSize }) {
  const px = SIZES[size];
  const fid = `logo-${size}`;
  // viewBox spans ±270 user units (540 wide). Scale filter blur values so
  // the glow resolves to consistent screen-pixel radii at each display size.
  const scale = 540 / px;
  const gb1 = 3 * scale;    // → ~3px glow on screen
  const gb2 = 8 * scale;    // → ~8px glow on screen
  const bb  = 1.5 * scale;  // → ~1.5px bracket glow on screen

  return (
    <div style={{ width: px, height: px, flexShrink: 0 }}>
      <svg
        viewBox="-270 -270 540 540"
        fill="none"
        aria-hidden
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <filter id={`${fid}-glow`} x="-30%" y="-200%" width="160%" height="500%">
            <feGaussianBlur stdDeviation={gb1} result="blur1" />
            <feGaussianBlur stdDeviation={gb2} result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={`${fid}-bracketGlow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={bb} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={`url(#${fid}-bracketGlow)`}>
          <line x1="40" y1="-210" x2="210" y2="-210" stroke="#00C8FF" strokeWidth="2.5" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
          <line x1="210" y1="-210" x2="210" y2="-40" stroke="#00C8FF" strokeWidth="2.5" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
          <line x1="-210" y1="40" x2="-210" y2="210" stroke="#00C8FF" strokeWidth="2.5" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
          <line x1="-210" y1="210" x2="-40" y2="210" stroke="#00C8FF" strokeWidth="2.5" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
        </g>
        <g filter={`url(#${fid}-glow)`} opacity={0.6}>
          <line x1="-270" y1="0" x2="-70" y2="0" stroke="#00C8FF" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <polyline
            points="-70,0 -35,0 -16,-75 0,75 16,-32 38,0 270,0"
            fill="none"
            stroke="#00C8FF"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  );
}
