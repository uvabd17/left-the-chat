import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudent, setStudentPin } from '../appwrite/db'
import { getSession, clearSession, hashPin, isPinFormat, isPinTrusted, markPinTrusted } from '../utils/auth'

const C = {
  bg: '#FFF5E1', surface: '#FFFFFF', border: '#000000',
  pink: '#FF90E8', yellow: '#FFD700', red: '#FF6B6B',
  purple: '#B18CFF', blue: '#59B8FF', orange: '#FFA64D', green: '#23C45E'
}

export default function PinSetup() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      const s = getSession()
      if (!s) { navigate('/login', { replace: true }); return }
      setSession(s)

      const student = await getStudent(s.rollNo)
      if (!student) {
        clearSession()
        navigate('/login', { replace: true })
        return
      }

      if (student.pinHash) {
        if (isPinTrusted(s.rollNo)) {
          navigate('/dashboard', { replace: true })
          return
        }
        navigate('/pin-verify', { replace: true })
        return
      }

      setLoading(false)
    }

    init()
  }, [])

  async function handleSavePin() {
    if (!session || saving) return
    setError('')

    if (!isPinFormat(pin)) {
      setError('PIN MUST BE EXACTLY 4 DIGITS')
      return
    }
    if (pin !== confirmPin) {
      setError('PINS DO NOT MATCH')
      return
    }

    setSaving(true)
    try {
      const pinHash = await hashPin(pin)
      await setStudentPin(session.rollNo, pinHash)
      markPinTrusted(session.rollNo)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(e?.message || 'FAILED TO SET PIN. TRY AGAIN.')
      setSaving(false)
    }
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
          SET YOUR PIN
        </h1>
        <p style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>
          Hi {session?.name?.split(' ')[0]}. Set a 4-digit PIN. You will need this when you open the site again.
        </p>

        {error && (
          <div style={{
            background: C.red, border: `2px solid ${C.border}`,
            padding: '10px 12px', fontWeight: 800, marginBottom: 12,
            textTransform: 'uppercase', fontSize: 13
          }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>4-digit PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          style={{
            background: C.surface, border: `2px solid ${C.border}`,
            padding: '12px 14px', fontSize: 20, fontFamily: 'monospace',
            width: '100%', marginBottom: 12, letterSpacing: 6
          }}
        />

        <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Confirm PIN</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={confirmPin}
          onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          style={{
            background: C.surface, border: `2px solid ${C.border}`,
            padding: '12px 14px', fontSize: 20, fontFamily: 'monospace',
            width: '100%', marginBottom: 16, letterSpacing: 6
          }}
        />

        <button
          onClick={handleSavePin}
          disabled={saving}
          style={{
            background: C.green, border: `3px solid ${C.border}`,
            boxShadow: `4px 4px 0 ${C.border}`,
            padding: '12px 20px', width: '100%',
            fontWeight: 900, textTransform: 'uppercase',
            fontSize: 14, cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.75 : 1
          }}
        >
          {saving ? 'SAVING...' : 'SAVE PIN'}
        </button>
      </div>
    </div>
  )
}
