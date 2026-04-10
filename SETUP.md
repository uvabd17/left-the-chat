# LEFT THE CHAT — Setup Guide (Appwrite)

## 1. Create Appwrite Project

1. Go to [Appwrite Cloud Console](https://cloud.appwrite.io/)
2. Sign up / log in
3. Click **Create Project** → name it "left-the-chat"
4. Copy your **Project ID** from the project settings

## 2. Update Config

Open `src/appwrite/client.js` and fill in:

```js
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('YOUR_PROJECT_ID')    // ← paste your project ID here

export const DB_ID = 'YOUR_DATABASE_ID'   // ← from step 3
export const BUCKET_ID = 'photos'          // ← from step 5
```

## 3. Create Database

1. In Appwrite Console → **Databases** → **Create database**
2. Name: "main" (or anything)
3. Copy the **Database ID** → paste into `client.js` as `DB_ID`

## 4. Create Collections

Create these 8 collections inside your database. For each collection, set **Permissions** to: `Any` role → `create, read, update, delete` (for development — tighten later).

### Collection: `students`
Document ID: Custom (roll number)
| Attribute | Type | Required |
|---|---|---|
| name | string (255) | yes |
| code | string (255) | yes |
| questions | string (10000) | no |
| banned | boolean | no |
| attempts | integer | no |
| lockedUntil | string (255) | no |
| slamBookFilled | boolean | no |
| photoURL | string (2000) | no |

> For `questions`, store as JSON string: `[{"question":"...","answer":"..."}]`
> Create an **index** on: `name` (for listing)

### Collection: `settings`
Document ID: Custom ("class", "admin")
| Attribute | Type | Required |
|---|---|---|
| password | string (255) | no |
| classQuestions | string (10000) | no |
| awardsCategories | string (10000) | no |
| awardsRevealDate | string (255) | no |
| superlatives | string (10000) | no |

> Store arrays as JSON strings

### Collection: `messages`
Document ID: Auto
| Attribute | Type | Required |
|---|---|---|
| from | string (255) | yes |
| to | string (255) | yes |
| text | string (5000) | yes |
| isAnonymous | boolean | yes |
| read | boolean | yes |
| reported | boolean | yes |
| createdAt | string (255) | yes |

> Create **indexes** on: `to` + `read` (compound), `reported`

### Collection: `slambooks`
Document ID: Custom (roll number)
| Attribute | Type | Required |
|---|---|---|
| rollNo | string (255) | yes |
| answers | string (10000) | yes |
| reactions | string (10000) | yes |
| createdAt | string (255) | yes |

> `answers` and `reactions` are JSON strings

### Collection: `votes`
Document ID: Custom (categoryId_voterRollNo)
| Attribute | Type | Required |
|---|---|---|
| category | string (255) | yes |
| voter | string (255) | yes |
| nominee | string (255) | yes |
| createdAt | string (255) | yes |

> Create **indexes** on: `category`, `voter`

### Collection: `superlatives`
Document ID: Custom (pollId_voterRollNo)
| Attribute | Type | Required |
|---|---|---|
| poll | string (255) | yes |
| voter | string (255) | yes |
| winner | string (255) | yes |
| createdAt | string (255) | yes |

> Create **indexes** on: `poll`, `voter`

### Collection: `unsent`
Document ID: Auto
| Attribute | Type | Required |
|---|---|---|
| text | string (5000) | yes |
| createdAt | string (255) | yes |
| reported | boolean | yes |

> Create **index** on: `createdAt` (desc)

### Collection: `futureself`
Document ID: Custom (roll number)
| Attribute | Type | Required |
|---|---|---|
| text | string (10000) | yes |
| unlockDate | string (255) | yes |
| delivered | boolean | yes |
| createdAt | string (255) | yes |

## 5. Create Storage Bucket

1. In Appwrite Console → **Storage** → **Create bucket**
2. Name: "photos", Bucket ID: "photos"
3. Set permissions: `Any` role → `create, read, update, delete`
4. Max file size: 2MB
5. Allowed file extensions: jpg, jpeg, png, webp

## 6. Set Up Initial Data

### Admin password
In the `settings` collection, create a document:
- Document ID: `admin`
- password: `"your-admin-password"`

### Class quiz questions
In the `settings` collection, create a document:
- Document ID: `class`
- classQuestions: `[{"question":"Who is the CR?","answer":"Yuvaraj"}]`
- awardsCategories: `[]`
- awardsRevealDate: `""`
- superlatives: `[]`

> Or just use the Admin Panel at `/admin` to set these up via UI.

## 7. Run the App

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

## 8. Test Flow

1. Go to `/admin` → enter admin password
2. Add a test student (Students tab)
3. Set up class quiz questions (Settings tab)
4. Go to `/login` → enter roll number → code → quiz → fill slam book
5. You should land on the dashboard

## 9. Deploy

```bash
npm run build
```

Deploy the `dist/` folder to:
- **Vercel** — connect repo, auto-deploys
- **Netlify** — drag and drop `dist/`
- **Appwrite Hosting** — if available in your plan

## Important Notes

- **No credit card** required for Appwrite Cloud free tier
- Free tier: 75K requests/month, 2GB database, 2GB storage
- For 71 students this is way more than enough
- Store JSON arrays as strings in Appwrite (it doesn't support nested objects natively)
- The app handles JSON parsing/stringifying automatically in `db.js`
