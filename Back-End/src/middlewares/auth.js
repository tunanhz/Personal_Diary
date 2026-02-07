const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware bảo vệ route - yêu cầu đăng nhập
const protect = async (req, res, next) => {
  try {
    let token;

    // Lấy token từ header Authorization: Bearer <token>
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Gắn user vào request (không lấy password)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token invalid",
    });
  }
};

// Middleware optional - nếu có token thì gắn user, không có thì bỏ qua
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Token không hợp lệ thì bỏ qua, tiếp tục như guest
    next();
  }
};

module.exports = { protect, optionalAuth };
