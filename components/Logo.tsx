type LogoSize = "sm" | "md" | "lg";

const SIZES: Record<LogoSize, { px: number; bsw: number; psw: number }> = {
  sm: { px: 28, bsw: 67, psw: 30 },
  md: { px: 44, bsw: 36, psw: 22 },
  lg: { px: 80, bsw: 25, psw: 15 },
};

export default function Logo({ size = "md" }: { size?: LogoSize }) {
  const { px, bsw, psw } = SIZES[size];
  const fid = `logo-${size}`;
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 800 800"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <defs>
        <filter id={`${fid}-glow`} x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation="5" result="blur1" />
          <feGaussianBlur stdDeviation="10" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${fid}-softglow`} x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform="translate(400,400)">
        <g filter={`url(#${fid}-softglow)`}>
          <line x1="30" y1="-200" x2="200" y2="-200" stroke="#00C8FF" strokeWidth={bsw} strokeLinecap="square" />
          <line x1="200" y1="-200" x2="200" y2="-30" stroke="#00C8FF" strokeWidth={bsw} strokeLinecap="square" />
          <line x1="-200" y1="30" x2="-200" y2="200" stroke="#00C8FF" strokeWidth={bsw} strokeLinecap="square" />
          <line x1="-200" y1="200" x2="-30" y2="200" stroke="#00C8FF" strokeWidth={bsw} strokeLinecap="square" />
        </g>
        <g filter={`url(#${fid}-glow)`} opacity={0.7}>
          <line x1="-260" y1="0" x2="-60" y2="0" stroke="#00C8FF" strokeWidth={psw} strokeLinecap="round" />
          <polyline
            points="-60,0 -30,0 -15,-70 0,70 15,-30 35,0 260,0"
            stroke="#00C8FF"
            strokeWidth={psw}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
