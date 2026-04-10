import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../utils/auth'
import { getAllUnsent, postUnsent } from '../appwrite/db'
import { moderateMessage } from '../appwrite/moderation'

const C = {
  bg: '#FFF5E1', surface: '#FFFFFF', border: '#000000',
  pink: '#FF90E8', yellow: '#FFD700', red: '#FF6B6B',
  purple: '#B18CFF', blue: '#59B8FF', orange: '#FFA64D', green: '#23C45E'
}

const CARD_COLORS = [C.pink, C.blue, C.yellow, C.purple, C.orange, C.green]

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

export default function UnsentWall() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s) { navigate('/login', { replace: true }); return }
    loadData()
  }, [])

  async function loadData() {
    const p = await getAllUnsent()
    setPosts(p)
    setLoading(false)
  }

  async function handlePost() {
    if (!text.trim()) return setError('TYPE SOMETHING')
    setPosting(true)
    setError('')
    const mod = await moderateMessage(text.trim())
    if (mod.blocked) {
      setPosting(false)
      return setError(mod.reason)
    }
    try {
      await postUnsent(text.trim())
      setPosting(false)
      setText('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 1500)
      loadData()
    } catch {
      setPosting(false)
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

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: 20, paddingBottom: 80 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease-out' }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, textTransform: 'uppercase' }}>💬 JUST SAY IT</h1>
          <p style={{ color: '#555', fontSize: 14, fontStyle: 'italic' }}>no names, no rules, just say it</p>
        </div>

        {/* Post input */}
        <div style={{
          background: C.surface, border: `3px solid ${C.border}`,
          boxShadow: `6px 6px 0 ${C.border}`, padding: 20, marginBottom: 24
        }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="what's on your mind?"
            rows={3}
            maxLength={280}
            style={{
              background: C.bg, border: `2px solid ${C.border}`,
              padding: '12px 14px', fontSize: 16, fontFamily: 'DM Sans, sans-serif',
              width: '100%', color: '#000', resize: 'none'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 12, color: '#999' }}>{text.length}/280</span>
            {success ? (
              <span style={{ fontWeight: 800, fontSize: 14, color: C.green, textTransform: 'uppercase', animation: 'popIn 0.3s ease-out' }}>POSTED ✓</span>
            ) : (
              <button
                onClick={handlePost}
                disabled={posting}
                style={{
                  background: C.blue, border: `3px solid ${C.border}`,
                  boxShadow: `4px 4px 0 ${C.border}`, padding: '10px 24px',
                  fontWeight: 800, fontSize: 14, cursor: posting ? 'wait' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase',
                  opacity: posting ? 0.7 : 1
                }}
                onMouseDown={e => { e.target.style.boxShadow = '1px 1px 0 #000'; e.target.style.transform = 'translate(3px,3px)' }}
                onMouseUp={e => { e.target.style.boxShadow = '4px 4px 0 #000'; e.target.style.transform = 'translate(0,0)' }}
                onMouseLeave={e => { e.target.style.boxShadow = '4px 4px 0 #000'; e.target.style.transform = 'translate(0,0)' }}
              >
                {posting ? 'POSTING...' : 'SEND IT'}
              </button>
            )}
          </div>
          {error && (
            <p style={{
              background: C.red, border: `2px solid ${C.border}`,
              padding: '8px 14px', fontWeight: 800, fontSize: 13,
              textTransform: 'uppercase', marginTop: 10
            }}>{error}</p>
          )}
        </div>

        {/* Wall */}
        {posts.length === 0 ? (
          <div style={{
            background: C.surface, border: `3px solid ${C.border}`,
            boxShadow: `6px 6px 0 ${C.border}`, padding: 40, textAlign: 'center'
          }}>
            <p style={{ fontWeight: 800, fontSize: 20, textTransform: 'uppercase' }}>NOTHING HERE. BE FIRST.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {posts.map((post, i) => (
              <div key={post.id} style={{
                background: CARD_COLORS[i % CARD_COLORS.length],
                border: `3px solid ${C.border}`,
                boxShadow: `4px 4px 0 ${C.border}`,
                padding: '18px 22px',
                animation: `fadeUp 0.3s ${i * 0.03}s ease-out both`
              }}>
                <p style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.5 }}>
                  {post.text}
                </p>
                <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 8, fontWeight: 600 }}>
                  {post.createdAt?.toDate?.()?.toLocaleDateString() || 'just now'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <HomeButton navigate={navigate} />
    </div>
  )
}
