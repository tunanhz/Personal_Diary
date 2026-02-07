# 📓 Personal Diary

Website quản lý bài viết nhật ký cá nhân.

## Tech Stack
- **Backend:** Express.js + MongoDB + Mongoose + JWT
- **Frontend:** Next.js (Phase 4)

## Cấu trúc project
```
Back-End/        # Express API server
Front-End/       # Next.js (coming soon)
```

## Backend API Endpoints

### Auth
| Method | Endpoint | Access | Mô tả |
|--------|----------|--------|-------|
| POST | /api/auth/register | Public | Đăng ký |
| POST | /api/auth/login | Public | Đăng nhập |
| GET | /api/auth/me | Private | Lấy thông tin user |

### Diary
| Method | Endpoint | Access | Mô tả |
|--------|----------|--------|-------|
| POST | /api/diaries | Private | Tạo bài viết |
| GET | /api/diaries/my | Private | Lấy bài viết của mình |
| GET | /api/diaries/public | Public | Lấy bài viết public |
| GET | /api/diaries/:id | Public/Private | Xem chi tiết |
| PUT | /api/diaries/:id | Private (owner) | Sửa bài viết |
| DELETE | /api/diaries/:id | Private (owner) | Xóa bài viết |
| PATCH | /api/diaries/:id/toggle-visibility | Private (owner) | Bật/tắt public |

### Comment
| Method | Endpoint | Access | Mô tả |
|--------|----------|--------|-------|
| POST | /api/diaries/:diaryId/comments | Private | Thêm comment |
| GET | /api/diaries/:diaryId/comments | Public | Lấy comments |
| DELETE | /api/diaries/:diaryId/comments/:commentId | Private | Xóa comment |

## Chạy Backend
```bash
cd Back-End
npm install
# Tạo file .env với: PORT, MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN
npm run dev
```
