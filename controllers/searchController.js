const User = require("../models/User");
const Post = require("../models/Post");
const { getPaginationInfo } = require("../utils/pagination");
const ErrorResponse = require("../utils/errorResponse");
const { pool } = require("../config/db");

// @desc    Search for users
// @route   GET /api/search/users
// @access  Private
exports.searchUsers = async (req, res, next) => {
  try {
    const { username, sortBy = "username", sortOrder = "asc" } = req.query;

    if (!username) {
      return next(new ErrorResponse("Please provide a search term", 400));
    }

    const countQuery = `
      SELECT COUNT(*) FROM users 
      WHERE username ILIKE $1
    `;

    const countResult = await pool.query(countQuery, [`%${username}%`]);
    const total = parseInt(countResult.rows[0].count);

    const { pagination, startIndex, limit } = getPaginationInfo(req, total);

    const direction = sortOrder === "desc" ? "DESC" : "ASC";

    const usersQuery = `
      SELECT id, username, profile_picture as "profilePicture", bio 
      FROM users
      WHERE username ILIKE $1
      ORDER BY ${sortBy} ${direction}
      LIMIT $2 OFFSET $3
    `;

    const usersResult = await pool.query(usersQuery, [
      `%${username}%`,
      limit,
      startIndex,
    ]);

    const users = usersResult.rows;

    const followStatusQuery = `
      SELECT following_id FROM followers
      WHERE follower_id = $1 AND following_id = ANY($2::uuid[])
    `;

    const userIds = users.map((user) => user.id);

    let followingIds = [];
    if (userIds.length > 0) {
      const followStatusResult = await pool.query(followStatusQuery, [
        req.user.id,
        userIds,
      ]);

      followingIds = followStatusResult.rows.map((row) => row.following_id);
    }

    const usersWithFollowStatus = users.map((user) => {
      return {
        ...user,
        isFollowing: followingIds.includes(user.id),
      };
    });

    res.status(200).json({
      success: true,
      pagination,
      data: usersWithFollowStatus,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Search for posts
// @route   GET /api/search/posts
// @access  Private
exports.searchPosts = async (req, res, next) => {
  try {
    const {
      keywords,
      userId,
      hasMedia,
      sortBy = "created_at",
      sortOrder = "desc",
    } = req.query;

    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (keywords) {
      conditions.push(`text ILIKE $${paramIndex}`);
      params.push(`%${keywords}%`);
      paramIndex++;
    }

    if (userId) {
      conditions.push(`user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (hasMedia === "true") {
      conditions.push("image IS NOT NULL");
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const countQuery = `
      SELECT COUNT(*) FROM posts ${whereClause}
    `;

    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const { pagination, startIndex, limit } = getPaginationInfo(req, total);

    let sortField = sortBy;
    if (sortBy === "likes") {
      sortField = "(SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id)";
    }
    const direction = sortOrder === "desc" ? "DESC" : "ASC";

    const postsQuery = `
      SELECT p.*, 
             u.username, u.profile_picture as "profilePicture",
             (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as "likesCount"
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ${whereClause}
      ORDER BY ${sortField} ${direction}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, startIndex);
    const postsResult = await pool.query(postsQuery, params);

    const posts = postsResult.rows;

    const postIds = posts.map((post) => post.id);

    let comments = [];
    if (postIds.length > 0) {
      const commentsQuery = `
        SELECT c.*, u.username, u.profile_picture as "profilePicture"
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ANY($1::uuid[])
        ORDER BY c.created_at
      `;

      const commentsResult = await pool.query(commentsQuery, [postIds]);
      comments = commentsResult.rows;
    }

    const postComments = {};
    comments.forEach((comment) => {
      if (!postComments[comment.post_id]) {
        postComments[comment.post_id] = [];
      }
      postComments[comment.post_id].push(comment);
    });

    const postsWithComments = posts.map((post) => {
      return {
        ...post,
        comments: postComments[post.id] || [],
      };
    });

    res.status(200).json({
      success: true,
      pagination,
      data: postsWithComments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Search for trending tags/topics
// @route   GET /api/search/trending
// @access  Private
exports.getTrendingTopics = async (req, res, next) => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const query = `
      SELECT p.text, COUNT(pl.id) as like_count
      FROM posts p
      LEFT JOIN post_likes pl ON p.id = pl.post_id
      WHERE p.created_at >= $1
      GROUP BY p.id
      ORDER BY like_count DESC
      LIMIT 100
    `;

    const result = await pool.query(query, [oneDayAgo]);
    const recentPosts = result.rows;

    const keywords = {};

    recentPosts.forEach((post) => {
      const words = post.text.toLowerCase().match(/\b\w+\b/g) || [];

      const weight = parseInt(post.like_count) + 1;

      words.forEach((word) => {
        if (word.length > 3) {
          if (!keywords[word]) {
            keywords[word] = 0;
          }
          keywords[word] += weight;
        }
      });
    });

    const trends = Object.entries(keywords)
      .map(([keyword, weight]) => ({ keyword, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: trends,
    });
  } catch (err) {
    next(err);
  }
};
