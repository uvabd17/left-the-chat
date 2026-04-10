import { databases, storage, ID, Query, DB_ID, BUCKET_ID, COLLECTIONS } from './client'

const C = COLLECTIONS

// Helper: parse JSON string fields safely
function parseJSON(val, fallback = []) {
  if (!val) return fallback
  if (typeof val !== 'string') return val
  try { return JSON.parse(val) } catch { return fallback }
}

function parseStudent(doc) {
  return {
    id: doc.$id,
    ...doc,
    questions: parseJSON(doc.questions, [])
  }
}

// ─── STUDENTS ───

export async function getStudent(rollNo) {
  try {
    const doc = await databases.getDocument(DB_ID, C.students, rollNo)
    return parseStudent(doc)
  } catch {
    return null
  }
}

export async function getAllStudents() {
  const res = await databases.listDocuments(DB_ID, C.students, [Query.limit(100)])
  return res.documents.map(parseStudent)
}

export async function updateStudent(rollNo, data) {
  const clean = { ...data }
  // Clean out Appwrite system fields
  delete clean.$id; delete clean.$createdAt; delete clean.$updatedAt
  delete clean.$permissions; delete clean.$databaseId; delete clean.$collectionId
  delete clean.id
  // Stringify arrays
  if (Array.isArray(clean.questions)) clean.questions = JSON.stringify(clean.questions)
  await databases.updateDocument(DB_ID, C.students, rollNo, clean)
}

export async function addStudent(rollNo, data) {
  const toStore = { ...data }
  if (Array.isArray(toStore.questions)) toStore.questions = JSON.stringify(toStore.questions)
  await databases.createDocument(DB_ID, C.students, rollNo, toStore)
}

export async function deleteStudent(rollNo) {
  await databases.deleteDocument(DB_ID, C.students, rollNo)
}

export async function recordFailedAttempt(rollNo) {
  const student = await getStudent(rollNo)
  if (!student) return 0
  const attempts = (student.attempts || 0) + 1
  const update = { attempts }
  if (attempts >= 5) {
    update.lockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    update.attempts = 0
  }
  await updateStudent(rollNo, update)
  return attempts
}

export async function resetAttempts(rollNo) {
  await updateStudent(rollNo, { attempts: 0, lockedUntil: null })
}

// ─── SETTINGS ───

export async function getSettings(docId = 'class') {
  try {
    const doc = await databases.getDocument(DB_ID, C.settings, docId)
    return {
      ...doc,
      classQuestions: parseJSON(doc.classQuestions, []),
      awardsCategories: parseJSON(doc.awardsCategories, []),
      superlatives: parseJSON(doc.superlatives, []),
      slamQuestions: parseJSON(doc.slamQuestions, [])
    }
  } catch {
    return null
  }
}

export async function updateSettings(docId, data) {
  const clean = { ...data }
  delete clean.$id; delete clean.$createdAt; delete clean.$updatedAt
  delete clean.$permissions; delete clean.$databaseId; delete clean.$collectionId
  // Stringify arrays for Appwrite
  if (Array.isArray(clean.classQuestions)) clean.classQuestions = JSON.stringify(clean.classQuestions)
  if (clean.awardsCategories !== undefined) clean.awardsCategories = JSON.stringify(clean.awardsCategories)
  if (Array.isArray(clean.superlatives)) clean.superlatives = JSON.stringify(clean.superlatives)
  if (Array.isArray(clean.slamQuestions)) clean.slamQuestions = JSON.stringify(clean.slamQuestions)
  try {
    await databases.updateDocument(DB_ID, C.settings, docId, clean)
  } catch (e) {
    if (e.code === 404) {
      await databases.createDocument(DB_ID, C.settings, docId, clean)
    } else {
      throw e
    }
  }
}

export async function getAdminPassword() {
  try {
    const doc = await databases.getDocument(DB_ID, C.settings, 'admin')
    return doc.password || null
  } catch {
    return null
  }
}

export async function setAdminPassword(password) {
  try {
    await databases.updateDocument(DB_ID, C.settings, 'admin', { password })
  } catch {
    await databases.createDocument(DB_ID, C.settings, 'admin', { password })
  }
}

// ─── SLAM BOOKS ───

export async function getSlamBook(rollNo) {
  try {
    const doc = await databases.getDocument(DB_ID, C.slambooks, rollNo)
    return { id: doc.$id, ...doc }
  } catch {
    return null
  }
}

export async function getAllSlamBooks() {
  const res = await databases.listDocuments(DB_ID, C.slambooks, [Query.limit(100)])
  return res.documents.map(d => ({ id: d.$id, ...d }))
}

export async function saveSlamBook(rollNo, answers) {
  const data = {
    rollNo,
    answers: JSON.stringify(answers),
    reactions: JSON.stringify({}),
    createdAt: new Date().toISOString()
  }
  try {
    await databases.createDocument(DB_ID, C.slambooks, rollNo, data)
  } catch (e) {
    if (e.code === 409) {
      await databases.updateDocument(DB_ID, C.slambooks, rollNo, {
        answers: JSON.stringify(answers),
        createdAt: new Date().toISOString()
      })
    } else {
      throw e
    }
  }
  await updateStudent(rollNo, { slamBookFilled: true })
}

export async function reactToSlamBook(targetRollNo, reactorRollNo, emoji) {
  const slam = await getSlamBook(targetRollNo)
  if (!slam) return
  const reactions = typeof slam.reactions === 'string' ? JSON.parse(slam.reactions) : (slam.reactions || {})
  if (reactions[reactorRollNo] === emoji) {
    delete reactions[reactorRollNo]
  } else {
    reactions[reactorRollNo] = emoji
  }
  await databases.updateDocument(DB_ID, C.slambooks, targetRollNo, {
    reactions: JSON.stringify(reactions)
  })
}

// Helper: parse slam book data (call this when reading slam books)
export function parseSlamBook(slam) {
  return {
    ...slam,
    answers: typeof slam.answers === 'string' ? JSON.parse(slam.answers) : (slam.answers || {}),
    reactions: typeof slam.reactions === 'string' ? JSON.parse(slam.reactions) : (slam.reactions || {})
  }
}

// ─── MESSAGES ───

export async function sendMessage(from, to, text, isAnonymous = false) {
  await databases.createDocument(DB_ID, C.messages, ID.unique(), {
    from,
    to,
    text,
    isAnonymous,
    read: false,
    reported: false,
    createdAt: new Date().toISOString()
  })
}

export async function getMessagesFor(rollNo) {
  const res = await databases.listDocuments(DB_ID, C.messages, [
    Query.equal('to', rollNo),
    Query.equal('read', false),
    Query.orderDesc('createdAt'),
    Query.limit(100)
  ])
  return res.documents.map(d => ({ id: d.$id, ...d }))
}

export async function getUnreadCount(rollNo) {
  const res = await databases.listDocuments(DB_ID, C.messages, [
    Query.equal('to', rollNo),
    Query.equal('read', false),
    Query.limit(1)
  ])
  return res.total
}

export async function markMessageRead(messageId) {
  await databases.deleteDocument(DB_ID, C.messages, messageId)
}

export async function reportMessage(messageId) {
  await databases.updateDocument(DB_ID, C.messages, messageId, { reported: true })
}

export async function getReportedMessages() {
  const res = await databases.listDocuments(DB_ID, C.messages, [
    Query.equal('reported', true),
    Query.limit(100)
  ])
  return res.documents.map(d => ({ id: d.$id, ...d }))
}

export async function getAllMessagesMeta() {
  const res = await databases.listDocuments(DB_ID, C.messages, [Query.limit(500)])
  return res.documents.map(d => ({
    id: d.$id,
    from: d.from,
    to: d.to,
    isAnonymous: d.isAnonymous,
    reported: d.reported,
    createdAt: d.createdAt,
    ...(d.reported ? { text: d.text } : {})
  }))
}

// ─── VOTES (AWARDS) ───

export async function saveVote(categoryId, voterRollNo, nomineeRollNo) {
  const voteId = `${categoryId}_${voterRollNo}`
  await databases.createDocument(DB_ID, C.votes, voteId, {
    category: categoryId,
    voter: voterRollNo,
    nominee: nomineeRollNo,
    createdAt: new Date().toISOString()
  })
}

export async function getVotesForCategory(categoryId) {
  const res = await databases.listDocuments(DB_ID, C.votes, [
    Query.equal('category', categoryId),
    Query.limit(100)
  ])
  return res.documents.map(d => ({ id: d.$id, ...d }))
}

export async function getUserVotes(voterRollNo) {
  const res = await databases.listDocuments(DB_ID, C.votes, [
    Query.equal('voter', voterRollNo),
    Query.limit(100)
  ])
  return res.documents.map(d => ({ id: d.$id, ...d }))
}

// ─── SUPERLATIVES (THIS OR THAT) ───

export async function saveSuperlativeVote(pollId, voterRollNo, winnerRollNo) {
  const voteId = `${pollId}_${voterRollNo}`
  await databases.createDocument(DB_ID, C.superlatives, voteId, {
    poll: pollId,
    voter: voterRollNo,
    winner: winnerRollNo,
    createdAt: new Date().toISOString()
  })
}

export async function getSuperlativeVotes(pollId) {
  const res = await databases.listDocuments(DB_ID, C.superlatives, [
    Query.equal('poll', pollId),
    Query.limit(100)
  ])
  return res.documents.map(d => ({ id: d.$id, ...d }))
}

export async function getUserSuperlativeVotes(voterRollNo) {
  const res = await databases.listDocuments(DB_ID, C.superlatives, [
    Query.equal('voter', voterRollNo),
    Query.limit(100)
  ])
  return res.documents.map(d => ({ id: d.$id, ...d }))
}

// ─── UNSENT WALL (JUST SAY IT) ───

export async function postUnsent(text) {
  await databases.createDocument(DB_ID, C.unsent, ID.unique(), {
    text,
    createdAt: new Date().toISOString(),
    reported: false
  })
}

export async function getAllUnsent() {
  const res = await databases.listDocuments(DB_ID, C.unsent, [
    Query.orderDesc('createdAt'),
    Query.limit(200)
  ])
  return res.documents.map(d => ({ id: d.$id, ...d }))
}

export async function deleteUnsent(id) {
  await databases.deleteDocument(DB_ID, C.unsent, id)
}

// ─── FUTURE SELF (TIME CAPSULE) ───

export async function saveFutureSelfMessage(rollNo, text, unlockDate) {
  await databases.createDocument(DB_ID, C.futureself, rollNo, {
    text,
    unlockDate: new Date(unlockDate).toISOString(),
    delivered: false,
    createdAt: new Date().toISOString()
  })
}

export async function getFutureSelfMessage(rollNo) {
  try {
    const doc = await databases.getDocument(DB_ID, C.futureself, rollNo)
    return { id: doc.$id, ...doc }
  } catch {
    return null
  }
}

export async function getAllFutureSelfMessages() {
  const res = await databases.listDocuments(DB_ID, C.futureself, [Query.limit(100)])
  return res.documents.map(d => ({ id: d.$id, ...d }))
}

// ─── PHOTOS (STORAGE) ───

export async function uploadPhoto(rollNo, file) {
  try {
    await storage.deleteFile(BUCKET_ID, rollNo)
  } catch { /* ignore if not exists */ }
  await storage.createFile(BUCKET_ID, rollNo, file)
  const url = storage.getFileView(BUCKET_ID, rollNo)
  await updateStudent(rollNo, { photoURL: url.toString() })
  return url.toString()
}

export function getPhotoURL(rollNo) {
  return storage.getFileView(BUCKET_ID, rollNo).toString()
}

// ─── TEST MODE: RESET ALL DATA ───

async function deleteAllInCollection(collectionId) {
  let hasMore = true
  while (hasMore) {
    const res = await databases.listDocuments(DB_ID, collectionId, [Query.limit(100)])
    if (res.documents.length === 0) { hasMore = false; break }
    for (const doc of res.documents) {
      await databases.deleteDocument(DB_ID, collectionId, doc.$id)
    }
  }
}

export async function resetAllTestData({ includeStudents = false } = {}) {
  await Promise.all([
    deleteAllInCollection(C.slambooks),
    deleteAllInCollection(C.messages),
    deleteAllInCollection(C.votes),
    deleteAllInCollection(C.superlatives),
    deleteAllInCollection(C.unsent),
    deleteAllInCollection(C.futureself),
  ])
  if (includeStudents) {
    await deleteAllInCollection(C.students)
  } else {
    const stuRes = await databases.listDocuments(DB_ID, C.students, [Query.limit(100)])
    for (const s of stuRes.documents) {
      await databases.updateDocument(DB_ID, C.students, s.$id, { slamBookFilled: false, attempts: 0, lockedUntil: null })
    }
  }
}
