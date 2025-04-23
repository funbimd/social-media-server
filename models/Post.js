// models/Post.js
const { pool } = require("../config/db");

class Post {
  // Create a new post
  static async create(postData) {
    try {
      const { text, image, user_id } = postData;

      const result = await pool.query(
        "INSERT INTO posts (text, image, user_id) VALUES ($1, $2, $3) RETURNING *",
        [text, image, user_id]
      );

      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find post by ID with user, comments and likes
  static async findById(id) {
    try {
      // Get the post with user info
      const postResult = await pool.query(
        `
        SELECT p.*, u.username, u.profile_picture
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
      `,
        [id]
      );

      if (postResult.rows.length === 0) return null;

      const post = postResult.rows[0];

      // Get comments with user info
      const commentsResult = await pool.query(
        `
        SELECT c.*, u.username, u.profile_picture
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = $1
        ORDER BY c.created_at DESC
      `,
        [id]
      );

      post.comments = commentsResult.rows;

      // Get likes
      const likesResult = await pool.query(
        `
        SELECT u.id, u.username
        FROM likes l
        JOIN users u ON l.user_id = u.id
        WHERE l.post_id = $1
      `,
        [id]
      );

      post.likes = likesResult.rows;

      return post;
    } catch (error) {
      throw error;
    }
  }

  // Get feed posts (from followed users and self)
  static async getFeedPosts(userId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const countResult = await pool.query(
        `
        SELECT COUNT(*) as total
        FROM posts
        WHERE user_id = $1
        OR user_id IN (SELECT following_id FROM followers WHERE follower_id = $1)
      `,
        [userId]
      );

      const total = parseInt(countResult.rows[0].total);

      // Get posts with user, comments count and likes count
      const postsResult = await pool.query(
        `
        SELECT p.*, u.username, u.profile_picture,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
          (SELECT EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1)) AS is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = $1
        OR p.user_id IN (SELECT following_id FROM followers WHERE follower_id = $1)
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `,
        [userId, limit, offset]
      );

      return {
        data: postsResult.rows,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Get explore posts (from users not followed)
  static async getExplorePosts(userId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const countResult = await pool.query(
        `
        SELECT COUNT(*) as total
        FROM posts
        WHERE user_id != $1
        AND user_id NOT IN (SELECT following_id FROM followers WHERE follower_id = $1)
      `,
        [userId]
      );

      const total = parseInt(countResult.rows[0].total);

      // Get posts with user, comments count and likes count
      const postsResult = await pool.query(
        `
        SELECT p.*, u.username, u.profile_picture,
          (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
          (SELECT EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1)) AS is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id != $1
        AND p.user_id NOT IN (SELECT following_id FROM followers WHERE follower_id = $1)
        ORDER BY 
          (SELECT COUNT(*) FROM likes WHERE post_id = p.id) DESC,
          p.created_at DESC
        LIMIT $2 OFFSET $3
      `,
        [userId, limit, offset]
      );

      return {
        data: postsResult.rows,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
          limit,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Toggle like on a post
  static async toggleLike(postId, userId) {
    try {
      // Check if already liked
      const checkResult = await pool.query(
        "SELECT * FROM likes WHERE post_id = $1 AND user_id = $2",
        [postId, userId]
      );

      const isLiked = checkResult.rows.length > 0;

      if (isLiked) {
        // Unlike
        await pool.query(
          "DELETE FROM likes WHERE post_id = $1 AND user_id = $2",
          [postId, userId]
        );
      } else {
        // Like
        await pool.query(
          "INSERT INTO likes (post_id, user_id) VALUES ($1, $2)",
          [postId, userId]
        );
      }

      // Get updated likes
      const likesResult = await pool.query(
        "SELECT user_id FROM likes WHERE post_id = $1",
        [postId]
      );

      return likesResult.rows;
    } catch (error) {
      throw error;
    }
  }

  // Add comment to a post
  static async addComment(postId, userId, text) {
    try {
      // Add comment
      const commentResult = await pool.query(
        "INSERT INTO comments (post_id, user_id, text) VALUES ($1, $2, $3) RETURNING *",
        [postId, userId, text]
      );

      // Get user info for the comment
      const userResult = await pool.query(
        "SELECT username, profile_picture FROM users WHERE id = $1",
        [userId]
      );

      const comment = {
        ...commentResult.rows[0],
        username: userResult.rows[0].username,
        profile_picture: userResult.rows[0].profile_picture,
      };

      return comment;
    } catch (error) {
      throw error;
    }
  }

  // Delete comment from a post
  static async deleteComment(commentId, userId) {
    try {
      // Check if comment exists and belongs to user
      const checkResult = await pool.query(
        "SELECT * FROM comments WHERE id = $1 AND user_id = $2",
        [commentId, userId]
      );

      if (checkResult.rows.length === 0) {
        return { error: "Comment not found or not authorized" };
      }

      // Delete comment
      await pool.query("DELETE FROM comments WHERE id = $1", [commentId]);

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Post;
