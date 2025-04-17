// controllers/searchController.js
const User = require("../models/User");
const Post = require("../models/Post");
const { getPaginationInfo } = require("../utils/pagination");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Search for users
// @route   GET /api/search/users
// @access  Private
exports.searchUsers = async (req, res, next) => {
  try {
    const { username, sortBy = "username", sortOrder = "asc" } = req.query;

    if (!username) {
      return next(new ErrorResponse("Please provide a search term", 400));
    }

    // Build the query
    const query = {
      username: { $regex: username, $options: "i" },
    };

    // Count total users matching the query
    const total = await User.countDocuments(query);

    // Get pagination info
    const { pagination, startIndex, limit } = getPaginationInfo(req, total);

    // Define sort options
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute the query with pagination and sorting
    const users = await User.find(query)
      .select("username profilePicture bio followers following")
      .sort(sort)
      .skip(startIndex)
      .limit(limit);

    // Add following status for each user
    const usersWithFollowStatus = users.map((user) => {
      const isFollowing = req.user.following.includes(user._id);
      return {
        ...user.toObject(),
        isFollowing,
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
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build the query
    const query = {};

    // Search by keywords if provided
    if (keywords) {
      query.text = { $regex: keywords, $options: "i" };
    }

    // Filter by user if provided
    if (userId) {
      query.user = userId;
    }

    // Filter by posts with media if requested
    if (hasMedia === "true") {
      query.image = { $exists: true, $ne: null };
    }

    // Count total posts matching the query
    const total = await Post.countDocuments(query);

    // Get pagination info
    const { pagination, startIndex, limit } = getPaginationInfo(req, total);

    // Define sort options
    const sort = {};

    // Allow sorting by likes count or date
    if (sortBy === "likes") {
      sort["likes.length"] = sortOrder === "desc" ? -1 : 1;
    } else {
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    // Execute the query with pagination and sorting
    const posts = await Post.find(query)
      .populate("user", "username profilePicture")
      .populate("comments.user", "username profilePicture")
      .sort(sort)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      pagination,
      data: posts,
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
    // This is a simplified implementation
    // A more complex version would use text analysis or aggregation

    // Get recent posts (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentPosts = await Post.find({
      createdAt: { $gte: oneDayAgo },
    }).select("text likes");

    // Simple trend detection based on likes count and keywords
    // In a real implementation, you might use more sophisticated text analysis
    const keywords = {};

    recentPosts.forEach((post) => {
      // Extract words from the post text
      const words = post.text.toLowerCase().match(/\b\w+\b/g) || [];

      // Count occurrences weighted by likes
      const weight = post.likes.length + 1; // +1 to count the post itself

      words.forEach((word) => {
        // Filter out common words and short words
        if (word.length > 3) {
          if (!keywords[word]) {
            keywords[word] = 0;
          }
          keywords[word] += weight;
        }
      });
    });

    // Convert to array and sort by weight
    const trends = Object.entries(keywords)
      .map(([keyword, weight]) => ({ keyword, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10); // Get top 10

    res.status(200).json({
      success: true,
      data: trends,
    });
  } catch (err) {
    next(err);
  }
};
