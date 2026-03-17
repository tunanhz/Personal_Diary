const Diary = require("../models/Diary");
const Comment = require("../models/Comment");
const cloudinary = require("../config/cloudinary");
const { getIO } = require("../socket");

// Helper: upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder = "personal-diary/diaries") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// @desc    Create a new diary entry
// @route   POST /api/diaries
// @access  Private
const createDiary = async (req, res, next) => {
  try {
    const { title, content, visibility, isPublic, tags } = req.body;

    // Upload images to Cloudinary if any
    let images = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer)
      );
      const results = await Promise.all(uploadPromises);
      images = results.map((r) => ({
        url: r.secure_url,
        publicId: r.public_id,
      }));
    }

    // Parse tags nếu gửi dưới dạng string (từ FormData)
    let parsedTags = tags || [];
    if (typeof tags === "string") {
      try {
        parsedTags = JSON.parse(tags);
      } catch {
        parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    let diaryVisibility = "private";
    if (visibility) {
      diaryVisibility = visibility;
    } else if (isPublic !== undefined) {
      diaryVisibility = (isPublic === "true" || isPublic === true) ? "public" : "private";
    }

    const diary = await Diary.create({
      title,
      content,
      visibility: diaryVisibility,
      tags: parsedTags,
      images,
      author: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: diary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all diaries of current user
// @route   GET /api/diaries/my
// @access  Private
const getMyDiaries = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter theo query params
    const filter = { author: req.user._id };

    // Filter theo visibility hoặc isPublic
    if (req.query.visibility) {
      filter.visibility = req.query.visibility;
    } else if (req.query.isPublic !== undefined) {
      filter.visibility = req.query.isPublic === "true" ? "public" : "private";
    }

    // Tìm kiếm theo title
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: "i" };
    }

    const [diaries, total] = await Promise.all([
      Diary.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "username fullName avatar"),
      Diary.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: diaries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single diary by ID (owner or public)
// @route   GET /api/diaries/:id
// @access  Public (but private diaries only visible to owner)
const getDiaryById = async (req, res, next) => {
  try {
    const diary = await Diary.findById(req.params.id).populate(
      "author",
      "username"
    );

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: "Diary not found",
      });
    }

    // Nếu diary không public, kiểm tra quyền xem
    if (diary.visibility !== "public") {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authorized to view this diary" });
      }
      if (diary.author._id.toString() !== req.user._id.toString()) {
        if (diary.visibility === "friends") {
          const Friendship = require("../models/Friendship");
          const isFriend = await Friendship.findOne({
            $or: [
              { requester: req.user._id, recipient: diary.author._id, status: "accepted" },
              { requester: diary.author._id, recipient: req.user._id, status: "accepted" }
            ]
          });
          if (!isFriend) {
            return res.status(403).json({ success: false, message: "This diary is for friends only" });
          }
        } else {
          return res.status(403).json({ success: false, message: "This diary is private" });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: diary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update diary entry
// @route   PUT /api/diaries/:id
// @access  Private (owner only)
const updateDiary = async (req, res, next) => {
  try {
    let diary = await Diary.findById(req.params.id);

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: "Diary not found",
      });
    }

    // Chỉ chủ sở hữu mới được sửa
    if (diary.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this diary",
      });
    }

    const { title, content, visibility, isPublic, tags, removeImageIds } = req.body;

    diary.title = title !== undefined ? title : diary.title;
    diary.content = content !== undefined ? content : diary.content;
    
    if (visibility !== undefined) {
      diary.visibility = visibility;
    } else if (isPublic !== undefined) {
      diary.visibility = (isPublic === "true" || isPublic === true) ? "public" : "private";
    }

    // Parse tags nếu gửi dưới dạng string (từ FormData)
    if (tags !== undefined) {
      if (typeof tags === "string") {
        try {
          diary.tags = JSON.parse(tags);
        } catch {
          diary.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
        }
      } else {
        diary.tags = tags;
      }
    }

    // Remove images nếu có
    if (removeImageIds) {
      let idsToRemove = removeImageIds;
      if (typeof removeImageIds === "string") {
        try {
          idsToRemove = JSON.parse(removeImageIds);
        } catch {
          idsToRemove = [removeImageIds];
        }
      }
      // Delete from Cloudinary
      const deletePromises = diary.images
        .filter((img) => idsToRemove.includes(img.publicId))
        .map((img) =>
          cloudinary.uploader.destroy(img.publicId).catch(() => {})
        );
      await Promise.all(deletePromises);

      // Remove from array
      diary.images = diary.images.filter(
        (img) => !idsToRemove.includes(img.publicId)
      );
    }

    // Upload new images nếu có
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadToCloudinary(file.buffer)
      );
      const results = await Promise.all(uploadPromises);
      const newImages = results.map((r) => ({
        url: r.secure_url,
        publicId: r.public_id,
      }));
      diary.images = [...diary.images, ...newImages];
    }

    await diary.save();

    // Populate author trước khi trả về
    await diary.populate("author", "username fullName avatar");

    res.status(200).json({
      success: true,
      data: diary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete diary entry
// @route   DELETE /api/diaries/:id
// @access  Private (owner only)
const deleteDiary = async (req, res, next) => {
  try {
    const diary = await Diary.findById(req.params.id);

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: "Diary not found",
      });
    }

    // Chỉ chủ sở hữu mới được xóa
    if (diary.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this diary",
      });
    }

    // Xóa tất cả comments liên quan
    await Comment.deleteMany({ diary: diary._id });

    // Delete images from Cloudinary
    if (diary.images && diary.images.length > 0) {
      const deletePromises = diary.images.map((img) =>
        cloudinary.uploader.destroy(img.publicId).catch(() => {})
      );
      await Promise.all(deletePromises);
    }

    // Delete diary
    await diary.deleteOne();

    res.status(200).json({
      success: true,
      message: "Diary deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle public/private (now cycling visibilities)
// @route   PATCH /api/diaries/:id/toggle-visibility
// @access  Private (owner only)
const toggleVisibility = async (req, res, next) => {
  try {
    const diary = await Diary.findById(req.params.id);

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: "Diary not found",
      });
    }

    if (diary.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (diary.visibility === "private") diary.visibility = "public";
    else if (diary.visibility === "public") diary.visibility = "private";
    else diary.visibility = "public"; // default to toggle from friends -> public
    
    await diary.save();

    res.status(200).json({
      success: true,
      data: diary,
      message: `Diary is now ${diary.visibility}`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all public diaries (for feed/guest)
// @route   GET /api/diaries/public
// @access  Public
const getPublicDiaries = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = { visibility: { $in: ["public"] } };
    
    // Nếu có đăng nhập, lấy được cả list các bài viết 'friends' của bạn bè
    if (req.user) {
      const Friendship = require("../models/Friendship");
      const friendships = await Friendship.find({
        $or: [{ requester: req.user._id }, { recipient: req.user._id }],
        status: "accepted"
      });
      const friendIds = friendships.map(f => 
        f.requester.toString() === req.user._id.toString() ? f.recipient : f.requester
      );
      
      filter = {
        $or: [
          { visibility: "public" },
          { visibility: "friends", author: { $in: friendIds } },
          { author: req.user._id } // always include own diaries just in case they land here
        ]
      };
    }

    // Tìm kiếm theo title
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: "i" };
    }

    const [diaries, total] = await Promise.all([
      Diary.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "username fullName avatar"),
      Diary.countDocuments(filter),
    ]);

    // Đếm comments cho mỗi diary
    const diaryIds = diaries.map((d) => d._id);
    const commentCounts = await Comment.aggregate([
      { $match: { diary: { $in: diaryIds } } },
      { $group: { _id: "$diary", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    commentCounts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    const data = diaries.map((d) => {
      const obj = d.toObject();
      obj.commentCount = countMap[d._id.toString()] || 0;
      return obj;
    });

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    React to a public diary (toggle emoji)
// @route   POST /api/diaries/:id/react
// @access  Private
const reactToDiary = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const allowedEmojis = ["\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDE2E", "\uD83D\uDE22", "\uD83D\uDC4F"];

    if (!emoji || !allowedEmojis.includes(emoji)) {
      return res.status(400).json({
        success: false,
        message: `Invalid emoji. Allowed: ${allowedEmojis.join(" ")}`,
      });
    }

    const diary = await Diary.findById(req.params.id);

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: "Diary not found",
      });
    }

    const userId = req.user._id.toString();

    if (diary.visibility !== "public") {
      if (diary.author._id.toString() !== userId) {
        if (diary.visibility === "friends") {
          const Friendship = require("../models/Friendship");
          const isFriend = await Friendship.findOne({
            $or: [
              { requester: userId, recipient: diary.author._id, status: "accepted" },
              { requester: diary.author._id, recipient: userId, status: "accepted" }
            ]
          });
          if (!isFriend) {
            return res.status(403).json({ success: false, message: "Cannot react to this friends-only diary" });
          }
        } else {
          return res.status(403).json({ success: false, message: "Cannot react to a private diary" });
        }
      }
    }

    // Kiểm tra user đã react emoji này chưa
    const existingIndex = diary.reactions.findIndex(
      (r) => r.user.toString() === userId && r.emoji === emoji
    );

    if (existingIndex > -1) {
      // Nếu đã react emoji này → bỏ react (toggle off)
      diary.reactions.splice(existingIndex, 1);
    } else {
      // Xóa reaction cũ của user (nếu có) rồi thêm mới
      diary.reactions = diary.reactions.filter(
        (r) => r.user.toString() !== userId
      );
      diary.reactions.push({ user: req.user._id, emoji });
    }

    await diary.save();

    // Tính lại summary
    const reactionSummary = {};
    diary.reactions.forEach((r) => {
      reactionSummary[r.emoji] = (reactionSummary[r.emoji] || 0) + 1;
    });

    const userReaction = diary.reactions.find(
      (r) => r.user.toString() === userId
    );

    // Emit real-time event
    const io = getIO();
    io.to(`diary:${req.params.id}`).emit("diary-reaction", {
      diaryId: req.params.id,
      reactions: diary.reactions,
      reactionSummary,
    });
    // Also emit to feed for explore page
    io.to("feed").emit("feed-diary-reaction", {
      diaryId: req.params.id,
      reactions: diary.reactions,
      reactionSummary,
    });

    res.status(200).json({
      success: true,
      data: {
        reactions: diary.reactions,
        reactionSummary,
        userReaction: userReaction ? userReaction.emoji : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public diaries of a specific user
// @route   GET /api/diaries/user/:userId
// @access  Public
const getPublicDiariesByUser = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filter = { author: req.params.userId, visibility: "public" };

    if (req.user) {
      if (req.user._id.toString() === req.params.userId) {
        filter = { author: req.params.userId }; // Owner sees all
      } else {
        const Friendship = require("../models/Friendship");
        const isFriend = await Friendship.findOne({
          $or: [
            { requester: req.user._id, recipient: req.params.userId, status: "accepted" },
            { requester: req.params.userId, recipient: req.user._id, status: "accepted" }
          ]
        });
        if (isFriend) {
          filter = { author: req.params.userId, visibility: { $in: ["public", "friends"] } };
        }
      }
    }

    const [diaries, total] = await Promise.all([
      Diary.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "username fullName avatar"),
      Diary.countDocuments(filter),
    ]);

    // Count comments for each diary
    const diaryIds = diaries.map((d) => d._id);
    const commentCounts = await Comment.aggregate([
      { $match: { diary: { $in: diaryIds } } },
      { $group: { _id: "$diary", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    commentCounts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    const data = diaries.map((d) => {
      const obj = d.toObject();
      obj.commentCount = countMap[d._id.toString()] || 0;
      return obj;
    });

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDiary,
  getMyDiaries,
  getDiaryById,
  updateDiary,
  deleteDiary,
  toggleVisibility,
  getPublicDiaries,
  getPublicDiariesByUser,
  reactToDiary,
};
