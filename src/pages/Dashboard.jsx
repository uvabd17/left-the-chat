import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, clearSession, hasSeenOnboarding, markOnboardingSeen } from '../utils/auth'
import { getUnreadCount, getStudent, getSlamBook, parseSlamBook, getSettings, getLatestUnsent } from '../appwrite/db'

const C = {
  bg: '#FFF5E1', surface: '#FFFFFF', border: '#000000',
  pink: '#FF90E8', yellow: '#FFD700', red: '#FF6B6B',
  purple: '#B18CFF', blue: '#59B8FF', orange: '#FFA64D', green: '#23C45E'
}

const FEATURES = [
  {
    key: 'slam', route: '/slam', color: C.pink,
    icon: '📖', name: 'ABOUT ME',
    sub: "fill yours, read theirs",
    tip: "this is everyone's slam book. tap a card, flip it, react to it."
  },
  {
    key: 'messages', route: '/messages', color: C.red,
    icon: '🔥', name: 'SECRET MSGS',
    sub: "send it. they read it. poof.",
    tip: "send secret messages to classmates. they burn after reading. gone forever."
  },
  {
    key: 'awards', route: '/awards', color: C.yellow,
    icon: '🏆', name: 'CLASS VOTES',
    sub: "vote for the legends",
    tip: "vote for classmates in different categories. results drop on reveal day."
  },
  {
    key: 'superlatives', route: '/superlatives', color: C.purple,
    icon: '⚡', name: 'THIS OR THAT',
    sub: "pick one, no skipping",
    tip: "two classmates, one question. pick a side."
  },
  {
    key: 'unsent', route: '/unsent', color: C.blue,
    icon: '💬', name: 'JUST SAY IT',
    sub: "no names, no rules, just say it",
    tip: "post anything anonymously. no names attached. ever."
  },
  {
    key: 'future', route: '/future', color: C.orange,
    icon: '🔮', name: 'TIME CAPSULE',
    sub: "write to future you",
    tip: "write a letter to yourself. it gets sealed until the date you pick."
  }
]

const POLL_MS = 45000
const SEEN_KEY = 'farewell_notif_seen_v1'

function digest(value) {
  const input = String(value || '')
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) + input.charCodeAt(i)
  }
  return (h >>> 0).toString(16)
}

function readSeenSet() {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed)
  } catch {
    return new Set()
  }
}

function writeSeenSet(seen) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)))
  } catch {
    // Ignore storage write issues; notifications still function in-memory.
  }
}

function sanitizeSnippet(text, maxLen = 96) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLen) return clean
  return `${clean.slice(0, maxLen)}...`
}

function buildSnapshot(unreadCount, settings, latestUnsent) {
  const awards = settings?.awardsCategories
  let activeCategory = null
  if (awards && typeof awards === 'object' && !Array.isArray(awards)) {
    activeCategory = awards.active || null
  } else if (typeof awards === 'string') {
    activeCategory = awards || null
  }
  const revealDate = settings?.awardsRevealDate || null
  const isRevealed = revealDate ? new Date(revealDate) <= new Date() : false
  const superlativesSig = digest(JSON.stringify(settings?.superlatives || []))

  return {
    unreadCount,
    activeCategory,
    revealDate,
    isRevealed,
    superlativesSig,
    latestUnsentId: latestUnsent?.id || null,
    latestUnsentText: latestUnsent?.text || ''
  }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [student, setStudent] = useState(null)
  const [title, setTitle] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [onboardingStep, setOnboardingStep] = useState(-1)
  const [cardsVisible, setCardsVisible] = useState(false)
  const [toastQueue, setToastQueue] = useState([])
  const [activeToast, setActiveToast] = useState(null)
  const seenRef = useRef(readSeenSet())
  const baselineRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    const s = getSession()
    if (!s) { navigate('/login', { replace: true }); return }
    setSession(s)
    loadData(s.rollNo)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (activeToast || toastQueue.length === 0) return
    const [next, ...rest] = toastQueue
    setActiveToast(next)
    setToastQueue(rest)
  }, [toastQueue, activeToast])

  useEffect(() => {
    if (!activeToast) return
    const t = setTimeout(() => setActiveToast(null), 5000)
    return () => clearTimeout(t)
  }, [activeToast])

  function enqueueToast(fingerprint, text, color = C.surface) {
    const seen = seenRef.current
    if (seen.has(fingerprint)) return
    seen.add(fingerprint)
    writeSeenSet(seen)
    setToastQueue(prev => [...prev, { id: `${Date.now()}_${Math.random()}`, text, color }])
  }

  async function pollNotifications(rollNo) {
    try {
      const [count, settings, latestUnsent] = await Promise.all([
        getUnreadCount(rollNo),
        getSettings(),
        getLatestUnsent()
      ])

      setUnreadCount(count)
      const prev = baselineRef.current
      const current = buildSnapshot(count, settings, latestUnsent)

      if (!prev) {
        baselineRef.current = current
        return
      }

      if (current.unreadCount > prev.unreadCount) {
        enqueueToast(`msg_${rollNo}_${current.unreadCount}`, 'NEW SECRET MESSAGE JUST DROPPED.', C.red)
      }

      if (current.activeCategory && current.activeCategory !== prev.activeCategory) {
        enqueueToast(
          `award_cat_${digest(`${current.activeCategory}_${current.revealDate || ''}`)}`,
          `NEW CLASS VOTE: ${current.activeCategory.toUpperCase()}`,
          C.yellow
        )
      }

      if (!prev.isRevealed && current.isRevealed && current.activeCategory) {
        enqueueToast(
          `award_reveal_${digest(`${current.activeCategory}_${current.revealDate || ''}`)}`,
          `RESULTS ARE OUT FOR ${current.activeCategory.toUpperCase()}.`,
          C.yellow
        )
      }

      if (current.superlativesSig !== prev.superlativesSig) {
        enqueueToast(`sup_${current.superlativesSig}`, 'THIS OR THAT POLLS GOT UPDATED.', C.purple)
      }

      if (current.latestUnsentId && current.latestUnsentId !== prev.latestUnsentId) {
        const snippet = sanitizeSnippet(current.latestUnsentText)
        enqueueToast(`unsent_${current.latestUnsentId}`, `NEW JUST SAY IT: "${snippet}"`, C.blue)
      }

      baselineRef.current = current
    } catch {
      // Silent failure: background notifications should not block dashboard usage.
    }
  }

  async function loadData(rollNo) {
    try {
      const [count, stu, slam, settings, latestUnsent] = await Promise.all([
        getUnreadCount(rollNo),
        getStudent(rollNo),
        getSlamBook(rollNo),
        getSettings(),
        getLatestUnsent()
      ])
      setUnreadCount(count)
      setStudent(stu)
      if (slam) {
        const parsed = parseSlamBook(slam)
        const titleQ = "In one word, what would your friends call you?"
        setTitle(parsed.answers[titleQ] || '')
      }

      baselineRef.current = buildSnapshot(count, settings, latestUnsent)
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(() => {
        pollNotifications(rollNo)
      }, POLL_MS)

      setLoading(false)
      setTimeout(() => setCardsVisible(true), 100)

      if (!hasSeenOnboarding()) {
        setTimeout(() => setOnboardingStep(0), 600)
      }
    } catch {
      setLoading(false)
    }
  }

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  function nextOnboarding() {
    if (onboardingStep >= FEATURES.length - 1) {
      setOnboardingStep(-1)
      markOnboardingSeen()
    } else {
      setOnboardingStep(onboardingStep + 1)
    }
  }

  function skipOnboarding() {
    setOnboardingStep(-1)
    markOnboardingSeen()
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontWeight: 900, fontSize: 24, textTransform: 'uppercase', animation: 'pulse 1s infinite' }}>LOADING...</p>
      </div>
    )
  }

  const photoFallbackBg = C.pink
  const initial = session?.name?.charAt(0)?.toUpperCase() || '?'

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: 20 }}>
      {activeToast && (
        <div style={{
          position: 'fixed', left: 16, bottom: 16, zIndex: 1200,
          background: activeToast.color, border: `3px solid ${C.border}`,
          boxShadow: `6px 6px 0 ${C.border}`,
          padding: '12px 16px', maxWidth: 360,
          fontSize: 13, fontWeight: 800, textTransform: 'uppercase',
          animation: 'fadeUp 0.2s ease-out'
        }}>
          {activeToast.text}
        </div>
      )}

      {/* Onboarding overlay */}
      {onboardingStep >= 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 998
        }} onClick={skipOnboarding} />
      )}

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          marginBottom: 32, animation: 'fadeUp 0.4s ease-out'
        }}>
          {/* Photo */}
          <div style={{
            width: 64, height: 64, border: `3px solid ${C.border}`,
            boxShadow: `4px 4px 0 ${C.border}`,
            background: student?.photoURL ? 'transparent' : photoFallbackBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 28, flexShrink: 0, overflow: 'hidden'
          }}>
            {student?.photoURL
              ? <img src={student.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : initial
            }
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1 }}>
              {session?.name}
            </h1>
            {title && (
              <p style={{
                fontSize: 14, color: '#555', fontWeight: 600, fontStyle: 'italic'
              }}>
                "{title}"
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent', border: `2px solid ${C.border}`,
              padding: '8px 16px', fontWeight: 800, fontSize: 12,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              textTransform: 'uppercase', transition: 'all 0.1s'
            }}
            onMouseEnter={e => { e.target.style.background = C.red; e.target.style.boxShadow = `3px 3px 0 ${C.border}` }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.boxShadow = 'none' }}
          >
            PEACE OUT
          </button>
        </div>

        {/* Feature Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FEATURES.map((f, i) => {
            const isOnboardingTarget = onboardingStep === i
            return (
              <div key={f.key} style={{ position: 'relative' }}>
                <div
                  onClick={() => onboardingStep < 0 && navigate(f.route)}
                  style={{
                    background: f.color,
                    border: `3px solid ${C.border}`,
                    boxShadow: `6px 6px 0 ${C.border}`,
                    padding: 24,
                    cursor: onboardingStep < 0 ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 16,
                    opacity: cardsVisible ? 1 : 0,
                    transform: cardsVisible ? 'translateY(0)' : 'translateY(20px)',
                    transitionDelay: `${i * 0.08}s`,
                    position: 'relative',
                    zIndex: isOnboardingTarget ? 999 : 1
                  }}
                  onMouseEnter={e => {
                    if (onboardingStep >= 0) return
                    e.currentTarget.style.transform = 'translate(-2px, -2px)'
                    e.currentTarget.style.boxShadow = `8px 8px 0 ${C.border}`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translate(0, 0)'
                    e.currentTarget.style.boxShadow = `6px 6px 0 ${C.border}`
                  }}
                >
                  <span style={{ fontSize: 36 }}>{f.icon}</span>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1 }}>
                      {f.name}
                    </h2>
                    <p style={{ fontSize: 13, fontWeight: 500, fontStyle: 'italic', opacity: 0.7, marginTop: 2 }}>
                      {f.sub}
                    </p>
                  </div>
                  {/* Badges */}
                  {f.key === 'messages' && unreadCount > 0 && (
                    <div style={{
                      background: C.surface, border: `2px solid ${C.border}`,
                      padding: '4px 10px', fontWeight: 900, fontSize: 14,
                      animation: 'popIn 0.3s ease-out'
                    }}>
                      {unreadCount}
                    </div>
                  )}
                  <span style={{ fontSize: 20, fontWeight: 900 }}>→</span>
                </div>

                {/* Onboarding tooltip */}
                {isOnboardingTarget && (
                  <div style={{
                    position: 'absolute', left: 16, right: 16,
                    bottom: -80, zIndex: 1000,
                    background: C.surface, border: `3px solid ${C.border}`,
                    boxShadow: `6px 6px 0 ${C.border}`, padding: 16,
                    animation: 'fadeUp 0.3s ease-out'
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{f.tip}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#999' }}>{onboardingStep + 1} / {FEATURES.length}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={skipOnboarding} style={{
                          background: 'transparent', border: 'none', fontSize: 13,
                          fontWeight: 700, cursor: 'pointer', color: '#999',
                          fontFamily: 'DM Sans, sans-serif'
                        }}>SKIP</button>
                        <button onClick={nextOnboarding} style={{
                          background: C.yellow, border: `2px solid ${C.border}`,
                          boxShadow: `3px 3px 0 ${C.border}`, padding: '6px 16px',
                          fontWeight: 800, fontSize: 13, cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase'
                        }}>
                          {onboardingStep === FEATURES.length - 1 ? 'GOT IT' : 'NEXT →'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 40, fontSize: 12, color: '#999' }}>
          LEFT THE CHAT — class of '26
        </p>
      </div>
    </div>
  )
}
