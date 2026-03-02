const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const cloudinary = require("../config/cloudinary");
const sendEmail = require("../utils/sendEmail");

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Kiểm tra user đã tồn tại chưa
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
    }

    // Tạo user mới
    const user = await User.create({ username, email, password });

    // Tạo tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Lưu refresh token vào DB
    await User.findByIdAndUpdate(user._id, { refreshToken });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || "",
        avatar: user.avatar || "",
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Tìm user kèm password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // So sánh password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Tạo tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Lưu refresh token vào DB (dùng updateOne để tránh trigger pre-save hook hash lại password)
    await User.findByIdAndUpdate(user._id, { refreshToken });

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || "",
        avatar: user.avatar || "",
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        fullName: req.user.fullName || "",
        avatar: req.user.avatar || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile (fullName, avatar)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { fullName } = req.body;

    const updateFields = {};
    if (fullName !== undefined) updateFields.fullName = fullName;

    // Handle avatar file upload to Cloudinary
    if (req.file) {
      // Upload buffer to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "personal-diary/avatars",
            transformation: [
              { width: 300, height: 300, crop: "fill", gravity: "face" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      // Delete old avatar from Cloudinary if exists
      const currentUser = await User.findById(req.user._id);
      if (currentUser.avatar && currentUser.avatar.includes("cloudinary")) {
        const publicId = currentUser.avatar
          .split("/")
          .slice(-2)
          .join("/")
          .replace(/\.[^/.]+$/, "");
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch {
          // Ignore delete errors
        }
      }

      updateFields.avatar = result.secure_url;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateFields, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName || "",
        avatar: user.avatar || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public profile of a user by ID
// @route   GET /api/auth/users/:userId
// @access  Public
const getUserPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName || "",
        avatar: user.avatar || "",
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token using refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: clientRefreshToken } = req.body;

    if (!clientRefreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(clientRefreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    // Tìm user và kiểm tra refresh token khớp trong DB
    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || user.refreshToken !== clientRefreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Tạo cặp token mới (Rotation: đổi cả RT mỗi lần refresh)
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Lưu refresh token mới vào DB
    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout - xóa refresh token
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res, next) => {
  try {
    // Xóa refresh token trong DB
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password - gửi OTP qua email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    // Tạo OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP trước khi lưu
    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp, salt);

    // Lưu OTP + thời gian hết hạn (10 phút)
    await User.findByIdAndUpdate(user._id, {
      resetPasswordOTP: hashedOTP,
      resetPasswordExpires: Date.now() + 10 * 60 * 1000,
    });

    // Gửi email
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px;">
        <div style="background: white; border-radius: 12px; padding: 32px; text-align: center;">
          <div style="font-size: 40px; margin-bottom: 8px;">🔐</div>
          <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px;">Password Reset</h2>
          <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">Use the code below to reset your password</p>
          <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This code expires in <strong>10 minutes</strong></p>
          <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0;">If you didn't request this, please ignore this email.</p>
        </div>
      </div>
    `;

    await sendEmail(email, "🔐 Personal Diary - Password Reset Code", html);

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password bằng OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findOne({ email }).select(
      "+resetPasswordOTP +resetPasswordExpires"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    if (!user.resetPasswordOTP || !user.resetPasswordExpires) {
      return res.status(400).json({
        success: false,
        message: "No password reset request found. Please request a new OTP.",
      });
    }

    // Kiểm tra hết hạn
    if (user.resetPasswordExpires < Date.now()) {
      await User.findByIdAndUpdate(user._id, {
        resetPasswordOTP: null,
        resetPasswordExpires: null,
      });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // So sánh OTP
    const isMatch = await bcrypt.compare(otp, user.resetPasswordOTP);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Hash mật khẩu mới và cập nhật
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetPasswordOTP: null,
      resetPasswordExpires: null,
      refreshToken: null, // Force logout tất cả sessions
    });

    res.status(200).json({
      success: true,
      message: "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile, getUserPublicProfile, refreshToken, logoutUser, forgotPassword, resetPassword };
