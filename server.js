const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/db");
const auth = require("./routes/auth");
const posts = require("./routes/posts");
const profiles = require("./routes/profiles");
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

app.use("/api/auth", auth);
app.use("/api/posts", posts);
app.use("/api/profiles", profiles);

// Connect to database
connectDB()
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error(`MongoDB connection error: ${err.message}`);
    // Don't exit process in production, let the server still run
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  });

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

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "Server error" : err.message,
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error(`Error: ${err.message}`);
  // Graceful shutdown
  server.close(() => process.exit(1));
});
