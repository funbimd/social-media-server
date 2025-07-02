const User = require("../models/User");
const { pool } = require("../config/db");
const crypto = require("crypto");
const ErrorResponse = require("../utils/errorResponse");
const sendEmail = require("../utils/sendEmail");

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

// @desc    Request password reset (forgot password)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Please provide an email address",
      });
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "No user found with that email address",
      });
    }

    const user = userResult.rows[0];

    const resetToken = crypto.randomBytes(20).toString("hex");

    const resetExpire = new Date();
    resetExpire.setMinutes(resetExpire.getMinutes() + 30);

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    await pool.query(
      `UPDATE users 
       SET reset_token = $1, reset_token_expire = $2 
       WHERE id = $3`,
      [resetTokenHash, resetExpire, user.id]
    );

    // In a production environment, you would send an email with the reset link
    // For development, we'll return the token in the response
    // const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/auth/reset-password/${resetToken}`;

    const message = `
      You are receiving this email because you (or someone else) has requested a password reset.
      Please click on the following link to reset your password:
      
      ${resetUrl}
      
      This link will expire in 30 minutes.
      
      If you did not request this, please ignore this email and your password will remain unchanged.
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request",
        text: message,
        html: `
          <h1>Password Reset Request</h1>
          <p>You are receiving this email because you (or someone else) has requested a password reset.</p>
          <p>Please click on the following link to reset your password:</p>
          <a href="${resetUrl}" target="_blank">Reset Password</a>
          <p>This link will expire in 30 minutes.</p>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        `,
      });
      res.status(200).json({
        success: true,
        message: "Password reset email sent",
        resetToken:
          process.env.NODE_ENV === "development" ? resetToken : undefined,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        error: "Could not send password reset email",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "An error occurred while processing the request",
    });
  }
};

// @desc    Reset password using token
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { token } = req.params;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Please provide a new password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const userResult = await pool.query(
      `SELECT * FROM users 
       WHERE reset_token = $1 
       AND reset_token_expire > NOW()`,
      [resetTokenHash]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    const user = userResult.rows[0];

    const hashedPassword = await User.hashPassword(password);

    await pool.query(
      `UPDATE users 
       SET password = $1,
           reset_token = NULL,
           reset_token_expire = NULL
       WHERE id = $2`,
      [hashedPassword, user.id]
    );

    const authToken = User.getSignedJwtToken(user.id);

    res.status(200).json({
      success: true,
      message: "Password reset successful",
      token: authToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Could not reset password",
    });
  }
};

// @desc    Change password (when logged in)
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: "Please provide current and new password",
      });
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters",
      });
    }

    const isMatch = await User.matchPassword(req.user.id, currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    const hashedPassword = await User.hashPassword(newPassword);

    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      req.user.id,
    ]);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Could not change password",
    });
  }
};
