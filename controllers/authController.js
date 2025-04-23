// controllers/authController.js
const User = require("../models/User");
const { pool } = require("../config/db");

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check if email already exists
    const emailCheck = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Email already in use",
      });
    }

    // Check if username already exists
    const usernameCheck = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (usernameCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Username already taken",
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
    });

    // Generate token
    const token = User.getSignedJwtToken(user.id);

    res.status(201).json({
      success: true,
      token,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide an email and password",
      });
    }

    // Check for user
    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if password matches
    const isMatch = await User.matchPassword(user.id, password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Generate token
    const token = User.getSignedJwtToken(user.id);

    res.status(200).json({
      success: true,
      token,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // User is already available in req.user from the auth middleware
    const user = req.user;

    // Get followers and following counts
    const followerCountResult = await pool.query(
      "SELECT COUNT(*) FROM followers WHERE following_id = $1",
      [user.id]
    );

    const followingCountResult = await pool.query(
      "SELECT COUNT(*) FROM followers WHERE follower_id = $1",
      [user.id]
    );

    user.followers_count = parseInt(followerCountResult.rows[0].count);
    user.following_count = parseInt(followingCountResult.rows[0].count);

    // Remove password from response
    delete user.password;

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};
