import { Client, Databases } from 'node-appwrite'

const client = new Client()
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('left-the-chat')
  .setKey('standard_d6b107c935b29b2451fb1523fe665553b2c6594734e2056cc02ef432782d364ee21d2e912fff50976fd8e6fa131251321af19621ca8e36fe7afbd0a4338f7d27397a0a7a8fc207dc5084dfbea36d2da38f8b72166fd008d50748c9a45e67daa52b9b100c75d7e5c777b7a4b1d53cd30de36a837effbe0aed1f7aef852f9e382e')

const db = new Databases(client)
const DB = 'main'

// Generate all 71 roll numbers
const rollNumbers = []

// 22R01A7301 to 22R01A7365 (65 students)
for (let i = 1; i <= 65; i++) {
  rollNumbers.push(`22R01A73${String(i).padStart(2, '0')}`)
}

// 23R01A7301 to 23R01A7306 (6 students)
for (let i = 1; i <= 6; i++) {
  rollNumbers.push(`23R01A73${String(i).padStart(2, '0')}`)
}

console.log(`Total students: ${rollNumbers.length}`)
console.log(`Admin: 22R01A7365 (Yuvaraj)\n`)

async function seed() {
  let added = 0, skipped = 0, failed = 0

  for (const rollNo of rollNumbers) {
    // Generate a simple default code — admin should change these later
    const code = rollNo.slice(-4) // last 4 digits as default code

    try {
      await db.createDocument(DB, 'students', rollNo, {
        name: rollNo, // placeholder — admin updates with real names
        code: code,
        questions: '[]',
        banned: false,
        attempts: 0,
        slamBookFilled: false,
      })
      added++
      console.log(`✅ ${rollNo}`)
    } catch (e) {
      if (e.code === 409) {
        skipped++
        console.log(`⏭️  ${rollNo} (already exists)`)
      } else {
        failed++
        console.log(`❌ ${rollNo}: ${e.message}`)
      }
    }
  }

  console.log(`\n📊 Done: ${added} added, ${skipped} skipped, ${failed} failed`)
  console.log('\n⚠️  NEXT STEPS:')
  console.log('1. Go to /admin and update each student\'s real NAME')
  console.log('2. Change each student\'s SECRET CODE (default is last 4 digits of roll no)')
  console.log('3. Add personal questions for each student')
  console.log(`4. Admin roll no: 22R01A7365`)
}

seed()
