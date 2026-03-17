const Comment = require("../models/Comment");
const Diary = require("../models/Diary");
const { getIO } = require("../socket");

// @desc    Add comment to a public diary
// @route   POST /api/diaries/:diaryId/comments
// @access  Private (pháº£i Ä‘Äƒng nháº­p má»›i Ä‘Æ°á»£c comment)
const addComment = async (req, res, next) => {
  try {
    const { content, parentComment } = req.body;

    // Kiểm tra diary tồn tại và quyền comment
    const diary = await Diary.findById(req.params.diaryId);

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: "Diary not found",
      });
    }

    // Check visibility permissions
    const userId = req.user._id.toString();
    if (diary.visibility !== "public") {
      if (diary.author.toString() !== userId) {
        if (diary.visibility === "friends") {
          const Friendship = require("../models/Friendship");
          const isFriend = await Friendship.findOne({
            $or: [
              { requester: userId, recipient: diary.author, status: "accepted" },
              { requester: diary.author, recipient: userId, status: "accepted" }
            ]
          });
          if (!isFriend) {
            return res.status(403).json({
              success: false,
              message: "This diary is for friends only",
            });
          }
        } else {
          return res.status(403).json({
            success: false,
            message: "Cannot comment on a private diary",
          });
        }
      }
    }

    // Nếu reply, kiểm tra parent comment tồn tại
    if (parentComment) {
      const parent = await Comment.findById(parentComment);
      if (!parent || parent.diary.toString() !== req.params.diaryId) {
        return res.status(400).json({
          success: false,
          message: "Parent comment not found in this diary",
        });
      }
      
      // Nếu comment được reply là một reply, gán root parent của nó
      // Điều này làm phẳng thread thành 1 cấp duy nhất
      const actualParentId = parent.parentComment || parent._id;
      
      const comment = await Comment.create({
        content,
        diary: diary._id,
        author: req.user._id,
        parentComment: actualParentId,
      });

      // Populate author trước khi trả về
      await comment.populate("author", "username fullName avatar");

      // Emit real-time event
      const io = getIO();
      io.to(`diary:${diary._id.toString()}`).emit("new-comment", {
        diaryId: diary._id.toString(),
        comment: comment.toObject(),
      });

      return res.status(201).json({
        success: true,
        data: comment,
      });
    }

    const comment = await Comment.create({
      content,
      diary: diary._id,
      author: req.user._id,
      parentComment: null,
    });

    // Populate author trÆ°á»›c khi tráº£ vá»
    await comment.populate("author", "username fullName avatar");

    // Emit real-time event
    const io = getIO();
    io.to(`diary:${diary._id.toString()}`).emit("new-comment", {
      diaryId: diary._id.toString(),
      comment: comment.toObject(),
    });

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all comments of a diary
// @route   GET /api/diaries/:diaryId/comments
// @access  Public (náº¿u diary public)
const getComments = async (req, res, next) => {
  try {
    const diary = await Diary.findById(req.params.diaryId);

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: "Diary not found",
      });
    }

    // Nếu diary không public, kiểm tra quyền xem
    if (diary.visibility !== "public") {
      const isOwner = req.user && diary.author.toString() === req.user._id.toString();
      
      if (!isOwner) {
        if (diary.visibility === "friends" && req.user) {
          const Friendship = require("../models/Friendship");
          const isFriend = await Friendship.findOne({
            $or: [
              { requester: req.user._id, recipient: diary.author, status: "accepted" },
              { requester: diary.author, recipient: req.user._id, status: "accepted" }
            ]
          });
          if (!isFriend) {
            return res.status(403).json({
              success: false,
              message: "This diary is for friends only",
            });
          }
        } else {
          return res.status(403).json({
            success: false,
            message: "This diary is private or restricted",
          });
        }
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      Comment.find({ diary: req.params.diaryId, parentComment: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "username fullName avatar"),
      Comment.countDocuments({ diary: req.params.diaryId, parentComment: null }),
    ]);

    // Láº¥y replies cho táº¥t cáº£ parent comments
    const parentIds = comments.map((c) => c._id);
    const replies = await Comment.find({
      diary: req.params.diaryId,
      parentComment: { $in: parentIds },
    })
      .sort({ createdAt: 1 })
      .populate("author", "username fullName avatar");

    // Gom replies vÃ o parent
    const replyMap = {};
    replies.forEach((r) => {
      const pid = r.parentComment.toString();
      if (!replyMap[pid]) replyMap[pid] = [];
      replyMap[pid].push(r);
    });

    const data = comments.map((c) => {
      const obj = c.toObject();
      obj.replies = replyMap[c._id.toString()] || [];
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

// @desc    Delete a comment
// @route   DELETE /api/diaries/:diaryId/comments/:commentId
// @access  Private (chá»§ comment hoáº·c chá»§ diary)
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Kiá»ƒm tra comment thuá»™c diary nÃ y khÃ´ng
    if (comment.diary.toString() !== req.params.diaryId) {
      return res.status(400).json({
        success: false,
        message: "Comment does not belong to this diary",
      });
    }

    // Chá»‰ chá»§ comment hoáº·c chá»§ diary má»›i Ä‘Æ°á»£c xÃ³a
    const diary = await Diary.findById(req.params.diaryId);
    const isCommentOwner =
      comment.author.toString() === req.user._id.toString();
    const isDiaryOwner =
      diary && diary.author.toString() === req.user._id.toString();

    if (!isCommentOwner && !isDiaryOwner) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    const deletedParentComment = comment.parentComment
      ? comment.parentComment.toString()
      : null;

    await comment.deleteOne();

    // XÃ³a táº¥t cáº£ replies náº¿u Ä‘Ã¢y lÃ  parent comment
    await Comment.deleteMany({ parentComment: req.params.commentId });

    // Emit real-time event
    const ioD = getIO();
    ioD.to(`diary:${req.params.diaryId}`).emit("delete-comment", {
      diaryId: req.params.diaryId,
      commentId: req.params.commentId,
      parentComment: deletedParentComment,
    });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    React to a comment (toggle emoji)
// @route   POST /api/diaries/:diaryId/comments/:commentId/react
// @access  Private
const reactToComment = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const allowedEmojis = ["\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDE2E", "\uD83D\uDE22", "\uD83D\uDC4F"];

    if (!emoji || !allowedEmojis.includes(emoji)) {
      return res.status(400).json({
        success: false,
        message: `Invalid emoji. Allowed: ${allowedEmojis.join(" ")}`,
      });
    }

    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.diary.toString() !== req.params.diaryId) {
      return res.status(400).json({
        success: false,
        message: "Comment does not belong to this diary",
      });
    }

    const userId = req.user._id.toString();

    const existingIndex = comment.reactions.findIndex(
      (r) => r.user.toString() === userId && r.emoji === emoji
    );

    if (existingIndex > -1) {
      comment.reactions.splice(existingIndex, 1);
    } else {
      comment.reactions = comment.reactions.filter(
        (r) => r.user.toString() !== userId
      );
      comment.reactions.push({ user: req.user._id, emoji });
    }

    await comment.save();

    // Emit real-time event
    const ioR = getIO();
    ioR.to(`diary:${req.params.diaryId}`).emit("comment-reaction", {
      diaryId: req.params.diaryId,
      commentId: req.params.commentId,
      reactions: comment.reactions,
    });

    res.status(200).json({
      success: true,
      data: {
        reactions: comment.reactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a comment
// @route   PUT /api/diaries/:diaryId/comments/:commentId
// @access  Private (chá»§ comment only)
const updateComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.diary.toString() !== req.params.diaryId) {
      return res.status(400).json({
        success: false,
        message: "Comment does not belong to this diary",
      });
    }

    // Chá»‰ chá»§ comment má»›i Ä‘Æ°á»£c sá»­a
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit this comment",
      });
    }

    comment.content = content.trim();
    await comment.save();
    await comment.populate("author", "username fullName avatar");

    // Emit real-time event
    const ioU = getIO();
    ioU.to(`diary:${req.params.diaryId}`).emit("update-comment", {
      diaryId: req.params.diaryId,
      comment: comment.toObject(),
    });

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addComment,
  getComments,
  deleteComment,
  reactToComment,
  updateComment,
};
