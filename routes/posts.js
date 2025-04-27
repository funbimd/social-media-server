const express = require("express");
const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  likePost,
  addComment,
  deleteComment,
  getFeedPosts,
  getExplorePosts,
} = require("../controllers/postController");
const { protect } = require("../middleware/auth");
const {
  postValidation,
  commentValidation,
  paginationValidation,
  validateRequest,
} = require("../middleware/validate");

const router = express.Router();

router.use(protect);

router
  .route("/")
  .post(postValidation, validateRequest, createPost)
  .get(getPosts);

router.route("/feed").get(paginationValidation, validateRequest, getFeedPosts);

router
  .route("/explore")
  .get(paginationValidation, validateRequest, getExplorePosts);

router
  .route("/:id")
  .get(getPost)
  .put(postValidation, validateRequest, updatePost)
  .delete(deletePost);

router.route("/:id/like").put(likePost);

router
  .route("/:id/comments")
  .post(commentValidation, validateRequest, addComment);

router.route("/:id/comments/:comment_id").delete(deleteComment);

module.exports = router;
