const express = require("express");
const bcrypt = require("bcryptjs");
const { getDb } = require("../db");
const { sendVerificationEmail, smtpConfigured } = require("../mail");

const router = express.Router();

function isSvsuEmail(email) {
  return typeof email === "string" && email.toLowerCase().endsWith("@svsu.edu");
}

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.get("/register", (req, res) => {
  res.render("register", { title: "Register", error: null });
});

router.post("/register", async (req, res) => {
  const db = getDb();
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = (req.body.password || "");

  if (!name || !email || !password) {
    return res.render("register", { title: "Register", error: "All fields are required." });
  }
  if (!isSvsuEmail(email)) {
    return res.render("register", { title: "Register", error: "Email must be an @svsu.edu address." });
  }
  if (password.length < 8) {
    return res.render("register", { title: "Register", error: "Password must be at least 8 characters." });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const code = genCode();
  const expiresAt = Date.now() + 15 * 60 * 1000;

  db.run(
    `INSERT INTO users (name, email, password_hash, verified, verify_code, verify_expires_at, created_at)
     VALUES (?, ?, ?, 0, ?, ?, ?)`,
    [name, email, passwordHash, code, expiresAt, Date.now()],
    async function (err) {
      if (err) {
        const msg = String(err.message || "");
        if (msg.includes("UNIQUE")) {
          return res.render("register", { title: "Register", error: "That email is already registered." });
        }
        console.error(err);
        return res.render("register", { title: "Register", error: "Registration failed." });
      }

      // Log in (unverified)
      req.session.user = { id: this.lastID, name, email, verified: 0 };

      // Attempt email send
      let emailed = false;
      try {
        emailed = await sendVerificationEmail(email, code);
      } catch (e) {
        console.warn("Email send failed:", e.message);
      }

      // If not emailed, show code on verify page (local dev)
      req.session.dev_verify_code = emailed ? null : code;

      res.redirect("/verify");
    }
  );
});

router.get("/verify", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.render("verify", {
    title: "Verify email",
    error: null,
    devCode: req.session.dev_verify_code || null,
    smtpOn: smtpConfigured()
  });
});

router.post("/verify", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  const db = getDb();
  const code = (req.body.code || "").trim();

  db.get(`SELECT id, verify_code, verify_expires_at FROM users WHERE id = ?`, [req.session.user.id], (err, row) => {
    if (err || !row) {
      return res.render("verify", { title: "Verify email", error: "Could not load user.", devCode: null, smtpOn: smtpConfigured() });
    }

    const expired = !row.verify_expires_at || Date.now() > row.verify_expires_at;
    if (expired) {
      return res.render("verify", { title: "Verify email", error: "Code expired. Log out and re-register.", devCode: req.session.dev_verify_code || null, smtpOn: smtpConfigured() });
    }

    if (code !== row.verify_code) {
      return res.render("verify", { title: "Verify email", error: "Incorrect code.", devCode: req.session.dev_verify_code || null, smtpOn: smtpConfigured() });
    }

    db.run(`UPDATE users SET verified = 1, verify_code = NULL, verify_expires_at = NULL WHERE id = ?`, [row.id], (err2) => {
      if (err2) {
        console.error(err2);
        return res.render("verify", { title: "Verify email", error: "Could not verify.", devCode: req.session.dev_verify_code || null, smtpOn: smtpConfigured() });
      }
      req.session.user.verified = 1;
      req.session.dev_verify_code = null;
      res.redirect("/");
    });
  });
});

router.get("/login", (req, res) => {
  res.render("login", { title: "Log in", error: null });
});

router.post("/login", (req, res) => {
  const db = getDb();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = (req.body.password || "");

  db.get(`SELECT id, name, email, password_hash, verified FROM users WHERE email = ?`, [email], async (err, row) => {
    if (err || !row) {
      return res.render("login", { title: "Log in", error: "Invalid email or password." });
    }
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.render("login", { title: "Log in", error: "Invalid email or password." });

    req.session.user = { id: row.id, name: row.name, email: row.email, verified: row.verified };
    res.redirect("/");
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

module.exports = router;
