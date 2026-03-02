const express = require("express");
const router = express.Router();
const { register, login, getMe, updateProfile, getUserPublicProfile, refreshToken, logoutUser, forgotPassword, resetPassword } = require("../controllers/authController");
const { protect } = require("../middlewares/auth");
const upload = require("../middlewares/upload");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/users/:userId", getUserPublicProfile);

// Protected routes
router.get("/me", protect, getMe);
router.post("/logout", protect, logoutUser);
router.put("/profile", protect, upload.single("avatar"), updateProfile);

module.exports = router;
