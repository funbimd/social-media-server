const { validationResult, check } = require("express-validator");

exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }
  next();
};

exports.registerValidation = [
  check("username", "Username is required").notEmpty().trim().escape(),
  check("username", "Username cannot exceed 50 characters").isLength({
    max: 50,
  }),
  check("email", "Please include a valid email").isEmail().normalizeEmail(),
  check("password", "Password must be at least 6 characters").isLength({
    min: 6,
  }),
];

exports.loginValidation = [
  check("email", "Please include a valid email").isEmail().normalizeEmail(),
  check("password", "Password is required").notEmpty(),
];

exports.postValidation = [
  check("text", "Text is required").notEmpty().trim(),
  check("text", "Text cannot exceed 500 characters").isLength({ max: 500 }),
  check("image", "Image must be a valid URL").optional().isURL(),
];

exports.commentValidation = [
  check("text", "Comment text is required").notEmpty().trim(),
  check("text", "Comment cannot exceed 300 characters").isLength({ max: 300 }),
];

exports.profileValidation = [
  check("bio", "Bio cannot exceed 500 characters")
    .optional()
    .isLength({ max: 500 }),
  check("profilePicture", "Profile picture must be a valid URL")
    .optional()
    .isURL(),
];

exports.paginationValidation = [
  check("page", "Page must be a positive number").optional().isInt({ min: 1 }),
  check("limit", "Limit must be between 1 and 100")
    .optional()
    .isInt({ min: 1, max: 100 }),
];

exports.searchValidation = [
  check("username", "Username is required for search")
    .notEmpty()
    .trim()
    .escape(),
];

exports.forgotPasswordValidation = [
  check("email", "Please include a valid email").isEmail().normalizeEmail(),
];

exports.resetPasswordValidation = [
  check("password", "Password must be at least 6 characters").isLength({
    min: 6,
  }),
];

exports.changePasswordValidation = [
  check("currentPassword", "Current password is required").notEmpty(),
  check("newPassword", "New password must be at least 6 characters").isLength({
    min: 6,
  }),
];
