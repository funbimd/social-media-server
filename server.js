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

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(helmet());
app.use(cors());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});

app.use("/api", apiLimiter);

app.use("/api/auth", auth);
app.use("/api/posts", posts);
app.use("/api/profiles", profiles);
app.use("/api/search", search);

app.get("/", (req, res) => {
  res.send("Social Media API is running...");
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

  connectDB()
    .then(() => console.log("PostgreSQL connected successfully"))
    .catch((err) => {
      console.error(`PostgreSQL connection error: ${err.message}`);
      if (process.env.NODE_ENV !== "production") {
        server.close(() => process.exit(1));
      }
    });
});

process.on("unhandledRejection", (err) => {
  console.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
