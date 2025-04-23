const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const { connectDB } = require("./config/db");
const auth = require("./routes/auth");
const posts = require("./routes/posts");
const profiles = require("./routes/profiles");
const search = require("./routes/search");
const errorHandler = require("./middleware/error");
const rateLimit = require("express-rate-limit");

// Load env vars
dotenv.config();

// Create Express app
const app = express();

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});

// Apply rate limiting to all API routes
app.use("/api", apiLimiter);

// Mount routers
app.use("/api/auth", auth);
app.use("/api/posts", posts);
app.use("/api/profiles", profiles);
app.use("/api/search", search);

// Basic route for testing
app.get("/", (req, res) => {
  res.send("Social Media API is running...");
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Error handler middleware (should be last)
app.use(errorHandler);

// Connect to database
connectDB()
  .then(() => console.log("PostgreSQL connected successfully"))
  .catch((err) => {
    console.error(`PostgreSQL connection error: ${err.message}`);
    // Don't exit process in production, let the server still run
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  });

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error(`Error: ${err.message}`);
  // Graceful shutdown
  server.close(() => process.exit(1));
});
