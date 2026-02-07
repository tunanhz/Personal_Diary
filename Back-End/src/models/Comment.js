const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [1000, "Comment must be at most 1000 characters"],
    },
    diary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Diary",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index để query nhanh comments theo diary
commentSchema.index({ diary: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", commentSchema);
