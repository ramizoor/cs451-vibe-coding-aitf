const express = require("express");
const { getDb } = require("../db");
const { requireVerified } = require("../middleware");

const router = express.Router();

function sectionTitle(section) {
  return section === "internal" ? "Internal AI Projects" : "External AI News & Products";
}

router.get("/internal", (req, res) => {
  const db = getDb();
  db.all(`
    SELECT p.id, p.title, p.created_at, u.name as author_name
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.section = 'internal'
    ORDER BY p.created_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).send("DB error.");
    res.render("posts_list", { title: "Internal AI Projects", section: "internal", rows });
  });
});

router.get("/external", (req, res) => {
  const db = getDb();
  db.all(`
    SELECT p.id, p.title, p.created_at, u.name as author_name
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.section = 'external'
    ORDER BY p.created_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).send("DB error.");
    res.render("posts_list", { title: "External AI News & Products", section: "external", rows });
  });
});

router.get("/:section/new", requireVerified, (req, res) => {
  const section = req.params.section;
  if (section !== "internal" && section !== "external") return res.status(404).send("Not found");
  res.render("post_new", { title: `New ${sectionTitle(section)}`, section, error: null });
});

router.post("/:section/new", requireVerified, (req, res) => {
  const db = getDb();
  const section = req.params.section;
  if (section !== "internal" && section !== "external") return res.status(404).send("Not found");

  const title = (req.body.title || "").trim();
  const body = (req.body.body || "").trim();
  const url = (req.body.url || "").trim();

  if (!title) return res.render("post_new", { title: `New ${sectionTitle(section)}`, section, error: "Title is required." });

  if (section === "internal" && !body) {
    return res.render("post_new", { title: `New ${sectionTitle(section)}`, section, error: "Description is required." });
  }
  if (section === "external") {
    if (!url) return res.render("post_new", { title: `New ${sectionTitle(section)}`, section, error: "URL is required." });
    // basic url sanity
    const normalized = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
    db.run(
      `INSERT INTO posts (section, title, url, author_id, created_at) VALUES (?, ?, ?, ?, ?)`,
      [section, title, normalized, req.session.user.id, Date.now()],
      function (err) {
        if (err) return res.status(500).send("DB error.");
        res.redirect(`/posts/${this.lastID}`);
      }
    );
    return;
  }

  db.run(
    `INSERT INTO posts (section, title, body, author_id, created_at) VALUES (?, ?, ?, ?, ?)`,
    [section, title, body, req.session.user.id, Date.now()],
    function (err) {
      if (err) return res.status(500).send("DB error.");
      res.redirect(`/posts/${this.lastID}`);
    }
  );
});

router.get("/posts/:id", (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);

  db.get(`
    SELECT p.*, u.name as author_name
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.id = ?
  `, [id], (err, post) => {
    if (err || !post) return res.status(404).send("Post not found.");

    db.all(`
      SELECT c.*, u.name as author_name
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `, [id], (err2, comments) => {
      if (err2) return res.status(500).send("DB error.");
      res.render("post_show", {
        title: post.title,
        post,
        comments,
        sectionName: sectionTitle(post.section),
        error: null
      });
    });
  });
});

router.post("/posts/:id/comments", requireVerified, (req, res) => {
  const db = getDb();
  const postId = Number(req.params.id);
  const body = (req.body.body || "").trim();

  if (!body) return res.redirect(`/posts/${postId}`);

  db.run(
    `INSERT INTO comments (post_id, author_id, body, created_at) VALUES (?, ?, ?, ?)`,
    [postId, req.session.user.id, body, Date.now()],
    function (err) {
      if (err) return res.status(500).send("DB error.");
      res.redirect(`/posts/${postId}`);
    }
  );
});

module.exports = router;
