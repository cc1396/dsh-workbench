/**
 * Data hooks: one snapshot poll and one clock.
 *
 * The snapshot is cached in `sessionStorage` so returning to the panel paints the last
 * answer immediately instead of an empty shell, and a cached paint is never reported
 * as an outage. Freshness follows the browser's own clock, not the Host's stamp.
 */

const POLL_MS = 15_000
const RETRY_MS = 4_000
const CACHE_KEY = 'dsh-workbench:snapshot:v3'
const CACHE_MAX_AGE_MS = 10 * 60_000

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (raw === null) return undefined
    const cached = JSON.parse(raw)
    if (!Number.isFinite(Number(cached?.at)) || Date.now() - Number(cached.at) > CACHE_MAX_AGE_MS) return undefined
    return cached.data !== null && typeof cached.data === 'object' ? cached.data : undefined
  } catch {
    return undefined
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // Storage full or disabled only costs the fast path.
  }
}

/**
 * Poll the snapshot.
 *
 * @param React - the runtime's React.
 * @param read - `(signal) => Promise<snapshot>`; supplied so a test can drive it.
 * @param tzOffset - the viewer's offset in seconds.
 * @returns `{ state, refresh }` with `state.status` one of
 *   `loading | ready | stale | error | cached`.
 */
export function useSnapshot(React, read, tzOffset) {
  const [state, setState] = React.useState(() => {
    const cached = readCache()
    return cached === undefined
      ? { status: 'loading', data: undefined, error: undefined }
      : { status: 'cached', data: cached, error: undefined }
  })
  const [attempt, setAttempt] = React.useState(0)
  const refresh = React.useCallback(() => setAttempt((value) => value + 1), [])

  React.useEffect(() => {
    const controller = new AbortController()
    let alive = true
    let timer

    const run = async () => {
      let delay = POLL_MS
      try {
        const data = await read(tzOffset, controller.signal)
        if (!alive) return
        writeCache(data)
        setState({ status: 'ready', data, error: undefined })
      } catch (error) {
        if (!alive || controller.signal.aborted) return
        // A cached or previous answer stays on screen; only the badge changes.
        setState((previous) => (previous.data === undefined ? { status: 'error', data: undefined, error } : { status: 'stale', data: previous.data, error }))
        delay = RETRY_MS
      }
      if (alive) timer = setTimeout(run, delay)
    }

    run()
    return () => {
      alive = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [attempt, tzOffset])

  React.useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onVisible = () => {
      if (document.visibilityState === 'visible') setAttempt((value) => value + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return [state, refresh]
}

/** A ticking clock for relative times. */
export function useNow(React, interval = 30_000) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(timer)
  }, [interval])
  return now
}

/** Whether the panel is in its narrow layout. */
export function useNarrow(React, breakpoint = 720) {
  const [narrow, setNarrow] = React.useState(() => typeof window !== 'undefined' && Number(window.innerWidth) < breakpoint)
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia(`(width<=${breakpoint - 1}px)`)
    const onChange = () => setNarrow(query.matches)
    setNarrow(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [breakpoint])
  return narrow
}
