import { useState, useEffect } from 'react'
import {
  getAllStudents, addStudent, updateStudent, deleteStudent,
  getSettings, updateSettings, getAdminPassword, setAdminPassword,
  getReportedMessages, getAllMessagesMeta, markMessageRead,
  getAllUnsent, deleteUnsent, uploadPhoto, resetAllTestData,
  getVotesForCategory
} from '../appwrite/db'

const C = {
  bg: '#FFF5E1', surface: '#FFFFFF', border: '#000000',
  pink: '#FF90E8', yellow: '#FFD700', red: '#FF6B6B',
  purple: '#B18CFF', blue: '#59B8FF', orange: '#FFA64D', green: '#23C45E'
}

const card = {
  background: C.surface, border: `3px solid ${C.border}`,
  boxShadow: `6px 6px 0 ${C.border}`, padding: 24
}

const btn = (color = C.pink) => ({
  background: color, border: `3px solid ${C.border}`,
  boxShadow: `4px 4px 0 ${C.border}`, padding: '10px 20px',
  fontWeight: 800, fontSize: 14, cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase',
  letterSpacing: 1, color: '#000', transition: 'all 0.1s'
})

const input = {
  background: C.surface, border: `2px solid ${C.border}`,
  padding: '10px 14px', fontSize: 15, fontFamily: 'DM Sans, sans-serif',
  width: '100%', color: '#000'
}

const tab = (active) => ({
  ...btn(active ? C.yellow : C.surface),
  boxShadow: active ? `4px 4px 0 ${C.border}` : 'none',
  flex: 1, textAlign: 'center'
})

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState('students')
  const [students, setStudents] = useState([])
  const [settings, setSettingsState] = useState(null)
  const [reported, setReported] = useState([])
  const [unsent, setUnsent] = useState([])
  const [loading, setLoading] = useState(false)

  // Student form
  const [newStudent, setNewStudent] = useState({ rollNo: '', name: '', code: '' })
  const [editingStudent, setEditingStudent] = useState(null)
  const [studentQuestions, setStudentQuestions] = useState([{ question: '', answer: '' }])
  const [newStudentPhoto, setNewStudentPhoto] = useState(null)
  const [newStudentPhotoPreview, setNewStudentPhotoPreview] = useState(null)

  // Search, filter, sort
  const [studentSearch, setStudentSearch] = useState('')
  const [studentFilter, setStudentFilter] = useState('all') // all, banned, locked, slamDone, slamPending
  const [studentSort, setStudentSort] = useState('rollNo') // rollNo, name, attempts

  // Settings form
  const [classQuestions, setClassQuestions] = useState([])
  const [activeAward, setActiveAward] = useState('')
  const [awardsRevealDate, setAwardsRevealDate] = useState('')
  const [pastWinners, setPastWinners] = useState([])
  const [superlatives, setSuperlatives] = useState([])
  const [slamQuestions, setSlamQuestions] = useState([])
  const [newAdminPw, setNewAdminPw] = useState('')
  const [testMode, setTestMode] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function handleLogin() {
    try {
      const adminPw = await getAdminPassword()
      if (pw.trim() === adminPw) {
        setAuthed(true)
        setPwError('')
        setLoadError('')
        loadData()
      } else {
        setPwError('WRONG PASSWORD')
      }
    } catch {
      setPwError('LOGIN FAILED')
    }
  }

  async function loadData() {
    setLoading(true)
    setLoadError('')
    const [s, set, r, u] = await Promise.allSettled([
      getAllStudents(), getSettings(), getReportedMessages(), getAllUnsent()
    ])

    const studentsValue = s.status === 'fulfilled' ? s.value : []
    const settingsValue = set.status === 'fulfilled' ? set.value : null
    const reportedValue = r.status === 'fulfilled' ? r.value : []
    const unsentValue = u.status === 'fulfilled' ? u.value : []

    setStudents(studentsValue)
    setSettingsState(settingsValue)
    if (settingsValue) {
      setClassQuestions(settingsValue.classQuestions || [])
      const aw = settingsValue.awardsCategories
      if (typeof aw === 'object' && aw !== null && !Array.isArray(aw)) {
        setActiveAward(aw.active || '')
        setPastWinners(aw.pastWinners || [])
      } else {
        setActiveAward('')
        setPastWinners([])
      }
      setAwardsRevealDate(settingsValue.awardsRevealDate || '')
      setSuperlatives(settingsValue.superlatives || [])
      setSlamQuestions(settingsValue.slamQuestions || [])
    } else {
      setClassQuestions([])
      setActiveAward('')
      setPastWinners([])
      setAwardsRevealDate('')
      setSuperlatives([])
      setSlamQuestions([])
    }

    setReported(reportedValue)
    setUnsent(unsentValue)

    if ([s, set, r, u].some(result => result.status === 'rejected')) {
      setLoadError('SOME ADMIN DATA FAILED TO LOAD')
    }

    setLoading(false)
  }

  function handlePhotoSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setNewStudentPhoto(file)
    const reader = new FileReader()
    reader.onload = (ev) => setNewStudentPhotoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleAddStudent() {
    if (!newStudent.rollNo || !newStudent.name) return
    await addStudent(newStudent.rollNo, {
      name: newStudent.name,
      code: newStudent.code,
      questions: studentQuestions.filter(q => q.question?.trim() && q.answer?.trim()),
      banned: false,
      attempts: 0,
      lockedUntil: null,
      slamBookFilled: false,
      photoURL: null
    })
    if (newStudentPhoto) {
      await uploadPhoto(newStudent.rollNo, newStudentPhoto)
    }
    setNewStudent({ rollNo: '', name: '', code: '' })
    setStudentQuestions([{ question: '', answer: '' }])
    setNewStudentPhoto(null)
    setNewStudentPhotoPreview(null)
    loadData()
  }

  async function handlePhotoUpload(rollNo, file) {
    await uploadPhoto(rollNo, file)
    loadData()
  }

  async function handleBan(rollNo, banned) {
    await updateStudent(rollNo, { banned: !banned })
    loadData()
  }

  async function handleResetLockout(rollNo) {
    await updateStudent(rollNo, { attempts: 0, lockedUntil: null })
    loadData()
  }

  async function handleSaveSettings() {
    await updateSettings('class', {
      classQuestions,
      awardsCategories: { active: activeAward, pastWinners },
      awardsRevealDate,
      superlatives,
      slamQuestions
    })
    if (newAdminPw.trim()) {
      await setAdminPassword(newAdminPw.trim())
      setNewAdminPw('')
    }
    loadData()
  }

  async function handleDeleteReported(id) {
    await markMessageRead(id)
    loadData()
  }

  async function handleBanSender(rollNo) {
    await updateStudent(rollNo, { banned: true })
    loadData()
  }

  async function handleDeleteUnsent(id) {
    await deleteUnsent(id)
    loadData()
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ ...card, maxWidth: 400, width: '100%' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>ADMIN</h1>
          <p style={{ color: '#555', marginBottom: 20, fontSize: 14 }}>enter password to continue</p>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="password"
            style={{ ...input, marginBottom: 16 }}
          />
          {pwError && <p style={{ color: C.red, fontWeight: 700, marginBottom: 12, fontSize: 14 }}>{pwError}</p>}
          <button onClick={handleLogin} style={btn(C.yellow)}>GET IN</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: 20 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, textTransform: 'uppercase', marginBottom: 24 }}>
          ADMIN PANEL
        </h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {['students', 'settings', 'reported', 'just say it'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={tab(activeTab === t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {loading && <p style={{ fontWeight: 700 }}>LOADING...</p>}
        {loadError && !loading && (
          <div style={{ ...card, marginBottom: 24, background: C.red }}>
            <p style={{ fontWeight: 800, textTransform: 'uppercase' }}>{loadError}</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>refresh the page after checking Appwrite permissions and indexes</p>
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && !loading && (() => {
          // Filter
          let filtered = students.filter(s => {
            if (studentSearch) {
              const q = studentSearch.toLowerCase()
              if (!s.name?.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) return false
            }
            if (studentFilter === 'banned') return s.banned
            if (studentFilter === 'locked') return s.lockedUntil && new Date(s.lockedUntil) > new Date()
            if (studentFilter === 'slamDone') return s.slamBookFilled
            if (studentFilter === 'slamPending') return !s.slamBookFilled
            return true
          })
          // Sort
          filtered.sort((a, b) => {
            if (studentSort === 'name') return (a.name || '').localeCompare(b.name || '')
            if (studentSort === 'attempts') return (b.attempts || 0) - (a.attempts || 0)
            return a.id.localeCompare(b.id)
          })

          return (
          <div>
            {/* Add student form */}
            <div style={{ ...card, marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', marginBottom: 16 }}>ADD STUDENT</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <input placeholder="Roll No" value={newStudent.rollNo} onChange={e => setNewStudent({ ...newStudent, rollNo: e.target.value.toUpperCase() })} style={{ ...input, flex: 1, minWidth: 120 }} />
                <input placeholder="Name" value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} style={{ ...input, flex: 2, minWidth: 150 }} />
              </div>
              {/* Photo picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 80, height: 80, border: `2px solid ${C.border}`,
                  background: newStudentPhotoPreview ? 'transparent' : C.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 14, overflow: 'hidden', flexShrink: 0,
                  color: '#999'
                }}>
                  {newStudentPhotoPreview
                    ? <img src={newStudentPhotoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : 'NO PIC'
                  }
                </div>
                <div>
                  <label style={{ ...btn(C.blue), fontSize: 12, padding: '8px 16px', display: 'inline-block', cursor: 'pointer' }}>
                    {newStudentPhoto ? 'CHANGE PHOTO' : 'ADD PHOTO'}
                    <input type="file" accept="image/*" hidden onChange={handlePhotoSelect} />
                  </label>
                  {newStudentPhoto && (
                    <button onClick={() => { setNewStudentPhoto(null); setNewStudentPhotoPreview(null) }} style={{ background: 'transparent', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: C.red, marginLeft: 8, fontFamily: 'DM Sans, sans-serif' }}>REMOVE</button>
                  )}
                  <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>optional — square photo works best</p>
                </div>
              </div>

              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Personal questions (for message unlocking):</p>
              {studentQuestions.map((q, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input placeholder="Question" value={typeof q === 'object' ? q.question || '' : q} onChange={e => { const nq = [...studentQuestions]; nq[i] = { question: e.target.value, answer: typeof q === 'object' ? q.answer || '' : '' }; setStudentQuestions(nq) }} style={{ ...input, flex: 2 }} />
                  <input placeholder="Answer" value={typeof q === 'object' ? q.answer || '' : ''} onChange={e => { const nq = [...studentQuestions]; nq[i] = { question: typeof q === 'object' ? q.question || '' : q, answer: e.target.value }; setStudentQuestions(nq) }} style={{ ...input, flex: 1 }} />
                  <button onClick={() => setStudentQuestions(studentQuestions.filter((_, j) => j !== i))} style={btn(C.red)}>X</button>
                </div>
              ))}
              <button onClick={() => setStudentQuestions([...studentQuestions, { question: '', answer: '' }])} style={{ ...btn(C.surface), marginBottom: 12, fontSize: 13 }}>+ ADD QUESTION</button>
              <br />
              <button onClick={handleAddStudent} style={btn(C.green)}>ADD STUDENT</button>
            </div>

            {/* Search + Filter + Sort bar */}
            <div style={{ ...card, marginBottom: 16, padding: 16 }}>
              <input
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Search by name or roll no..."
                style={{ ...input, marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {[
                  { key: 'all', label: 'ALL' },
                  { key: 'banned', label: 'BANNED' },
                  { key: 'locked', label: 'LOCKED' },
                  { key: 'slamDone', label: 'SLAM DONE' },
                  { key: 'slamPending', label: 'SLAM PENDING' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setStudentFilter(f.key)}
                    style={{
                      background: studentFilter === f.key ? C.yellow : C.surface,
                      border: `2px solid ${C.border}`,
                      boxShadow: studentFilter === f.key ? `3px 3px 0 ${C.border}` : 'none',
                      padding: '6px 14px', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase'
                    }}
                  >{f.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#555' }}>SORT:</span>
                {[
                  { key: 'rollNo', label: 'ROLL NO' },
                  { key: 'name', label: 'NAME' },
                  { key: 'attempts', label: 'ATTEMPTS' },
                ].map(s => (
                  <button
                    key={s.key}
                    onClick={() => setStudentSort(s.key)}
                    style={{
                      background: studentSort === s.key ? C.pink : C.surface,
                      border: `2px solid ${C.border}`,
                      boxShadow: studentSort === s.key ? `3px 3px 0 ${C.border}` : 'none',
                      padding: '6px 12px', fontWeight: 800, fontSize: 12, cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase'
                    }}
                  >{s.label}</button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: '#999', marginTop: 10, fontWeight: 600 }}>
                SHOWING {filtered.length} OF {students.length} STUDENTS
              </p>
            </div>

            {/* Student list */}
            {filtered.map(s => (
              <div key={s.id} style={{ ...card, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ width: 72, height: 72, border: `2px solid ${C.border}`, background: C.pink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 24, flexShrink: 0, overflow: 'hidden' }}>
                  {s.photoURL ? <img src={s.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : s.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <p style={{ fontWeight: 800, fontSize: 16 }}>{s.name} <span style={{ fontWeight: 400, color: '#555' }}>({s.id})</span></p>
                  <p style={{ fontSize: 13, color: '#555' }}>
                    Code: {s.code} | Attempts: {s.attempts || 0}
                    {s.banned && <span style={{ color: C.red, fontWeight: 700 }}> | BANNED</span>}
                    {s.slamBookFilled && <span style={{ color: C.green, fontWeight: 700 }}> | SLAM DONE</span>}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <label style={btn(C.blue)}>
                    PHOTO
                    <input type="file" accept="image/*" hidden onChange={e => e.target.files[0] && handlePhotoUpload(s.id, e.target.files[0])} />
                  </label>
                  <button onClick={() => handleBan(s.id, s.banned)} style={btn(s.banned ? C.green : C.red)}>
                    {s.banned ? 'UNBAN' : 'BAN'}
                  </button>
                  <button onClick={() => handleResetLockout(s.id)} style={btn(C.orange)}>RESET LOCK</button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ ...card, textAlign: 'center' }}>
                <p style={{ fontWeight: 800, textTransform: 'uppercase' }}>
                  {students.length === 0 ? 'NO STUDENTS YET — ADD ONE ABOVE' : 'NO MATCHES'}
                </p>
              </div>
            )}
          </div>
          )
        })()}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && !loading && (
          <div style={{ ...card }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', marginBottom: 16 }}>CLASS QUIZ QUESTIONS (MCQ)</h2>
            {classQuestions.map((q, i) => {
              const qObj = typeof q === 'object' ? q : { question: q, options: ['', ''], correct: 0 }
              return (
                <div key={i} style={{ border: `2px solid ${C.border}`, padding: 16, marginBottom: 12, background: C.bg }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input value={qObj.question || ''} onChange={e => {
                      const nq = [...classQuestions]
                      nq[i] = { ...qObj, question: e.target.value }
                      setClassQuestions(nq)
                    }} placeholder="Question" style={{ ...input, flex: 1, fontWeight: 700 }} />
                    <button onClick={() => setClassQuestions(classQuestions.filter((_, j) => j !== i))} style={btn(C.red)}>X</button>
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#555', marginBottom: 8 }}>OPTIONS (click radio to mark correct)</p>
                  {(qObj.options || []).map((opt, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                      <div
                        onClick={() => {
                          const nq = [...classQuestions]
                          nq[i] = { ...qObj, correct: j }
                          setClassQuestions(nq)
                        }}
                        style={{
                          width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                          border: `2px solid ${qObj.correct === j ? C.green : C.border}`,
                          background: qObj.correct === j ? C.green : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {qObj.correct === j && <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>✓</span>}
                      </div>
                      <input value={opt} onChange={e => {
                        const nq = [...classQuestions]
                        const newOpts = [...(qObj.options || [])]
                        newOpts[j] = e.target.value
                        nq[i] = { ...qObj, options: newOpts }
                        setClassQuestions(nq)
                      }} placeholder={`Option ${j + 1}`} style={{ ...input, flex: 1, background: qObj.correct === j ? C.green + '22' : input.background }} />
                      {(qObj.options || []).length > 2 && (
                        <button onClick={() => {
                          const nq = [...classQuestions]
                          const newOpts = (qObj.options || []).filter((_, k) => k !== j)
                          const newCorrect = qObj.correct === j ? 0 : qObj.correct > j ? qObj.correct - 1 : qObj.correct
                          nq[i] = { ...qObj, options: newOpts, correct: newCorrect }
                          setClassQuestions(nq)
                        }} style={{ ...btn(C.red), padding: '4px 8px', fontSize: 11 }}>X</button>
                      )}
                    </div>
                  ))}
                  {(qObj.options || []).length < 6 && (
                    <button onClick={() => {
                      const nq = [...classQuestions]
                      nq[i] = { ...qObj, options: [...(qObj.options || []), ''] }
                      setClassQuestions(nq)
                    }} style={{ ...btn(C.surface), fontSize: 11, padding: '4px 12px', marginTop: 4 }}>+ ADD OPTION</button>
                  )}
                </div>
              )
            })}
            <button onClick={() => setClassQuestions([...classQuestions, { question: '', options: ['', ''], correct: 0 }])} style={{ ...btn(C.surface), marginBottom: 24 }}>+ ADD QUESTION</button>

            <h2 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>ABOUT ME QUESTIONS</h2>
            <p style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>These show during login when students fill their slam book. Leave empty for defaults. "What would your friends call you?" is always added automatically.</p>
            {slamQuestions.map((q, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={q} onChange={e => { const nq = [...slamQuestions]; nq[i] = e.target.value; setSlamQuestions(nq) }} placeholder={`Question ${i + 1}`} style={{ ...input, flex: 1 }} />
                <button onClick={() => setSlamQuestions(slamQuestions.filter((_, j) => j !== i))} style={btn(C.red)}>X</button>
              </div>
            ))}
            <button onClick={() => setSlamQuestions([...slamQuestions, ''])} style={{ ...btn(C.surface), marginBottom: 24 }}>+ ADD SLAM QUESTION</button>

            <h2 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>CLASS VOTES (DAILY AWARD)</h2>
            <p style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>One active category at a time. Students vote from all classmates. Clear it when done, set a new one next day.</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={activeAward} onChange={e => setActiveAward(e.target.value)} placeholder="e.g. Funniest Person" style={{ ...input, flex: 1 }} />
              {activeAward && <button onClick={() => setActiveAward('')} style={btn(C.red)}>CLEAR</button>}
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 13, marginBottom: 8 }}>Results reveal date</p>
              <input type="date" value={awardsRevealDate} onChange={e => setAwardsRevealDate(e.target.value)} style={input} />
            </div>

            {activeAward && (
              <button
                onClick={async () => {
                  const votes = await getVotesForCategory(activeAward)
                  if (votes.length === 0) { alert('No votes yet for this category.'); return }
                  const counts = {}
                  votes.forEach(v => { counts[v.nominee] = (counts[v.nominee] || 0) + 1 })
                  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
                  const winnerRoll = sorted[0][0]
                  const winnerName = students.find(s => s.id === winnerRoll)?.name || winnerRoll
                  if (!confirm(`Winner: ${winnerName} (${sorted[0][1]} votes). Archive to Hall of Fame and clear this category?`)) return
                  setPastWinners([...pastWinners, { category: activeAward, winner: winnerRoll, name: winnerName }])
                  setActiveAward('')
                  setAwardsRevealDate('')
                }}
                style={{ ...btn(C.yellow), marginBottom: 16, width: '100%', fontWeight: 900 }}
              >
                ARCHIVE WINNER & CLEAR CATEGORY
              </button>
            )}

            {/* Hall of Fame */}
            {pastWinners.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 13, marginBottom: 8 }}>HALL OF FAME (past winners)</p>
                {pastWinners.map((pw, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, padding: '6px 10px', background: C.bg, border: `2px solid ${C.border}` }}>
                    <span>🏆</span>
                    <span style={{ fontWeight: 800, flex: 1 }}>{pw.category}: {pw.name || pw.winner}</span>
                    <button onClick={() => setPastWinners(pastWinners.filter((_, j) => j !== i))} style={{ ...btn(C.red), padding: '4px 10px', fontSize: 11 }}>X</button>
                  </div>
                ))}
              </div>
            )}

            <h2 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', marginBottom: 16 }}>THIS OR THAT POLLS</h2>
            {superlatives.map((s, i) => (
              <div key={i} style={{ ...card, marginBottom: 12, padding: 16, background: C.bg }}>
                <input placeholder="Question (e.g. who's more likely to...)" value={s.question || ''} onChange={e => { const ns = [...superlatives]; ns[i] = { ...ns[i], question: e.target.value }; setSuperlatives(ns) }} style={{ ...input, marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input placeholder="Roll No A" value={s.optionA || ''} onChange={e => { const ns = [...superlatives]; ns[i] = { ...ns[i], optionA: e.target.value }; setSuperlatives(ns) }} style={{ ...input, flex: 1 }} />
                  <span style={{ fontWeight: 900, alignSelf: 'center' }}>VS</span>
                  <input placeholder="Roll No B" value={s.optionB || ''} onChange={e => { const ns = [...superlatives]; ns[i] = { ...ns[i], optionB: e.target.value }; setSuperlatives(ns) }} style={{ ...input, flex: 1 }} />
                </div>
                <button onClick={() => setSuperlatives(superlatives.filter((_, j) => j !== i))} style={{ ...btn(C.red), marginTop: 8, fontSize: 12 }}>REMOVE</button>
              </div>
            ))}
            <button onClick={() => setSuperlatives([...superlatives, { question: '', optionA: '', optionB: '' }])} style={{ ...btn(C.surface), marginBottom: 24 }}>+ ADD POLL</button>

            <h2 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', marginBottom: 16 }}>CHANGE ADMIN PASSWORD</h2>
            <input type="password" placeholder="New password (leave blank to keep)" value={newAdminPw} onChange={e => setNewAdminPw(e.target.value)} style={{ ...input, marginBottom: 16 }} />

            <br />
            <button onClick={handleSaveSettings} style={btn(C.green)}>SAVE ALL SETTINGS</button>

            {/* Test Mode */}
            <div style={{ marginTop: 40, borderTop: `3px solid ${C.border}`, paddingTop: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8, color: C.red }}>TEST MODE</h2>
              <p style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>Toggle test mode to enable data reset. This wipes ALL slambooks, messages, votes, superlative votes, unsent posts, and future self messages. Students and settings are NOT affected.</p>
              <div
                onClick={() => setTestMode(!testMode)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 16 }}
              >
                <div style={{
                  width: 48, height: 28, border: `2px solid ${C.border}`,
                  background: testMode ? C.red : '#ddd',
                  position: 'relative', transition: 'all 0.2s'
                }}>
                  <div style={{
                    width: 22, height: 22, background: C.surface, border: `2px solid ${C.border}`,
                    position: 'absolute', top: 1, left: testMode ? 22 : 2,
                    transition: 'all 0.2s'
                  }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase' }}>
                  {testMode ? 'TEST MODE ON' : 'TEST MODE OFF'}
                </span>
              </div>
              {testMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={async () => {
                      if (!confirm('RESET USER DATA? This deletes all slambooks, messages, votes, unsent posts, and future self messages. Students and settings stay.')) return
                      setResetting(true)
                      await resetAllTestData()
                      localStorage.removeItem('farewell_session')
                      localStorage.removeItem('farewell_onboarding')
                      setResetting(false)
                      loadData()
                      alert('USER DATA WIPED. Session cleared — re-login needed.')
                    }}
                    disabled={resetting}
                    style={{
                      ...btn(C.red), width: '100%', opacity: resetting ? 0.7 : 1,
                      cursor: resetting ? 'wait' : 'pointer'
                    }}
                  >
                    {resetting ? 'RESETTING...' : 'RESET USER DATA (KEEP STUDENTS)'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('NUCLEAR RESET — this deletes EVERYTHING: all students, slambooks, messages, votes, unsent posts, future self messages. Only settings survive. Are you sure?')) return
                      setResetting(true)
                      await resetAllTestData({ includeStudents: true })
                      localStorage.removeItem('farewell_session')
                      localStorage.removeItem('farewell_onboarding')
                      setResetting(false)
                      loadData()
                      alert('EVERYTHING WIPED. All students deleted. Re-add them from admin.')
                    }}
                    disabled={resetting}
                    style={{
                      ...btn(C.red), width: '100%', opacity: resetting ? 0.7 : 1,
                      cursor: resetting ? 'wait' : 'pointer',
                      background: '#8B0000'
                    }}
                  >
                    {resetting ? 'RESETTING...' : 'NUCLEAR RESET (DELETE STUDENTS TOO)'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REPORTED TAB */}
        {activeTab === 'reported' && !loading && (
          <div>
            {reported.length === 0 && <div style={card}><p style={{ fontWeight: 800 }}>ALL CLEAN</p></div>}
            {reported.map(r => (
              <div key={r.id} style={{ ...card, marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
                  {r.from} → {r.to} {r.isAnonymous && '(anonymous)'} | {r.createdAt ? new Date(r.createdAt).toLocaleString() : 'unknown'}
                </p>
                <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 12, padding: 12, background: C.bg, border: `2px solid ${C.border}` }}>{r.text}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleDeleteReported(r.id)} style={btn(C.orange)}>DISMISS & DELETE</button>
                  <button onClick={() => handleBanSender(r.from)} style={btn(C.red)}>BAN SENDER</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* JUST SAY IT TAB */}
        {activeTab === 'just say it' && !loading && (
          <div>
            {unsent.length === 0 && <div style={card}><p style={{ fontWeight: 800 }}>WALL IS EMPTY</p></div>}
            {unsent.map(u => (
              <div key={u.id} style={{ ...card, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <p style={{ fontWeight: 500, flex: 1 }}>{u.text}</p>
                <button onClick={() => handleDeleteUnsent(u.id)} style={btn(C.red)}>DELETE</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
