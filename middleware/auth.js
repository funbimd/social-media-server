// middleware/auth.js
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

exports.protect = async (req, res, next) => {
  let token;

  // Check if auth header exists and has token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add user to req object
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      decoded.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "User not found",
      });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }
};
