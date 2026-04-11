import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudent, getSettings, recordFailedAttempt, resetAttempts, saveSlamBook } from '../appwrite/db'
import { getSession, saveSession } from '../utils/auth'

const C = {
  bg: '#FFF5E1', surface: '#FFFFFF', border: '#000000',
  pink: '#FF90E8', yellow: '#FFD700', red: '#FF6B6B',
  purple: '#B18CFF', blue: '#59B8FF', orange: '#FFA64D', green: '#23C45E'
}

// This one is always appended — it shows on the slam card front
const FIXED_SLAM_Q = "In one word, what would your friends call you?"

const DEFAULT_SLAM_QUESTIONS = [
  "Most embarrassing college memory?",
  "One thing nobody knows about you?",
  "Your honest opinion of this class?",
  "What are you doing in 10 years?",
  "One word for college life?"
]

const STEP_COLORS = [C.pink, C.yellow, C.purple]
const STEP_TITLES = [
  "WHAT'S YOUR ROLL NUMBER?",
  "PROVE YOU'RE ONE OF US 🧠",
  "LAST THING — TELL US ABOUT YOU ✍️"
]

function Confetti() {
  const colors = [C.pink, C.yellow, C.blue, C.purple, C.orange, C.green, C.red]
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.5,
    size: 8 + Math.random() * 12,
    rotation: Math.random() * 360
  }))

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: '40%', left: `${p.left}%`,
          width: p.size, height: p.size, background: p.color,
          border: `2px solid ${C.border}`,
          transform: `rotate(${p.rotation}deg)`,
          animation: `confettiUp 1.5s ${p.delay}s ease-out forwards`,
          opacity: 0
        }} />
      ))}
      <style>{`
        @keyframes confettiUp {
          0% { opacity: 1; transform: translateY(0) rotate(0deg) scale(1); }
          100% { opacity: 0; transform: translateY(-400px) rotate(720deg) scale(0.3); }
        }
      `}</style>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [animDir, setAnimDir] = useState('in')

  // Step 0 state
  const [rollNo, setRollNo] = useState('')
  const [student, setStudent] = useState(null)

  // Step 1 state — class quiz
  const [classQuestions, setClassQuestions] = useState([])
  const [quizAnswers, setQuizAnswers] = useState([])

  // Step 2 state — slam book
  const [slamQuestions, setSlamQuestions] = useState([])
  const [slamAnswers, setSlamAnswers] = useState([])

  // Shared state
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lockTimer, setLockTimer] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const timerRef = useRef(null)

  useEffect(() => {
    const session = getSession()
    if (session) navigate('/dashboard', { replace: true })
  }, [])

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  function shakeError(msg) {
    setError(msg)
    setShaking(true)
    setTimeout(() => setShaking(false), 500)
  }

  function goNext() {
    setAnimDir('in')
    setError('')
    setStep(s => s + 1)
  }

  function startLockTimer(lockedUntil) {
    const end = lockedUntil.toDate ? lockedUntil.toDate().getTime() : new Date(lockedUntil).getTime()
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

  // STEP 0 — Roll Number
  async function handleRollSubmit() {
    if (!rollNo.trim()) return shakeError("TYPE SOMETHING")
    setLoading(true)
    setError('')
    try {
      const s = await getStudent(rollNo.trim().toUpperCase())
      if (!s) { setLoading(false); return shakeError("WHO ARE YOU?") }
      if (s.banned) { setLoading(false); return shakeError("YOU'VE BEEN KICKED OUT") }
      if (s.lockedUntil) {
        const lockEnd = s.lockedUntil.toDate ? s.lockedUntil.toDate() : new Date(s.lockedUntil)
        if (lockEnd > new Date()) {
          startLockTimer(s.lockedUntil)
          setLoading(false)
          return shakeError("CHILL. COME BACK LATER.")
        }
      }
      setStudent(s)
      const settings = await getSettings()
      if (settings?.classQuestions && settings.classQuestions.length > 0) {
        setClassQuestions(settings.classQuestions)
        setQuizAnswers(settings.classQuestions.map(() => -1))
      }
      // Build slam questions: admin-defined or defaults + fixed title question
      const customQs = settings?.slamQuestions?.length > 0 ? settings.slamQuestions : DEFAULT_SLAM_QUESTIONS
      const allSlamQs = [...customQs, FIXED_SLAM_Q]
      setSlamQuestions(allSlamQs)
      setSlamAnswers(allSlamQs.map(() => ''))
      setLoading(false)
      goNext()
    } catch {
      setLoading(false)
      shakeError("SOMETHING BROKE. TRY AGAIN.")
    }
  }

  // STEP 1 — Class Quiz (MCQ)
  async function handleQuizSubmit() {
    const allFilled = quizAnswers.every(a => a >= 0)
    if (!allFilled) return shakeError("PICK AN ANSWER FOR EACH")
    setLoading(true)
    const allCorrect = classQuestions.every((q, i) => {
      const correct = typeof q === 'object' && Array.isArray(q.options) ? q.correct : -1
      return quizAnswers[i] === correct
    })
    if (!allCorrect) {
      const attempts = await recordFailedAttempt(rollNo.trim().toUpperCase())
      setLoading(false)
      if (attempts >= 5) {
        const s = await getStudent(rollNo.trim().toUpperCase())
        if (s?.lockedUntil) startLockTimer(s.lockedUntil)
        return shakeError("TOO MANY TRIES. LOCKED OUT.")
      }
      return shakeError(`NOT EVEN CLOSE. ${5 - (attempts || 0)} TRIES LEFT.`)
    }
    setLoading(false)
    if (student.slamBookFilled) {
      await handleLoginSuccess()
    } else {
      goNext()
    }
  }

  // STEP 2 — Slam Book
  async function handleSlamSubmit() {
    const allFilled = slamAnswers.every(a => a.trim())
    if (!allFilled) return shakeError("FILL ALL OF THEM. NO SKIPPING.")
    setLoading(true)
    try {
      const answersObj = {}
      slamQuestions.forEach((q, i) => { answersObj[q] = slamAnswers[i].trim() })
      await saveSlamBook(rollNo.trim().toUpperCase(), answersObj)
      await handleLoginSuccess()
    } catch {
      setLoading(false)
      shakeError("SOMETHING BROKE. TRY AGAIN.")
    }
  }

  async function handleLoginSuccess() {
    await resetAttempts(rollNo.trim().toUpperCase())
    saveSession(rollNo.trim().toUpperCase(), student.name)
    setShowConfetti(true)
    setLoading(false)
    setTimeout(() => navigate('/dashboard', { replace: true }), 1200)
  }

  const totalSteps = student?.slamBookFilled ? 2 : 3

  const cardStyle = {
    background: C.surface,
    border: `3px solid ${C.border}`,
    boxShadow: `8px 8px 0 ${C.border}`,
    padding: 32,
    maxWidth: 440,
    width: '100%',
    animation: animDir === 'in' ? 'slideInRight 0.3s ease-out' : undefined
  }

  const inputStyle = {
    background: C.surface,
    border: `2px solid ${C.border}`,
    padding: '12px 16px',
    fontSize: 16,
    fontFamily: 'DM Sans, sans-serif',
    width: '100%',
    color: '#000'
  }

  const btnStyle = (color) => ({
    background: color,
    border: `3px solid ${C.border}`,
    boxShadow: `4px 4px 0 ${C.border}`,
    padding: '12px 28px',
    fontWeight: 800,
    fontSize: 16,
    cursor: loading ? 'wait' : 'pointer',
    fontFamily: 'DM Sans, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#000',
    transition: 'all 0.1s',
    opacity: loading ? 0.7 : 1,
    width: '100%',
    marginTop: 16
  })

  function handleBtnHover(e, down) {
    if (loading) return
    if (down) {
      e.target.style.boxShadow = `1px 1px 0 ${C.border}`
      e.target.style.transform = 'translate(3px, 3px)'
    } else {
      e.target.style.boxShadow = `4px 4px 0 ${C.border}`
      e.target.style.transform = 'translate(0, 0)'
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      {showConfetti && <Confetti />}

      {/* App title */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>
          LEFT THE CHAT
        </h1>
        <p style={{ color: '#555', fontSize: 14, marginTop: 4 }}>the last things you say before you leave</p>
      </div>

      {/* Lock screen */}
      {lockTimer && (
        <div style={{
          ...cardStyle,
          background: C.yellow,
          textAlign: 'center',
          marginBottom: 20
        }}>
          <p style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>LOCKED OUT</p>
          <p style={{ fontSize: 48, fontWeight: 900, fontFamily: 'monospace', letterSpacing: 4 }}>{lockTimer}</p>
          <p style={{ fontSize: 13, marginTop: 8, color: '#555' }}>come back when the timer hits zero</p>
        </div>
      )}

      {/* Step card */}
      {!lockTimer && (
        <div style={cardStyle}>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: step === i ? 32 : 12, height: 12,
                background: i <= step ? STEP_COLORS[i] : '#ddd',
                border: `2px solid ${C.border}`,
                transition: 'all 0.3s',
                display: (i === 2 && student?.slamBookFilled) ? 'none' : 'block'
              }} />
            ))}
          </div>

          <p style={{ fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 4 }}>
            STEP {step + 1} OF {totalSteps}
          </p>
          <h2 style={{
            fontSize: 22, fontWeight: 900, textTransform: 'uppercase',
            marginBottom: 20, lineHeight: 1.2,
            animation: shaking ? 'shake 0.4s ease-out' : undefined
          }}>
            {STEP_TITLES[step]}
          </h2>

          {/* Error */}
          {error && !lockTimer && (
            <div style={{
              background: C.red, border: `3px solid ${C.border}`,
              padding: '10px 16px', marginBottom: 16,
              fontWeight: 800, fontSize: 14, textTransform: 'uppercase',
              animation: 'shake 0.4s ease-out'
            }}>
              {error}
            </div>
          )}

          {/* STEP 0 — Roll Number */}
          {step === 0 && (
            <div>
              <input
                value={rollNo}
                onChange={e => setRollNo(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleRollSubmit()}
                placeholder="e.g. 22R01A7301"
                style={{ ...inputStyle, fontWeight: 700, fontSize: 18, letterSpacing: 1 }}
                autoFocus
              />
              <button
                onClick={handleRollSubmit}
                onMouseDown={e => handleBtnHover(e, true)}
                onMouseUp={e => handleBtnHover(e, false)}
                onMouseLeave={e => handleBtnHover(e, false)}
                style={btnStyle(C.pink)}
                disabled={loading}
              >
                {loading ? 'CHECKING...' : 'LET ME IN →'}
              </button>
            </div>
          )}

          {/* STEP 1 — Class Quiz (MCQ) */}
          {step === 1 && (
            <div>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>hey {student?.name?.split(' ')[0]}! answer these to get in.</p>
              {classQuestions.map((q, i) => {
                const qObj = typeof q === 'object' ? q : { question: q, options: [], correct: -1 }
                return (
                  <div key={i} style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 14, fontWeight: 700, display: 'block', marginBottom: 8 }}>
                      {qObj.question || q}
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(qObj.options || []).map((opt, j) => (
                        <div
                          key={j}
                          onClick={() => { const na = [...quizAnswers]; na[i] = j; setQuizAnswers(na) }}
                          style={{
                            padding: '10px 14px',
                            border: `2px solid ${quizAnswers[i] === j ? C.yellow : C.border}`,
                            background: quizAnswers[i] === j ? C.yellow : C.surface,
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 14,
                            fontFamily: 'DM Sans, sans-serif',
                            transition: 'all 0.1s',
                            boxShadow: quizAnswers[i] === j ? `3px 3px 0 ${C.border}` : 'none'
                          }}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              <button
                onClick={handleQuizSubmit}
                onMouseDown={e => handleBtnHover(e, true)}
                onMouseUp={e => handleBtnHover(e, false)}
                onMouseLeave={e => handleBtnHover(e, false)}
                style={btnStyle(C.yellow)}
                disabled={loading}
              >
                {loading ? 'CHECKING...' : 'I KNOW MY CLASS →'}
              </button>
            </div>
          )}

          {/* STEP 2 — SLAM BOOK */}
          {step === 2 && (
            <div>
              {slamQuestions.map((q, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                    {q}
                  </label>
                  {i === slamQuestions.length - 1 ? (
                    <input
                      value={slamAnswers[i]}
                      onChange={e => { const na = [...slamAnswers]; na[i] = e.target.value; setSlamAnswers(na) }}
                      placeholder="one word only"
                      maxLength={30}
                      style={{ ...inputStyle, fontWeight: 700 }}
                    />
                  ) : (
                    <textarea
                      value={slamAnswers[i]}
                      onChange={e => { const na = [...slamAnswers]; na[i] = e.target.value; setSlamAnswers(na) }}
                      placeholder="spill..."
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }}
                    />
                  )}
                </div>
              ))}
              <button
                onClick={handleSlamSubmit}
                onMouseDown={e => handleBtnHover(e, true)}
                onMouseUp={e => handleBtnHover(e, false)}
                onMouseLeave={e => handleBtnHover(e, false)}
                style={btnStyle(C.purple)}
                disabled={loading}
              >
                {loading ? 'SEALING...' : 'SEAL IT FOREVER →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <p style={{ marginTop: 24, fontSize: 12, color: '#999' }}>class of '26 — you had to be there</p>
    </div>
  )
}
