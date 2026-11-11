/**
 * Formatting. RMB only, tabular numbers, and never a guessed value.
 *
 * The workbench is a Chinese product priced in yuan; a `$` beside a yuan figure was a
 * real defect, so the currency is not a parameter here.
 */

const RMB = '¥'

/** Current interface language, set once at registration. */
let language = 'zh'

export function setLanguage(value) {
  language = typeof value === 'string' && value !== '' ? value : 'zh'
}

export function currentLanguage() {
  return language
}

/** Local timezone offset in seconds, east positive. */
export function tzOffsetSeconds() {
  return -new Date().getTimezoneOffset() * 60
}

/** `UTC+08:00` for the header. */
export function utcOffsetLabel() {
  const minutes = -new Date().getTimezoneOffset()
  const sign = minutes >= 0 ? '+' : '-'
  const absolute = Math.abs(minutes)
  return `UTC${sign}${pad2(Math.floor(absolute / 60))}:${pad2(absolute % 60)}`
}

export function pad2(value) {
  return String(value).padStart(2, '0')
}

/** `MM/DD HH:mm`. */
export function dateTimeOf(time) {
  const value = Number(time)
  if (!Number.isFinite(value) || value <= 0) return ''
  const date = new Date(value)
  return `${date.getMonth() + 1}/${date.getDate()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** `HH:mm` of a timestamp. */
export function clockOf(time) {
  const value = Number(time)
  if (!Number.isFinite(value) || value <= 0) return ''
  const date = new Date(value)
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** `M月D日`, or the locale's medium date. */
export function dateLabel(time) {
  const value = Number(time)
  if (!Number.isFinite(value) || value <= 0) return ''
  try {
    return new Intl.DateTimeFormat(language, { month: 'long', day: 'numeric' }).format(new Date(value))
  } catch {
    return dateTimeOf(value)
  }
}

/** Money in RMB, two decimals; a non-zero amount below a cent says so. */
export function moneyOf(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value)) return `${RMB}0.00`
  if (value > 0 && value < 0.01) return `<${RMB}0.01`
  return `${RMB}${value.toLocaleString(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Compact token counts: `1.2M`, `96k`, `138`. */
export function tokensOf(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '0'
  const trim = (text) => text.replace(/\.0$/, '')
  if (number >= 1_000_000) return `${trim((number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1))}M`
  if (number >= 1000) return `${trim((number / 1000).toFixed(number >= 100_000 ? 0 : 1))}k`
  return String(Math.round(number))
}

/** A generation rate, one decimal below 100. */
export function rateOf(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '—'
  return number >= 100 ? String(Math.round(number)) : String(Math.round(number * 10) / 10)
}

/** `2m41s` style durations. */
export function durationOf(ms) {
  const seconds = Number(ms) / 1000
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s'
  if (seconds < 60) return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = Math.round(seconds % 60)
  if (minutes < 60) return `${minutes}m${pad2(rest)}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h${pad2(minutes % 60)}m`
}

/** Relative time from a translation function, so the wording stays local. */
export function relativeTime(t, time, now) {
  const at = Number(time)
  if (!Number.isFinite(at) || at <= 0) return ''
  const delta = Math.max(0, Number(now) - at)
  if (delta < 60_000) return t('time.justNow')
  const minutes = Math.floor(delta / 60_000)
  if (minutes < 60) return t('time.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time.hoursAgo', { count: hours })
  return t('time.daysAgo', { count: Math.floor(hours / 24) })
}

/** The last path segment of a workspace. */
export function basename(path) {
  if (typeof path !== 'string' || path === '') return ''
  const parts = path.split(/[\\/]+/).filter((part) => part !== '')
  return parts.length === 0 ? path : parts[parts.length - 1]
}

/** Truncate for a single line, keeping the ending visible. */
export function clip(text, limit) {
  const value = String(text ?? '')
  return value.length > limit ? `${value.slice(0, limit)}…` : value
}
