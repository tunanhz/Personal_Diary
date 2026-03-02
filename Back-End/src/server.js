const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

// Load env variables (dùng path tuyệt đối để không phụ thuộc cwd)
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");
const { initSocket } = require("./socket");

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/diaries", require("./routes/diaryRoutes"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

// Error handler (phải đặt sau routes)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO ready`);
});

module.exports = { app, server, io };
