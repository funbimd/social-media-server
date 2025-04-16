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

const router = express.Router();

// All routes are protected
router.use(protect);

router.route("/").post(createPost).get(getPosts);

router.route("/feed").get(getFeedPosts);

router.route("/explore").get(getExplorePosts);

router.route("/:id").get(getPost).put(updatePost).delete(deletePost);

router.route("/:id/like").put(likePost);

router.route("/:id/comments").post(addComment);

router.route("/:id/comments/:comment_id").delete(deleteComment);

module.exports = router;
