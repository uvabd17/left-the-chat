# Farewell Class App

A private farewell web app for a college batch of 71 students. Built with React + Vite + Firebase. Students log in with a roll number + unique code + class quiz. The app has 8 features: entry gate, slam book, burn-after-read messages, class awards voting, superlatives poll, unsent messages wall, message to future self, and an admin panel.

See @SETUP.md for Firebase and Gemma 4 API key setup instructions.

---

## Project structure

```
farewell-app/
├── index.html
├── vite.config.js
├── package.json
├── firestore.rules
├── SETUP.md
└── src/
    ├── main.jsx                  # React entry point
    ├── App.jsx                   # Router — all routes defined here
    ├── firebase/
    │   ├── config.js             # Firebase init — keys already filled in by user
    │   ├── db.js                 # All Firestore CRUD functions (complete)
    │   └── moderation.js        # Gemma 4 API + keyword blacklist (complete)
    ├── pages/
    │   ├── AdminPanel.jsx        # COMPLETE — do not modify unless asked
    │   ├── Login.jsx             # TODO — Phase 2
    │   ├── Dashboard.jsx         # TODO — Phase 2
    │   ├── SlamBook.jsx          # TODO — Phase 3
    │   ├── Messages.jsx          # TODO — Phase 3
    │   ├── Awards.jsx            # TODO — Phase 3
    │   ├── Superlatives.jsx      # TODO — Phase 3
    │   ├── UnsentWall.jsx        # TODO — Phase 3
    │   └── FutureSelf.jsx        # TODO — Phase 3
    ├── components/               # Shared UI components
    └── styles/                   # Global styles if needed
```

---

## Tech stack

- **React 18** with Vite (not CRA)
- **React Router v6** for routing
- **Firebase v10** — Firestore for DB, no Firebase Auth (custom session via localStorage)
- **Gemma 4 API** (Google AI Studio) for message moderation
- **DM Sans** font from Google Fonts (already in index.html)
- No CSS framework — plain inline styles or CSS modules only
- No TypeScript — plain JavaScript

---

## Commands

```bash
npm install        # install deps
npm run dev        # dev server at localhost:5173
npm run build      # production build
npm run preview    # preview production build
```

---

## Session management (important)

There is NO Firebase Auth. Session is managed manually:
- On successful login, store `{ rollNo, name }` in `localStorage` as key `farewell_session`
- On every protected page, check localStorage at the top — if missing, redirect to `/login`
- On logout, clear localStorage and redirect to `/login`
- Helper functions for this go in `src/utils/auth.js`

---

## Entry gate logic (important — get this right)

Login flow has 3 layers, all must pass:
1. Roll number must exist in Firestore `students` collection
2. Student must not be banned (`banned !== true`)
3. Student must not be locked out (`lockedUntil` must be null or in the past)
4. Unique code must match exactly (case-insensitive comparison)
5. All class-level questions from `settings/class` must be answered correctly (case-insensitive, trimmed)

On wrong answer: call `recordFailedAttempt(rollNo)` from db.js — 3 failures = 1 hour lockout.
On success: call `resetAttempts(rollNo)` then save session.

---

## Messaging rules (important)

Before sending a message:
1. Sender must answer all of recipient's personal questions correctly (from `students/{toRollNo}.questions`)
2. Message text must pass `moderateMessage()` from moderation.js
3. If moderation blocks it, show the reason to the user — do NOT send
4. Sender cannot message themselves
5. Use `sendMessage()` from db.js

Burn after read: when recipient opens a message, call `markMessageRead(messageId)` which DELETES it from Firestore — no second chance.

---

## Design system

All pages use this dark theme — keep it consistent:

```js
colors = {
  bg: "#0f0f11",
  surface: "#18181c",
  border: "#2a2a30",
  textPrimary: "#e8e6e0",
  textSecondary: "#999",
  textMuted: "#555",
  accent: "#6c63ff",
  success: "#2ecc71",
  danger: "#e74c3c",
  warning: "#f39c12",
}

borderRadius = 8px (inputs, buttons), 12px (cards)
font = "DM Sans", sans-serif
```

Cards: `background: #18181c`, `border: 1px solid #2a2a30`, `border-radius: 12px`, `padding: 20px`
Buttons: `background: #6c63ff`, `color: #fff`, `border: none`, `border-radius: 8px`, `padding: 11px 20px`
Inputs: `background: #0f0f11`, `border: 1px solid #2a2a30`, `border-radius: 8px`, `padding: 9px 12px`, `color: #e8e6e0`

---

## Firestore collections

| Collection | Document ID | Key fields |
|---|---|---|
| `students` | rollNo | name, code, questions[], banned, attempts, lockedUntil, slamBookFilled |
| `settings` | "class" | classQuestions[], awardsCategories[], awardsRevealDate, superlatives[] |
| `messages` | auto | from, to, text, isAnonymous, read, reported, createdAt |
| `slambooks` | rollNo | rollNo, answers{}, reactions{} |
| `votes` | `{categoryId}_{voterRollNo}` | category, voter, nominee |
| `unsent` | auto | text, createdAt, reported |
| `futureself` | rollNo | text, unlockDate, email, delivered |
| `superlatives` | `{pollId}_{voterRollNo}` | poll, voter, winner |

All db functions are already written in `src/firebase/db.js` — import and use them, do not rewrite.

---

## What is already done (Phase 1)

- `src/firebase/config.js` — Firebase config (user fills in keys)
- `src/firebase/db.js` — all database functions
- `src/firebase/moderation.js` — Gemma 4 moderation + Telugu/English keyword blacklist
- `src/pages/AdminPanel.jsx` — full admin panel with students, settings, reported, unsent tabs
- `src/App.jsx` — routing skeleton
- `firestore.rules` — security rules
- `SETUP.md` — setup guide

---

## What needs to be built (Phase 2 — start here)

### 1. `src/utils/auth.js`
```
getSession() → { rollNo, name } | null
saveSession(rollNo, name) → void
clearSession() → void
```

### 2. `src/pages/Login.jsx`
- Route: `/login`
- Step 1: Input roll number → fetch student from Firestore → check exists, not banned, not locked
- Step 2: Input unique code → verify match
- Step 3: Answer class questions fetched from `settings/class` → verify all correct
- On success: save session, redirect to `/dashboard`
- Show lockout timer if locked out
- Beautiful dark UI matching design system above

### 3. `src/pages/Dashboard.jsx`
- Route: `/dashboard` (protected)
- Shows welcome message with student name
- Cards/buttons for all 8 features
- Show unread message count badge (fetch from messages where to == rollNo and read == false)
- Show whether slam book is filled (if not, prompt to fill)
- Header with student name + logout button

---

## What needs to be built (Phase 3 — after Phase 2 works)

Build these one at a time. Each is a separate page:

### 4. `src/pages/SlamBook.jsx` — Route: `/slam`
- First login: show form to fill slam book (5 questions, defined below)
- After filled: show your own slam book + all classmates' slam books
- Emoji reaction bar on each slam book (😂 ❤️ 🔥 👏 😭) — one reaction per person per slam book
- Slam book questions: "Your most embarrassing college memory", "One thing nobody knows about you", "Your honest opinion of this class", "What are you doing in 10 years?", "One word for college life"

### 5. `src/pages/Messages.jsx` — Route: `/messages`
- Left panel: list of classmates (from all students)
- Click a classmate → quiz them (answer their personal questions from Firestore)
- Pass quiz → show message compose box
- Optional anonymous toggle
- On send: run moderation, if blocked show reason, else call sendMessage()
- Right panel: your inbox — show count of unread messages
- Click "Read message" → show message with dramatic burn animation → call markMessageRead() → gone
- Report button before burning

### 6. `src/pages/Awards.jsx` — Route: `/awards`
- Show all award categories from settings
- For each category: show list of all classmates to vote for (exclude self)
- One vote per category per person — if already voted, show who they voted for
- Results section: hidden until awardsRevealDate — show countdown timer if not revealed yet
- After reveal: show winner + vote count per nominee as a bar chart

### 7. `src/pages/Superlatives.jsx` — Route: `/superlatives`
- Show each poll as a head-to-head card: "Name A vs Name B — [question]"
- Big vote buttons for each option
- Live vote percentage bars update after voting
- One vote per poll per person

### 8. `src/pages/UnsentWall.jsx` — Route: `/unsent`
- Scrollable wall of anonymous one-liners
- Input box at top to post new one
- Run moderation before posting
- No reactions, no names — just the messages
- Newest first

### 9. `src/pages/FutureSelf.jsx` — Route: `/future`
- If already written: show "Your message is sealed until [date]" — no editing
- If not written: text area + date picker (min 1 year from today) + email input
- On submit: save to Firestore via saveFutureSelfMessage()
- Note: actual email delivery is out of scope — just store it; admin can handle delivery manually

---

## Code style

- Functional components only, hooks for state
- Import db functions from `../firebase/db` — never call Firestore directly in pages
- Import moderation from `../firebase/moderation`
- All styles inline (style={{}}) — no separate CSS files unless absolutely needed
- Handle loading states (show a spinner or "Loading..." text)
- Handle errors gracefully — show user-friendly messages, never raw error objects
- Use async/await, not .then() chains
- No console.logs in final code

---

## IMPORTANT rules

- Never modify `src/firebase/db.js` or `src/firebase/moderation.js` unless explicitly asked
- Never modify `src/pages/AdminPanel.jsx` unless explicitly asked
- Always check session at the top of every protected page — redirect to /login if missing
- Always run moderation before sending any user-generated message content
- The burn-after-read mechanic is critical — markMessageRead() DELETES the message, not just marks it read
- Keep all pages consistent with the dark design system
- Awards results must be fully hidden (not just greyed out) before the reveal date
