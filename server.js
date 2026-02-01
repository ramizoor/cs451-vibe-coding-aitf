const path = require("path");
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const csrf = require("csurf");

const { initDb } = require("./src/db");
const authRoutes = require("./src/routes/auth");
const postRoutes = require("./src/routes/posts");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Security headers
app.use(helmet({
  contentSecurityPolicy: false // keep CSP off for demo simplicity (EJS forms + inline)
}));

// Rate limiting (basic)
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120
}));

// Body parsing
app.use(express.urlencoded({ extended: false }));

// Static files
app.use("/public", express.static(path.join(__dirname, "public")));

// Sessions
app.use(session({
  store: new SQLiteStore({
    db: "sessions.sqlite",
    dir: path.join(__dirname, "data")
  }),
  secret: process.env.SESSION_SECRET || "dev_only_change_me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

// DB init
initDb(path.join(__dirname, "data", "app.sqlite"));

// CSRF (after sessions)
app.use(csrf());

// Make user + csrf available to all templates
app.use(async (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.user = req.session.user || null;
  next();
});

// Routes
app.use(authRoutes);
app.use(postRoutes);

// Home
app.get("/", (req, res) => {
  res.render("home", { title: "SVSU AI Hub" });
});

// Error handling
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).send("Form tampered with (CSRF). Please go back and try again.");
  }
  console.error(err);
  res.status(500).send("Server error.");
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`SVSU AI Hub running on http://localhost:${port}`));
