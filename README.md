# caio-forum

A small Create React App single-page forum demo using Firebase (Firestore + Auth). Posts, comments, and votes are stored in Firestore; authentication uses Firebase Auth. The UI uses react-markdown for post content and react-router for navigation.

## Features
- Real-time posts list (Firestore onSnapshot)
- Client-side auth (signup/login) with profile docs in users collection
- Inline comments stored on the post document
- Upvote/downvote with optimistic UI backed by Firestore increment()
- Markdown editor and renderer with GFM support
- Seed data available in src/data/seed.js (optional)

## Tech stack
- React (Create React App)
- Firebase: Firestore + Auth
- react-router, react-markdown, remark-gfm
- Testing libs: @testing-library/react, jest
- Small CSS files alongside components (no CSS frameworks)

## Quick start (local)
1. Clone:
   git clone <repo-url>
   cd caio-forum
2. Install:
   npm install
3. Environment:
   Create a .env.local with:
   REACT_APP_FIREBASE_API_KEY=
   REACT_APP_FIREBASE_AUTH_DOMAIN=
   REACT_APP_FIREBASE_PROJECT_ID=
   REACT_APP_FIREBASE_STORAGE_BUCKET=
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
   REACT_APP_FIREBASE_APP_ID=
4. Run dev server:
   npm start
   Open http://localhost:3000

## Google Health connection (private beta)

The `/health` page is a private, signed-in user flow. It starts Google OAuth for Google Health on the server, encrypts access and refresh tokens before they are saved, and only returns connection status or an identity-verification result to the browser. It does not yet sync or chart health measurements.

Create a Google Cloud OAuth client for the Google Health API and register this exact callback URL:

```
https://<your-domain>/api/google-health/callback
```

Google Health requires Google OAuth and HTTPS. Add the following **server-only** variables to Vercel (and to a local server environment). Do not prefix them with `REACT_APP_`, and never commit them:

```
GOOGLE_HEALTH_CLIENT_ID=
GOOGLE_HEALTH_CLIENT_SECRET=
GOOGLE_HEALTH_REDIRECT_URI=https://<your-domain>/api/google-health/callback
HEALTH_TOKEN_ENCRYPTION_KEY=   # base64 encoding of exactly 32 random bytes
APP_URL=https://<your-domain>

# Firebase Admin service account — server-only
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=    # preserve escaped \\n characters in Vercel
```

Generate the encryption key locally with `openssl rand -base64 32`; store the result only in your deployment secret manager. Rotating this key makes previously stored Google Health tokens unreadable, so use a deliberate key-rotation migration later.

### Firestore access requirement

The server stores encrypted credentials in `healthConnections/{uid}` and temporary OAuth state in `healthOAuthStates/{state}`. Add explicit **deny** rules for both collections to the Firestore rules deployed in Firebase. They must be readable and writable only through the Admin SDK; browser clients must never access them.

```
match /healthConnections/{document=**} { allow read, write: if false; }
match /healthOAuthStates/{document=**} { allow read, write: if false; }
```

## Build & deploy
- Build for production:
  npm run build
- Deploy the build folder to any static host (Netlify, Vercel, Firebase Hosting, etc.)

## Tests & lint
- Run tests (watch):
  npm test
- Run a single test file (watch):
  npm test -- src/components/PostCard.test.jsx
- Run a test by name:
  npm test -- -t "renders post title"
- Run tests once (CI):
  CI=true npm test -- --watchAll=false
- No lint npm script provided, but ESLint config extends react-app. Run:
  npx eslint "src/**/*.{js,jsx}" --ext .js,.jsx

## High-level architecture
- src/App.js: Router and route definitions:
  - / → Home
  - /post/:id → PostDetail
  - /create → CreatePost
- src/context/ForumContext.js: central provider and API surface (useForum hook). Handles:
  - Auth state (onAuthStateChanged)
  - Real-time posts subscription (onSnapshot)
  - Methods: signup, login, logout, addPost, votePost, addComment, voteComment
  - Persists user vote state to users/<uid> document
- src/firebase.js: initializes Firebase using REACT_APP_FIREBASE_* env vars
- Pages: src/pages/*
- Components: src/components/* (MarkdownEditor, MarkdownRenderer, Navbar, PostCard, CommentThread, AuthModal, etc.)
- Data: src/data/seed.js contains initial posts/categories; App has a commented seed button for manual seeding.

## Data model & important runtime notes
- Firestore collections:
  - posts — fields: title, body, category, author, authorFullName, createdAt (serverTimestamp), votes (number), comments (array)
  - users — keyed by uid: email, fullName, username, votedPosts, votedComments
- Comments: stored inline in the post document as an array (not a separate collection). Comment shape: { id, postId, parentId, author, body, votes, createdAt }.
- Timestamps:
  - Posts use serverTimestamp() (Firestore Timestamp).
  - Some comment code uses ISO strings (Date.toISOString()). When sorting/comparing, account for mixed timestamp types.
- Voting:
  - Posts use Firestore increment() for atomic updates.
  - User vote state is stored in users/<uid> and mirrored locally for optimistic UI.
- Auth:
  - Signup creates a users doc with profile fields; onAuthStateChanged fetches that profile.

## Seeding the DB
- Seed data: src/data/seed.js.
- A seed helper exists (commented button in App.js). If seeding into a live Firestore:
  - Verify env vars point to a test project.
  - Consider writing a small script to call addDoc/setDoc and avoid UI-triggered accidental seeds.

## Contributing / changes that affect data model
- Avoid moving comments out of the posts document to a new collection without:
  1. A migration path to update existing documents.
  2. Updating all consumers (ForumContext, PostDetail rendering, seed data).
- If changing Firestore usage (batched reads, new collections), update tests and provide a migration plan.

## Security & env
- Never commit Firebase keys/secrets. Use .env.local or CI secrets.
- Test any Firestore writes against a development project first.

## Files to inspect first (for newcomers)
- src/context/ForumContext.js
- src/firebase.js
- src/pages/Home.jsx, PostDetail.jsx, CreatePost.jsx
- src/components/PostCard.jsx, CommentThread.jsx, MarkdownEditor.jsx
- src/data/seed.js

---
