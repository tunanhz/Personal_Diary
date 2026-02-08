const express = require("express");
const router = express.Router();
const { register, login, getMe, updateProfile, getUserPublicProfile } = require("../controllers/authController");
const { protect } = require("../middlewares/auth");
const upload = require("../middlewares/upload");

// Public routes
router.post("/register", register);
router.post("/login", login);
router.get("/users/:userId", getUserPublicProfile);

// Protected routes
router.get("/me", protect, getMe);
router.put("/profile", protect, upload.single("avatar"), updateProfile);

module.exports = router;
