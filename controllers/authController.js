const User = require("../models/User");
const { pool } = require("../config/db");

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const user = await User.create({
      username,
      email,
      password,
    });

    const token = User.getSignedJwtToken(user.id);

    res.status(201).json({
      success: true,
      token,
    });
  } catch (err) {
    if (err.code === "23505") {
      if (err.detail.includes("email")) {
        res.status(400).json({
          success: false,
          error: "Email already in use",
        });
        return;
      } else if (err.detail.includes("username")) {
        res.status(400).json({
          success: false,
          error: "Username already taken",
        });
        return;
      }
    } else {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: "Please provide an email and password",
      });
    }

    const user = await User.findByEmail(email);

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const isMatch = await User.matchPassword(user.id, password);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

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
    const user = req.user;

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
