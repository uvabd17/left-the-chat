import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, query, where, orderBy,
  addDoc, serverTimestamp, increment, Timestamp
} from 'firebase/firestore'
import { db } from './config'

// ─── STUDENTS ───

export async function getStudent(rollNo) {
  const snap = await getDoc(doc(db, 'students', rollNo))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getAllStudents() {
  const snap = await getDocs(collection(db, 'students'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function updateStudent(rollNo, data) {
  await updateDoc(doc(db, 'students', rollNo), data)
}

export async function addStudent(rollNo, data) {
  await setDoc(doc(db, 'students', rollNo), data)
}

export async function deleteStudent(rollNo) {
  await deleteDoc(doc(db, 'students', rollNo))
}

export async function recordFailedAttempt(rollNo) {
  const studentRef = doc(db, 'students', rollNo)
  const snap = await getDoc(studentRef)
  if (!snap.exists()) return
  const data = snap.data()
  const attempts = (data.attempts || 0) + 1
  const update = { attempts }
  if (attempts >= 5) {
    update.lockedUntil = Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000))
    update.attempts = 0
  }
  await updateDoc(studentRef, update)
  return attempts
}

export async function resetAttempts(rollNo) {
  await updateDoc(doc(db, 'students', rollNo), { attempts: 0, lockedUntil: null })
}

// ─── SETTINGS ───

export async function getSettings(docId = 'class') {
  const snap = await getDoc(doc(db, 'settings', docId))
  return snap.exists() ? snap.data() : null
}

export async function updateSettings(docId, data) {
  await setDoc(doc(db, 'settings', docId), data, { merge: true })
}

export async function getAdminPassword() {
  const snap = await getDoc(doc(db, 'settings', 'admin'))
  return snap.exists() ? snap.data().password : null
}

export async function setAdminPassword(password) {
  await setDoc(doc(db, 'settings', 'admin'), { password }, { merge: true })
}

// ─── SLAM BOOKS ───

export async function getSlamBook(rollNo) {
  const snap = await getDoc(doc(db, 'slambooks', rollNo))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getAllSlamBooks() {
  const snap = await getDocs(collection(db, 'slambooks'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function saveSlamBook(rollNo, answers) {
  await setDoc(doc(db, 'slambooks', rollNo), {
    rollNo,
    answers,
    reactions: {},
    createdAt: serverTimestamp()
  })
  await updateDoc(doc(db, 'students', rollNo), { slamBookFilled: true })
}

export async function reactToSlamBook(targetRollNo, reactorRollNo, emoji) {
  const slamRef = doc(db, 'slambooks', targetRollNo)
  const snap = await getDoc(slamRef)
  if (!snap.exists()) return
  const data = snap.data()
  const reactions = data.reactions || {}
  const prevEmoji = reactions[reactorRollNo]
  if (prevEmoji === emoji) {
    delete reactions[reactorRollNo]
  } else {
    reactions[reactorRollNo] = emoji
  }
  await updateDoc(slamRef, { reactions })
}

// ─── MESSAGES ───

export async function sendMessage(from, to, text, isAnonymous = false) {
  await addDoc(collection(db, 'messages'), {
    from,
    to,
    text,
    isAnonymous,
    read: false,
    reported: false,
    createdAt: serverTimestamp()
  })
}

export async function getMessagesFor(rollNo) {
  const q = query(
    collection(db, 'messages'),
    where('to', '==', rollNo),
    where('read', '==', false),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getUnreadCount(rollNo) {
  const q = query(
    collection(db, 'messages'),
    where('to', '==', rollNo),
    where('read', '==', false)
  )
  const snap = await getDocs(q)
  return snap.size
}

export async function markMessageRead(messageId) {
  await deleteDoc(doc(db, 'messages', messageId))
}

export async function reportMessage(messageId) {
  await updateDoc(doc(db, 'messages', messageId), { reported: true })
}

export async function getReportedMessages() {
  const q = query(
    collection(db, 'messages'),
    where('reported', '==', true)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getAllMessagesMeta() {
  const snap = await getDocs(collection(db, 'messages'))
  return snap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      from: data.from,
      to: data.to,
      isAnonymous: data.isAnonymous,
      reported: data.reported,
      createdAt: data.createdAt,
      ...(data.reported ? { text: data.text } : {})
    }
  })
}

// ─── VOTES (AWARDS) ───

export async function saveVote(categoryId, voterRollNo, nomineeRollNo) {
  const voteId = `${categoryId}_${voterRollNo}`
  await setDoc(doc(db, 'votes', voteId), {
    category: categoryId,
    voter: voterRollNo,
    nominee: nomineeRollNo,
    createdAt: serverTimestamp()
  })
}

export async function getVotesForCategory(categoryId) {
  const q = query(collection(db, 'votes'), where('category', '==', categoryId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getUserVotes(voterRollNo) {
  const q = query(collection(db, 'votes'), where('voter', '==', voterRollNo))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── SUPERLATIVES (THIS OR THAT) ───

export async function saveSuperlativeVote(pollId, voterRollNo, winnerRollNo) {
  const voteId = `${pollId}_${voterRollNo}`
  await setDoc(doc(db, 'superlatives', voteId), {
    poll: pollId,
    voter: voterRollNo,
    winner: winnerRollNo,
    createdAt: serverTimestamp()
  })
}

export async function getSuperlativeVotes(pollId) {
  const q = query(collection(db, 'superlatives'), where('poll', '==', pollId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getUserSuperlativeVotes(voterRollNo) {
  const q = query(collection(db, 'superlatives'), where('voter', '==', voterRollNo))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── UNSENT WALL (JUST SAY IT) ───

export async function postUnsent(text) {
  await addDoc(collection(db, 'unsent'), {
    text,
    createdAt: serverTimestamp(),
    reported: false
  })
}

export async function getAllUnsent() {
  const q = query(collection(db, 'unsent'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteUnsent(id) {
  await deleteDoc(doc(db, 'unsent', id))
}

// ─── FUTURE SELF (TIME CAPSULE) ───

export async function saveFutureSelfMessage(rollNo, text, unlockDate) {
  await setDoc(doc(db, 'futureself', rollNo), {
    text,
    unlockDate: Timestamp.fromDate(new Date(unlockDate)),
    delivered: false,
    createdAt: serverTimestamp()
  })
}

export async function getFutureSelfMessage(rollNo) {
  const snap = await getDoc(doc(db, 'futureself', rollNo))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getAllFutureSelfMessages() {
  const snap = await getDocs(collection(db, 'futureself'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
