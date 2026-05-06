export async function validateUrl(value: string): Promise<
  { valid: true; url: string } |
  { valid: false; error: string; type: 'format' | 'unreachable' }
> {
  const trimmed = value.trim()
  if (!trimmed) return { valid: false, error: '', type: 'format' }

  const withProtocol = trimmed.startsWith('http')
    ? trimmed
    : 'https://' + trimmed

  let parsed: URL
  try { parsed = new URL(withProtocol) }
  catch {
    return {
      valid: false,
      error: 'The input does not resolve to a live domain. Enter a valid website URL to proceed.',
      type: 'format'
    }
  }

  if (!parsed.hostname.includes('.') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
    return {
      valid: false,
      error: 'The input does not resolve to a live domain. Enter a valid website URL to proceed.',
      type: 'format'
    }
  }

  try {
    const res = await fetch(
      `/api/check-url?url=${encodeURIComponent(withProtocol)}`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (res.ok) {
      const data = await res.json()
      if (data.reachable === false) {
        return {
          valid: false,
          error: 'Target URL could not be resolved. Verify the domain is active and accessible before running a diagnostic.',
          type: 'unreachable'
        }
      }
    }
  } catch {
    // network failure — proceed anyway
  }

  return { valid: true, url: withProtocol }
}
