// controllers/profileController.js
const { pool } = require("../config/db");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get user profile
// @route   GET /api/profiles/:id
// @access  Private
exports.getUserProfile = async (req, res, next) => {
  try {
    // Get basic user info
    const userQuery = `
      SELECT id, username, email, profile_picture as "profilePicture", bio, created_at as "createdAt"
      FROM users
      WHERE id = $1
    `;

    const userResult = await pool.query(userQuery, [req.params.id]);

    if (userResult.rows.length === 0) {
      return next(new ErrorResponse("User not found", 404));
    }

    const user = userResult.rows[0];

    // Get followers
    const followersQuery = `
      SELECT u.id, u.username, u.profile_picture as "profilePicture", u.bio
      FROM followers f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
    `;

    const followersResult = await pool.query(followersQuery, [req.params.id]);
    user.followers = followersResult.rows;

    // Get following
    const followingQuery = `
      SELECT u.id, u.username, u.profile_picture as "profilePicture", u.bio
      FROM followers f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
    `;

    const followingResult = await pool.query(followingQuery, [req.params.id]);
    user.following = followingResult.rows;

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Follow/Unfollow a user
// @route   PUT /api/profiles/:id/follow
// @access  Private
exports.followUser = async (req, res, next) => {
  try {
    // Make sure user can't follow themselves
    if (req.params.id === req.user.id) {
      return next(new ErrorResponse("You cannot follow yourself", 400));
    }

    // Check if target user exists
    const userQuery = "SELECT * FROM users WHERE id = $1";
    const userResult = await pool.query(userQuery, [req.params.id]);

    if (userResult.rows.length === 0) {
      return next(new ErrorResponse("User not found", 404));
    }

    // Check if already following
    const followCheckQuery = `
      SELECT * FROM followers
      WHERE follower_id = $1 AND following_id = $2
    `;

    const followCheckResult = await pool.query(followCheckQuery, [
      req.user.id,
      req.params.id,
    ]);

    const isFollowing = followCheckResult.rows.length > 0;

    if (isFollowing) {
      // Unfollow
      await pool.query(
        "DELETE FROM followers WHERE follower_id = $1 AND following_id = $2",
        [req.user.id, req.params.id]
      );

      return res.status(200).json({
        success: true,
        data: { following: false },
      });
    } else {
      // Follow
      await pool.query(
        "INSERT INTO followers (follower_id, following_id) VALUES ($1, $2)",
        [req.user.id, req.params.id]
      );

      return res.status(200).json({
        success: true,
        data: { following: true },
      });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Get user posts
// @route   GET /api/profiles/:id/posts
// @access  Private
exports.getUserPosts = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Get total count
    const countQuery = "SELECT COUNT(*) FROM posts WHERE user_id = $1";
    const countResult = await pool.query(countQuery, [req.params.id]);
    const total = parseInt(countResult.rows[0].count);

    // Get posts
    const postsQuery = `
      SELECT p.*, 
        u.username, 
        u.profile_picture as "profilePicture",
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as "likesCount"
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const postsResult = await pool.query(postsQuery, [
      req.params.id,
      limit,
      startIndex,
    ]);
    const posts = postsResult.rows;

    // Get comments
    const postIds = posts.map((post) => post.id);
    let comments = [];

    if (postIds.length > 0) {
      const commentsQuery = `
        SELECT c.*, 
          u.username, 
          u.profile_picture as "profilePicture"
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ANY($1::uuid[])
        ORDER BY c.created_at
      `;

      const commentsResult = await pool.query(commentsQuery, [postIds]);
      comments = commentsResult.rows;
    }

    // Assign comments to posts
    const postsWithComments = posts.map((post) => {
      const postComments = comments.filter(
        (comment) => comment.post_id === post.id
      );
      return {
        ...post,
        comments: postComments,
      };
    });

    res.status(200).json({
      success: true,
      count: posts.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: postsWithComments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user followers list
// @route   GET /api/profiles/:id/followers
// @access  Private
exports.getUserFollowers = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Get total count
    const countQuery = "SELECT COUNT(*) FROM followers WHERE following_id = $1";
    const countResult = await pool.query(countQuery, [req.params.id]);
    const total = parseInt(countResult.rows[0].count);

    // Get followers with pagination
    const followersQuery = `
      SELECT u.id, u.username, u.profile_picture as "profilePicture", u.bio
      FROM followers f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = $1
      ORDER BY u.username
      LIMIT $2 OFFSET $3
    `;

    const followersResult = await pool.query(followersQuery, [
      req.params.id,
      limit,
      startIndex,
    ]);

    res.status(200).json({
      success: true,
      count: followersResult.rows.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: followersResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user following list
// @route   GET /api/profiles/:id/following
// @access  Private
exports.getUserFollowing = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Get total count
    const countQuery = "SELECT COUNT(*) FROM followers WHERE follower_id = $1";
    const countResult = await pool.query(countQuery, [req.params.id]);
    const total = parseInt(countResult.rows[0].count);

    // Get following with pagination
    const followingQuery = `
      SELECT u.id, u.username, u.profile_picture as "profilePicture", u.bio
      FROM followers f
      JOIN users u ON f.following_id = u.id
      WHERE f.follower_id = $1
      ORDER BY u.username
      LIMIT $2 OFFSET $3
    `;

    const followingResult = await pool.query(followingQuery, [
      req.params.id,
      limit,
      startIndex,
    ]);

    res.status(200).json({
      success: true,
      count: followingResult.rows.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: followingResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Search for users
// @route   GET /api/profiles/search
// @access  Private
exports.searchUsers = async (req, res, next) => {
  try {
    const { username } = req.query;

    if (!username) {
      return next(
        new ErrorResponse("Please provide a username to search for", 400)
      );
    }

    // Search for users with similar usernames
    const usersQuery = `
      SELECT id, username, profile_picture as "profilePicture", bio
      FROM users
      WHERE username ILIKE $1
      ORDER BY username
    `;

    const usersResult = await pool.query(usersQuery, [`%${username}%`]);

    res.status(200).json({
      success: true,
      count: usersResult.rows.length,
      data: usersResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get suggested users to follow (users not followed)
// @route   GET /api/profiles/suggestions
// @access  Private
exports.getSuggestedUsers = async (req, res, next) => {
  try {
    // Get users that the current user doesn't follow
    const suggestedUsersQuery = `
      SELECT id, username, profile_picture as "profilePicture", bio
      FROM users
      WHERE id != $1
      AND id NOT IN (
        SELECT following_id FROM followers WHERE follower_id = $1
      )
      ORDER BY RANDOM()
      LIMIT 5
    `;

    const suggestedUsersResult = await pool.query(suggestedUsersQuery, [
      req.user.id,
    ]);

    res.status(200).json({
      success: true,
      count: suggestedUsersResult.rows.length,
      data: suggestedUsersResult.rows,
    });
  } catch (err) {
    next(err);
  }
};
