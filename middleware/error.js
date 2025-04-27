const ErrorResponse = require("../utils/errorResponse");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error(err);

  if (err.name === "CastError") {
    const message = `Resource not found with ID: ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = new ErrorResponse(`${field} '${value}' already exists`, 400);
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new ErrorResponse(message, 400);
  }

  if (err.name === "JsonWebTokenError") {
    error = new ErrorResponse("Invalid token. Authorization denied", 401);
  }

  if (err.name === "TokenExpiredError") {
    error = new ErrorResponse("Token expired. Please login again", 401);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
