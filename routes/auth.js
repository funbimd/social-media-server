const express = require("express");
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  validateRequest,
} = require("../middleware/validate");

const router = express.Router();

router.post("/register", registerValidation, validateRequest, register);
router.post("/login", loginValidation, validateRequest, login);
router.get("/me", protect, getMe);

router.post(
  "/forgot-password",
  forgotPasswordValidation,
  validateRequest,
  forgotPassword
);
router.put(
  "/reset-password/:token",
  resetPasswordValidation,
  validateRequest,
  resetPassword
);
router.put(
  "/change-password",
  protect,
  changePasswordValidation,
  validateRequest,
  changePassword
);

module.exports = router;
