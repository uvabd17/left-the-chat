const SESSION_KEY = 'farewell_session'

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveSession(rollNo, name) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ rollNo, name }))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function hasSeenOnboarding() {
  return localStorage.getItem('farewell_onboarding') === 'true'
}

export function markOnboardingSeen() {
  localStorage.setItem('farewell_onboarding', 'true')
}
