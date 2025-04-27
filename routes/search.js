const express = require("express");
const {
  searchUsers,
  searchPosts,
  getTrendingTopics,
} = require("../controllers/searchController");
const { protect } = require("../middleware/auth");
const {
  searchValidation,
  paginationValidation,
  validateRequest,
} = require("../middleware/validate");

const router = express.Router();

router.use(protect);

router
  .route("/users")
  .get(searchValidation, paginationValidation, validateRequest, searchUsers);

router.route("/posts").get(paginationValidation, validateRequest, searchPosts);

router.route("/trending").get(getTrendingTopics);

module.exports = router;
