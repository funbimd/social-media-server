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
const {
  searchValidation,
  paginationValidation,
  profileValidation,
  validateRequest,
} = require("../middleware/validate");

const router = express.Router();

router.use(protect);

router.route("/:id").get(getUserProfile);

router.route("/search").get(searchValidation, validateRequest, searchUsers);

router
  .route("/suggestions")
  .get(paginationValidation, validateRequest, getSuggestedUsers);

router.route("/:id/follow").put(followUser);

router
  .route("/:id/posts")
  .get(paginationValidation, validateRequest, getUserPosts);

router
  .route("/:id/followers")
  .get(paginationValidation, validateRequest, getUserFollowers);

router
  .route("/:id/following")
  .get(paginationValidation, validateRequest, getUserFollowing);

module.exports = router;
