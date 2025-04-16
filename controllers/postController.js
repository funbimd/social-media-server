const Post = require("../models/Post");
const User = require("../models/User");

// @desc    Create a post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { text, image } = req.body;

    const newPost = await Post.create({
      text,
      image,
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: newPost,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Get all posts
// @route   GET /api/posts
// @access  Private
exports.getPosts = async (req, res) => {
  try {
    // Get posts from users the current user follows and their own posts
    const currentUser = await User.findById(req.user.id);
    const userFollowing = currentUser.following;

    // Add current user's ID to the list to include their posts
    userFollowing.push(req.user.id);

    const posts = await Post.find({ user: { $in: userFollowing } })
      .sort({ createdAt: -1 })
      .populate("user", "username profilePicture")
      .populate("comments.user", "username profilePicture");

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("user", "username profilePicture")
      .populate("comments.user", "username profilePicture");

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Make sure user owns the post
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: "Not authorized to update this post",
      });
    }

    post = await Post.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Make sure user owns the post
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: "Not authorized to delete this post",
      });
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Like/Unlike a post
// @route   PUT /api/posts/:id/like
// @access  Private
exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Check if the post has already been liked by this user
    if (post.likes.some((like) => like.toString() === req.user.id)) {
      // If already liked, unlike it (remove user ID from likes array)
      post.likes = post.likes.filter((like) => like.toString() !== req.user.id);
    } else {
      // If not liked, add user ID to likes array
      post.likes.push(req.user.id);
    }

    await post.save();

    res.status(200).json({
      success: true,
      data: post.likes,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Add comment to a post
// @route   POST /api/posts/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    const newComment = {
      text: req.body.text,
      user: req.user.id,
    };

    post.comments.unshift(newComment);

    await post.save();

    // Populate the user data in the newly added comment
    await post.populate("comments.user", "username profilePicture");

    res.status(201).json({
      success: true,
      data: post.comments,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Delete comment from a post
// @route   DELETE /api/posts/:id/comments/:comment_id
// @access  Private
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Get the comment
    const comment = post.comments.find(
      (comment) => comment._id.toString() === req.params.comment_id
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Comment not found",
      });
    }

    // Check if user is the comment owner
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: "Not authorized to delete this comment",
      });
    }

    // Get remove index
    post.comments = post.comments.filter(
      ({ _id }) => _id.toString() !== req.params.comment_id
    );

    await post.save();

    res.status(200).json({
      success: true,
      data: post.comments,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Get feed posts (from followed users and self)
// @route   GET /api/posts/feed
// @access  Private
exports.getFeedPosts = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Get current user and their following list
    const currentUser = await User.findById(req.user.id);
    const userFollowing = [...currentUser.following, req.user.id]; // Include own posts

    // Get total count for pagination
    const total = await Post.countDocuments({ user: { $in: userFollowing } });

    // Get posts from followed users
    const posts = await Post.find({ user: { $in: userFollowing } })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate("user", "username profilePicture")
      .populate("comments.user", "username profilePicture")
      .populate("likes", "username");

    res.status(200).json({
      success: true,
      count: posts.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: posts,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Get explore/discover posts (from users not followed)
// @route   GET /api/posts/explore
// @access  Private
exports.getExplorePosts = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Get users that current user doesn't follow
    const currentUser = await User.findById(req.user.id);
    const following = [...currentUser.following, req.user.id]; // Include self

    // Get total count for pagination
    const total = await Post.countDocuments({ user: { $nin: following } });

    // Get posts from users not followed
    const posts = await Post.find({ user: { $nin: following } })
      .sort({ likes: -1, createdAt: -1 }) // Sort by popularity then recency
      .skip(startIndex)
      .limit(limit)
      .populate("user", "username profilePicture")
      .populate("comments.user", "username profilePicture")
      .populate("likes", "username");

    res.status(200).json({
      success: true,
      count: posts.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: posts,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};
