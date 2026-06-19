const supabaseAdmin = require("../libs/supabaseAdmin");

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user)
    return res.status(401).json({ error: "Invalid token" });

  req.userId = data.user.id;
  next();
};

module.exports = authenticate;
