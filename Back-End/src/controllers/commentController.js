const Comment = require("../models/Comment");
const Diary = require("../models/Diary");

// @desc    Add comment to a public diary
// @route   POST /api/diaries/:diaryId/comments
// @access  Private (phải đăng nhập mới được comment)
const addComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    // Kiểm tra diary tồn tại và là public
    const diary = await Diary.findById(req.params.diaryId);

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: "Diary not found",
      });
    }

    if (!diary.isPublic) {
      return res.status(403).json({
        success: false,
        message: "Cannot comment on a private diary",
      });
    }

    const comment = await Comment.create({
      content,
      diary: diary._id,
      author: req.user._id,
    });

    // Populate author trước khi trả về
    await comment.populate("author", "username");

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
// @access  Public (nếu diary public)
const getComments = async (req, res, next) => {
  try {
    const diary = await Diary.findById(req.params.diaryId);

    if (!diary) {
      return res.status(404).json({
        success: false,
        message: "Diary not found",
      });
    }

    // Nếu diary private, chỉ chủ sở hữu mới xem được comments
    if (!diary.isPublic) {
      if (!req.user || diary.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "This diary is private",
        });
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      Comment.find({ diary: req.params.diaryId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "username"),
      Comment.countDocuments({ diary: req.params.diaryId }),
    ]);

    res.status(200).json({
      success: true,
      data: comments,
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
// @access  Private (chủ comment hoặc chủ diary)
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Kiểm tra comment thuộc diary này không
    if (comment.diary.toString() !== req.params.diaryId) {
      return res.status(400).json({
        success: false,
        message: "Comment does not belong to this diary",
      });
    }

    // Chỉ chủ comment hoặc chủ diary mới được xóa
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

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addComment,
  getComments,
  deleteComment,
};
