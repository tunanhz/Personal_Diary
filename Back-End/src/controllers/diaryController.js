const Diary = require("../models/Diary");
const Comment = require("../models/Comment");

// @desc    Create a new diary entry
// @route   POST /api/diaries
// @access  Private
const createDiary = async (req, res, next) => {
  try {
    const { title, content, isPublic, tags } = req.body;

    const diary = await Diary.create({
      title,
      content,
      isPublic: isPublic || false,
      tags: tags || [],
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

    // Filter theo isPublic nếu có
    if (req.query.isPublic !== undefined) {
      filter.isPublic = req.query.isPublic === "true";
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
        .populate("author", "username"),
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

    // Nếu diary private, chỉ chủ sở hữu mới được xem
    if (!diary.isPublic) {
      if (!req.user || diary.author._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "This diary is private",
        });
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

    const { title, content, isPublic, tags } = req.body;

    diary.title = title !== undefined ? title : diary.title;
    diary.content = content !== undefined ? content : diary.content;
    diary.isPublic = isPublic !== undefined ? isPublic : diary.isPublic;
    diary.tags = tags !== undefined ? tags : diary.tags;

    await diary.save();

    // Populate author trước khi trả về
    await diary.populate("author", "username");

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

    // Xóa diary
    await diary.deleteOne();

    res.status(200).json({
      success: true,
      message: "Diary deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle public/private
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

    diary.isPublic = !diary.isPublic;
    await diary.save();

    res.status(200).json({
      success: true,
      data: diary,
      message: `Diary is now ${diary.isPublic ? "public" : "private"}`,
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

    const filter = { isPublic: true };

    // Tìm kiếm theo title
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: "i" };
    }

    const [diaries, total] = await Promise.all([
      Diary.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("author", "username"),
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

module.exports = {
  createDiary,
  getMyDiaries,
  getDiaryById,
  updateDiary,
  deleteDiary,
  toggleVisibility,
  getPublicDiaries,
};
