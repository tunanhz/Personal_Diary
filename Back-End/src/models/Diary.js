const mongoose = require("mongoose");

const diarySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title must be at most 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false, // Mặc định là private
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index để tìm kiếm nhanh
diarySchema.index({ author: 1, createdAt: -1 });
diarySchema.index({ isPublic: 1, createdAt: -1 });

module.exports = mongoose.model("Diary", diarySchema);
