import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudent, recordPinFailure, resetPinFailures } from '../appwrite/db'
import { getSession, clearSession, hashPin, isPinFormat, isPinTrusted, markPinTrusted } from '../utils/auth'

const C = {
  bg: '#FFF5E1', surface: '#FFFFFF', border: '#000000',
  pink: '#FF90E8', yellow: '#FFD700', red: '#FF6B6B',
  purple: '#B18CFF', blue: '#59B8FF', orange: '#FFA64D', green: '#23C45E'
}

export default function PinVerify() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [student, setStudent] = useState(null)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [lockTimer, setLockTimer] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const s = getSession()
      if (!s) { navigate('/login', { replace: true }); return }
      setSession(s)

      const stu = await getStudent(s.rollNo)
      if (!stu) {
        clearSession()
        navigate('/login', { replace: true })
        return
      }

      if (!stu.pinHash) {
        navigate('/pin-setup', { replace: true })
        return
      }

      if (isPinTrusted(s.rollNo)) {
        navigate('/dashboard', { replace: true })
        return
      }

      setStudent(stu)
      if (stu.pinLockedUntil && new Date(stu.pinLockedUntil) > new Date()) {
        startLockTimer(stu.pinLockedUntil)
      }
      setLoading(false)
    }

    init()
  }, [])

  function startLockTimer(lockedUntil) {
    if (timerRef.current) clearInterval(timerRef.current)
    const end = new Date(lockedUntil).getTime()
    function tick() {
      const diff = end - Date.now()
      if (diff <= 0) {
        setLockTimer(null)
        if (timerRef.current) clearInterval(timerRef.current)
        return
      }
      const mins = Math.floor(diff / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setLockTimer(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`)
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
  }

  async function handleVerify() {
    if (!session || !student || verifying || lockTimer) return
    setError('')

    if (!isPinFormat(pin)) {
      setError('ENTER A 4-DIGIT PIN')
      return
    }

    setVerifying(true)
    try {
      const entered = await hashPin(pin)
      if (entered === student.pinHash) {
        await resetPinFailures(session.rollNo)
        markPinTrusted(session.rollNo)
        navigate('/dashboard', { replace: true })
        return
      }

      const result = await recordPinFailure(session.rollNo)
      if (result.locked && result.lockedUntil) {
        startLockTimer(result.lockedUntil)
        setError('TOO MANY WRONG PINS. ACCOUNT LOCKED.')
      } else {
        setError(`WRONG PIN. ${result.attemptsLeft} TRIES LEFT.`)
      }
      const refreshed = await getStudent(session.rollNo)
      if (refreshed) setStudent(refreshed)
      setPin('')
      setVerifying(false)
    } catch (e) {
      setError(e?.message || 'VERIFICATION FAILED. TRY AGAIN.')
      setVerifying(false)
    }
  }

  function handleForceLogout() {
    if (lockTimer) return
    clearSession()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontWeight: 900, fontSize: 24, textTransform: 'uppercase', animation: 'pulse 1s infinite' }}>LOADING...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{
        background: C.surface, border: `3px solid ${C.border}`,
        boxShadow: `8px 8px 0 ${C.border}`, padding: 28,
        width: '100%', maxWidth: 420
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>
          ENTER PIN
        </h1>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
          Welcome back, {session?.name?.split(' ')[0]}. Enter your 4-digit PIN to continue.
        </p>

        {lockTimer && (
          <div style={{
            background: C.yellow, border: `2px solid ${C.border}`,
            padding: 12, marginBottom: 12, textAlign: 'center'
          }}>
            <p style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Locked for</p>
            <p style={{ fontSize: 34, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 3 }}>{lockTimer}</p>
            <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
              Account switching is disabled during lockout.
            </p>
          </div>
        )}

        {error && (
          <div style={{
            background: C.red, border: `2px solid ${C.border}`,
            padding: '10px 12px', fontWeight: 800, marginBottom: 12,
            textTransform: 'uppercase', fontSize: 13
          }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
          disabled={!!lockTimer || verifying}
          style={{
            background: C.surface, border: `2px solid ${C.border}`,
            padding: '12px 14px', fontSize: 20, fontFamily: 'monospace',
            width: '100%', marginBottom: 16, letterSpacing: 6,
            opacity: lockTimer ? 0.6 : 1
          }}
        />

        <button
          onClick={handleVerify}
          disabled={!!lockTimer || verifying}
          style={{
            background: C.green, border: `3px solid ${C.border}`,
            boxShadow: `4px 4px 0 ${C.border}`,
            padding: '12px 20px', width: '100%',
            fontWeight: 900, textTransform: 'uppercase',
            fontSize: 14, cursor: lockTimer || verifying ? 'not-allowed' : 'pointer',
            opacity: lockTimer || verifying ? 0.75 : 1
          }}
        >
          {verifying ? 'VERIFYING...' : 'UNLOCK'}
        </button>

        <button
          onClick={handleForceLogout}
          disabled={!!lockTimer}
          style={{
            marginTop: 10, width: '100%',
            background: 'transparent', border: `2px solid ${C.border}`,
            padding: '10px 16px', fontWeight: 800,
            cursor: lockTimer ? 'not-allowed' : 'pointer',
            opacity: lockTimer ? 0.55 : 1,
            textTransform: 'uppercase'
          }}
        >
          Switch account
        </button>
      </div>
    </div>
  )
}
