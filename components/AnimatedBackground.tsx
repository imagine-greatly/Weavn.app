"use client";

export default function AnimatedBackground() {
  return (
    <>
      <div aria-hidden className="global-ambient-animated-bg" />
      <style jsx global>{`
        @keyframes globalAmbientShift {
          0% {
            background-position: 50% 45%;
          }
          50% {
            background-position: 52% 45%;
          }
          100% {
            background-position: 50% 45%;
          }
        }
        .global-ambient-animated-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 45%, #0a1628 0%, #081122 45%, #050810 100%);
          background-size: 120% 120%;
          animation: globalAmbientShift 10s linear infinite;
        }
        @media (max-width: 768px) {
          .global-ambient-animated-bg {
            animation: none;
            background-size: auto;
            background-position: 50% 45%;
            will-change: auto;
          }
        }
      `}</style>
    </>
  );
}
