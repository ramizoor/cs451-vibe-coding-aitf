function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function requireVerified(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  if (!req.session.user.verified) return res.redirect("/verify");
  next();
}

module.exports = { requireAuth, requireVerified };
