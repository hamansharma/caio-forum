# Copilot instructions for caio-forum

Purpose: quick reference for automated/code-assistant sessions working in this repo.

---

## Quick commands

- Start (dev):
  - npm start
- Build (production):
  - npm run build
- Test (watch):
  - npm test
  - Run a single test file (watch mode):
    - npm test -- src/components/PostCard.test.jsx
  - Run a single test by name (watch mode):
    - npm test -- -t "renders post title"
  - Run tests once (non-interactive):
    - CI=true npm test -- --watchAll=false
- Eject (one-way):
  - npm run eject

Note: there is no repo-provided "lint" npm script. ESLint config is present (extends react-app). To run ESLint manually:

- npx eslint "src/**/*.{js,jsx}" --ext .js,.jsx

---

## High-level architecture

- Create React App SPA using react-router for routes defined in src/App.js:
  - / → Home
  - /post/:id → PostDetail
  - /create → CreatePost
- Global state & API wrapper: src/context/ForumContext.js (exported useForum hook)
  - Manages auth, posts, votes, comments and exposes methods: signup, login, logout, addPost, votePost, addComment, voteComment.
  - Subscribes to Firestore posts collection with an onSnapshot real-time listener.
- Firebase integration: src/firebase.js
  - Uses Firestore (getFirestore) and Firebase Auth (getAuth).
  - Config via REACT_APP_FIREBASE_* environment variables.
- Data & UI
  - Pages: src/pages/* (Home, PostDetail, CreatePost)
  - Reusable components: src/components/* (MarkdownEditor, MarkdownRenderer, Navbar, PostCard, CommentThread, AuthModal, etc.)
  - Markdown rendering uses react-markdown + remark-gfm.
- Seed data: src/data/seed.js contains INITIAL_POSTS and CATEGORIES; a seed button is commented out in App.js for manual DB seeding.

---

## Data model & runtime conventions (important for automation)

- Firestore collections used:
  - posts: documents with fields: title, body, category, author, authorFullName, createdAt (serverTimestamp), votes (number), comments (array)
  - users: documents keyed by uid with fields: email, fullName, username, votedPosts, votedComments
- Comments are stored inline on the parent post document (posts[].comments) — not a separate collection. Comment objects look like: { id, postId, parentId, author, body, votes, createdAt }.
- Comment IDs are generated client-side (Date.now().toString()). Posts use Firestore serverTimestamp for consistency; comments use ISO strings in some code paths. Be careful when comparing/sorting timestamps — createdAt can be mixed types.
- Voting:
  - Posts use Firestore increment() for atomic updates.
  - User vote state is mirrored in users.<uid>.votedPosts / votedComments and in local context (votedPosts/votedComments) for optimistic UI.
- Auth flow:
  - onAuthStateChanged loads the user's profile from users collection; signup writes a users doc during account creation. Login assumes a users profile exists.

---

## Key repository conventions for assistants

- Do not refactor the data shape (move comments to their own collection) without providing a migration plan and updating every consumer (ForumContext, PostDetail rendering, seed data).
- When suggesting changes to Firestore reads/writes, preserve the existing use of onSnapshot for the posts list unless a clear benefit (and migration) to batched queries/collections is provided.
- Tests: testing libraries are installed but there are currently no dedicated test files included; add tests under src/** with .test.js/.test.jsx and use the npm test patterns above.
- Environment variables: Firebase config is read from REACT_APP_FIREBASE_* variables. Do not hardcode secrets — use env or .env local overrides.
- Styling: plain .css files live alongside components (no CSS modules or Tailwind present). Keep imports consistent with existing pattern.

---

## Files worth opening first

- src/context/ForumContext.js — central logic for data and auth
- src/firebase.js — Firebase initialization and required env vars
- src/pages/* and src/components/* — UI and rendering flow
- src/data/seed.js — seed content and categories

---

## Existing AI assistant / helper files checked

No CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules, or other common AI assistant rules files were found in the repo root. (If present, incorporate into this guidance.)

---

If making automated code changes, include tests or a migration step for any data-model changes that affect production Firestore documents.