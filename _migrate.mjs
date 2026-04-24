import { Client, Databases, Query } from 'node-appwrite'
import fs from 'fs'
import os from 'os'

const prefs = JSON.parse(fs.readFileSync(os.homedir() + '/.appwrite/prefs.json', 'utf8'))
const profile = prefs[prefs.current]
const client = new Client()
  .setEndpoint(profile.endpoint)
  .setProject('left-the-chat')
  .setKey(profile.key)
const db = new Databases(client)

const DRY_RUN = process.argv.includes('--dry-run')

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

async function main() {
  // 1. Fetch current polls
  const settings = await db.getDocument('main', 'settings', 'class')
  const polls = JSON.parse(settings.superlatives || '[]')
  console.log(`Current polls: ${polls.length}`)

  // 2. Backfill stable IDs where missing
  let backfilled = 0
  const withIds = polls.map(p => {
    if (p && typeof p === 'object' && p.id) return p
    backfilled++
    return { ...p, id: genId() }
  })
  console.log(`Polls needing ID backfill: ${backfilled}`)

  // Build set of valid (pollId, winner) pairs from CURRENT polls
  const validMap = new Map()
  withIds.forEach(p => {
    validMap.set(p.id, new Set([p.optionA, p.optionB]))
  })

  // Also keep old index-based mapping so we can detect position-based votes too
  const indexMap = new Map()
  withIds.forEach((p, i) => {
    indexMap.set(`poll_${i}`, new Set([p.optionA, p.optionB]))
  })

  // 3. Fetch all superlative votes
  const allVotes = []
  let offset = 0
  while (true) {
    const page = await db.listDocuments('main', 'superlatives', [Query.limit(100), Query.offset(offset)])
    allVotes.push(...page.documents)
    if (page.documents.length < 100) break
    offset += 100
  }
  console.log(`Total vote docs: ${allVotes.length}`)

  // 4. Classify each vote: valid (matches current pollId or index) or stale
  const stale = []
  const valid = []
  for (const v of allVotes) {
    // Does it match a current stable poll id?
    const byId = validMap.get(v.poll)
    if (byId && byId.has(v.winner)) { valid.push(v); continue }
    // Does it match a current index-based position with right winner?
    const byIdx = indexMap.get(v.poll)
    if (byIdx && byIdx.has(v.winner)) { valid.push(v); continue }
    // Otherwise stale
    stale.push(v)
  }
  console.log(`Valid votes: ${valid.length}`)
  console.log(`Stale votes: ${stale.length}`)

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes made.')
    console.log('Sample stale votes (up to 5):')
    stale.slice(0, 5).forEach(v => console.log(`  ${v.$id}: poll=${v.poll} voter=${v.voter} winner=${v.winner}`))
    return
  }

  // 5. Save updated settings with IDs
  if (backfilled > 0) {
    await db.updateDocument('main', 'settings', 'class', {
      superlatives: JSON.stringify(withIds)
    })
    console.log(`Updated settings with ${backfilled} new poll IDs`)
  }

  // 6. Delete stale votes
  let deleted = 0
  for (const v of stale) {
    try {
      await db.deleteDocument('main', 'superlatives', v.$id)
      deleted++
      if (deleted % 20 === 0) console.log(`  deleted ${deleted}...`)
    } catch (err) {
      console.log(`  failed to delete ${v.$id}: ${err.message}`)
    }
  }
  console.log(`Deleted ${deleted} stale votes`)
  console.log('Done.')
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
