const User = require("../models/User");

// @desc    Get user profile
// @route   GET /api/profiles/:id
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("followers", "username profilePicture")
      .populate("following", "username profilePicture");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

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

// @desc    Follow/Unfollow a user
// @route   PUT /api/profiles/:id/follow
// @access  Private
exports.followUser = async (req, res) => {
  try {
    // Make sure user can't follow themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: "You cannot follow yourself",
      });
    }

    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Check if already following
    const isFollowing = currentUser.following.some(
      (user) => user.toString() === req.params.id
    );

    if (isFollowing) {
      // Unfollow: Remove user from following list
      currentUser.following = currentUser.following.filter(
        (user) => user.toString() !== req.params.id
      );

      // Remove current user from target user's followers list
      userToFollow.followers = userToFollow.followers.filter(
        (user) => user.toString() !== req.user.id
      );

      await currentUser.save();
      await userToFollow.save();

      return res.status(200).json({
        success: true,
        data: { following: false },
      });
    }

    // Follow: Add user to following list
    currentUser.following.push(req.params.id);
    userToFollow.followers.push(req.user.id);

    await currentUser.save();
    await userToFollow.save();

    res.status(200).json({
      success: true,
      data: { following: true },
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Get user posts
// @route   GET /api/profiles/:id/posts
// @access  Private
exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.id })
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

// @desc    Get user followers list
// @route   GET /api/profiles/:id/followers
// @access  Private
exports.getUserFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "followers",
      "username profilePicture bio"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      count: user.followers.length,
      data: user.followers,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Get user following list
// @route   GET /api/profiles/:id/following
// @access  Private
exports.getUserFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate(
      "following",
      "username profilePicture bio"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      count: user.following.length,
      data: user.following,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Search for users
// @route   GET /api/profiles/search
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: "Please provide a username to search for",
      });
    }

    // Search for users with similar usernames
    const users = await User.find({
      username: { $regex: username, $options: "i" }, // Case-insensitive search
    }).select("username profilePicture bio");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};

// @desc    Get suggested users to follow (users not followed)
// @route   GET /api/profiles/suggestions
// @access  Private
exports.getSuggestedUsers = async (req, res) => {
  try {
    // Get users that the current user doesn't follow
    const currentUser = await User.findById(req.user.id);
    const following = [...currentUser.following, req.user.id]; // Include self

    // Find users not followed, limit to 5
    const users = await User.find({ _id: { $nin: following } })
      .select("username profilePicture bio")
      .limit(5);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
};
