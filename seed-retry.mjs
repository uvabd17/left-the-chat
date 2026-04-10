import { Client, Databases } from 'node-appwrite'

const client = new Client()
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('left-the-chat')
  .setKey('standard_d6b107c935b29b2451fb1523fe665553b2c6594734e2056cc02ef432782d364ee21d2e912fff50976fd8e6fa131251321af19621ca8e36fe7afbd0a4338f7d27397a0a7a8fc207dc5084dfbea36d2da38f8b72166fd008d50748c9a45e67daa52b9b100c75d7e5c777b7a4b1d53cd30de36a837effbe0aed1f7aef852f9e382e')

const db = new Databases(client)
const DB = 'main'

const rollNumbers = []
for (let i = 1; i <= 65; i++) rollNumbers.push(`22R01A73${String(i).padStart(2, '0')}`)
for (let i = 1; i <= 6; i++) rollNumbers.push(`23R01A73${String(i).padStart(2, '0')}`)

const delay = ms => new Promise(r => setTimeout(r, ms))
const RETRY_ATTEMPTS = 5

function isRetryableError(error) {
  return error?.message?.includes('fetch failed')
}

async function createStudentWithRetry(rollNo, payload) {
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      await db.createDocument(DB, 'students', rollNo, payload)
      return { status: 'added' }
    } catch (e) {
      if (e.code === 409) {
        return { status: 'exists' }
      }

      if (!isRetryableError(e) || attempt === RETRY_ATTEMPTS) {
        return { status: 'failed', error: e }
      }

      const waitMs = attempt * 1500
      console.log(`↻ ${rollNo}: retry ${attempt}/${RETRY_ATTEMPTS - 1} in ${waitMs}ms`)
      await delay(waitMs)
    }
  }

  return { status: 'failed', error: new Error('Unknown failure') }
}

async function seed() {
  let added = 0, skipped = 0, failed = 0
  const failures = []
  const requestedRollNumbers = process.argv.slice(2)
  const targetRollNumbers = requestedRollNumbers.length > 0 ? requestedRollNumbers : rollNumbers

  for (const rollNo of targetRollNumbers) {
    const code = rollNo.slice(-4)
    const result = await createStudentWithRetry(rollNo, {
      name: rollNo,
      code: code,
      questions: '[]',
      banned: false,
      attempts: 0,
      slamBookFilled: false,
    })

    if (result.status === 'added') {
      added++
      console.log(`✅ ${rollNo}`)
    } else if (result.status === 'exists') {
      skipped++
      console.log(`⏭️  ${rollNo} (exists)`)
    } else {
      failed++
      failures.push(rollNo)
      console.log(`❌ ${rollNo}: ${result.error.message}`)
    }

    await delay(500) // wait 500ms between each to avoid rate limit
  }

  console.log(`\n📊 Done: ${added} added, ${skipped} skipped, ${failed} failed`)
  if (failures.length > 0) {
    console.log(`Failed roll numbers: ${failures.join(' ')}`)
  }
}

seed()
