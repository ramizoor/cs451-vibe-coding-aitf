# SVSU AI Hub (AITF)

A small web app for CS451 vibe coding:
- SVSU-only accounts (@svsu.edu)
- Login + sessions
- Post **Internal AI Projects** announcements (title + description)
- Post **External AI News & Products** links (title + URL)
- Comment on any post

## How to Run

npm install
npm run dev


Then open http://localhost:3000

## Email verification

On registration, the app creates a 6-digit code.
- If SMTP is configured in `.env`, the code is emailed to the SVSU address.
- If SMTP is **not** configured, the code is shown on the verification page (so you can still demo the feature locally).

## Notes
This is intentionally simple (CS451 demo scale): Express + EJS + SQLite.
