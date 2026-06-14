'use client'

import React from 'react'
import { METRIC_KEYS, SEVERITY_COLOR } from '@/lib/design-tokens'

export interface CodeBlockProps {
  code: string
  language?: 'json' | 'bash'
}

const C = {
  key:    '#8080c0',  // json-key    — JSON object keys (muted purple)
  metric: '#6F9BC6',  // json-metric — measurement/dimension keys (muted blue)
  str:    '#00C48C',  // json-string — string values (muted green)
  num:    '#C9D1D9',  // json-number — numbers / booleans / null (near-white)
  muted:  '#6E7587',  // ink-muted   — bash commands, flags
  sec:    '#9398A8',  // ink-secondary
  pri:    '#E6E9EE',  // ink-primary
  accent: '#00C8FF',  // accent-blue — weavn_live_ tokens in bash only
} as const

const SEV_HEX: Record<string, string> = {
  'sev-critical': '#E8635F',
  'sev-high':     '#6F9BC6',
  'ink-muted':    '#6E7587',
}

type Tok = { text: string; color: string }

function tokenizeJSON(line: string): Tok[] {
  const m = line.match(/^(\s*)("([^"]+)")(\s*:\s*)(.+)$/)
  if (!m) return [{ text: line, color: C.sec }]

  const [, indent, keyQ, key, colon, rest] = m
  const trimmed = rest.trimEnd()
  const comma = trimmed.endsWith(',') ? ',' : ''
  const val = comma ? trimmed.slice(0, -1).trimEnd() : trimmed

  // Key coloring — 3 tiers (precedence order):
  // 1. severity key → metric blue (its value still uses SEVERITY_COLOR)
  // 2. METRIC_KEYS   → metric blue
  // 3. all others    → key purple
  const keyColor = METRIC_KEYS.includes(key) ? C.metric : C.key

  // Value coloring — unchanged; severity value → SEVERITY_COLOR, never blue
  let valColor: string
  if (key === 'severity') {
    const bare = val.replace(/^"|"$/g, '').toLowerCase()
    const cls = SEVERITY_COLOR[bare]
    valColor = cls ? (SEV_HEX[cls] ?? C.sec) : C.sec
  } else if (val.startsWith('"') || val.startsWith("'")) {
    valColor = C.str
  } else if (/^(true|false|null|-?\d[\d.eE+\-]*)$/.test(val.trim())) {
    valColor = C.num
  } else {
    valColor = C.sec
  }

  return [
    { text: indent, color: C.pri },
    { text: keyQ,   color: keyColor },
    { text: colon,  color: C.sec },
    { text: val + comma, color: valColor },
  ].filter(t => t.text.length > 0)
}

function tokenizeBash(line: string): Tok[] {
  const tokens: Tok[] = []
  const re = /(weavn_live_\S+)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(https?:\/\/\S+)|(\\$)|(-{1,2}[a-zA-Z]\S*)|(\s+)|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    const [full, wdoc, quoted, url, bs, flag, ws] = m
    if (ws)     tokens.push({ text: full, color: C.pri })
    else if (wdoc)   tokens.push({ text: full, color: C.accent })
    else if (quoted) tokens.push({ text: full, color: C.str })
    else if (url)    tokens.push({ text: full, color: C.str })
    else if (bs)     tokens.push({ text: full, color: C.muted })
    else if (flag)   tokens.push({ text: full, color: C.muted })
    else             tokens.push({ text: full, color: C.muted })
  }
  return tokens
}

function CodeBlock({ code, language = 'json' }: CodeBlockProps) {
  const lines = code.split('\n')
  const tokenize = language === 'json' ? tokenizeJSON : tokenizeBash

  return (
    <pre
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 13,
        lineHeight: 1.7,
        backgroundColor: '#0A0E18',
        border: '0.5px solid rgba(255,255,255,0.08)',
        margin: 0,
        padding: '16px 20px',
        overflowX: 'auto',
        whiteSpace: 'pre',
        borderRadius: 0,
      }}
    >
      {lines.map((line, i) => (
        <span key={i} style={{ display: 'block' }}>
          {tokenize(line).map((tok, j) => (
            <span key={j} style={{ color: tok.color }}>{tok.text}</span>
          ))}
        </span>
      ))}
    </pre>
  )
}

export { CodeBlock }
export default CodeBlock
