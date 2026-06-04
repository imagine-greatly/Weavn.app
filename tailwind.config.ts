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
        background: {
          base: '#050810',
          raised: '#080C14',
          interactive: '#0D1420',
          border: '#111827',
          subtle: '#0A0F1A',
        },
        cyan: {
          DEFAULT: '#00C8FF',
          dim: '#00C8FF20',
          glow: '#00C8FF15',
          muted: '#00C8FF60',
        },
        text: {
          primary: '#F0F4FF',
          secondary: '#4A5568',
          tertiary: '#2D3748',
          inverse: '#050810',
        },
        severity: {
          critical: '#FF4444',
          high: '#FF8C00',
          medium: '#F5A623',
          low: '#4A9EFF',
          positive: '#00C48C',
        },
        score: {
          high: '#00C48C',
          mid: '#F5A623',
          low: '#FF4444',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 200, 255, 0.15), 0 0 60px rgba(0, 200, 255, 0.05)',
        'glow-cyan-strong': '0 0 30px rgba(0, 200, 255, 0.25), 0 0 80px rgba(0, 200, 255, 0.08)',
        surface: '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
        'surface-lg': '0 4px 24px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.3)',
        // retained from prior system — referenced by existing globals.css
        'cyan-soft': '0 0 40px rgba(0,180,255,0.06)',
        'cyan-active': '0 0 0 1px rgba(0,200,255,0.4), 0 0 20px rgba(0,200,255,0.2), 0 0 60px rgba(0,200,255,0.08)',
        'cyan-intense': '0 0 0 1px rgba(0,220,255,0.6), 0 0 30px rgba(0,220,255,0.35), 0 0 80px rgba(0,220,255,0.15)',
        'red-glow': '0 0 20px rgba(255,45,45,0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
