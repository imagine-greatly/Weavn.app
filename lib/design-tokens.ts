export const TOKENS = {
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
  },
} as const;

export const ELEVATION = {
  base: 'bg-background-base',
  raised: 'bg-background-raised',
  interactive: 'bg-background-interactive',
} as const;

export const TEXT = {
  primary: 'text-text-primary font-body',
  secondary: 'text-text-secondary font-body',
  mono: 'font-mono text-text-secondary',
  label: 'font-mono text-xs uppercase tracking-widest text-text-tertiary',
  display: 'font-display font-extrabold tracking-tight text-text-primary',
} as const;

export const SURFACE = {
  base: 'bg-background-raised border border-background-border',
  interactive: 'bg-background-raised border border-background-border hover:bg-background-interactive transition-colors duration-150',
  inset: 'bg-background-subtle border border-background-border',
} as const;
