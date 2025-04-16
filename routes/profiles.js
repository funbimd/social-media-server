const express = require("express");
const {
  getUserProfile,
  followUser,
  getUserPosts,
  searchUsers,
  getSuggestedUsers,
  getUserFollowers,
  getUserFollowing,
} = require("../controllers/profileController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

router.route("/search").get(searchUsers);

router.route("/suggestions").get(getSuggestedUsers);

router.route("/:id/follow").put(followUser);

router.route("/:id/posts").get(getUserPosts);

router.route("/:id/followers").get(getUserFollowers);

router.route("/:id/following").get(getUserFollowing);

router.route("/:id").get(getUserProfile);

module.exports = router;
