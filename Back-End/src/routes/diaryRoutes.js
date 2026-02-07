const express = require("express");
const router = express.Router();
const {
  createDiary,
  getMyDiaries,
  getDiaryById,
  updateDiary,
  deleteDiary,
  toggleVisibility,
  getPublicDiaries,
  reactToDiary,
} = require("../controllers/diaryController");
const {
  addComment,
  getComments,
  deleteComment,
  reactToComment,
} = require("../controllers/commentController");
const { protect, optionalAuth } = require("../middlewares/auth");

// ===== PUBLIC ROUTES =====
// Lấy danh sách bài viết public (guest có thể xem)
router.get("/public", getPublicDiaries);

// ===== PRIVATE ROUTES (yêu cầu đăng nhập) =====
// CRUD diary của user
router.post("/", protect, createDiary);
router.get("/my", protect, getMyDiaries);
router.put("/:id", protect, updateDiary);
router.delete("/:id", protect, deleteDiary);
router.patch("/:id/toggle-visibility", protect, toggleVisibility);

// React to a diary (toggle emoji)
router.post("/:id/react", protect, reactToDiary);

// Xem chi tiết diary (dùng optionalAuth để biết ai đang xem)
router.get("/:id", optionalAuth, getDiaryById);

// ===== COMMENT ROUTES =====
// Lấy comments (optionalAuth để kiểm tra quyền nếu diary private)
router.get("/:diaryId/comments", optionalAuth, getComments);
// Thêm comment (phải đăng nhập)
router.post("/:diaryId/comments", protect, addComment);
// Xóa comment (phải đăng nhập, chủ comment hoặc chủ diary)
router.delete("/:diaryId/comments/:commentId", protect, deleteComment);
// React to a comment (toggle emoji)
router.post("/:diaryId/comments/:commentId/react", protect, reactToComment);

module.exports = router;
