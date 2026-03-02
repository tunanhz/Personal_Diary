const jwt = require("jsonwebtoken");

// Tạo Access Token (ngắn hạn - 15 phút)
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  });
};

// Tạo Refresh Token (dài hạn - 7 ngày)
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  });
};

module.exports = { generateAccessToken, generateRefreshToken };
