const Friendship = require("../models/Friendship");
const User = require("../models/User");

// @desc    Send a friend request
// @route   POST /api/friends/request/:userId
// @access  Private
exports.sendRequest = async (req, res, next) => {
  try {
    const requesterId = req.user._id;
    const recipientId = req.params.userId;

    if (requesterId.toString() === recipientId) {
      return res.status(400).json({ success: false, message: "Cannot send a friend request to yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if a friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    });

    if (existingFriendship) {
      if (existingFriendship.status === "pending") {
        return res.status(400).json({ success: false, message: "Friend request already exists" });
      }
      if (existingFriendship.status === "accepted") {
        return res.status(400).json({ success: false, message: "You are already friends" });
      }
      // If rejected, allow re-request (or update status back to pending)
      existingFriendship.status = "pending";
      existingFriendship.requester = requesterId;
      existingFriendship.recipient = recipientId;
      await existingFriendship.save();
      return res.status(200).json({ success: true, message: "Friend request sent", data: existingFriendship });
    }

    // Create new friend request
    const friendship = await Friendship.create({
      requester: requesterId,
      recipient: recipientId,
      status: "pending",
    });

    res.status(201).json({ success: true, message: "Friend request sent", data: friendship });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept a friend request
// @route   POST /api/friends/accept/:requestId
// @access  Private
exports.acceptRequest = async (req, res, next) => {
  try {
    const friendship = await Friendship.findById(req.params.requestId);

    if (!friendship) {
      return res.status(404).json({ success: false, message: "Friend request not found" });
    }

    // Only the recipient can accept
    if (friendship.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to accept this request" });
    }

    if (friendship.status !== "pending") {
      return res.status(400).json({ success: false, message: "Request is not pending" });
    }

    friendship.status = "accepted";
    await friendship.save();

    res.status(200).json({ success: true, message: "Friend request accepted", data: friendship });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject or Cancel a friend request
// @route   POST /api/friends/reject/:requestId
// @access  Private
exports.rejectRequest = async (req, res, next) => {
  try {
    const friendship = await Friendship.findById(req.params.requestId);

    if (!friendship) {
      return res.status(404).json({ success: false, message: "Friend request not found" });
    }

    // Requester can cancel, Recipient can reject
    if (
      friendship.requester.toString() !== req.user._id.toString() &&
      friendship.recipient.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Not authorized to modify this request" });
    }

    // Either delete the request or set status to rejected. We will delete it to clean up DB space
    await friendship.deleteOne();

    res.status(200).json({ success: true, message: "Friend request removed" });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a friend
// @route   DELETE /api/friends/remove/:userId
// @access  Private
exports.removeFriend = async (req, res, next) => {
  try {
    const userId1 = req.user._id;
    const userId2 = req.params.userId;

    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { requester: userId1, recipient: userId2, status: "accepted" },
        { requester: userId2, recipient: userId1, status: "accepted" },
      ],
    });

    if (!friendship) {
      return res.status(404).json({ success: false, message: "Friendship not found" });
    }

    res.status(200).json({ success: true, message: "Friend removed" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of accepted friends
// @route   GET /api/friends
// @access  Private
exports.getFriends = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const friendships = await Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: "accepted",
    })
      .populate("requester", "username fullName avatar")
      .populate("recipient", "username fullName avatar");

    // Extract the other user from the friendship
    const friends = friendships.map((f) => {
      // Return the one that is NOT the current user
      if (f.requester._id.toString() === userId.toString()) {
        return f.recipient;
      } else {
        return f.requester;
      }
    });

    res.status(200).json({ success: true, count: friends.length, data: friends });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending friend requests
// @route   GET /api/friends/requests
// @access  Private
exports.getRequests = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Requests received by me (someone else is requester, I am recipient)
    const received = await Friendship.find({
      recipient: userId,
      status: "pending",
    }).populate("requester", "username fullName avatar");

    // Requests sent by me
    const sent = await Friendship.find({
      requester: userId,
      status: "pending",
    }).populate("recipient", "username fullName avatar");

    res.status(200).json({ success: true, data: { received, sent } });
  } catch (error) {
    next(error);
  }
};
