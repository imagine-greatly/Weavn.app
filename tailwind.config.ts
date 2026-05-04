import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050810",
        surface: "#0A0D1A",
        card: "#0D1020",
        elevated: "#111428",
        border: {
          DEFAULT: "#1C1C2E",
          active: "rgba(0,200,255,0.35)",
        },
        cyan: "#00C8FF",
        "cyan-dim": "rgba(0,200,255,0.15)",
        red: "#FF2D2D",
        orange: "#FF9500",
        green: "#00FF87",
        "text-primary": "#F0F4FF",
        "text-secondary": "#8E8EA0",
        "text-muted": "#3A3A52",
      },
      fontFamily: {
        orbitron: ["var(--font-orbitron)", "sans-serif"],
        display: ["var(--font-orbitron)", "sans-serif"],
        sans: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-space-grotesk)", "sans-serif"],
        mono: [
          "var(--font-jetbrains-mono)",
          "var(--font-space-mono)",
          "monospace",
        ],
      },
      boxShadow: {
        "cyan-soft": "0 0 40px rgba(0,180,255,0.06)",
        "cyan-active": "0 0 0 1px rgba(0,200,255,0.4), 0 0 20px rgba(0,200,255,0.2), 0 0 60px rgba(0,200,255,0.08)",
        "cyan-intense": "0 0 0 1px rgba(0,220,255,0.6), 0 0 30px rgba(0,220,255,0.35), 0 0 80px rgba(0,220,255,0.15)",
        "red-glow": "0 0 20px rgba(255,45,45,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
