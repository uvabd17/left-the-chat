import { Client, Databases, Storage } from 'node-appwrite'

const client = new Client()
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('left-the-chat')
  .setKey('standard_d6b107c935b29b2451fb1523fe665553b2c6594734e2056cc02ef432782d364ee21d2e912fff50976fd8e6fa131251321af19621ca8e36fe7afbd0a4338f7d27397a0a7a8fc207dc5084dfbea36d2da38f8b72166fd008d50748c9a45e67daa52b9b100c75d7e5c777b7a4b1d53cd30de36a837effbe0aed1f7aef852f9e382e')

const databases = new Databases(client)
const storage = new Storage(client)

const DB = 'main'

async function run() {
  console.log('🚀 Setting up LEFT THE CHAT...\n')

  // Create collections
  const collections = [
    { id: 'students', name: 'Students' },
    { id: 'settings', name: 'Settings' },
    { id: 'messages', name: 'Messages' },
    { id: 'slambooks', name: 'Slam Books' },
    { id: 'votes', name: 'Votes' },
    { id: 'superlatives', name: 'Superlatives' },
    { id: 'unsent', name: 'Unsent' },
    { id: 'futureself', name: 'Future Self' },
  ]

  for (const col of collections) {
    try {
      await databases.createCollection(DB, col.id, col.name, [
        'read("any")', 'create("any")', 'update("any")', 'delete("any")'
      ])
      console.log(`✅ Collection: ${col.name}`)
    } catch (e) {
      if (e.code === 409) console.log(`⏭️  Collection: ${col.name} (already exists)`)
      else console.log(`❌ Collection ${col.name}: ${e.message}`)
    }
  }

  // ─── STUDENTS attributes ───
  console.log('\n📋 Adding attributes to students...')
  for (const a of [
    { key: 'name', size: 255, required: true },
    { key: 'code', size: 255, required: true },
    { key: 'questions', size: 10000, required: false },
    { key: 'lockedUntil', size: 255, required: false },
    { key: 'photoURL', size: 2000, required: false },
  ]) {
    try {
      await databases.createStringAttribute(DB, 'students', a.key, a.size, a.required)
      console.log(`  ✅ ${a.key} (string)`)
    } catch (e) {
      if (e.code === 409) console.log(`  ⏭️  ${a.key} (exists)`)
      else console.log(`  ❌ ${a.key}: ${e.message}`)
    }
  }
  for (const key of ['banned', 'slamBookFilled']) {
    try {
      await databases.createBooleanAttribute(DB, 'students', key, false, false)
      console.log(`  ✅ ${key} (boolean)`)
    } catch (e) {
      if (e.code === 409) console.log(`  ⏭️  ${key} (exists)`)
      else console.log(`  ❌ ${key}: ${e.message}`)
    }
  }
  try {
    await databases.createIntegerAttribute(DB, 'students', 'attempts', false, 0, 999, 0)
    console.log('  ✅ attempts (integer)')
  } catch (e) {
    if (e.code === 409) console.log('  ⏭️  attempts (exists)')
    else console.log(`  ❌ attempts: ${e.message}`)
  }

  // ─── SETTINGS attributes ───
  console.log('\n📋 Adding attributes to settings...')
  for (const a of [
    { key: 'password', size: 255, required: false },
    { key: 'classQuestions', size: 10000, required: false },
    { key: 'awardsCategories', size: 10000, required: false },
    { key: 'awardsRevealDate', size: 255, required: false },
    { key: 'superlatives', size: 10000, required: false },
  ]) {
    try {
      await databases.createStringAttribute(DB, 'settings', a.key, a.size, a.required)
      console.log(`  ✅ ${a.key}`)
    } catch (e) {
      if (e.code === 409) console.log(`  ⏭️  ${a.key} (exists)`)
      else console.log(`  ❌ ${a.key}: ${e.message}`)
    }
  }

  // ─── MESSAGES attributes ───
  console.log('\n📋 Adding attributes to messages...')
  for (const a of [
    { key: 'from', size: 255, required: true },
    { key: 'to', size: 255, required: true },
    { key: 'text', size: 5000, required: true },
    { key: 'createdAt', size: 255, required: true },
  ]) {
    try {
      await databases.createStringAttribute(DB, 'messages', a.key, a.size, a.required)
      console.log(`  ✅ ${a.key}`)
    } catch (e) {
      if (e.code === 409) console.log(`  ⏭️  ${a.key} (exists)`)
      else console.log(`  ❌ ${a.key}: ${e.message}`)
    }
  }
  for (const key of ['isAnonymous', 'read', 'reported']) {
    try {
      await databases.createBooleanAttribute(DB, 'messages', key, false, false)
      console.log(`  ✅ ${key}`)
    } catch (e) {
      if (e.code === 409) console.log(`  ⏭️  ${key} (exists)`)
      else console.log(`  ❌ ${key}: ${e.message}`)
    }
  }

  // ─── SLAMBOOKS attributes ───
  console.log('\n📋 Adding attributes to slambooks...')
  for (const a of [
    { key: 'rollNo', size: 255, required: true },
    { key: 'answers', size: 10000, required: true },
    { key: 'reactions', size: 10000, required: true },
    { key: 'createdAt', size: 255, required: true },
  ]) {
    try {
      await databases.createStringAttribute(DB, 'slambooks', a.key, a.size, a.required)
      console.log(`  ✅ ${a.key}`)
    } catch (e) {
      if (e.code === 409) console.log(`  ⏭️  ${a.key} (exists)`)
      else console.log(`  ❌ ${a.key}: ${e.message}`)
    }
  }

  // ─── VOTES attributes ───
  console.log('\n📋 Adding attributes to votes...')
  for (const a of [
    { key: 'category', size: 255, required: true },
    { key: 'voter', size: 255, required: true },
    { key: 'nominee', size: 255, required: true },
    { key: 'createdAt', size: 255, required: true },
  ]) {
    try {
      await databases.createStringAttribute(DB, 'votes', a.key, a.size, a.required)
      console.log(`  ✅ ${a.key}`)
    } catch (e) {
      if (e.code === 409) console.log(`  ⏭️  ${a.key} (exists)`)
      else console.log(`  ❌ ${a.key}: ${e.message}`)
    }
  }

  // ─── SUPERLATIVES attributes ───
  console.log('\n📋 Adding attributes to superlatives...')
  for (const a of [
    { key: 'poll', size: 255, required: true },
    { key: 'voter', size: 255, required: true },
    { key: 'winner', size: 255, required: true },
    { key: 'createdAt', size: 255, required: true },
  ]) {
    try {
      await databases.createStringAttribute(DB, 'superlatives', a.key, a.size, a.required)
      console.log(`  ✅ ${a.key}`)
    } catch (e) {
      if (e.code === 409) console.log(`  ⏭️  ${a.key} (exists)`)
      else console.log(`  ❌ ${a.key}: ${e.message}`)
    }
  }

  // ─── UNSENT attributes ───
  console.log('\n📋 Adding attributes to unsent...')
  for (const a of [
    { key: 'text', size: 5000, required: true },
    { key: 'createdAt', size: 255, required: true },
  ]) {
    try {
      await databases.createStringAttribute(DB, 'unsent', a.key, a.size, a.required)
      console.log(`  ✅ ${a.key}`)
    } catch (e) {
      if (e.code === 409) console.log(`  ⏭️  ${a.key} (exists)`)
      else console.log(`  ❌ ${a.key}: ${e.message}`)
    }
  }
  try {
    await databases.createBooleanAttribute(DB, 'unsent', 'reported', false, false)
    console.log('  ✅ reported')
  } catch (e) {
    if (e.code === 409) console.log('  ⏭️  reported (exists)')
    else console.log(`  ❌ reported: ${e.message}`)
  }

  // ─── FUTURESELF attributes ───
  console.log('\n📋 Adding attributes to futureself...')
  for (const a of [
    { key: 'text', size: 10000, required: true },
    { key: 'unlockDate', size: 255, required: true },
    { key: 'createdAt', size: 255, required: true },
  ]) {
    try {
      await databases.createStringAttribute(DB, 'futureself', a.key, a.size, a.required)
      console.log(`  ✅ ${a.key}`)
    } catch (e) {
      if (e.code === 409) console.log(`  ⏭️  ${a.key} (exists)`)
      else console.log(`  ❌ ${a.key}: ${e.message}`)
    }
  }
  try {
    await databases.createBooleanAttribute(DB, 'futureself', 'delivered', false, false)
    console.log('  ✅ delivered')
  } catch (e) {
    if (e.code === 409) console.log('  ⏭️  delivered (exists)')
    else console.log(`  ❌ delivered: ${e.message}`)
  }

  // ─── INDEXES ───
  console.log('\n📋 Creating indexes (waiting 5s for attributes)...')
  await new Promise(r => setTimeout(r, 5000))

  const indexes = [
    { col: 'messages', key: 'idx_to_read', attrs: ['to', 'read'] },
    { col: 'messages', key: 'idx_reported', attrs: ['reported'] },
    { col: 'messages', key: 'idx_createdAt', attrs: ['createdAt'], orders: ['DESC'] },
    { col: 'votes', key: 'idx_category', attrs: ['category'] },
    { col: 'votes', key: 'idx_voter', attrs: ['voter'] },
    { col: 'superlatives', key: 'idx_poll', attrs: ['poll'] },
    { col: 'superlatives', key: 'idx_voter', attrs: ['voter'] },
    { col: 'unsent', key: 'idx_createdAt', attrs: ['createdAt'], orders: ['DESC'] },
  ]

  for (const idx of indexes) {
    try {
      await databases.createIndex(DB, idx.col, idx.key, 'key', idx.attrs, idx.orders || [])
      console.log(`  ✅ ${idx.col}.${idx.key}`)
    } catch (e) {
      if (e.code === 409) console.log(`  ⏭️  ${idx.col}.${idx.key} (exists)`)
      else console.log(`  ❌ ${idx.col}.${idx.key}: ${e.message}`)
    }
  }

  // ─── STORAGE BUCKET ───
  console.log('\n📋 Creating storage bucket...')
  try {
    await storage.createBucket('photos', 'Photos', [
      'read("any")', 'create("any")', 'update("any")', 'delete("any")'
    ])
    console.log('✅ Bucket: photos')
  } catch (e) {
    if (e.code === 409) console.log('⏭️  Bucket: photos (already exists)')
    else console.log(`❌ Bucket: ${e.message}`)
  }

  // ─── SEED ADMIN PASSWORD ───
  console.log('\n📋 Creating admin settings...')
  await new Promise(r => setTimeout(r, 3000))
  try {
    await databases.createDocument(DB, 'settings', 'admin', {
      password: 'admin123'
    })
    console.log('✅ Admin password set to: admin123 (change this in /admin!)')
  } catch (e) {
    if (e.code === 409) console.log('⏭️  Admin settings already exist')
    else console.log(`❌ Admin settings: ${e.message}`)
  }

  console.log('\n🎉 DONE! Run `npm run dev` and go to /admin to start adding students.')
  console.log('⚠️  Remember to change the admin password from "admin123"!')
}

run().catch(e => console.error('Fatal:', e.message))
