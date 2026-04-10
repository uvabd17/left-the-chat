import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../utils/auth'
import { getFutureSelfMessage, saveFutureSelfMessage } from '../appwrite/db'

const C = {
  bg: '#FFF5E1', surface: '#FFFFFF', border: '#000000',
  pink: '#FF90E8', yellow: '#FFD700', red: '#FF6B6B',
  purple: '#B18CFF', blue: '#59B8FF', orange: '#FFA64D', green: '#23C45E'
}

function HomeButton({ navigate }) {
  return (
    <button
      onClick={() => navigate('/dashboard')}
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 100,
        background: C.surface, border: `3px solid ${C.border}`,
        boxShadow: `4px 4px 0 ${C.border}`, padding: '12px 20px',
        fontFamily: "'DM Sans', sans-serif", fontWeight: 800,
        fontSize: 13, textTransform: 'uppercase', cursor: 'pointer', color: '#000'
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `2px 2px 0 ${C.border}`; e.currentTarget.style.transform = 'translate(2px, 2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = `4px 4px 0 ${C.border}`; e.currentTarget.style.transform = 'translate(0,0)' }}
    >
      ← HOME
    </button>
  )
}

export default function FutureSelf() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [existing, setExisting] = useState(null)
  const [text, setText] = useState('')
  const [unlockDate, setUnlockDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sealed, setSealed] = useState(false)

  // Min date = 1 year from today
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  useEffect(() => {
    const s = getSession()
    if (!s) { navigate('/login', { replace: true }); return }
    setSession(s)
    loadData(s.rollNo)
  }, [])

  async function loadData(rollNo) {
    const msg = await getFutureSelfMessage(rollNo)
    setExisting(msg)
    setLoading(false)
  }

  async function handleSeal() {
    if (!text.trim()) return setError('WRITE SOMETHING')
    if (!unlockDate) return setError('PICK A DATE')
    if (new Date(unlockDate) < minDate) return setError('MUST BE AT LEAST 1 YEAR FROM NOW')
    setSaving(true)
    setError('')
    try {
      await saveFutureSelfMessage(session.rollNo, text.trim(), unlockDate)
      setSaving(false)
      setSealed(true)
      setExisting({ unlockDate })
    } catch {
      setSaving(false)
      setError('SOMETHING BROKE. TRY AGAIN.')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontWeight: 900, fontSize: 24, textTransform: 'uppercase', animation: 'pulse 1s infinite' }}>LOADING...</p>
      </div>
    )
  }

  const unlockDisplay = existing?.unlockDate
    ? new Date(existing.unlockDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : unlockDate

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: 20, paddingBottom: 80 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease-out' }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, textTransform: 'uppercase' }}>🔮 TIME CAPSULE</h1>
          <p style={{ color: '#555', fontSize: 14, fontStyle: 'italic' }}>write to future you</p>
        </div>

        {/* Already written */}
        {(existing || sealed) && (
          <div style={{
            background: C.orange, border: `3px solid ${C.border}`,
            boxShadow: `8px 8px 0 ${C.border}`, padding: 40,
            textAlign: 'center',
            animation: sealed ? 'popIn 0.4s ease-out' : 'fadeUp 0.3s ease-out'
          }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>
              SEALED
            </h2>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              your message is locked until
            </p>
            <p style={{
              fontSize: 28, fontWeight: 900, fontFamily: 'monospace',
              background: C.surface, border: `3px solid ${C.border}`,
              display: 'inline-block', padding: '8px 20px', marginTop: 8
            }}>
              {unlockDisplay}
            </p>
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', marginTop: 16, fontWeight: 700, textTransform: 'uppercase' }}>
              NO PEEKING. NO EDITING. SEE YOU THEN.
            </p>
          </div>
        )}

        {/* Write form */}
        {!existing && !sealed && (
          <div style={{
            background: C.surface, border: `3px solid ${C.border}`,
            boxShadow: `6px 6px 0 ${C.border}`, padding: 24
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 16 }}>
              write a letter to your future self. once sealed, you can't read it or edit it until the date you pick.
            </p>

            <label style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              YOUR MESSAGE
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="dear future me..."
              rows={8}
              style={{
                background: C.bg, border: `2px solid ${C.border}`,
                padding: '14px 16px', fontSize: 16, fontFamily: 'DM Sans, sans-serif',
                width: '100%', color: '#000', resize: 'vertical', minHeight: 160
              }}
            />

            <label style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginTop: 20, marginBottom: 6 }}>
              OPEN ON THIS DATE (MIN 1 YEAR FROM NOW)
            </label>
            <input
              type="date"
              value={unlockDate}
              onChange={e => setUnlockDate(e.target.value)}
              min={minDateStr}
              style={{
                background: C.bg, border: `2px solid ${C.border}`,
                padding: '10px 14px', fontSize: 15, fontFamily: 'DM Sans, sans-serif',
                width: '100%', color: '#000'
              }}
            />

            {error && (
              <p style={{
                background: C.red, border: `2px solid ${C.border}`,
                padding: '8px 14px', fontWeight: 800, fontSize: 13,
                textTransform: 'uppercase', marginTop: 16
              }}>{error}</p>
            )}

            <button
              onClick={handleSeal}
              disabled={saving}
              style={{
                background: C.orange, border: `3px solid ${C.border}`,
                boxShadow: `4px 4px 0 ${C.border}`, padding: '14px 28px',
                fontWeight: 800, fontSize: 16, cursor: saving ? 'wait' : 'pointer',
                fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase',
                width: '100%', marginTop: 20, opacity: saving ? 0.7 : 1
              }}
              onMouseDown={e => { e.target.style.boxShadow = '1px 1px 0 #000'; e.target.style.transform = 'translate(3px,3px)' }}
              onMouseUp={e => { e.target.style.boxShadow = '4px 4px 0 #000'; e.target.style.transform = 'translate(0,0)' }}
              onMouseLeave={e => { e.target.style.boxShadow = '4px 4px 0 #000'; e.target.style.transform = 'translate(0,0)' }}
            >
              {saving ? 'SEALING...' : 'SEAL IT 🔒'}
            </button>
          </div>
        )}
      </div>
      <HomeButton navigate={navigate} />
    </div>
  )
}
