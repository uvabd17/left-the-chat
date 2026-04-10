import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../utils/auth'
import { getAllSlamBooks, getAllStudents, reactToSlamBook, parseSlamBook } from '../appwrite/db'

const C = {
  bg: '#FFF5E1', surface: '#FFFFFF', border: '#000000',
  pink: '#FF90E8', yellow: '#FFD700', red: '#FF6B6B',
  purple: '#B18CFF', blue: '#59B8FF', orange: '#FFA64D', green: '#23C45E'
}

const REACTIONS = [
  { emoji: '💀', label: "I'M DEAD" },
  { emoji: '🫣', label: 'EXPOSED' },
  { emoji: '🗣️', label: 'REAL TALK' },
  { emoji: '🐐', label: 'GOAT' },
  { emoji: '😭', label: 'CRYING RN' }
]

const TITLE_Q = "In one word, what would your friends call you?"

const CARD_COLORS = [C.pink, C.blue, C.yellow, C.purple, C.orange, C.green, C.red]

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

function FlipCard({ slam, student, myRollNo, colorIndex, onReact }) {
  const [flipped, setFlipped] = useState(false)
  const color = CARD_COLORS[colorIndex % CARD_COLORS.length]
  const answers = slam.answers || {}
  const title = answers[TITLE_Q] || ''
  const otherAnswers = Object.entries(answers).filter(([k]) => k !== TITLE_Q)
  const reactions = slam.reactions || {}
  const myReaction = reactions[myRollNo]
  const isMe = slam.rollNo === myRollNo

  // Count reactions
  const counts = {}
  Object.values(reactions).forEach(emoji => { counts[emoji] = (counts[emoji] || 0) + 1 })

  return (
    <div
      style={{
        perspective: 1000,
        width: '100%',
        maxWidth: 340,
        height: 420,
        cursor: 'pointer',
        margin: '0 auto'
      }}
      onClick={() => setFlipped(!flipped)}
    >
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transition: 'transform 0.6s',
        transformStyle: 'preserve-3d',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)'
      }}>
        {/* FRONT */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          background: color, border: `3px solid ${C.border}`,
          boxShadow: `6px 6px 0 ${C.border}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, textAlign: 'center'
        }}>
          {isMe && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              background: C.surface, border: `2px solid ${C.border}`,
              padding: '2px 10px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase'
            }}>YOU</div>
          )}
          {/* Photo */}
          <div style={{
            width: 140, height: 140, border: `3px solid ${C.border}`,
            boxShadow: `4px 4px 0 ${C.border}`,
            background: student?.photoURL ? 'transparent' : C.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 40, overflow: 'hidden', marginBottom: 16
          }}>
            {student?.photoURL
              ? <img src={student.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : student?.name?.charAt(0)?.toUpperCase() || '?'
            }
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', lineHeight: 1.1, marginBottom: 4 }}>
            {student?.name || slam.rollNo}
          </h3>
          <p style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>{slam.rollNo}</p>
          {title && (
            <div style={{
              background: C.surface, border: `2px solid ${C.border}`,
              padding: '6px 16px', fontWeight: 700, fontSize: 16,
              fontStyle: 'italic', marginTop: 8
            }}>
              "{title}"
            </div>
          )}
          <p style={{ fontSize: 11, color: '#555', marginTop: 16, textTransform: 'uppercase', fontWeight: 700 }}>
            TAP TO FLIP →
          </p>
        </div>

        {/* BACK */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: C.surface, border: `3px solid ${C.border}`,
          boxShadow: `6px 6px 0 ${C.border}`,
          display: 'flex', flexDirection: 'column',
          padding: 20, overflow: 'hidden'
        }}>
          <h4 style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', marginBottom: 12, flexShrink: 0 }}>
            {student?.name}'S ANSWERS
          </h4>
          {/* Scrollable answers */}
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
            {otherAnswers.map(([q, a], i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#999', marginBottom: 2 }}>{q}</p>
                <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{a}</p>
              </div>
            ))}
          </div>
          {/* Reactions */}
          <div style={{
            display: 'flex', gap: 6, justifyContent: 'center',
            flexShrink: 0, borderTop: `2px solid ${C.border}`, paddingTop: 12
          }}
            onClick={e => e.stopPropagation()}
          >
            {REACTIONS.map(r => {
              const isActive = myReaction === r.emoji
              const count = counts[r.emoji] || 0
              return (
                <button
                  key={r.emoji}
                  onClick={(e) => { e.stopPropagation(); onReact(slam.rollNo, r.emoji) }}
                  title={r.label}
                  style={{
                    background: isActive ? C.yellow : C.bg,
                    border: `2px solid ${C.border}`,
                    boxShadow: isActive ? `3px 3px 0 ${C.border}` : 'none',
                    padding: '4px 8px', cursor: 'pointer',
                    fontSize: 18, display: 'flex', alignItems: 'center', gap: 4,
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.1s'
                  }}
                >
                  {r.emoji}
                  {count > 0 && <span style={{ fontSize: 12, fontWeight: 800 }}>{count}</span>}
                </button>
              )
            })}
          </div>
          <p style={{ fontSize: 10, color: '#999', textAlign: 'center', marginTop: 8, textTransform: 'uppercase', fontWeight: 700 }}>
            TAP TO FLIP BACK
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SlamBook() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [slamBooks, setSlamBooks] = useState([])
  const [students, setStudents] = useState({})
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const touchStart = useRef(null)

  useEffect(() => {
    const s = getSession()
    if (!s) { navigate('/login', { replace: true }); return }
    setSession(s)
    loadData(s.rollNo)
  }, [])

  async function loadData(myRollNo) {
    const [rawSlams, stuList] = await Promise.all([getAllSlamBooks(), getAllStudents()])
    const stuMap = {}
    stuList.forEach(s => { stuMap[s.id] = s })
    setStudents(stuMap)
    // Parse stringified JSON fields
    const slams = rawSlams.map(parseSlamBook)
    // Pin own card first
    const sorted = slams.sort((a, b) => {
      if (a.rollNo === myRollNo) return -1
      if (b.rollNo === myRollNo) return 1
      return 0
    })
    setSlamBooks(sorted)
    setLoading(false)
  }

  async function handleReact(targetRollNo, emoji) {
    if (!session) return
    await reactToSlamBook(targetRollNo, session.rollNo, emoji)
    // Optimistic update
    setSlamBooks(prev => prev.map(s => {
      if (s.rollNo !== targetRollNo) return s
      const reactions = { ...s.reactions }
      if (reactions[session.rollNo] === emoji) {
        delete reactions[session.rollNo]
      } else {
        reactions[session.rollNo] = emoji
      }
      return { ...s, reactions }
    }))
  }

  // Touch swipe handlers for mobile carousel
  function handleTouchStart(e) {
    touchStart.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (touchStart.current === null) return
    const diff = touchStart.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 60) {
      if (diff > 0 && currentIndex < slamBooks.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      }
    }
    touchStart.current = null
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontWeight: 900, fontSize: 24, textTransform: 'uppercase', animation: 'pulse 1s infinite' }}>LOADING...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: 20 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease-out' }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, textTransform: 'uppercase' }}>📖 ABOUT ME</h1>
          <p style={{ color: '#555', fontSize: 14, fontStyle: 'italic' }}>
            {slamBooks.length} slam books filled — tap a card to flip it
          </p>
        </div>

        {slamBooks.length === 0 && (
          <div style={{
            background: C.surface, border: `3px solid ${C.border}`,
            boxShadow: `6px 6px 0 ${C.border}`, padding: 40, textAlign: 'center'
          }}>
            <p style={{ fontWeight: 800, fontSize: 20, textTransform: 'uppercase' }}>NO ONE'S FILLED THEIRS YET</p>
            <p style={{ color: '#555', marginTop: 8 }}>be the first one to log in!</p>
          </div>
        )}

        {/* Mobile: Carousel */}
        <div
          style={{ display: 'block' }}
          className="mobile-carousel"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Show on small screens */}
          <div style={{
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Desktop: Grid */}
            <style>{`
              .slam-grid { display: none; }
              .slam-carousel { display: block; }
              @media (min-width: 768px) {
                .slam-grid { display: grid !important; }
                .slam-carousel { display: none !important; }
              }
            `}</style>

            {/* Carousel (mobile) */}
            <div className="slam-carousel">
              {slamBooks.length > 0 && (
                <>
                  <div style={{
                    display: 'flex',
                    transition: 'transform 0.3s ease-out',
                    transform: `translateX(-${currentIndex * 100}%)`
                  }}>
                    {slamBooks.map((slam, i) => (
                      <div key={slam.rollNo} style={{ minWidth: '100%', padding: '0 10px' }}>
                        <FlipCard
                          slam={slam}
                          student={students[slam.rollNo]}
                          myRollNo={session?.rollNo}
                          colorIndex={i}
                          onReact={handleReact}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Carousel dots */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                    {slamBooks.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        style={{
                          width: currentIndex === i ? 28 : 10, height: 10,
                          background: currentIndex === i ? C.pink : '#ddd',
                          border: `2px solid ${C.border}`,
                          cursor: 'pointer', transition: 'all 0.2s', padding: 0
                        }}
                      />
                    ))}
                  </div>
                  <p style={{ textAlign: 'center', fontSize: 12, color: '#999', marginTop: 8 }}>
                    SWIPE LEFT / RIGHT — {currentIndex + 1} of {slamBooks.length}
                  </p>
                </>
              )}
            </div>

            {/* Grid (desktop) */}
            <div
              className="slam-grid"
              style={{
                display: 'none',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 24
              }}
            >
              {slamBooks.map((slam, i) => (
                <div key={slam.rollNo} style={{ animation: `fadeUp 0.4s ${i * 0.05}s ease-out both` }}>
                  <FlipCard
                    slam={slam}
                    student={students[slam.rollNo]}
                    myRollNo={session?.rollNo}
                    colorIndex={i}
                    onReact={handleReact}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <HomeButton navigate={navigate} />
    </div>
  )
}
