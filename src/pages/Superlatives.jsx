import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../utils/auth'
import { getSettings, getAllStudents, saveSuperlativeVote, getSuperlativeVotes, getUserSuperlativeVotes } from '../appwrite/db'

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

function PhotoBox({ student, size = 80 }) {
  return (
    <div style={{
      width: size, height: size, border: `3px solid ${C.border}`,
      boxShadow: `4px 4px 0 ${C.border}`,
      background: student?.photoURL ? 'transparent' : C.purple,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, fontSize: size * 0.4, overflow: 'hidden', flexShrink: 0
    }}>
      {student?.photoURL
        ? <img src={student.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        : student?.name?.charAt(0)?.toUpperCase() || '?'
      }
    </div>
  )
}

export default function Superlatives() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [polls, setPolls] = useState([])
  const [studentsMap, setStudentsMap] = useState({})
  const [myVotes, setMyVotes] = useState({})
  const [voteCounts, setVoteCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(null)

  useEffect(() => {
    const s = getSession()
    if (!s) { navigate('/login', { replace: true }); return }
    setSession(s)
    loadData(s.rollNo)
  }, [])

  async function loadData(rollNo) {
    const [settings, stuList, userVotes] = await Promise.all([
      getSettings(), getAllStudents(), getUserSuperlativeVotes(rollNo)
    ])
    const p = settings?.superlatives || []
    setPolls(p)
    const map = {}
    stuList.forEach(s => { map[s.id] = s })
    setStudentsMap(map)

    const vMap = {}
    userVotes.forEach(v => { vMap[v.poll] = v.winner })
    setMyVotes(vMap)

    // Load vote counts for polls where user has voted
    const counts = {}
    await Promise.all(p.map(async (poll, i) => {
      const pollId = `poll_${i}`
      if (vMap[pollId]) {
        const votes = await getSuperlativeVotes(pollId)
        let aCount = 0, bCount = 0
        votes.forEach(v => {
          if (v.winner === poll.optionA) aCount++
          else if (v.winner === poll.optionB) bCount++
        })
        counts[pollId] = { a: aCount, b: bCount, total: aCount + bCount }
      }
    }))
    setVoteCounts(counts)
    setLoading(false)
  }

  async function handleVote(pollIndex, winnerRollNo) {
    const pollId = `poll_${pollIndex}`
    if (myVotes[pollId]) return
    setVoting(pollId)
    try {
      await saveSuperlativeVote(pollId, session.rollNo, winnerRollNo)
      setMyVotes(prev => ({ ...prev, [pollId]: winnerRollNo }))

      // Fetch updated counts
      const votes = await getSuperlativeVotes(pollId)
      const poll = polls[pollIndex]
      let aCount = 0, bCount = 0
      votes.forEach(v => {
        if (v.winner === poll.optionA) aCount++
        else if (v.winner === poll.optionB) bCount++
      })
      setVoteCounts(prev => ({ ...prev, [pollId]: { a: aCount, b: bCount, total: aCount + bCount } }))
    } catch {
      alert('VOTE FAILED. PLEASE TRY AGAIN.')
    } finally {
      setVoting(null)
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
          <h1 style={{ fontSize: 32, fontWeight: 900, textTransform: 'uppercase' }}>⚡ THIS OR THAT</h1>
          <p style={{ color: '#555', fontSize: 14, fontStyle: 'italic' }}>pick one, no skipping</p>
        </div>

        {polls.length === 0 && (
          <div style={{
            background: C.surface, border: `3px solid ${C.border}`,
            boxShadow: `6px 6px 0 ${C.border}`, padding: 40, textAlign: 'center'
          }}>
            <p style={{ fontWeight: 800, fontSize: 20, textTransform: 'uppercase' }}>NO POLLS YET</p>
            <p style={{ color: '#555', marginTop: 8 }}>admin hasn't created any matchups</p>
          </div>
        )}

        {polls.map((poll, i) => {
          const pollId = `poll_${i}`
          const myPick = myVotes[pollId]
          const counts = voteCounts[pollId]
          const stuA = studentsMap[poll.optionA]
          const stuB = studentsMap[poll.optionB]
          const pctA = counts ? (counts.total > 0 ? Math.round((counts.a / counts.total) * 100) : 0) : 0
          const pctB = counts ? (counts.total > 0 ? Math.round((counts.b / counts.total) * 100) : 0) : 0

          return (
            <div key={i} style={{
              background: C.surface, border: `3px solid ${C.border}`,
              boxShadow: `6px 6px 0 ${C.border}`, padding: 24, marginBottom: 20,
              animation: `fadeUp 0.4s ${i * 0.08}s ease-out both`
            }}>
              {/* Question */}
              <p style={{
                fontSize: 14, fontWeight: 800, textTransform: 'uppercase',
                textAlign: 'center', marginBottom: 20, color: '#555'
              }}>
                {poll.question}
              </p>

              {/* VS layout */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                {/* Option A */}
                <div
                  onClick={() => !myPick && voting !== pollId && handleVote(i, poll.optionA)}
                  style={{
                    flex: 1, textAlign: 'center', cursor: myPick ? 'default' : 'pointer',
                    padding: 16, border: `3px solid ${myPick === poll.optionA ? C.green : 'transparent'}`,
                    background: myPick === poll.optionA ? '#f0fff4' : 'transparent',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { if (!myPick) e.currentTarget.style.background = C.pink + '40' }}
                  onMouseLeave={e => { if (!myPick) e.currentTarget.style.background = myPick === poll.optionA ? '#f0fff4' : 'transparent' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <PhotoBox student={stuA} />
                  </div>
                  <p style={{ fontWeight: 800, fontSize: 16, textTransform: 'uppercase' }}>
                    {stuA?.name || poll.optionA}
                  </p>
                  {myPick && counts && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ background: C.bg, border: `2px solid ${C.border}`, height: 24, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pctA}%`,
                          background: C.pink, transition: 'width 1s ease-out',
                          minWidth: pctA > 0 ? 20 : 0
                        }} />
                      </div>
                      <p style={{ fontWeight: 900, fontSize: 20, marginTop: 4 }}>{pctA}%</p>
                    </div>
                  )}
                </div>

                {/* VS */}
                <div style={{
                  fontWeight: 900, fontSize: 24, color: C.purple,
                  flexShrink: 0, textAlign: 'center'
                }}>
                  VS
                </div>

                {/* Option B */}
                <div
                  onClick={() => !myPick && voting !== pollId && handleVote(i, poll.optionB)}
                  style={{
                    flex: 1, textAlign: 'center', cursor: myPick ? 'default' : 'pointer',
                    padding: 16, border: `3px solid ${myPick === poll.optionB ? C.green : 'transparent'}`,
                    background: myPick === poll.optionB ? '#f0fff4' : 'transparent',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { if (!myPick) e.currentTarget.style.background = C.blue + '40' }}
                  onMouseLeave={e => { if (!myPick) e.currentTarget.style.background = myPick === poll.optionB ? '#f0fff4' : 'transparent' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <PhotoBox student={stuB} />
                  </div>
                  <p style={{ fontWeight: 800, fontSize: 16, textTransform: 'uppercase' }}>
                    {stuB?.name || poll.optionB}
                  </p>
                  {myPick && counts && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ background: C.bg, border: `2px solid ${C.border}`, height: 24, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pctB}%`,
                          background: C.blue, transition: 'width 1s ease-out',
                          minWidth: pctB > 0 ? 20 : 0
                        }} />
                      </div>
                      <p style={{ fontWeight: 900, fontSize: 20, marginTop: 4 }}>{pctB}%</p>
                    </div>
                  )}
                </div>
              </div>

              {myPick && (
                <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, fontWeight: 800, color: C.green, textTransform: 'uppercase' }}>
                  LOCKED IN ✓ {counts && `(${counts.total} votes)`}
                </p>
              )}

              {voting === pollId && (
                <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, fontWeight: 800, color: '#999', textTransform: 'uppercase', animation: 'pulse 1s infinite' }}>
                  LOCKING IN...
                </p>
              )}
            </div>
          )
        })}
      </div>
      <HomeButton navigate={navigate} />
    </div>
  )
}
