const SESSION_KEY = 'farewell_session'
const SESSION_VERSION = 2
const PIN_TRUST_KEY = 'farewell_pin_trust'
const PIN_TRUST_VERSION = 1
const PIN_TRUST_DAYS = 7

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== SESSION_VERSION) return null
    if (!parsed.rollNo || !parsed.name) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(rollNo, name) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    rollNo,
    name,
    version: SESSION_VERSION
  }))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(PIN_TRUST_KEY)
}

export function isPinFormat(pin) {
  return /^\d{4}$/.test(pin)
}

export async function hashPin(pin) {
  const input = String(pin || '')
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(input)
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `fallback_${(h >>> 0).toString(16).padStart(8, '0')}`
}

export function markPinTrusted(rollNo, days = PIN_TRUST_DAYS) {
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000
  localStorage.setItem(PIN_TRUST_KEY, JSON.stringify({
    rollNo,
    expiresAt,
    version: PIN_TRUST_VERSION
  }))
}

export function clearPinTrust() {
  localStorage.removeItem(PIN_TRUST_KEY)
}

export function isPinTrusted(rollNo) {
  try {
    const raw = localStorage.getItem(PIN_TRUST_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== PIN_TRUST_VERSION) return false
    if (parsed.rollNo !== rollNo) return false
    return Number(parsed.expiresAt) > Date.now()
  } catch {
    return false
  }
}

export function hasSeenOnboarding() {
  return localStorage.getItem('farewell_onboarding') === 'true'
}

export function markOnboardingSeen() {
  localStorage.setItem('farewell_onboarding', 'true')
}
