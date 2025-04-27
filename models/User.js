const { pool } = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

class User {
  static async findById(id) {
    try {
      const result = await pool.query("SELECT * FROM users WHERE id = $1", [
        id,
      ]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByIdWithRelations(id) {
    try {
      const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
        id,
      ]);
      const user = userResult.rows[0];

      if (!user) return null;

      const followersResult = await pool.query(
        `
        SELECT u.id, u.username, u.profile_picture, u.bio
        FROM followers f
        JOIN users u ON f.follower_id = u.id
        WHERE f.following_id = $1
      `,
        [id]
      );

      const followingResult = await pool.query(
        `
        SELECT u.id, u.username, u.profile_picture, u.bio
        FROM followers f
        JOIN users u ON f.following_id = u.id
        WHERE f.follower_id = $1
      `,
        [id]
      );

      user.followers = followersResult.rows;
      user.following = followingResult.rows;

      return user;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async create(userData) {
    try {
      const { username, email, password } = userData;

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const result = await pool.query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
        [username, email, hashedPassword]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async matchPassword(userId, enteredPassword) {
    try {
      const result = await pool.query(
        "SELECT password FROM users WHERE id = $1",
        [userId]
      );
      if (!result.rows[0]) return false;

      return await bcrypt.compare(enteredPassword, result.rows[0].password);
    } catch (error) {
      throw error;
    }
  }

  static getSignedJwtToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "30d",
    });
  }

  static async toggleFollow(currentUserId, targetUserId) {
    try {
      const checkResult = await pool.query(
        "SELECT * FROM followers WHERE follower_id = $1 AND following_id = $2",
        [currentUserId, targetUserId]
      );

      const isFollowing = checkResult.rows.length > 0;

      if (isFollowing) {
        await pool.query(
          "DELETE FROM followers WHERE follower_id = $1 AND following_id = $2",
          [currentUserId, targetUserId]
        );
        return { following: false };
      } else {
        await pool.query(
          "INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)",
          [currentUserId, targetUserId]
        );
        return { following: true };
      }
    } catch (error) {
      throw error;
    }
  }

  static async getSuggestedUsers(userId, limit = 5) {
    try {
      const result = await pool.query(
        `
        SELECT id, username, profile_picture, bio
        FROM users
        WHERE id != $1
        AND id NOT IN (
          SELECT following_id FROM followers WHERE follower_id = $1
        )
        LIMIT $2
      `,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
