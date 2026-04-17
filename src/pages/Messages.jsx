import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '../utils/auth'
import {
  getMessagesFor, getAllStudents, getStudent,
  sendMessage, markMessageRead, reportMessage
} from '../appwrite/db'
import { moderateMessage } from '../appwrite/moderation'

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

function BurnOverlay({ message, senderName, onDone, onFlag }) {
  const [burning, setBurning] = useState(false)
  const [flagged, setFlagged] = useState(false)

  function handleDone() {
    setBurning(true)
    setTimeout(() => onDone(), 800)
  }

  function handleFlag() {
    onFlag()
    setFlagged(true)
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        background: C.surface, border: `3px solid ${C.border}`,
        boxShadow: `8px 8px 0 ${C.border}`, padding: 32,
        maxWidth: 440, width: '100%',
        animation: burning ? 'scramble 0.8s ease-in forwards' : 'fadeUp 0.4s ease-out'
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 8 }}>
          FROM: {message.isAnonymous ? 'ANONYMOUS' : senderName}
        </p>
        <div style={{
          background: C.bg, border: `2px solid ${C.border}`,
          padding: 20, marginBottom: 20, fontSize: 18, fontWeight: 600,
          lineHeight: 1.5, minHeight: 80
        }}>
          {message.text}
        </div>

        {!burning && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleFlag}
              disabled={flagged}
              style={{
                flex: 1, background: flagged ? '#ddd' : C.orange,
                border: `3px solid ${C.border}`,
                boxShadow: `4px 4px 0 ${C.border}`,
                padding: '12px 16px', fontWeight: 800, fontSize: 14,
                cursor: flagged ? 'default' : 'pointer',
                fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase'
              }}
            >
              {flagged ? 'FLAGGED ✓' : 'FLAG THIS'}
            </button>
            <button
              onClick={handleDone}
              style={{
                flex: 1, background: C.red,
                border: `3px solid ${C.border}`,
                boxShadow: `4px 4px 0 ${C.border}`,
                padding: '12px 16px', fontWeight: 800, fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase',
                color: '#000'
              }}
              onMouseDown={e => { e.target.style.boxShadow = `1px 1px 0 ${C.border}`; e.target.style.transform = 'translate(3px,3px)' }}
              onMouseUp={e => { e.target.style.boxShadow = `4px 4px 0 ${C.border}`; e.target.style.transform = 'translate(0,0)' }}
              onMouseLeave={e => { e.target.style.boxShadow = `4px 4px 0 ${C.border}`; e.target.style.transform = 'translate(0,0)' }}
            >
              DONE 🔥
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Messages() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [students, setStudents] = useState([])
  const [studentsMap, setStudentsMap] = useState({})
  const [loading, setLoading] = useState(true)

  const [selectedRecipient, setSelectedRecipient] = useState(null)
  const [quizMode, setQuizMode] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState([])
  const [quizError, setQuizError] = useState('')
  const [composeMode, setComposeMode] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendSuccess, setSendSuccess] = useState('')
  const [sending, setSending] = useState(false)
  const [burningMsg, setBurningMsg] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const s = getSession()
    if (!s) { navigate('/login', { replace: true }); return }
    setSession(s)
    loadData(s.rollNo)
  }, [])

  async function loadData(rollNo) {
    const [msgs, stuList] = await Promise.all([getMessagesFor(rollNo), getAllStudents()])
    setMessages(msgs)
    setStudents(stuList)
    const map = {}
    stuList.forEach(s => { map[s.id] = s })
    setStudentsMap(map)
    setLoading(false)
  }

  function selectRecipient(stu) {
    if (stu.id === session.rollNo) return
    setSelectedRecipient(stu)
    setComposeMode(false)
    setSendError('')
    setSendSuccess('')
    setMsgText('')
    if (stu.questions && stu.questions.length > 0) {
      setQuizMode(true)
      setQuizAnswers(stu.questions.map(q => (typeof q === 'object' && Array.isArray(q.options)) ? -1 : ''))
      setQuizError('')
    } else {
      setQuizMode(false)
      setComposeMode(true)
    }
  }

  function handleQuizSubmit() {
    const allCorrect = selectedRecipient.questions.every((q, i) => {
      if (typeof q === 'object' && Array.isArray(q.options)) {
        return quizAnswers[i] === q.correct
      }
      const expected = (typeof q === 'object' ? q.answer : q).trim().toLowerCase()
      return (quizAnswers[i] || '').trim().toLowerCase() === expected
    })
    if (!allCorrect) {
      setQuizError("YOU DON'T KNOW THEM LIKE THAT")
      return
    }
    setQuizMode(false)
    setComposeMode(true)
    setQuizError('')
  }

  async function handleSend() {
    if (!msgText.trim()) return setSendError("TYPE SOMETHING")
    setSending(true)
    setSendError('')
    const mod = await moderateMessage(msgText.trim())
    if (mod.blocked) {
      setSending(false)
      return setSendError(mod.reason)
    }
    try {
      await sendMessage(session.rollNo, selectedRecipient.id, msgText.trim(), isAnonymous)
      setSending(false)
      setSendSuccess('SENT 💀')
      setMsgText('')
      setTimeout(() => {
        setSendSuccess('')
        setComposeMode(false)
        setSelectedRecipient(null)
      }, 1500)
    } catch {
      setSending(false)
      setSendError('SOMETHING BROKE. TRY AGAIN.')
    }
  }

  async function handleBurn(msg) {
    await markMessageRead(msg.id)
    setBurningMsg(null)
    setMessages(prev => prev.filter(m => m.id !== msg.id))
  }

  async function handleFlag(msg) {
    await reportMessage(msg.id)
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
      {burningMsg && (
        <BurnOverlay
          message={burningMsg}
          senderName={studentsMap[burningMsg.from]?.name || burningMsg.from}
          onDone={() => handleBurn(burningMsg)}
          onFlag={() => handleFlag(burningMsg)}
        />
      )}

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ marginBottom: 24, animation: 'fadeUp 0.3s ease-out' }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, textTransform: 'uppercase' }}>🔥 SECRET MSGS</h1>
          <p style={{ color: '#555', fontSize: 14, fontStyle: 'italic' }}>send it. they read it. poof.</p>
        </div>

        {/* INBOX */}
        <div style={{
          background: C.surface, border: `3px solid ${C.border}`,
          boxShadow: `6px 6px 0 ${C.border}`, padding: 24, marginBottom: 24
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', marginBottom: 16 }}>
            INBOX {messages.length > 0 && (
              <span style={{
                background: C.red, border: `2px solid ${C.border}`,
                padding: '2px 10px', fontSize: 14, marginLeft: 8
              }}>{messages.length}</span>
            )}
          </h2>

          {messages.length === 0 ? (
            <p style={{ color: '#999', fontWeight: 600, textTransform: 'uppercase', fontSize: 14 }}>
              NO ONE'S SAID ANYTHING... YET
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map(msg => (
                <div key={msg.id} style={{
                  background: C.bg, border: `2px solid ${C.border}`,
                  padding: 16, display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 12
                }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>
                      {msg.isAnonymous ? '🫣 ANONYMOUS' : `FROM: ${studentsMap[msg.from]?.name || msg.from}`}
                    </p>
                    <p style={{ fontSize: 12, color: '#999' }}>
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'just now'}
                    </p>
                  </div>
                  <button
                    onClick={() => setBurningMsg(msg)}
                    style={{
                      background: C.red, border: `3px solid ${C.border}`,
                      boxShadow: `3px 3px 0 ${C.border}`, padding: '8px 16px',
                      fontWeight: 800, fontSize: 12, cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseDown={e => { e.target.style.boxShadow = '1px 1px 0 #000'; e.target.style.transform = 'translate(2px,2px)' }}
                    onMouseUp={e => { e.target.style.boxShadow = '3px 3px 0 #000'; e.target.style.transform = 'translate(0,0)' }}
                    onMouseLeave={e => { e.target.style.boxShadow = '3px 3px 0 #000'; e.target.style.transform = 'translate(0,0)' }}
                  >
                    READ & BURN
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEND */}
        <div style={{
          background: C.surface, border: `3px solid ${C.border}`,
          boxShadow: `6px 6px 0 ${C.border}`, padding: 24
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', marginBottom: 16 }}>
            SEND A MESSAGE
          </h2>

          {!selectedRecipient && (
            <>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="search by name or roll no..."
                style={{
                  background: C.bg, border: `2px solid ${C.border}`,
                  padding: '10px 14px', fontSize: 15, fontFamily: 'DM Sans, sans-serif',
                  width: '100%', color: '#000', marginBottom: 12
                }}
              />
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {filteredStudents.map(s => (
                  <div
                    key={s.id}
                    onClick={() => selectRecipient(s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', cursor: 'pointer',
                      border: '2px solid transparent', transition: 'all 0.1s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.border = `2px solid ${C.border}` }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.border = '2px solid transparent' }}
                  >
                    <div style={{
                      width: 36, height: 36, border: `2px solid ${C.border}`,
                      background: s.photoURL ? 'transparent' : C.pink,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: 16, overflow: 'hidden', flexShrink: 0
                    }}>
                      {s.photoURL
                        ? <img src={s.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        : s.name?.charAt(0)?.toUpperCase()
                      }
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</p>
                      <p style={{ fontSize: 12, color: '#999' }}>{s.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {selectedRecipient && quizMode && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <button onClick={() => { setSelectedRecipient(null); setQuizMode(false) }} style={{
                  background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', fontWeight: 900
                }}>←</button>
                <p style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase' }}>
                  SENDING TO {selectedRecipient.name}
                </p>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#555' }}>
                answer their questions to unlock:
              </p>
              {selectedRecipient.questions.map((q, i) => {
                const isMCQ = typeof q === 'object' && Array.isArray(q.options)
                return (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                      {typeof q === 'object' ? q.question : q}
                    </label>
                    {isMCQ ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {q.options.map((opt, j) => (
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
                              boxShadow: quizAnswers[i] === j ? `3px 3px 0 ${C.border}` : 'none'
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <input
                        value={quizAnswers[i] || ''}
                        onChange={e => { const na = [...quizAnswers]; na[i] = e.target.value; setQuizAnswers(na) }}
                        style={{
                          background: C.bg, border: `2px solid ${C.border}`,
                          padding: '10px 14px', fontSize: 15, fontFamily: 'DM Sans, sans-serif',
                          width: '100%', color: '#000'
                        }}
                      />
                    )}
                  </div>
                )
              })}
              {quizError && (
                <p style={{
                  background: C.red, border: `2px solid ${C.border}`,
                  padding: '8px 14px', fontWeight: 800, fontSize: 13,
                  textTransform: 'uppercase', marginBottom: 12
                }}>{quizError}</p>
              )}
              <button onClick={handleQuizSubmit} style={{
                background: C.green, border: `3px solid ${C.border}`,
                boxShadow: `4px 4px 0 ${C.border}`, padding: '12px 24px',
                fontWeight: 800, fontSize: 14, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', width: '100%'
              }}>UNLOCK</button>
            </div>
          )}

          {selectedRecipient && composeMode && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <button onClick={() => { setSelectedRecipient(null); setComposeMode(false) }} style={{
                  background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', fontWeight: 900
                }}>←</button>
                <p style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase' }}>
                  TO: {selectedRecipient.name}
                </p>
              </div>

              {sendSuccess ? (
                <div style={{
                  background: C.green, border: `3px solid ${C.border}`,
                  padding: 20, textAlign: 'center',
                  fontWeight: 900, fontSize: 24, textTransform: 'uppercase',
                  animation: 'popIn 0.3s ease-out'
                }}>{sendSuccess}</div>
              ) : (
                <>
                  <textarea
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    placeholder="type your message..."
                    rows={4}
                    style={{
                      background: C.bg, border: `2px solid ${C.border}`,
                      padding: '12px 14px', fontSize: 16, fontFamily: 'DM Sans, sans-serif',
                      width: '100%', color: '#000', resize: 'vertical', minHeight: 100
                    }}
                  />
                  <div
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginTop: 12, cursor: 'pointer', padding: '8px 0'
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, border: `2px solid ${C.border}`,
                      background: isAnonymous ? C.purple : C.surface,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 900, fontSize: 14
                    }}>
                      {isAnonymous && '✓'}
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>
                      SEND ANONYMOUSLY
                    </span>
                  </div>
                  {sendError && (
                    <p style={{
                      background: C.red, border: `2px solid ${C.border}`,
                      padding: '8px 14px', fontWeight: 800, fontSize: 13,
                      textTransform: 'uppercase', marginTop: 12
                    }}>{sendError}</p>
                  )}
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    style={{
                      background: C.pink, border: `3px solid ${C.border}`,
                      boxShadow: `4px 4px 0 ${C.border}`, padding: '12px 24px',
                      fontWeight: 800, fontSize: 16, cursor: sending ? 'wait' : 'pointer',
                      fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase',
                      width: '100%', marginTop: 16, opacity: sending ? 0.7 : 1
                    }}
                    onMouseDown={e => { e.target.style.boxShadow = '1px 1px 0 #000'; e.target.style.transform = 'translate(3px,3px)' }}
                    onMouseUp={e => { e.target.style.boxShadow = '4px 4px 0 #000'; e.target.style.transform = 'translate(0,0)' }}
                    onMouseLeave={e => { e.target.style.boxShadow = '4px 4px 0 #000'; e.target.style.transform = 'translate(0,0)' }}
                  >
                    {sending ? 'SENDING...' : 'DROP IT 💀'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <HomeButton navigate={navigate} />
    </div>
  )
}
