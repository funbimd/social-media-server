// controllers/postController.js
const { pool } = require("../config/db");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Create a post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res, next) => {
  try {
    const { text, image } = req.body;

    const result = await pool.query(
      `INSERT INTO posts 
        (text, image, user_id) 
       VALUES 
        ($1, $2, $3) 
       RETURNING *`,
      [text, image, req.user.id]
    );

    const newPost = result.rows[0];

    res.status(201).json({
      success: true,
      data: newPost,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all posts
// @route   GET /api/posts
// @access  Private
exports.getPosts = async (req, res, next) => {
  try {
    // Get current user's following list
    const followingQuery = `
      SELECT following_id FROM followers
      WHERE follower_id = $1
    `;
    const followingResult = await pool.query(followingQuery, [req.user.id]);
    const following = followingResult.rows.map((row) => row.following_id);

    // Add current user's ID to include their posts
    following.push(req.user.id);

    // Get posts from followed users
    let postsQuery = `
      SELECT p.*, 
        u.username, 
        u.profile_picture as "profilePicture",
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as "likesCount"
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ANY($1::uuid[])
      ORDER BY p.created_at DESC
    `;

    const postsResult = await pool.query(postsQuery, [following]);
    const posts = postsResult.rows;

    // Get comments for these posts
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

    // Associate comments with their posts
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
      data: postsWithComments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
exports.getPost = async (req, res, next) => {
  try {
    // Get the post
    const postQuery = `
      SELECT p.*, 
        u.username, 
        u.profile_picture as "profilePicture"
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `;

    const postResult = await pool.query(postQuery, [req.params.id]);

    if (postResult.rows.length === 0) {
      return next(new ErrorResponse("Post not found", 404));
    }

    const post = postResult.rows[0];

    // Get the comments for this post
    const commentsQuery = `
      SELECT c.*, 
        u.username, 
        u.profile_picture as "profilePicture"
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at
    `;

    const commentsResult = await pool.query(commentsQuery, [req.params.id]);
    post.comments = commentsResult.rows;

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = async (req, res, next) => {
  try {
    // First check if post exists and user owns it
    const checkQuery = `
      SELECT user_id FROM posts WHERE id = $1
    `;

    const checkResult = await pool.query(checkQuery, [req.params.id]);

    if (checkResult.rows.length === 0) {
      return next(new ErrorResponse("Post not found", 404));
    }

    // Check ownership
    if (checkResult.rows[0].user_id !== req.user.id) {
      return next(new ErrorResponse("Not authorized to update this post", 401));
    }

    // Update the post
    const { text, image } = req.body;

    const updateQuery = `
      UPDATE posts 
      SET text = $1, 
          image = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const updateResult = await pool.query(updateQuery, [
      text,
      image,
      req.params.id,
    ]);

    res.status(200).json({
      success: true,
      data: updateResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res, next) => {
  try {
    // First check if post exists and user owns it
    const checkQuery = `
      SELECT user_id FROM posts WHERE id = $1
    `;

    const checkResult = await pool.query(checkQuery, [req.params.id]);

    if (checkResult.rows.length === 0) {
      return next(new ErrorResponse("Post not found", 404));
    }

    // Check ownership
    if (checkResult.rows[0].user_id !== req.user.id) {
      return next(new ErrorResponse("Not authorized to delete this post", 401));
    }

    // Delete comments first (assuming you have cascade delete in your schema)
    await pool.query("DELETE FROM comments WHERE post_id = $1", [
      req.params.id,
    ]);

    // Delete likes
    await pool.query("DELETE FROM post_likes WHERE post_id = $1", [
      req.params.id,
    ]);

    // Delete the post
    await pool.query("DELETE FROM posts WHERE id = $1", [req.params.id]);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Like/Unlike a post
// @route   PUT /api/posts/:id/like
// @access  Private
exports.likePost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const userId = req.user?.id;

    // Check for missing or invalid UUIDs
    if (!postId || !userId) {
      return next(new ErrorResponse("Invalid post ID or user ID", 400));
    }

    // Check if post exists
    const postQuery = "SELECT * FROM posts WHERE id = $1";
    const postResult = await pool.query(postQuery, [postId]);

    if (postResult.rows.length === 0) {
      return next(new ErrorResponse("Post not found", 404));
    }

    // Check if already liked
    const likeCheckQuery = `
      SELECT * FROM post_likes 
      WHERE post_id = $1 AND user_id = $2
    `;
    const likeCheckResult = await pool.query(likeCheckQuery, [postId, userId]);
    const isLiked = likeCheckResult.rows.length > 0;

    if (isLiked) {
      // Unlike: Remove the like
      await pool.query(
        "DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2",
        [postId, userId]
      );
    } else {
      // Like: Add a like
      await pool.query(
        "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)",
        [postId, userId]
      );
    }

    // Get updated likes
    const likesQuery = `
      SELECT u.id, u.username 
      FROM post_likes pl
      JOIN users u ON pl.user_id = u.id
      WHERE pl.post_id = $1
    `;
    const likesResult = await pool.query(likesQuery, [postId]);

    res.status(200).json({
      success: true,
      data: likesResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add comment to a post
// @route   POST /api/posts/:id/comments
// @access  Private
exports.addComment = async (req, res, next) => {
  try {
    // Check if post exists
    const postQuery = "SELECT * FROM posts WHERE id = $1";
    const postResult = await pool.query(postQuery, [req.params.id]);

    if (postResult.rows.length === 0) {
      return next(new ErrorResponse("Post not found", 404));
    }

    // Add the comment
    const { text } = req.body;

    const commentQuery = `
      INSERT INTO comments (text, user_id, post_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `;

    const commentResult = await pool.query(commentQuery, [
      text,
      req.user.id,
      req.params.id,
    ]);

    // Get the inserted comment with user info
    const newCommentQuery = `
      SELECT c.*, 
        u.username, 
        u.profile_picture as "profilePicture"
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;

    const newCommentResult = await pool.query(newCommentQuery, [
      commentResult.rows[0].id,
    ]);

    // Get all comments for the post
    const allCommentsQuery = `
      SELECT c.*, 
        u.username, 
        u.profile_picture as "profilePicture"
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
    `;

    const allCommentsResult = await pool.query(allCommentsQuery, [
      req.params.id,
    ]);

    res.status(201).json({
      success: true,
      data: allCommentsResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete comment from a post
// @route   DELETE /api/posts/:id/comments/:comment_id
// @access  Private
exports.deleteComment = async (req, res, next) => {
  try {
    // Check if post exists
    const postQuery = "SELECT * FROM posts WHERE id = $1";
    const postResult = await pool.query(postQuery, [req.params.id]);

    if (postResult.rows.length === 0) {
      return next(new ErrorResponse("Post not found", 404));
    }

    // Check if comment exists and user owns it
    const commentQuery = `
      SELECT * FROM comments 
      WHERE id = $1 AND post_id = $2
    `;

    const commentResult = await pool.query(commentQuery, [
      req.params.comment_id,
      req.params.id,
    ]);

    if (commentResult.rows.length === 0) {
      return next(new ErrorResponse("Comment not found", 404));
    }

    // Check ownership
    if (commentResult.rows[0].user_id !== req.user.id) {
      return next(
        new ErrorResponse("Not authorized to delete this comment", 401)
      );
    }

    // Delete the comment
    await pool.query("DELETE FROM comments WHERE id = $1", [
      req.params.comment_id,
    ]);

    // Get updated comments
    const updatedCommentsQuery = `
      SELECT c.*, 
        u.username, 
        u.profile_picture as "profilePicture"
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
    `;

    const updatedCommentsResult = await pool.query(updatedCommentsQuery, [
      req.params.id,
    ]);

    res.status(200).json({
      success: true,
      data: updatedCommentsResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get feed posts (from followed users and self)
// @route   GET /api/posts/feed
// @access  Private
exports.getFeedPosts = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Get current user's following list
    const followingQuery = `
      SELECT following_id FROM followers
      WHERE follower_id = $1
    `;
    const followingResult = await pool.query(followingQuery, [req.user.id]);
    const following = followingResult.rows.map((row) => row.following_id);

    // Add current user's ID to include their posts
    following.push(req.user.id);

    // Get total count for pagination
    const totalQuery = `
      SELECT COUNT(*) FROM posts
      WHERE user_id = ANY($1::uuid[])
    `;

    const totalResult = await pool.query(totalQuery, [following]);
    const total = parseInt(totalResult.rows[0].count);

    // Get posts with pagination
    const postsQuery = `
      SELECT p.*, 
        u.username, 
        u.profile_picture as "profilePicture",
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as "likesCount"
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ANY($1::uuid[])
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const postsResult = await pool.query(postsQuery, [
      following,
      limit,
      startIndex,
    ]);
    const posts = postsResult.rows;

    // Get comments for these posts
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

    // Associate comments with their posts
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

// @desc    Get explore/discover posts (from users not followed)
// @route   GET /api/posts/explore
// @access  Private
exports.getExplorePosts = async (req, res, next) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Get current user's following list
    const followingQuery = `
      SELECT following_id FROM followers
      WHERE follower_id = $1
    `;
    const followingResult = await pool.query(followingQuery, [req.user.id]);
    const following = followingResult.rows.map((row) => row.following_id);

    // Add current user's ID
    following.push(req.user.id);

    // Get total count for pagination
    const totalQuery = `
      SELECT COUNT(*) FROM posts
      WHERE user_id != ALL($1::uuid[])
    `;

    const totalResult = await pool.query(totalQuery, [following]);
    const total = parseInt(totalResult.rows[0].count);

    // Get posts with pagination
    const postsQuery = `
      SELECT p.*, 
        u.username, 
        u.profile_picture as "profilePicture",
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as "likesCount"
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id != ALL($1::uuid[])
      ORDER BY 
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) DESC,
        p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const postsResult = await pool.query(postsQuery, [
      following,
      limit,
      startIndex,
    ]);
    const posts = postsResult.rows;

    // Get comments for these posts
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

    // Associate comments with their posts
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
