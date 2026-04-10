import { Client, Databases, Storage, ID, Query } from 'appwrite'

const client = new Client()
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('left-the-chat')

export const databases = new Databases(client)
export const storage = new Storage(client)
export { ID, Query }

// IDs — fill these after creating collections in Appwrite console
export const DB_ID = 'main'
export const BUCKET_ID = 'photos'

export const COLLECTIONS = {
  students: 'students',
  settings: 'settings',
  messages: 'messages',
  slambooks: 'slambooks',
  votes: 'votes',
  superlatives: 'superlatives',
  unsent: 'unsent',
  futureself: 'futureself'
}
