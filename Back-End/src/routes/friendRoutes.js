const express = require("express");
const router = express.Router();
const friendController = require("../controllers/friendController");
const { protect } = require("../middlewares/auth");

// Send a friend request
router.post("/request/:userId", protect, friendController.sendRequest);

// Accept a friend request
router.post("/accept/:requestId", protect, friendController.acceptRequest);

// Reject/Cancel a friend request
router.post("/reject/:requestId", protect, friendController.rejectRequest);

// Remove a friend
router.delete("/remove/:userId", protect, friendController.removeFriend);

// Get list of friends
router.get("/", protect, friendController.getFriends);

// Get pending friend requests
router.get("/requests", protect, friendController.getRequests);

module.exports = router;
