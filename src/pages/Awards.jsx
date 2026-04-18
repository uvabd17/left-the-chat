import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../utils/auth'
import { getSettings, getAllStudents, saveVote, getVotesForCategory, getUserVotes } from '../appwrite/db'

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

function Podium({ votes, studentsMap }) {
  const counts = {}
  votes.forEach(v => { counts[v.nominee] = (counts[v.nominee] || 0) + 1 })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)
  const max = sorted.length > 0 ? sorted[0][1] : 1

  const medals = ['🥇', '🥈', '🥉']
  const podiumColors = [C.yellow, '#E0E0E0', '#CD7F32']

  return (
    <div>
      {/* Top 3 Podium */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {top3.map(([rollNo, count], i) => {
          const stu = studentsMap[rollNo]
          return (
            <div key={rollNo} style={{
              background: podiumColors[i], border: `3px solid ${C.border}`,
              boxShadow: `6px 6px 0 ${C.border}`, padding: 20,
              textAlign: 'center', width: 140,
              animation: `fadeUp 0.5s ${i * 0.15}s ease-out both`
            }}>
              <span style={{ fontSize: 36 }}>{medals[i]}</span>
              <div style={{
                width: 72, height: 72, border: `3px solid ${C.border}`,
                background: stu?.photoURL ? 'transparent' : C.pink,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 28, overflow: 'hidden',
                margin: '8px auto'
              }}>
                {stu?.photoURL
                  ? <img src={stu.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : stu?.name?.charAt(0)?.toUpperCase() || '?'
                }
              </div>
              <p style={{ fontWeight: 900, fontSize: 14, textTransform: 'uppercase' }}>
                {stu?.name || rollNo}
              </p>
              <p style={{ fontWeight: 800, fontSize: 20 }}>{count} votes</p>
            </div>
          )
        })}
      </div>

      {/* Bar chart for the rest */}
      {rest.length > 0 && (
        <div style={{
          background: C.surface, border: `3px solid ${C.border}`,
          boxShadow: `4px 4px 0 ${C.border}`, padding: 16
        }}>
          {rest.map(([rollNo, count]) => (
            <div key={rollNo} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <p style={{ fontWeight: 700, fontSize: 12, width: 90, textAlign: 'right', flexShrink: 0 }}>
                {studentsMap[rollNo]?.name || rollNo}
              </p>
              <div style={{ flex: 1, background: C.bg, border: `2px solid ${C.border}`, height: 22 }}>
                <div style={{
                  height: '100%', width: `${(count / max) * 100}%`,
                  background: C.pink, transition: 'width 1s ease-out',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 6, fontWeight: 800, fontSize: 11, minWidth: 24
                }}>{count}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Awards() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [activeCategory, setActiveCategory] = useState(null)
  const [revealDate, setRevealDate] = useState(null)
  const [pastWinners, setPastWinners] = useState([])
  const [students, setStudents] = useState([])
  const [studentsMap, setStudentsMap] = useState({})
  const [myVote, setMyVote] = useState(null)
  const [allVotes, setAllVotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [tab, setTab] = useState('vote') // vote or halloffame

  const revealed = revealDate ? new Date(revealDate) <= new Date() : false

  useEffect(() => {
    const s = getSession()
    if (!s) { navigate('/login', { replace: true }); return }
    setSession(s)
    loadData(s.rollNo)
  }, [])

  async function loadData(rollNo) {
    const [settings, stuList, userVotes] = await Promise.all([
      getSettings(), getAllStudents(), getUserVotes(rollNo)
    ])

    const stuMap = {}
    stuList.forEach(s => { stuMap[s.id] = s })
    setStudents(stuList)
    setStudentsMap(stuMap)

    // Parse awards data
    const awardsData = settings?.awardsCategories
    if (typeof awardsData === 'object' && awardsData !== null && !Array.isArray(awardsData)) {
      setActiveCategory(awardsData.active || null)
      setPastWinners(awardsData.pastWinners || [])
    } else if (typeof awardsData === 'string') {
      setActiveCategory(awardsData)
      setPastWinners([])
    } else {
      setActiveCategory(null)
      setPastWinners([])
    }

    setRevealDate(settings?.awardsRevealDate || null)

    // Check if user already voted for active category
    if (awardsData?.active || (typeof awardsData === 'string' && awardsData)) {
      const catId = typeof awardsData === 'object' ? awardsData.active : awardsData
      if (catId) {
        const existing = userVotes.find(v => v.category === catId)
        setMyVote(existing?.nominee || null)

        // Load all votes if revealed
        if (settings?.awardsRevealDate && new Date(settings.awardsRevealDate) <= new Date()) {
          const votes = await getVotesForCategory(catId)
          setAllVotes(votes)
        }
      }
    }

    setLoading(false)
  }

  async function handleVote(nomineeRollNo) {
    if (myVote || voting) return
    setVoting(true)
    try {
      await saveVote(activeCategory, session.rollNo, nomineeRollNo)
      setMyVote(nomineeRollNo)
      setConfirmTarget(null)
    } catch {
      alert('VOTE FAILED. PLEASE TRY AGAIN.')
    } finally {
      setVoting(false)
    }
  }

  const filteredStudents = students.filter(s =>
    s.id !== session?.rollNo &&
    (s.name?.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()))
  )

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
          <h1 style={{ fontSize: 32, fontWeight: 900, textTransform: 'uppercase' }}>🏆 CLASS VOTES</h1>
          <p style={{ color: '#555', fontSize: 14, fontStyle: 'italic' }}>vote for the legends</p>
        </div>

        {/* Tabs */}
        {pastWinners.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button onClick={() => setTab('vote')} style={{
              flex: 1, background: tab === 'vote' ? C.yellow : C.surface,
              border: `3px solid ${C.border}`,
              boxShadow: tab === 'vote' ? `4px 4px 0 ${C.border}` : 'none',
              padding: '10px 16px', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase'
            }}>TODAY'S VOTE</button>
            <button onClick={() => setTab('halloffame')} style={{
              flex: 1, background: tab === 'halloffame' ? C.yellow : C.surface,
              border: `3px solid ${C.border}`,
              boxShadow: tab === 'halloffame' ? `4px 4px 0 ${C.border}` : 'none',
              padding: '10px 16px', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase'
            }}>HALL OF FAME</button>
          </div>
        )}

        {/* HALL OF FAME */}
        {tab === 'halloffame' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pastWinners.map((pw, i) => (
              <div key={i} style={{
                background: C.yellow, border: `3px solid ${C.border}`,
                boxShadow: `6px 6px 0 ${C.border}`, padding: 20,
                display: 'flex', alignItems: 'center', gap: 16,
                animation: `fadeUp 0.3s ${i * 0.05}s ease-out both`
              }}>
                <span style={{ fontSize: 32 }}>🏆</span>
                <div style={{
                  width: 56, height: 56, border: `3px solid ${C.border}`,
                  background: studentsMap[pw.winner]?.photoURL ? 'transparent' : C.pink,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 22, overflow: 'hidden', flexShrink: 0
                }}>
                  {studentsMap[pw.winner]?.photoURL
                    ? <img src={studentsMap[pw.winner].photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : studentsMap[pw.winner]?.name?.charAt(0)?.toUpperCase() || '?'
                  }
                </div>
                <div>
                  <p style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase' }}>{pw.category}</p>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{pw.name || studentsMap[pw.winner]?.name || pw.winner}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VOTING */}
        {tab === 'vote' && (
          <>
            {/* No active category */}
            {!activeCategory && (
              <div style={{
                background: C.surface, border: `3px solid ${C.border}`,
                boxShadow: `6px 6px 0 ${C.border}`, padding: 40, textAlign: 'center'
              }}>
                <p style={{ fontWeight: 800, fontSize: 20, textTransform: 'uppercase' }}>NO ACTIVE VOTE RIGHT NOW</p>
                <p style={{ color: '#555', marginTop: 8 }}>check back later — admin drops a new one daily</p>
              </div>
            )}

            {/* Active category */}
            {activeCategory && (
              <div style={{
                background: C.yellow, border: `3px solid ${C.border}`,
                boxShadow: `6px 6px 0 ${C.border}`, padding: 24,
                textAlign: 'center', marginBottom: 20
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#555' }}>TODAY'S CATEGORY</p>
                <h2 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', marginTop: 4 }}>{activeCategory}</h2>
              </div>
            )}

            {/* Already voted */}
            {activeCategory && myVote && !revealed && (
              <div style={{
                background: C.green, border: `3px solid ${C.border}`,
                boxShadow: `6px 6px 0 ${C.border}`, padding: 24,
                textAlign: 'center', marginBottom: 20
              }}>
                <p style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase' }}>YOU VOTED FOR</p>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                  <div style={{
                    width: 64, height: 64, border: `3px solid ${C.border}`,
                    background: studentsMap[myVote]?.photoURL ? 'transparent' : C.pink,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: 24, overflow: 'hidden'
                  }}>
                    {studentsMap[myVote]?.photoURL
                      ? <img src={studentsMap[myVote].photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : studentsMap[myVote]?.name?.charAt(0)?.toUpperCase()
                    }
                  </div>
                </div>
                <p style={{ fontWeight: 800, fontSize: 18, marginTop: 8 }}>{studentsMap[myVote]?.name || myVote}</p>
                <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', marginTop: 4 }}>
                  {revealDate ? `RESULTS DROP ON ${new Date(revealDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}` : 'RESULTS COMING SOON'}
                </p>
              </div>
            )}

            {/* Results revealed */}
            {activeCategory && revealed && allVotes.length > 0 && (
              <Podium votes={allVotes} studentsMap={studentsMap} />
            )}

            {/* Revealed but no votes */}
            {activeCategory && revealed && allVotes.length === 0 && myVote && (
              <div style={{
                background: C.surface, border: `3px solid ${C.border}`,
                boxShadow: `6px 6px 0 ${C.border}`, padding: 24,
                textAlign: 'center', marginBottom: 20
              }}>
                <p style={{ fontWeight: 800, fontSize: 16, textTransform: 'uppercase' }}>NO VOTES YET</p>
                <p style={{ color: '#555', marginTop: 4 }}>be the first to vote!</p>
              </div>
            )}

            {/* Voting grid — show if user hasn't voted yet */}
            {activeCategory && !myVote && (
              <>
                {/* Confirm modal */}
                {confirmTarget && (
                  <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                  }}>
                    <div style={{
                      background: C.surface, border: `3px solid ${C.border}`,
                      boxShadow: `8px 8px 0 ${C.border}`, padding: 32,
                      textAlign: 'center', maxWidth: 340, width: '100%',
                      animation: 'fadeUp 0.2s ease-out'
                    }}>
                      <div style={{
                        width: 80, height: 80, border: `3px solid ${C.border}`,
                        background: studentsMap[confirmTarget]?.photoURL ? 'transparent' : C.pink,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 32, overflow: 'hidden',
                        margin: '0 auto 12px'
                      }}>
                        {studentsMap[confirmTarget]?.photoURL
                          ? <img src={studentsMap[confirmTarget].photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          : studentsMap[confirmTarget]?.name?.charAt(0)?.toUpperCase()
                        }
                      </div>
                      <p style={{ fontWeight: 900, fontSize: 18, textTransform: 'uppercase' }}>
                        {studentsMap[confirmTarget]?.name}
                      </p>
                      <p style={{ fontSize: 14, color: '#555', margin: '8px 0 20px' }}>
                        vote for {studentsMap[confirmTarget]?.name?.split(' ')[0]} as <strong>{activeCategory}</strong>?
                      </p>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => setConfirmTarget(null)} style={{
                          flex: 1, background: C.surface, border: `3px solid ${C.border}`,
                          padding: '12px 16px', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase'
                        }}>NAH</button>
                        <button onClick={() => handleVote(confirmTarget)} style={{
                          flex: 1, background: C.green, border: `3px solid ${C.border}`,
                          boxShadow: `4px 4px 0 ${C.border}`,
                          padding: '12px 16px', fontWeight: 800, fontSize: 14, cursor: voting ? 'wait' : 'pointer',
                          fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase'
                        }}>{voting ? 'LOCKING...' : 'LOCK IT IN'}</button>
                      </div>
                    </div>
                  </div>
                )}

                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="search by name..."
                  style={{
                    background: C.surface, border: `2px solid ${C.border}`,
                    padding: '10px 14px', fontSize: 15, fontFamily: 'DM Sans, sans-serif',
                    width: '100%', color: '#000', marginBottom: 16
                  }}
                />

                {/* Photo grid — 4 columns */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 10
                }}>
                  {filteredStudents.map((s, i) => (
                    <div
                      key={s.id}
                      onClick={() => setConfirmTarget(s.id)}
                      style={{
                        background: C.surface, border: `2px solid ${C.border}`,
                        cursor: 'pointer', textAlign: 'center', padding: 8,
                        transition: 'all 0.1s',
                        animation: `fadeUp 0.3s ${i * 0.02}s ease-out both`
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.pink; e.currentTarget.style.border = `2px solid ${C.border}`; e.currentTarget.style.boxShadow = `3px 3px 0 ${C.border}`; e.currentTarget.style.transform = 'translate(-2px,-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translate(0,0)' }}
                    >
                      <div style={{
                        width: '100%', aspectRatio: '1', border: `2px solid ${C.border}`,
                        background: s.photoURL ? 'transparent' : C.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 24, overflow: 'hidden', marginBottom: 6
                      }}>
                        {s.photoURL
                          ? <img src={s.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          : s.name?.charAt(0)?.toUpperCase()
                        }
                      </div>
                      <p style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', lineHeight: 1.2 }}>
                        {s.name?.split(' ')[0]}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
      <HomeButton navigate={navigate} />
    </div>
  )
}
