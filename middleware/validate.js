// middleware/validate.js
const { validationResult, check } = require("express-validator");

// Middleware to check for validation errors
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

// Validation rules for registration
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

// Validation rules for login
exports.loginValidation = [
  check("email", "Please include a valid email").isEmail().normalizeEmail(),
  check("password", "Password is required").notEmpty(),
];

// Validation rules for creating posts
exports.postValidation = [
  check("text", "Text is required").notEmpty().trim(),
  check("text", "Text cannot exceed 500 characters").isLength({ max: 500 }),
  check("image", "Image must be a valid URL").optional().isURL(),
];

// Validation rules for comments
exports.commentValidation = [
  check("text", "Comment text is required").notEmpty().trim(),
  check("text", "Comment cannot exceed 300 characters").isLength({ max: 300 }),
];

// Validation rules for profile update
exports.profileValidation = [
  check("bio", "Bio cannot exceed 500 characters")
    .optional()
    .isLength({ max: 500 }),
  check("profilePicture", "Profile picture must be a valid URL")
    .optional()
    .isURL(),
];

// Validation for pagination parameters
exports.paginationValidation = [
  check("page", "Page must be a positive number").optional().isInt({ min: 1 }),
  check("limit", "Limit must be between 1 and 100")
    .optional()
    .isInt({ min: 1, max: 100 }),
];

// Validation for search parameters
exports.searchValidation = [
  check("username", "Username is required for search")
    .notEmpty()
    .trim()
    .escape(),
];
